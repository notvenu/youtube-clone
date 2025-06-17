import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { Comment } from "../models/comment.model.js"
import { apiError } from "../utils/apiError.util.js"
import { apiResponse } from "../utils/apiResponse.util.js"
import { asyncHandler } from "../utils/asyncHandler.util.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId, videoId } = req.query
    const filter = {}
    if (videoId) {
        if (!isValidObjectId(videoId)) {
            throw new apiError(400, "Invalid video ID")
        }
        filter.video = new mongoose.Types.ObjectId(videoId)
    }
    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new apiError(400, "Invalid user ID")
        }
        filter.owner = new mongoose.Types.ObjectId(userId)
    }
    if (query) {
        filter.content = { $regex: query, $options: "i" }
    }
    const sort = {}
    const allowedSortFields = ['createdAt', 'updatedAt', 'content']
    if (sortBy) {
        if (!allowedSortFields.includes(sortBy)) {
            throw new apiError(400, `Invalid sort field. Allowed fields: ${allowedSortFields.join(', ')}`)
        }
        if (sortType === "asc" || sortType === "desc") {
            sort[sortBy] = sortType === "asc" ? 1 : -1
        } else {
            throw new apiError(400, "Invalid sort type. Use 'asc' or 'desc'.")
        }
    } else {
        sort.createdAt = -1
    }
    const pageNum = parseInt(page, 10)
    const limitNum = parseInt(limit, 10)
    if (pageNum < 1) {
        throw new apiError(400, "Page number must be greater than 0")
    }
    if (limitNum < 1 || limitNum > 100) {
        throw new apiError(400, "Limit must be between 1 and 100")
    }
    const options = {
        page: pageNum,
        limit: limitNum,
        sort,
    }
    const aggregate = Comment.aggregate([
        { $match: filter },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: { $first: "$ownerDetails" }
            }
        },
        {
            $unset: "ownerDetails"
        },
        {
            $project: {
                content: 1,
                video: 1,
                createdAt: 1,
                updatedAt: 1,
                "owner._id": 1,
                "owner.userName": 1,
                "owner.fullName": 1,
                "owner.avatar": 1
            }
        }
    ])
    const comments = await Comment.aggregatePaginate(aggregate, options)
    if (!comments?.docs?.length) {
        return res.status(200).json(
            new apiResponse(200, {
                comments: [],
                totalPages: comments.totalPages || 0,
                currentPage: comments.page || 1,
                totalComments: comments.totalDocs || 0,
                hasNext: false,
                hasPrev: false
            }, "No comments found")
        )
    }
    return res.status(200).json(
        new apiResponse(200, {
            comments: comments.docs,
            totalPages: comments.totalPages,
            currentPage: comments.page,
            totalComments: comments.totalDocs,
            hasNext: comments.hasNextPage,
            hasPrev: comments.hasPrevPage
        }, "Comments fetched successfully")
    )
})

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { content } = req.body
    const owner = req?.user?._id
    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video ID.")
    }
    if (!owner) {
        throw new apiError(401, "You must be logged in to add a comment")
    }
    if (!content?.trim()) {
        throw new apiError(400, "Content is required")
    }
    const video = await Video.findById(videoId)
    if (!video) {
        throw new apiError(404, "Video not found.")
    }
    if (!video.isPublished) {
        throw new apiError(400, "Cannot comment on unpublished video")
    }
    const comment = await Comment.create({
        content: content.trim(),
        video: videoId,
        owner
    })
    const createdComment = await Comment.findById(comment._id)
        .populate("owner", "userName fullName avatar")
        .populate("video", "title")
    if (!createdComment) {
        throw new apiError(500, "Comment creation failed")
    }
    return res.status(201).json(
        new apiResponse(
            201,
            { comment: createdComment },
            "Comment added successfully."
        )
    )
})

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    const { content } = req.body
    const user = req?.user?._id
    if (!isValidObjectId(commentId)) {
        throw new apiError(400, "Invalid comment ID.")
    }
    if (!user) {
        throw new apiError(401, "You must be logged in to edit a comment.")
    }
    if (!content?.trim()) {
        throw new apiError(400, "Content is required to update the comment.")
    }
    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new apiError(404, "Comment not found.")
    }
    if (comment.owner.toString() !== user.toString()) {
        throw new apiError(403, "You are not authorized to edit this comment.")
    }
    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        { content: content.trim() },
        { new: true }
    ).populate("owner", "userName fullName avatar")
     .populate("video", "title")
    if (!updatedComment) {
        throw new apiError(500, "Failed to update comment")
    }
    return res.status(200).json(
        new apiResponse(200, { comment: updatedComment }, "Comment updated successfully.")
    )
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId, videoId } = req.params
    const user = req?.user?._id
    if (!isValidObjectId(commentId) || !isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid comment ID or video ID.")
    }
    if (!user) {
        throw new apiError(401, "You must be logged in to delete a comment.")
    }
    const [comment, video] = await Promise.all([
        Comment.findById(commentId),
        Video.findById(videoId)
    ])
    if (!comment) {
        throw new apiError(404, "Comment not found.")
    }
    if (!video) {
        throw new apiError(404, "Video not found.")
    }
    const isCommentOwner = comment.owner.toString() === user.toString()
    const isVideoOwner = video.owner.toString() === user.toString()
    if (!isCommentOwner && !isVideoOwner) {
        throw new apiError(403, "You are not authorized to delete this comment.")
    }
    await comment.deleteOne()
    return res.status(200).json(
        new apiResponse(200, {}, "Comment deleted successfully.")
    )
})

export { getVideoComments, addComment, updateComment, deleteComment }