import { v2 as cloudinary } from "cloudinary"
import fs from "fs"

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
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
        fs.unlinkSync(localFilePath)
        return response
    } catch (error) {
        fs.unlinkSync(localFilePath) //Removing Local File
        console.error("Error uploading file to Cloudinary:", error)
        return null
    }
}

const deleteFromCloudinary = async (cloudUrl) => {
    try {
        if (!cloudUrl) return null
        const publicId = cloudUrl.split('/').pop().split('.')[0];
        const response = await cloudinary.uploader.destroy(publicId, {
            resource_type: "auto",
        });
        return response.result === 'ok' ? true : false;
    } catch (error) {
        console.error("Error deleting file from Cloudinary:", error)
        return false
    }
}

export { uploadOnCloudinary, deleteFromCloudinary }