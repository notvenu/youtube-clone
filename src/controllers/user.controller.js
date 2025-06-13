import { asyncHandler } from "../utils/asyncHandler.util.js"
import { apiError } from "../utils/apiError.util.js"
import { apiResponse } from "../utils/apiResponse.util.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.util.js"
import jwt, { decode } from "jsonwebtoken"

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
    if (!avatarLocalPath) {
        throw new apiError(400, "Avatar image is required");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = coverImageLocalPath
    ? await uploadOnCloudinary(coverImageLocalPath)
    : { url: "" }
    if(!avatar?.url){
        throw new apiError(400, "Avatar image is required")
    }
    //Creating User and Adding to DB
    const user = await User.create({
        userName,
        fullName,
        avatar: avatar.url,
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
            $set: {
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
            process.env.ACCESS_TOKEN_SECRET,
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
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
        return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", newRefreshToken, options).json (
            new apiResponse (
                200,
                {
                    accessToken,
                    newRefreshToken
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
        new apiError(
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
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new apiError(400, "Avatar image upload failed.")
    }
    await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                avatar: avatar?.url
            }
        },
        {new: true}
    ).select("-password -refreshToken -watchHistory")

    return res.status(200).json(
        new apiResponse(
            200, 
            {avatar: avatar.url}, 
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
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url){
        throw new apiError(400, "Cover image upload failed.")
    }
    await User.findByIdAndUpdate(req.user?._id,
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
            {coverImage: coverImage.url}, 
            "User cover image updated successfully"
        )
    )
})

export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage }