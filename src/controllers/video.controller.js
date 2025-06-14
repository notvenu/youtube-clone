import { asyncHandler } from "../utils/asyncHandler.util.js"
import { apiError } from "../utils/apiError.util.js"
import { apiResponse } from "../utils/apiResponse.util.js"
import { Video } from "../models/video.model.js"
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.util.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

const uploadVideo = asyncHandler(async (req, res) => {

})

export { uploadVideo }