import { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { User } from "../models/user.model.js"
import { Video } from "../models/video.model.js"
import { asyncHandler} from "../utils/asyncHandler.util.js"
import { apiError } from "../utils/apiError.util.js"
import { apiResponse } from "../utils/apiResponse.util.js"

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body
    if(!name?.trim()){
        throw new apiError(400, "Playlist name is required")
    }
    const playlist = await Playlist.create({
        name: name,
        description: description || "",
        owner: req.user?._id
    })
    const createdPlaylist = await Playlist.findById(playlist._id)
    if(!createdPlaylist){
        throw new apiError(500, "Failed to create playlist")
    }
    return res.status(200).json(
        new apiResponse(
            200,
            createdPlaylist,
            "Playlist created successfully."
        )
    )
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params
    if(!isValidObjectId(userId)){
        throw new apiError(400, "Invalid user ID")
    }
    const user = req.user?._id
    const loggedInUser = await User.findById(userId)
    if(!user){
        throw new apiError(401, "Unauthorized. Please login to view playlists.")
    }
    if(user.toString() !== loggedInUser?._id.toString()){
        throw new apiError(404, "You can only view your own playlists.")
    }
    const playlists = await Playlist.find({
        owner: userId
    }).populate("owner", "fullName userName avatar").populate("videos", "title description thumbnail views duration isPublished")
    if(playlists.length === 0){
        return res.status(200).json(
            new apiResponse(
                200,
                { playlists: [] },
                "No playlists found for this user"
            )
        )
    }
    return res.status(200).json(
        new apiResponse(
            200,
            { playlists },
            "Playlists retrieved successfully."
        )
    )
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    if(!isValidObjectId(playlistId)){
        throw new apiError(400, "Invalid playlist ID")
    }
    const playlist = await Playlist.findById(playlistId)
        .populate("owner", "fullName userName avatar")
        .populate("videos", "title description thumbnail views duration")
    if(!playlist){
        throw new apiError(404, "Playlist not found")
    }
    return res.status(200).json(
        new apiResponse(
            200,
            { playlist },
            "Playlist fetched successfully."
        )
    )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { videoId, playlistId } = req.params
    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
        throw new apiError(400, "Invalid playlist ID or video ID.")
    }
    const user = req.user?._id
    if(!user){
        throw new apiError(401, "Unauthorized. Please login to add video to playlist.")
    }
    const playlist = await Playlist.findById(playlistId)
    if(!playlist){
        throw new apiError(404, "Playlist not found")
    }
    if(playlist.owner.toString() !== user.toString()){
        throw new apiError(403, "User not authorized to add videos to this playlist.")
    }
    const video = await Video.findById(videoId)
    if(!video){
        throw new apiError(404, "Video not found")
    }
    if(!video.isPublished){
        throw new apiError(400, "Cannot add unpublished video to playlist")
    }
    if(playlist.videos.includes(video?._id)){
        throw new apiError(400, "Video is already in the playlist")
    }
    playlist.videos.push(videoId)
    await playlist.save()
    const updatedPlaylist = await Playlist.findById(playlistId)
        .populate("owner", "fullName userName avatar")
        .populate("videos", "title description thumbnail views duration")
    return res.status(200).json(
        new apiResponse(
            200,
            { playlist: updatedPlaylist },
            "Video successfully added to playlist."
        )
    )
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
        throw new apiError(400, "Invalid playlist ID or video ID.")
    }
    const user = req.user?._id
    if(!user){
        throw new apiError(401, "Unauthorized. Please login to remove video from playlist.")
    }
    const playlist = await Playlist.findById(playlistId)
    if(!playlist){
        throw new apiError(404, "Playlist not found")
    }
    if(!(playlist.owner.toString() === user.toString())){
        throw new apiError(403, "User not authorized to remove videos from this playlist.")
    }
    const video = await Video.findById(videoId)
    if(!video){
        throw new apiError(404, "Video not found")
    }
    if(!playlist.videos.includes(videoId)){
        throw new apiError(400, "Video is not in the playlist")
    }
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: {
                videos: videoId
            }
        },
        {
            new: true
        }
    ).populate("owner", "fullName userName avatar")
     .populate("videos", "title description thumbnail views duration")
     
    if(!updatedPlaylist){
        throw new apiError(500, "Failed to remove video from playlist")
    }
    return res.status(200).json(
        new apiResponse(
            200,
            { playlist: updatedPlaylist },
            "Video successfully removed from the playlist."
        )
    )
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    if(!isValidObjectId(playlistId)){
        throw new apiError(400, "Invalid playlist ID.")
    }
    const user = req.user?._id
    if(!user){
        throw new apiError(401, "Unauthorized. Please login to delete the playlist.")
    }
    const playlist = await Playlist.findById(playlistId)
    if(!playlist){
        throw new apiError(404, "Playlist not found")
    }
    if(!(playlist.owner.toString() === user.toString())){
        // Fixed: Proper HTTP status code
        throw new apiError(403, "User not authorized to delete this playlist.")
    }
    await playlist.deleteOne()
    return res.status(200).json(
        new apiResponse(
            200,
            {},
            "Playlist deleted successfully."
        )
    )
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    if(!isValidObjectId(playlistId)){
        throw new apiError(400, "Invalid playlist ID.")
    }
    const {name, description} = req.body
    if(!name?.trim() && !description?.trim()){
        throw new apiError(400, "At least one field (name or description) is required to update the playlist.")
    }
    const user = req.user?._id
    if(!user){
        throw new apiError(401, "Unauthorized. Please login to update the playlist.")
    }
    const playlist = await Playlist.findById(playlistId)
    if(!playlist){
        throw new apiError(404, "Playlist not found")
    }
    if(!(playlist.owner.toString() === user.toString())){
        throw new apiError(403, "User not authorized to update this playlist.")
    }
    const updateData = {}
    if(name?.trim()){
        updateData.name = name.trim()
    }
    if(description?.trim()){
        updateData.description = description.trim()
    }
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        updateData,
        { new: true }
    ).populate("owner", "fullName userName avatar")
     .populate("videos", "title description thumbnail views duration")
    if(!updatedPlaylist){
        throw new apiError(500, "Failed to update playlist")
    }
    return res.status(200).json(
        new apiResponse(
            200,
            { playlist: updatedPlaylist },
            "Playlist updated successfully."
        )
    )
})

export { createPlaylist, getUserPlaylists, getPlaylistById, addVideoToPlaylist, removeVideoFromPlaylist, deletePlaylist, updatePlaylist }