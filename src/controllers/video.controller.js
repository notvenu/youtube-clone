import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { apiError } from "../utils/apiError.util.js"
import { apiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { deleteFromCloudinary } from "../utils/cloudinary.js"

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    const filter = {}
    if (query) {
        filter.$or = [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } }
        ]
    }
    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new apiError(400, "Invalid user ID")
        }
        filter.owner = userId
    }
    const sort = {}
    if (sortBy) {
        if (sortType === "asc" || sortType === "desc") {
            sort[sortBy] = sortType === "asc" ? 1 : -1
        } else {
            throw new apiError(400, "Invalid sort type. Use 'asc' or 'desc'.")
        }
    } else {
        sort.createdAt = -1 // Default sort by createdAt descending
    }
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort,
    }
    const videos = await Video.paginate(filter, options)
    if (!videos) {
        throw new apiError(404, "No videos found")
    }
    // Populating owner details
    const populatedVideos = await Video.populate(videos.docs, {
        path: "owner",
        select: "-password -refreshToken -watchHistory"
    })
    return res.status(200).json(
        new apiResponse(200, { videos: populatedVideos, totalPages: videos.totalPages })
    )
})

const uploadAVideo = asyncHandler(async (req, res) => {
    const {title, description} = req.body
    // Check for empty fields
    if (!title.trim()) {
        throw new apiError(400, "Title of the video is required.")
    }
    //Uploading and checking Video and Thumbnail
    const videoFileLocalPath = req.files && req.files.video && req.files.video[0] && req.files.video[0].path;
    const thumbnailLocalPath = req.files && req.files.thumbnail && req.files.thumbnail[0] && req.files.thumbnail[0].path;
    if(!videoFileLocalPath){
        throw new apiError(400, "Video file is required.")
    }
    if(!thumbnailLocalPath){
        throw new apiError(400, "Thumbnail file is required.")
    }
    const videoFile = await uploadOnCloudinary(videoFileLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if(!videoFile || !thumbnail){
        throw new apiError(500, "Video or Thumbnail upload failed.")
    }
    //Creating Video and Adding to DB
    const video = await Video.create({
        title,
        description: description || "",
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        duration: videoFile.duration
    })
    //Checking Video Creation
    const createdVideo = await Video.findById(video._id).select(
        "-views -isPublished"
    )
    if(!createdVideo){
        throw new apiError(500, "Video upload failed")
    }
    //Sending Succesfull Video Upload Response
    return res.status(201).json(
        new apiResponse(200, createdVideo, "Video uploaded successfully")
    )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new apiError(400, "Invalid video ID");
    }

    // Convert videoId to ObjectId for aggregation
    const videoObjectId = new mongoose.Types.ObjectId(videoId);

    // Increment views and fetch video with owner details
    const video = await Video.findByIdAndUpdate(
        videoId,
        { $inc: { views: 1 } },
        { new: true }
    )
    .populate("owner", "username fullName avatar")
    .select("title description thumbnail videoFile views owner");

    if (!video) {
        throw new apiError(404, "Video not found.");
    }

    // Get likes, dislikes count and check if current user liked/disliked
    const videoStats = await Video.aggregate([
        {
            $match: {
                _id: videoObjectId
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "likedby",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "dislikes",
                localField: "_id",
                foreignField: "video",
                as: "dislikes",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "dislikedby",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "video",
                as: "comments",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "commentOwner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: { $first: "$commentOwner" }
                        }
                    },
                    {
                        $project: {
                            content: 1,
                            owner: 1,
                            createdAt: 1,
                            updatedAt: 1
                        }
                    },
                    {
                        $sort: { createdAt: -1 }
                    }
                ]
            }
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                dislikesCount: { $size: "$dislikes" },
                commentsCount: { $size: "$comments" },
                isLiked: {
                    $cond: {
                        if: { 
                            $in: [
                                req.user?._id ? new mongoose.Types.ObjectId(req.user._id) : null, 
                                "$likes.likedby"
                            ] 
                        },
                        then: true,
                        else: false
                    }
                },
                isDisliked: {
                    $cond: {
                        if: { 
                            $in: [
                                req.user?._id ? new mongoose.Types.ObjectId(req.user._id) : null, 
                                "$dislikes.dislikedby"
                            ] 
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                title: 1,
                description: 1,
                thumbnail: 1,
                videoFile: 1,
                views: 1,
                owner: 1,
                likesCount: 1,
                dislikesCount: 1,
                commentsCount: 1,
                comments: 1,
                isLiked: 1,
                isDisliked: 1
            }
        }
    ]);

    if (!videoStats || videoStats.length === 0) {
        throw new apiError(404, "Video not found.");
    }

    // Combine the video data with stats
    const videoWithStats = {
        ...video.toObject(),
        likesCount: videoStats[0].likesCount,
        dislikesCount: videoStats[0].dislikesCount,
        commentsCount: videoStats[0].commentsCount,
        comments: videoStats[0].comments,
        isLiked: videoStats[0].isLiked,
        isDisliked: videoStats[0].isDisliked
    };

    return res.status(200).json(
        new apiResponse(200, videoWithStats, "Video fetched successfully")
    );
});

const updateVideoDetails = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const {title, description} = req.body
    if( !(title || description) ) {
        throw new apiError(400, "At least one field is required to update")
    }
    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                ...(title && { title }),
                ...(description && { description }),
            },
        },
        {new: true}
    ).select("-views -isPublished")
    //Checking if Video is updated
    if (!video) {
        throw new apiError(404, "Video not found")
    }
    return res.status(200).json(
        new apiResponse(200, video, "Video details updated successfully")
    )
})

const updateVideoThumbnail = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const thumbnailLocalPath = req.file?.path
    if (!thumbnailLocalPath) {
        throw new apiError(400, "Thumbnail is required.")
    }
    const video = await Video.findById(videoId)
    if (!video) {
        throw new apiError(404, "Video not found.")
    }
    try {
        await deleteFromCloudinary(video.thumbnail);
    } catch (error) {
        throw new apiError(500, "Error deleting old thumbnail from cloud storage.")
    }
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if (!thumbnail?.url) {
        throw new apiError(500, "Error uploading thumbnail to cloud storage.")
    }
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                thumbnail: thumbnail.url,
            },
        },
        { new: true }
    ).select("-title -description -duration -isPublished -videoFile -views -owner")
    return res.status(200).json(
        new apiResponse(
            200,
            { thumbnail: updatedVideo.thumbnail },
            "Thumbnail updated successfully."
        )
    )
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const video = await Video.findById(videoId)
    try {
        await deleteFromCloudinary(video?.videoFile)
    } catch (error) {
        throw new apiError(500, "Error deleting video file from cloud storage")
    }
    try {
        await deleteFromCloudinary(video?.thumbnail)
    } catch (error) {
        throw new apiError(500, "Error deleting thumbnail from cloud storage")
    }
    await video.deleteOne()
    return res.status(200).json(
        new apiResponse(
            200, 
            {}, 
            "Video deleted successfully."
        )
    )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const video = await Video.findById(videoId)
    if (!video) {
        throw new apiError(404, "Video not found")
    }
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        { 
            isPublished: !video.isPublished,
        },
        { new: true }
    ).select("-views")
    if (!updatedVideo) {
        throw new apiError(404, "Video not found")
    }
    return res.status(200).json(
        new apiResponse(200, video, `Video ${updatedVideo.isPublished? "published" : "unpublished"} successfully`)
    )
})

export { getAllVideos, uploadAVideo, getVideoById, updateVideoDetails, updateVideoThumbnail, deleteVideo, togglePublishStatus }