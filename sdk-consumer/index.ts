import { DiscoveryNodeSelector, sdk, stagingConfig } from "@audius/sdk";
import { UploadTrackRequest } from "@audius/sdk/dist/sdk/api/tracks/types";
import express from "express";
import multer from "multer";
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const app = express();
app.use(express.json());
app.use(express.urlencoded());
const port = 3000;

// Test/develop sdk functionality here

const audiusSdk = sdk({
  appName: "sdk-consumer",
  services: {
    discoveryNodeSelector: new DiscoveryNodeSelector({
      bootstrapServices: stagingConfig.discoveryNodes,
    }),
  },
});

app.listen(port, () => {
  console.log(`sdk-consumer listening on port ${port}`);
});

const trackUpload = upload.fields([
  { name: "coverArtFile", maxCount: 1 },
  { name: "trackFile", maxCount: 1 },
]);

type MulterFiles =
  | {
      [fieldname: string]: Express.Multer.File[];
    }
  | undefined;

app.post<UploadTrackRequest>(
  "/uploadTrack",
  trackUpload as any,
  async (req, res) => {
    try {
      const coverArtFile = (req.files as MulterFiles)?.["coverArtFile"][0];
      const trackFile = (req.files as MulterFiles)?.["trackFile"][0];

      if (coverArtFile && trackFile) {
        const uploadTrackRequest: UploadTrackRequest = {
          artistId: req.body.artistId,
          coverArtFile: {
            buffer: coverArtFile?.buffer,
            name: coverArtFile.originalname,
          },
          metadata: JSON.parse(req.body.metadata),
          onProgress: (progress) => console.log("Progress:", progress),
          trackFile: {
            buffer: trackFile?.buffer,
            name: trackFile.originalname,
          },
        };
        const result = await audiusSdk.tracks.uploadTrack(uploadTrackRequest);
        res.send(result);
      }
    } catch (e) {
      res.send((e as any).message);
    }
  }
);
