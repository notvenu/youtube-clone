import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

//Config to access cross origin data
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}))
//File intake Config
app.use(express.json({limit: '16kb'}))
app.use(express.urlencoded({
    extended: true,limit: '16kb'
}))
//To store data publicly avaliable to anyone
app.use(express.static("public"))
//To send and get cookies
app.use(cookieParser())

//Routes Import
import userRouter from './routes/user.route.js'
import healthcheckRouter from "./routes/healthcheck.route.js"
import tweetRouter from "./routes/tweet.route.js"
import subscriptionRouter from "./routes/subscription.route.js"
import videoRouter from "./routes/video.route.js"
import commentRouter from "./routes/comment.route.js"
import likeRouter from "./routes/like.route.js"
import playlistRouter from "./routes/playlist.route.js"
import dashboardRouter from "./routes/dashboard.route.js"

//routes declaration
app.use("/api/v1/healthcheck", healthcheckRouter)
app.use("/api/v1/users", userRouter)
app.use("/api/v1/tweets", tweetRouter)
app.use("/api/v1/subscriptions", subscriptionRouter)
app.use("/api/v1/videos", videoRouter)
app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/likes", likeRouter)
app.use("/api/v1/playlist", playlistRouter)
app.use("/api/v1/dashboard", dashboardRouter)

export { app }