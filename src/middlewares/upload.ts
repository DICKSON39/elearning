import multer from "multer";

// Use memory storage to buffer files for direct upload to Supabase
const storage = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  // Allow only image and video MIME types
  const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];
  const isAllowed = allowedMimeTypes.some((type) => file.mimetype.startsWith(type));

  if (isAllowed) {
    cb(null, true);
  } else {
    cb(new Error("Only image and video files are allowed!"), false);
  }
};

export const upload = multer({ storage, fileFilter });
