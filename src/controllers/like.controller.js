import { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { apiError } from "../utils/apiError.util.js"
import { apiResponse } from "../utils/apiResponse.util.js"
import { asyncHandler } from "../utils/asyncHandler.util.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: toggle like on video
    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video ID")
    }
    const existingLike = await Like.findOne({ video: videoId, likedBy: req.user._id })
    if (existingLike) {
        // If like exists, remove it
        await Like.deleteOne({ _id: existingLike._id })
        return res.status(200).json(new apiResponse(200, "Like removed successfully"))
    } else {
        // If like does not exist, create it
        const newLike = new Like({
            video: videoId,
            likedBy: req.user._id
        })
        await newLike.save()
        return res.status(201).json(new apiResponse(201, newLike, "Video liked successfully"))
    }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    if (!isValidObjectId(commentId)) {
        throw new apiError(400, "Invalid comment ID")
    }
    const existingLike = await Like.findOne({ comment: commentId, likedBy: req.user._id })
    if (existingLike) {
        // If like exists, remove it
        await Like.deleteOne({ _id: existingLike._id })
        return res.status(200).json(new apiResponse(200, "Like removed successfully"))
    } else {
        // If like does not exist, create it
        const newLike = new Like({
            comment: commentId,
            likedBy: req.user._id
        })
        await newLike.save()
        return res.status(201).json(new apiResponse(201, newLike, "Comment liked successfully"))
    }
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    if (!isValidObjectId(tweetId)) {
        throw new apiError(400, "Invalid tweet ID")
    }
    const existingLike = await Like.findOne({ tweet: tweetId, likedBy: req.user._id })
    if (existingLike) {
        // If like exists, remove it
        await Like.deleteOne({ _id: existingLike._id })
        return res.status(200).json(new apiResponse(200, "Like removed successfully"))
    } else {
        // If like does not exist, create it
        const newLike = new Like({
            tweet: tweetId,
            likedBy: req.user._id
        })
        await newLike.save()
        return res.status(201).json(new apiResponse(201, newLike, "Tweet liked successfully"))
    }
})

export { toggleCommentLike, toggleTweetLike, toggleVideoLike }