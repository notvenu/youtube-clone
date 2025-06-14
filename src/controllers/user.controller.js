import { asyncHandler } from "../utils/asyncHandler.util.js"
import { apiError } from "../utils/apiError.util.js"
import { apiResponse } from "../utils/apiResponse.util.js"
import { User } from "../models/user.model.js"
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.util.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

//Generate Access and Refresh Token
const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        if (!user) {
            throw new apiError(404, "User not found for token generation")
        }
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}

    } catch (error) {
        throw new apiError(500, "Something went wrong while generating referesh and access token")
    }
}

//User Registration
const registerUser = asyncHandler(async (req, res) => {
    const { userName, fullName, email, password } = req.body
    // Check for empty fields
    if ([userName, email, fullName, password].some((field) => field?.trim() === "")) {
        throw new apiError(400, "All fields are required")
    }
    // Username: alphanumeric, 3–20 chars
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
    if (!usernameRegex.test(userName)) {
        throw new apiError(400, "Username must be alphanumeric and 3-20 characters long")
    }
    // Full name: letters and spaces only
    const fullNameRegex = /^[a-zA-Z ]{3,50}$/
    if (!fullNameRegex.test(fullName)) {
        throw new apiError(400, "Full name must contain only letters and spaces")
    }
    // Email: standard pattern
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
        throw new apiError(400, "Invalid email format")
    }
    // Password: at least 6 characters, includes number and letter
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,}$/
    if (!passwordRegex.test(password)) {
        throw new apiError(400, "Password must be at least 6 characters and include at least one letter and one number")
    }
    //Checking User Existance
    const existedUser = await User.findOne({
        $or: [{ userName }, { email }]
    })
    if (existedUser){
        throw new apiError(409, "User with this username or email already exists")
    }
    //Uploading and checking Avatar and CoverImage
    const avatarLocalPath = req.files && req.files.avatar && req.files.avatar[0] && req.files.avatar[0].path;
    const coverImageLocalPath = req.files && req.files.coverImage && req.files.coverImage[0] && req.files.coverImage[0].path;
    
    const avatar = avatarLocalPath 
        ? await uploadOnCloudinary(avatarLocalPath)
        : { url: "" }
    const coverImage = coverImageLocalPath
        ? await uploadOnCloudinary(coverImageLocalPath)
        : { url: "" }
    
    //Creating User and Adding to DB
    const user = await User.create({
        userName,
        fullName,
        avatar: avatar.url || "",
        coverImage: coverImage.url || "",
        email,
        password,
    })
    //Checking User creation
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken -watchHistory"
    )
    if(!createdUser){
        throw new apiError(500, "User creation failed")
    }
    //Sending Succesfull User Creation
    return res.status(201).json(
        new apiResponse(200, createdUser, "User created successfully")
    )
})

//User Login
const loginUser = asyncHandler(async (req, res) =>{
    const {email, userName, password} = req.body
    console.log(email);
    if (!(userName || email)) {
        throw new apiError(400, "username or email is required")
    }
    const user = await User.findOne({
        $or: [{userName}, {email}]
    })
    if (!user) {
        throw new apiError(404, "User does not exist")
    }
   const isPasswordValid = await user.isPasswordCorrect(password)
   if (!isPasswordValid) {
    throw new apiError(401, "Invalid user credentials")
    }
   const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    const options = {
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new apiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )
})

//User Logout
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(
        new apiResponse(200, null, "User logged out successfully")
    )
})

//Refreshing Access Token
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new apiError(401, "Unauthorized Request")
    }
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
        )
        const user = await User.findById(decodedToken._id)
        if(!user){
            throw new apiError(401, "Invalid refresh token.")
        }
        if(incomingRefreshToken !== user?.refreshToken) {
            throw new apiError(401, "Refresh token is expired or invalid.")
        }
        const options = {
            httpOnly: true,
            secure: true
        }
        const {accessToken, refreshToken: newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
        return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", newRefreshToken, options).json (
            new apiResponse (
                200,
                {
                    accessToken,
                    refreshToken: newRefreshToken
                },
                "Access token refreshed successfully."
            )
        )
    } catch (error) {
        console.error("Error refreshing access token:", error)
        throw new apiError(401, "Invalid refresh token.")
    }
})

//Update Password
const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {oldPassword, newPassword, confirmPassword} = req.body
    if( !oldPassword || !newPassword || !confirmPassword) {
        throw new apiError(400, "All fields are required.")
    }
    if(newPassword !== confirmPassword) {
        throw new apiError(400, "New password and confirm password do not match.")
    }
    if(newPassword === oldPassword) {
        throw new apiError(400, "New password cannot be the same as old password.")
    }
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,}$/
    if (!passwordRegex.test(newPassword)) {
        throw new apiError(400, "Password must be at least 6 characters and include at least one letter and one number")
    }
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new apiError(400, "Invalid old password.")
    }
    user.password = newPassword
    await user.save({validateBeforeSave: false})
    return res.status(200).json(
        new apiResponse(
            200,
            {},
            "Password changed successfully."
        ))
})

//Search User
const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select("-password -refreshToken -watchHistory")
    if (!user) {
        throw new apiError(404, "User not found")
    }
    return res.status(200).json(
        new apiResponse(200, user, "Current user fetched successfully")
    )
})

