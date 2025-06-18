import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { apiError } from "../utils/apiError.util.js"
import { apiResponse } from "../utils/apiResponse.util.js"
import {asyncHandler} from "../utils/asyncHandler.util.js"

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body
    const user = req?.user._id
    if(!isValidObjectId(user)){
        throw new apiError(400, "Invalid user ID")
    }
    if(!content?.trim()){
        throw new apiError(400, "Content is required")
    }
    const tweet = await Tweet.create({
        content,
        owner: user
    })
    const createdTweet = await Tweet.findById(tweet?._id)
    if(!createdTweet){
        throw new apiError(500, "Failed to create tweet")
    }
    return res.status(201).json(
        new apiResponse(201, createdTweet, "Tweet created successfully")
    )
})

const getUserTweets = asyncHandler(async (req, res) => {
    const user = req.user?._id
    if(!user){
        throw new apiError(400, "Invalid user ID")
    }
    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(user)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "user"
            }
        },
        {
            $unwind: "$user"
        },
        {
            $project: {
                content: 1,
                
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        }
    ])
    if(!tweets || tweets.length === 0) {
        throw new apiError(404, "No Tweets found by this user.")
    }
    return res.status(200).json(
        new apiResponse(
            200,
            "Tweets for this user fetched successfully.",
            { tweets }
        )
    )
})

const getChannelTweets = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    if(!isValidObjectId(channelId)){
        throw new apiError(400, "Invalid channel ID")
    }
    const channelExists = await User.findById(channelId)
    if (!channelExists) {
        throw new apiError(404, "Channel not found")
    }
    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "channel"
            }
        },
        {
            $unwind: "$channel"
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                updatedAt: 1,
                "channel.userName": 1,
                "channel.fullName": 1,
                "channel.avatar": 1
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        }
    ])
    return res.status(200).json(
        new apiResponse(
            200,
            { 
                tweets: tweets || [],
                tweetCount: tweets ? tweets.length : 0,
                channel: {
                    id: channelExists._id,
                    username: channelExists.userName,
                    fullName: channelExists.fullName
                }
            },
            "Tweets for this channel fetched successfully."
        )
    )
})

const updateTweet = asyncHandler(async (req, res) => {
    const { content } = req.body
    const { tweetId } = req.params
    if(!isValidObjectId(tweetId)){
        throw new apiError(400, "Invalid tweet ID")
    }
    const user = req?.user._id
    if(!user){
        throw new apiError(400, "You must be logged in to update this tweet.")
    }
    const tweet = await Tweet.findById(tweetId)
    if(!tweet){
        throw new apiError(404, "Tweet not found.")
    }
    if(tweet?.owner.toString() !== user.toString()){
        throw new apiError(400, "User is not authorized to update this tweet.")
    }
    tweet.content = content
    await tweet.save()
    return res.status(200).json(
        new apiResponse(
            200,
            tweet,
            "Tweet updated succesfully."
        )
    )
})

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    if(!isValidObjectId(tweetId)){
        throw new apiError(400, "Invalid tweet ID")
    }
    const user = req.user?._id
    if(!user){
        throw new apiError(400, "You must be logged in to delete this tweet.")
    }
    const tweet = await Tweet.findById(tweetId)
    if(!tweet){
        throw new apiError(404, "Tweet not found.")
    }
    if(tweet?.owner.toString !== user.toString()){
        throw new apiError(400, "User is not autorized to delete this tweet.")
    }
    await tweet.deleteOne()
    return res.status(200).json(
        new apiResponse(
            200,
            {},
            "Tweet deleted successfully."
        )
    )
})

export { createTweet, getUserTweets, getChannelTweets, updateTweet, deleteTweet }