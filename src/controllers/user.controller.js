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

export { registerUser, loginUser, logoutUser, refreshAccessToken }