import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { Comment } from "../models/comment.model.js"
import { apiError } from "../utils/ApiError.js"
import { apiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { apiError } from "../utils/apiError.util.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId, videoId} = req.query
    const filter = {}
    // Filter by video
    if (videoId) {
        if (!isValidObjectId(videoId)) {
            throw new apiError(400, "Invalid video ID")
        }
        filter.video = videoId
    }
    // Filter by user
    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new apiError(400, "Invalid user ID")
        }
        filter.owner = userId
    }
    // Text search on comment content
    if (query) {
        filter.content = { $regex: query, $options: "i" }
    }
    // Sorting logic
    const sort = {}
    if (sortBy) {
        if (sortType === "asc" || sortType === "desc") {
            sort[sortBy] = sortType === "asc" ? 1 : -1
        } else {
            throw new apiError(400, "Invalid sort type. Use 'asc' or 'desc'.")
        }
    } else {
        sort.createdAt = -1
    }
    // Pagination options
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort,
        populate: {
            path: "owner",
            select: "username fullName avatar",
        },
    }
    const comments = await Comment.paginate(filter, options)
    if (!comments?.docs?.length) {
        throw new apiError(404, "No comments found")
    }
    return res.status(200).json(
        new apiResponse(200, {
            comments: comments.docs,
            totalPages: comments.totalPages,
            currentPage: comments.page,
            totalComments: comments.totalDocs,
        }, "Comments fetched successfully")
    )
})

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { content } = req.body
    const owner = req?.user._id
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new apiError(400, "Invalid video ID.")
    }
    if(!content?.trim()){
        throw new apiError(400, "Content is required")
    }
    if(!owner){
        throw new apiError(401, "You must be logged in to add a comment")
    }
    const videoExists = await Video.exists({ _id: videoId })
    if (!videoExists) {
        throw new apiError(404, "Video not found.")
    }
    const comment = await Comment.create({
        content,
        video: videoExists?._id,
        owner
    })
    const createdComment = await Comment.findById(comment._id)
    if(!createdComment){
        throw new apiError(404, "Comment creation failed")
    }
    return res.status(200).json(
        new apiResponse(
            200,
            {createdComment},
            "Comment added successfully."
        )
    )
})

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    const { content } = req.body
    const user = req?.user?._id
    // Validate comment ID
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new apiError(400, "Invalid comment ID.")
    }
    // Check authentication
    if (!user) {
        throw new apiError(401, "You must be logged in to edit a comment.")
    }
    // Fetch the comment
    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new apiError(404, "Comment not found.")
    }
    // Check ownership
    if (comment.owner.toString() !== user.toString()) {
        throw new apiError(403, "You are not authorized to edit this comment.")
    }
    // Validate new content
    if (!content?.trim()) {
        throw new apiError(400, "Content is required to update the comment.")
    }
    // Update comment
    comment.content = content
    await comment.save()

    return res.status(200).json(
        new apiResponse(200, comment, "Comment updated successfully.")
    )
})


const deleteComment = asyncHandler(async (req, res) => {
    const { commentId, videoId } = req.params
    const user = req?.user?._id
    // Validate comment ID
    if (!mongoose.Types.ObjectId.isValid(commentId) || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new apiError(400, "Invalid comment ID or video ID.")
    }
    // Check authentication
    if (!user) {
        throw new apiError(401, "You must be logged in to delete a comment.")
    }
    // Fetch the comment
    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new apiError(404, "Comment not found.")
    }
    // Check ownership either video owner or comment owner can detelete the comment
    const video = await Video.findById( videoId )
    if (comment.owner.toString() !== user.toString() || video.owner.toString() !== user.toString()) {
        throw new apiError(403, "You are not authorized to delete this comment.")
    }
    // Update comment
    await comment.deleteOne()

    return res.status(200).json(
        new apiResponse(200, comment, "Comment deleted successfully.")
    )
})

export { getVideoComments, addComment, updateComment, deleteComment }