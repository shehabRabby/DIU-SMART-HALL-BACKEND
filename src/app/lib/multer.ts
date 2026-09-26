import multer from "multer";

// Set Multer for handling file uploads
const storage = multer.memoryStorage();
export const upload = multer({ storage: storage });
