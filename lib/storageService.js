const { Readable } = require("stream");
const { storage } = require("./google");

const BUCKET_NAME = process.env.BUCKET_NAME;

function parseDataUrl(dataUrl) {
  const match = /^data:(.+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("invalid data URL");
  return { mimeType: match[1], buffer: Buffer.from(match[2], "base64") };
}

async function uploadPhoto(dataUrl, objectName) {
  const { mimeType, buffer } = parseDataUrl(dataUrl);

  await storage.objects.insert({
    bucket: BUCKET_NAME,
    name: objectName,
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
  });

  return `/api/photos/${encodeURIComponent(objectName)}`;
}

async function getPhotoStream(objectName) {
  const res = await storage.objects.get(
    { bucket: BUCKET_NAME, object: objectName, alt: "media" },
    { responseType: "stream" }
  );
  return res.data;
}

module.exports = { uploadPhoto, getPhotoStream };
