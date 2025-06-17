import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { Dislike } from "../models/dislike.model.js"
import { apiError } from "../utils/apiError.util.js"
import { apiResponse } from "../utils/apiResponse.util.js"
import { asyncHandler } from "../utils/asyncHandler.util.js"

const getChannelStats = asyncHandler(async (req, res) => {
    const user = req.user?._id
    if (!user) {
        throw new apiError(401, "Unauthorized")
    }
    const [totalVideos, totalViewsResult, totalSubscribers, videoIds] = await Promise.all([
        Video.countDocuments({ owner: user._id }),
        Video.aggregate([
            { 
                $match: { 
                    owner: new mongoose.Types.ObjectId(user._id)
                } 
            },
            { 
                $group: { 
                    _id: null, 
                    totalViews: { $sum: "$views" } 
                } 
            }
        ]),
        Subscription.countDocuments({ channel: user._id }),
        Video.find({ owner: user._id }).select('_id')
    ])
    const totalLikes = await Like.countDocuments({
        video: { $in: videoIds.map(v => v._id) }
    })
    const totalDislikes = await Dislike.countDocuments({
        video: { $in: videoIds.map(v => v._id) }
    })
    const stats = {
        totalVideos,
        totalViews: totalViewsResult[0]?.totalViews || 0,
        totalSubscribers,
        totalLikes,
        totalDislikes
    }
    return res.status(200).json(
        new apiResponse(200, stats, "Channel stats fetched successfully")
    )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortType = 'desc' } = req.query
    const user = req.user?._id
    if (!user) {
        throw new apiError(401, "Unauthorized")
    }
    const pageNum = parseInt(page, 10)
    const limitNum = parseInt(limit, 10)
    if (pageNum < 1) {
        throw new apiError(400, "Page number must be greater than 0")
    }
    if (limitNum < 1 || limitNum > 50) {
        throw new apiError(400, "Limit must be between 1 and 50")
    }
    const allowedSortFields = ['createdAt', 'updatedAt', 'title', 'views', 'duration']
    if (!allowedSortFields.includes(sortBy)) {
        throw new apiError(400, `Invalid sort field. Allowed fields: ${allowedSortFields.join(', ')}`)
    }
    const sortOrder = sortType === 'asc' ? 1 : -1
    const skip = (pageNum - 1) * limitNum
    const [videos, totalCount] = await Promise.all([
        Video.find({ owner: user._id })
            .select('title description thumbnail views duration isPublished createdAt updatedAt')
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(limitNum),
        Video.countDocuments({ owner: user._id })
    ])
    if (videos.length === 0) {
        return res.status(200).json(
            new apiResponse(200, {
                videos: [],
                totalVideos: 0,
                totalPages: 0,
                currentPage: pageNum,
                hasNextPage: false,
                hasPrevPage: false
            }, "No videos found for this channel")
        )
    }
    const totalPages = Math.ceil(totalCount / limitNum)
    return res.status(200).json(
        new apiResponse(200, {
            videos,
            totalVideos: totalCount,
            totalPages,
            currentPage: pageNum,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1
        }, "Channel videos fetched successfully")
    )
})

export { getChannelStats, getChannelVideos }