//Update Text User Data
const updateAccountDetails = asyncHandler(async (req, res) => {
    const {fullName, email, userName} = req.body
    if( !(fullName || email || userName) ) {
        throw new apiError(400, "At least one field is required to update")
    }

    // Check if email or username already exists (if they're being updated)
    if (email && email !== req.user.email) {
        const emailExists = await User.findOne({ email })
        if (emailExists) {
            throw new apiError(409, "Email already exists")
        }
    }
    
    if (userName && userName !== req.user.userName) {
        const userNameExists = await User.findOne({ userName })
        if (userNameExists) {
            throw new apiError(409, "Username already exists")
        }
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName || req.user.fullName,
                email: email || req.user.email,
                userName: userName || req.user.userName
            }
        },
        {new: true}
    ).select("-password -refreshToken -watchHistory")
    
    if (!user) {
        throw new apiError(404, "User not found")
    }
    return res.status(200).json(
        new apiResponse(200, user, "User details updated successfully")
    )
})

//Update Avatar
const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath) {
        throw new apiError(400, "Avatar image is required.")
    }
    // Delete old avatar if exists
    if (req.user?.avatar) {
        try {
            await deleteFromCloudinary(req.user.avatar)
        } catch (error) {
            console.error("Error deleting old avatar:", error)
        }
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new apiError(400, "Avatar image upload failed.")
    }
    
    const updatedUser = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                avatar: avatar?.url
            }
        },
        {new: true}
    ).select("-userName -fullName -email -password -refreshToken -watchHistory")

    return res.status(200).json(
        new apiResponse(
            200, 
            updatedUser, 
            "User avatar updated successfully"
        )
    )
})

//Update CoverImage
const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath) {
        throw new apiError(400, "Cover image is required.")
    }
    // Delete old cover image if exists
    if (req.user?.coverImage) {
        try {
            await deleteFromCloudinary(req.user.coverImage)
        } catch (error) {
            console.error("Error deleting old cover image:", error)
        }
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url){
        throw new apiError(400, "Cover image upload failed.")
    }
    
    const updatedUser = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                coverImage: coverImage?.url
            }
        },
        {new: true}
    ).select("-password -refreshToken -watchHistory")
    
    return res.status(200).json(
        new apiResponse(
            200, 
            updatedUser, 
            "User cover image updated successfully"
        )
    )
})

//Delete Avatar
const deleteUserAvatar = asyncHandler(async(req, res) => {
    if(!req.user?.avatar) {
        throw new apiError(404, "Avatar not found")
    }
    try {
        await deleteFromCloudinary(req.user?.avatar)
    } catch (error) {
        throw new apiError(500, "Error deleting avatar from cloud storage")
    }
    
    const updatedUser = await User.findByIdAndUpdate(req.user?._id,
        {
            $unset: {
                avatar: ""
            }
        },
        {new: true}
    ).select("-password -refreshToken -watchHistory")
    
    return res.status(200).json(
        new apiResponse(
            200, 
            updatedUser, 
            "User avatar deleted successfully."
        )
    ) 
})

//Delete User Cover Image
const deleteUserCoverImage = asyncHandler(async(req, res) => {
    if(!req.user?.coverImage) {
        throw new apiError(404, "Cover Image not found")
    }
    try {
        await deleteFromCloudinary(req.user?.coverImage)
    } catch (error) {
        throw new apiError(500, "Error deleting cover image from cloud storage")
    }
    
    const updatedUser = await User.findByIdAndUpdate(req.user?._id,
        { 
            $unset: { 
                coverImage: "" 
            } 
        },
        { new: true }
    ).select("-password -watchHistory -refreshToken")

    return res.status(200).json(
        new apiResponse(
            200, 
            updatedUser, 
            "User cover image deleted successfully."
        )
    ) 
})

//Get user profile , subscriberscount and subscribedto count
const getUserChannelProfile = asyncHandler(async (req, res) => {
    const {userName} = req.params
    if(!userName?.trim()){
        throw new apiError(400, "Username is required")
    }
    const channel = await User.aggregate([
        {
            $match: {
                userName: userName?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        }, 
        {
           $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                userName: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1
            }
        }
    ])
    if(!channel?.length) {
        throw new apiError(404, "Channel not found.")
    }
    return res.status(200).json(
        new apiResponse(200, channel[0], "Channel profile fetched successfully.")
    )
})

//Get User Watch History
const getUserWatchHistory =  asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        userName: 1,
                                        avatar: 1,
                                        subscribersCount: 1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner",
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).json(
        new apiResponse(200, user[0]?.watchHistory || [], "User watch history fetched successfully.")
    )
})

const deleteUserAccount = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user?._id)
    if (!user) {
        throw new apiError(404, "User not found")
    }
    
    // Delete avatar if exists
    if (user.avatar) {
        try {
            await deleteFromCloudinary(user.avatar)
        } catch (error) {
            console.error("Error deleting avatar from cloud storage:", error)
        }
    }
    
    // Delete cover image if exists
    if (user.coverImage) {
        try {
            await deleteFromCloudinary(user.coverImage)
        } catch (error) {
            console.error("Error deleting cover image from cloud storage:", error)
        }
    }
    
    await user.deleteOne()

    return res.status(200).json(
        new apiResponse(
            200,
            {},
            "User account deleted successfully."
        )
    )
})

export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, deleteUserAvatar, deleteUserCoverImage, getUserChannelProfile, getUserWatchHistory, deleteUserAccount }