import { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { Dislike } from "../models/dislike.model.js"
import { apiError } from "../utils/apiError.util.js"
import { apiResponse } from "../utils/apiResponse.util.js"
import { asyncHandler } from "../utils/asyncHandler.util.js"

const toggleVideoDislike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video ID")
    }
    const existingLike = await Like.findOne({ video: videoId, likedBy: req.user._id })
    const existingDislike = await Dislike.findOne({ video: videoId, dislikedBy: req.user._id })
    if (existingDislike) {
        // If Dislike exists, remove it
        await Dislike.deleteOne({ _id: existingDislike._id })
        return res.status(200).json(new apiResponse(200, null, "Dislike removed successfully"))
    } else if(existingLike) {
        // If Dislike does not exist, create it
        if(existingLike){
           await Like.deleteOne({_id: existingLike._id})
        }
        const newDislike = new Dislike({
            video: videoId,
            dislikedBy: req.user._id
        })
        await newDislike.save()
        return res.status(201).json(new apiResponse(201, newDislike, "Video Disliked successfully and like removed succesfully."))
    }
})

const toggleCommentDislike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    if (!isValidObjectId(commentId)) {
        throw new apiError(400, "Invalid comment ID")
    }
    const existingLike = await Like.findOne({ comment: commentId, likedBy: req.user._id })
    const existingDislike = await Dislike.findOne({ comment: commentId, dislikedBy: req.user._id })
    if (existingDislike) {
        // If Dislike exists, remove it
        await Dislike.deleteOne({ _id: existingDislike._id })
        return res.status(200).json(new apiResponse(200, "Dislike removed successfully"))
    } else {
        // If Dislike does not exist, create it
        if(existingLike){
           await Like.deleteOne({_id: existingLike._id})
        }
        const newDislike = new Dislike({
            comment: commentId,
            dislikedBy: req.user._id
        })
        await newDislike.save()
        return res.status(201).json(new apiResponse(201, newDislike, "Comment disliked successfully"))
    }
})

const toggleTweetDislike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    if (!isValidObjectId(tweetId)) {
        throw new apiError(400, "Invalid tweet ID")
    }
    const existingLike = await Like.findOne({ tweet: tweetId, likedBy: req.user._id })
    const existingDislike = await Dislike.findOne({ tweet: tweetId, dislikedBy: req.user._id })
    if (existingDislike) {
        // If Dislike exists, remove it
        if(existingLike){
           await Like.deleteOne({_id: existingLike._id})
        }
        await Dislike.deleteOne({ _id: existingDislike._id })
        return res.status(200).json(new apiResponse(200, "Dislike removed successfully"))
    } else {
        // If Dislike does not exist, create it
        const newDislike = new Dislike({
            tweet: tweetId,
            dislikedBy: req.user._id
        })
        await newDislike.save()
        return res.status(201).json(new apiResponse(201, newDislike, "Tweet disliked successfully"))
    }
})

export { toggleCommentDislike, toggleTweetDislike, toggleVideoDislike }