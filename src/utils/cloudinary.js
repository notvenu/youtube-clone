import { v2 as cloudinary } from "cloudinary"
import fs from "fs"

cloudinary.config({ 
    cloud_name: proccess.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try{
        if(!localFilePath) return null
        //Upload the File on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type:"auto",
        })
        console.log("File uploaded successfully:", response.secure_url)
    } catch (error) {
        fs.unlinkSync(localFilePath) //Removing Local File
        console.error("Error uploading file to Cloudinary:", error)
        return null
    }
}

export { uploadOnCloudinary }