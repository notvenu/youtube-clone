import { apiError } from "../utils/apiError.util.js"
import { apiResponse } from "../utils/apiResponse.util.js"
import {asyncHandler} from "../utils/asyncHandler.util.js"


const healthcheck = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new apiResponse(
            200,
            {
                status: "OK",
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            },
            "Health check passed"
        )
    )
})

export { healthcheck }
    