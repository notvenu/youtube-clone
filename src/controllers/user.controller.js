import { asyncHandler } from "../utils/asyncHandler.util.js";

const registerUser = asyncHandler(async (req, res) => {
    res.status(200).json({
        message: "registration successful",
    })
})

export { registerUser }