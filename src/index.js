import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: './.env'
});

const startServer = () => {
  connectDB()
  .then(() => {
    app.on("error", (error) => {
        console.log(`❌ Server error: ${error.message}`);
        process.exit(1);
    });
    app.listen(process.env.PORT, () => {
        console.log(`Server is live at port : ${process.env.PORT}`);
    });
  })
  .catch((error) => {
      console.error(`❌ Failed to connect to the database: ${error.message}`);
      process.exit(1);
  });
};

startServer();
