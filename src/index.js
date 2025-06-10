import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { DB_NAME } from "./constants.js";
dotenv.config({
    path: './.env'
});
const startServer = async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB connection established");
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
  }
};

startServer();
