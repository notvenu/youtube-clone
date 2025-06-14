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

//Routes
import userRouter from "./routes/user.route.js"

//Routes Declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/videos", )

export { app }