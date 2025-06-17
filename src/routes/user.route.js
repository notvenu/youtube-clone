import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, deleteUserAvatar, deleteUserCoverImage, getUserChannelProfile, getUserWatchHistory, deleteUserAccount, getLikedVideos } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(upload.fields([{name: "avatar",maxCount: 1,},{name: "coverImage",maxCount: 1,}]),registerUser)
router.route("/login").post(loginUser)
router.route("/refresh-token").post(refreshAccessToken)

//Secured Routes
router.use(verifyJWT)// Apply verifyJWT middleware to all routes in this file

router.route("/logout").post(logoutUser)
router.route("/current-user").get(getCurrentUser)
router.route("/change-password").patch(changeCurrentPassword)
router.route("/update-account").patch(updateAccountDetails)
router.route("/update-avatar").patch(upload.single("avatar"), updateUserAvatar)
router.route("/update-cover-image").patch(upload.single("coverImage"), updateUserCoverImage)
router.route("/delete-avatar").patch(deleteUserAvatar)
router.route("/delete-cover-image").patch(deleteUserCoverImage)
router.route("/c/:userName").get(getUserChannelProfile)
router.route("/watch-history").get(getUserWatchHistory)
router.route("/liked-videos").get(getLikedVideos)
router.route("/delete-account").patch(deleteUserAccount)


export default router