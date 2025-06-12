import { asyncHandler } from "../utils/asyncHandler.util.js"
import { apiError } from "../utils/apiError.util.js"
import { apiResponse } from "../utils/apiResponse.util.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.util.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

//Generate Access and Refresh Token
const generateAccessAndRefreshToken = async(userId) => {
    try{
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}
    } catch(error) {
        throw new apiError(500, "Something went wrong while generating tokens")
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
const loginUser = asyncHandler(async (req, res) => {
    //Get Data
    //Check data input is undefined
    //find user
    //check password
    //access token, refresh token generate
    //send cookies
    const {userName, email, password} = req.body
    if(!(userName || email)){
        throw new apiError(400, "Username or email is required")
    }
    const user = await User.findOne({
        $or: [{userName}, {email}]
    })
    if(!user){
        throw new apiError(404, "User does not exist")
    }
    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new apiError(401, "Invalid password")
    }
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)
    const loggedInUser= await User.findById(user._id).select("-password -refreshToken")
    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(
        new apiResponse(
            200,
            {
                user: loggedInUser,
                accessToken,
                refreshToken
            },
            "User logged in successfully"
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
    return res.status(200).clearCookie("accessToken", accessToken).clearCookie("refreshToken", refreshToken).json(
        new apiResponse(200, null, "User logged out successfully")
    )
})

export { registerUser, loginUser, logoutUser }