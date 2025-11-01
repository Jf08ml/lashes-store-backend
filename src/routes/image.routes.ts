import { Router } from "express";
import upload from "../middlewares/uploadMiddleware";
import { uploadImage } from "../modules/images/image.controller";

const router = Router();

router.post("/upload/:folder", upload.single("file"), uploadImage);

export default router;
