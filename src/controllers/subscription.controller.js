import mongoose, {isValidObjectId} from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { apiError } from "../utils/apiError.util.js"
import { apiResponse } from "../utils/apiResponse.util.js"
import { asyncHandler } from "../utils/asyncHandler.util.js"

const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    if (!isValidObjectId(channelId)) {
        throw new apiError(400, "Invalid Channel ID")
    }
    if (!req.user?._id) {
        throw new apiError(401, "Unauthorized")
    }
    const userExists = await User.findById(channelId)
    if (!userExists) {
        throw new apiError(404, "User not found")
    }
    const subscriptions = await Subscription.find({ 
        subscriber: channelId 
    }).populate('channel', 'username fullName avatar')
    return res.status(200).json(
        new apiResponse(
            200, 
            { 
                subscriptions: subscriptions || [], 
                subscriptionCount: subscriptions ? subscriptions.length : 0 
            }, 
            "Subscribed channels fetched successfully"
        )
    )
})

const getChannelSubscribers = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    if (!isValidObjectId(subscriberId)) {
        throw new apiError(400, "Invalid Subscriber ID")
    }
    if (!req.user?._id) {
        throw new apiError(401, "Unauthorized")
    }
    const channelExists = await User.findById(subscriberId)
    if (!channelExists) {
        throw new apiError(404, "Channel not found")
    }
    const subscribers = await Subscription.find({ 
        channel: subscriberId 
    }).populate('subscriber', 'username fullName avatar')
    return res.status(200).json(
        new apiResponse(
            200, 
            { 
                subscribers: subscribers || [], 
                subscriberCount: subscribers ? subscribers.length : 0,
                channel: {
                    id: channelExists._id,
                    userName: channelExists.userName,
                    fullName: channelExists.fullName,
                    avatar: channelExists.avatar,
                    coverImage: channelExists.coverImage
                }
            }, 
            "Channel subscribers fetched successfully"
        )
    )
})

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    if (!isValidObjectId(channelId)) {
        throw new apiError(400, "Invalid Channel ID")
    }
    if (!req.user?._id) {
        throw new apiError(401, "Unauthorized")
    }
    const channelExists = await User.findById(channelId)
    if (!channelExists) {
        throw new apiError(404, "Channel not found")
    }
    if (req.user._id.toString() === channelId) {
        throw new apiError(400, "You cannot subscribe to yourself")
    }
    const existingSubscription = await Subscription.findOne({
        subscriber: req.user._id,
        channel: channelId
    })
    if (existingSubscription) {
        await Subscription.findByIdAndDelete(existingSubscription._id)
        return res.status(200).json(
            new apiResponse(
                200,
                { subscribed: false },
                "Successfully unsubscribed from channel"
            )
        )
    } else {
        const newSubscription = await Subscription.create({
            subscriber: req.user._id,
            channel: channelId
        })
        return res.status(201).json(
            new apiResponse(
                201,
                { 
                    subscribed: true,
                    subscription: newSubscription
                },
                "Successfully subscribed to channel"
            )
        )
    }
})

export { toggleSubscription, getChannelSubscribers, getSubscribedChannels }