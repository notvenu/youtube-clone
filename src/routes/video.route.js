import { Router } from "express";
import { getAllVideos, uploadAVideo, getVideoById, updateVideoDetails, updateVideoThumbnail, deleteVideo, togglePublishStatus } from "../controllers/video.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()
router.route("/:videoId").get(getVideoById)
//Secure Routes
router.use(verifyJWT)
router.route("/").get(getAllVideos)
router.route("/upload").post(upload.fields([{name: "videoFile",maxCount: 1,},{name: "thumbnail",maxCount: 1,}]), uploadAVideo)
router.route("/:videoId/update-video-details").patch(updateVideoDetails)
router.route("/:videoId/update-thumbnail").patch(upload.single("thumbnail"), updateVideoThumbnail)
router.route("/:videoId").delete(deleteVideo)
router.route("/:videoId/publish").patch(togglePublishStatus)

export default router