import mongoose, {isValidObjectId} from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { apiError } from "../utils/apiError.util.js"
import { apiResponse } from "../utils/apiResponse.util.js"
import { asyncHandler } from "../utils/asyncHandler.util.js"

const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if (!isValidObjectId(channelId)) {
        throw new apiError(400, "Invalid channel ID")
    }
    // Check if user is trying to subscribe to themselves
    if (channelId === req.user._id.toString()) {
        throw new apiError(400, "You cannot subscribe to your own channel")
    }
    // Check if channel exists
    const channelExists = await User.findById(channelId)
    if (!channelExists) {
        throw new apiError(404, "Channel not found")
    }
    const existingSubscription = await Subscription.findOne({ 
        channel: channelId, 
        subscriber: req.user._id 
    })
    if (existingSubscription) {
        // If subscription exists, remove it (unsubscribe)
        await Subscription.deleteOne({ _id: existingSubscription._id })
        return res.status(200).json(
            new apiResponse(200, {}, "Unsubscribed channel successfully")
        )
    } else {
        // If subscription does not exist, create it (subscribe)
        const newSubscription = new Subscription({
            channel: channelId,
            subscriber: req.user._id
        })
        await newSubscription.save()
        return res.status(201).json(
            new apiResponse(201, newSubscription, "Subscribed channel successfully")
        )
    }
})

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
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
    
    // Find all subscriptions where this channel is the target
    const subscribers = await Subscription.find({ 
        channel: channelId 
    }).populate('subscriber', 'username fullName avatar')
    
    if (!subscribers || subscribers.length === 0) {
        throw new apiError(404, "No subscribers found for this channel")
    }
    
    return res.status(200).json(
        new apiResponse(
            200, 
            { subscribers, subscriberCount: subscribers.length }, 
            "Subscribers fetched successfully"
        )
    )
})

const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    if (!isValidObjectId(subscriberId)) {
        throw new apiError(400, "Invalid Subscriber ID")
    }
    const subscriberExists = await User.findById(subscriberId)
    if (!subscriberExists) {
        throw new apiError(404, "Subscriber not found")
    }
    // Find all channels this user has subscribed to
    const subscriptions = await Subscription.find({ 
        subscriber: subscriberId 
    }).populate('channel', 'username fullName avatar')
    if (!subscriptions || subscriptions.length === 0) {
        throw new apiError(404, "No subscriptions found for this user")
    }
    return res.status(200).json(
        new apiResponse(
            200, 
            { subscriptions, subscriptionCount: subscriptions.length }, 
            "Subscribed channels fetched successfully"
        )
    )
})

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels }