import { Router } from "express";
import { uploadVideo } from "../controllers/video.route.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { uploadVideo } from "../controllers/video.controller.js";

const router = Router()

export default router