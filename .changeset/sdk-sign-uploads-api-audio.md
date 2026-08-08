---
'@audius/sdk': minor
---

`uploads.createAudioUpload` accepts an optional encoded `userId`, and the default SDK factory wires the configured wallet client into its storage service, so audio uploaded through the uploads API is signed like track uploads are. Without a userId or wallet client the upload still succeeds unsigned and never earns an attestation.
