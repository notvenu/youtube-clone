import { APP_VERSION } from "../constants.js";
import { apiResponse } from "../utils/apiResponse.util.js";
import { asyncHandler } from "../utils/asyncHandler.util.js";
import { formatDuration } from "../utils/formatDuration.util.js";

export const healthcheck = asyncHandler(async (req, res) => {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    const env = process.env.NODE_ENV || "";
    const version = APP_VERSION || "";

    const data = {
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: formatDuration(uptime),
        memory: {
            rss: memoryUsage.rss,
            heapTotal: memoryUsage.heapTotal,
            heapUsed: memoryUsage.heapUsed,
            external: memoryUsage.external,
        },
        env,
        version,
    };

    res.status(200).json(
        new apiResponse(
            200,
            "Health check passed",
            data
        )
    );
});
