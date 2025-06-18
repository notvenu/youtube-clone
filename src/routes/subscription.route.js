import { Router } from 'express';
import { getSubscribedChannels, getChannelSubscribers, toggleSubscription } from "../controllers/subscription.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"

const router = Router()
router.use(verifyJWT) // Apply verifyJWT middleware to all routes in this file

router.route("/c/:channelId").post(toggleSubscription)
router.route("/c/:channelId").get(getSubscribedChannels)
router.route("/u/:subscriberId").get(getChannelSubscribers)

export default router