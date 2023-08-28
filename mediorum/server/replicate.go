package server

import (
	"context"
	"errors"
	"fmt"
	"io"
	"mediorum/cidutil"
	"mediorum/server/signature"
	"mime/multipart"
	"net/http"
	"net/url"
	"time"

	"golang.org/x/sync/errgroup"
)

func (ss *MediorumServer) replicateFile(fileName string, file io.ReadSeeker) ([]string, error) {
	logger := ss.logger.With("task", "replicate", "cid", fileName)

	success := []string{}
	preferred, _ := ss.rendezvous(fileName)
	for _, peer := range preferred {
		logger := logger.With("to", peer)

		logger.Info("replicating")

		file.Seek(0, 0)
		err := ss.replicateFileToHost(peer, fileName, file)
		if err != nil {
			logger.Error("replication failed", "err", err)
		} else {
			logger.Info("replicated")
			success = append(success, peer)
			if len(success) == ss.Config.ReplicationFactor {
				break
			}
		}
	}

	return success, nil
}

func (ss *MediorumServer) replicateToMyBucket(fileName string, file io.Reader) error {
	ctx := context.Background()
	logger := ss.logger.With("task", "replicateToMyBucket", "cid", fileName)
	logger.Info("replicateToMyBucket")
	key := cidutil.ShardCID(fileName)

	// already have?
	alreadyHave, _ := ss.bucket.Exists(ctx, key)
	if !alreadyHave {
		w, err := ss.bucket.NewWriter(ctx, key, nil)
		if err != nil {
			return err
		}
		defer w.Close()

		_, err = io.Copy(w, file)
		if err != nil {
			return err
		}
	}

	// record that we "have" this key
	var exists bool
	ss.crud.DB.Raw(
		"SELECT EXISTS(SELECT 1 FROM blobs WHERE host = ? AND key = ? LIMIT 1)",
		ss.Config.Self.Host,
		fileName,
	).Scan(&exists)
	if !exists {
		logger.Info("creating blob record")
		return ss.crud.Create(&Blob{
			Host:      ss.Config.Self.Host,
			Key:       fileName,
			CreatedAt: time.Now().UTC(),
		})
	}

	return nil
}

func (ss *MediorumServer) dropFromMyBucket(fileName string) error {
	logger := ss.logger.With("task", "dropFromMyBucket", "cid", fileName)
	logger.Info("deleting blob")

	key := cidutil.ShardCID(fileName)
	ctx := context.Background()
	err := ss.bucket.Delete(ctx, key)
	if err != nil {
		logger.Error("failed to delete", "err", err)
	}

	// if blob record exists... delete it
	var existingBlob *Blob
	found := ss.crud.DB.Where("host = ? AND key = ?", ss.Config.Self.Host, fileName).First(&existingBlob)
	if found.Error == nil {
		logger.Info("deleting blob record")
		return ss.crud.Delete(existingBlob)
	}

	return nil
}

func (ss *MediorumServer) replicateFileToHost(peer string, fileName string, file io.Reader) error {
	// logger := ss.logger.With()
	if peer == ss.Config.Self.Host {
		return ss.replicateToMyBucket(fileName, file)
	}

	client := http.Client{
		Timeout: 30 * time.Second,
	}

	// first check if target already has it...
	if ss.hostHasBlob(peer, fileName) {
		ss.logger.Info(peer + " already has " + fileName)
		return nil
	}

	r, w := io.Pipe()
	m := multipart.NewWriter(w)
	errChan := make(chan error)

	go func() {
		defer w.Close()
		defer m.Close()
		part, err := m.CreateFormFile(filesFormFieldName, fileName)
		if err != nil {
			errChan <- err
			return
		}
		if _, err = io.Copy(part, file); err != nil {
			errChan <- err
			return
		}
		close(errChan)
	}()

	req := signature.SignedPost(
		peer+"/internal/blobs",
		m.FormDataContentType(),
		r,
		ss.Config.privateKey,
		ss.Config.Self.Host,
	)

	// send it
	resp, err := client.Do(req)
	if err != nil {
		return err
	}

	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return errors.New(resp.Status)
	}

	return <-errChan
}

// hostHasBlob is a "quick check" that a host has a blob (used for checking host has blob before redirecting to it).
func (ss *MediorumServer) hostHasBlob(host, key string) bool {
	client := http.Client{
		Timeout: time.Second,
	}
	u := apiPath(host, fmt.Sprintf("internal/blobs/info/%s", url.PathEscape(key)))
	req, err := http.NewRequest("GET", u, nil)
	if err != nil {
		return false
	}
	req.Header.Set("User-Agent", "mediorum "+ss.Config.Self.Host)
	has, err := client.Do(req)
	if err != nil {
		return false
	}
	defer has.Body.Close()
	return has.StatusCode == 200
}

// raceHostHasBlob tries batches of 5 hosts concurrently to find the first healthy host with the key instead of sequentially waiting for a 1s timeout from each host.
func (ss *MediorumServer) raceHostHasBlob(key string, hostsWithKey []string) string {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	g, _ := errgroup.WithContext(ctx)
	g.SetLimit(5)
	hostWithKeyCh := make(chan string, 1)

	for _, host := range hostsWithKey {
		h := host
		g.Go(func() error {
			if ss.hostHasBlob(h, key) {
				// write to channel and cancel context to stop other goroutines, or stop if context was already canceled
				select {
				case hostWithKeyCh <- h:
					cancel()
				case <-ctx.Done():
				}
			}
			return nil
		})
	}

	go func() {
		g.Wait()
		close(hostWithKeyCh)
	}()

	host, ok := <-hostWithKeyCh
	if ok {
		return host
	}
	return ""
}

func (ss *MediorumServer) pullFileFromHost(host, cid string) error {
	if host == ss.Config.Self.Host {
		return errors.New("should not pull blob from self")
	}
	client := http.Client{
		Timeout: 10 * time.Second,
	}
	u := apiPath(host, "internal/blobs", url.PathEscape(cid))

	req, err := signature.SignedGet(u, ss.Config.privateKey, ss.Config.Self.Host)
	if err != nil {
		return err
	}

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("pull blob: bad status: %d cid: %s host: %s", resp.StatusCode, cid, host)
	}

	return ss.replicateToMyBucket(cid, resp.Body)
}
