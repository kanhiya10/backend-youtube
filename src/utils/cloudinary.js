import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const UploadOnCloudinary = async (localFilePath, transformation = []) => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: 'auto',
      transformation,
    });

    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    return null;
  }
};


const RemoveFromCloudinary= async(localFilePath)=>{
    try{
        if(!localFilePath)return null;
        //upload the file on cloudinary
        const response= await cloudinary.uploader.destroy(localFilePath);
        return response;
    }
    catch(error){
        console.log("error in removing file from cloudinary");
        // fs.unlinkSync(localFilePath)//remove the locally saved temporary file as the upload operation got failed.
        return null;
    }
}

export {UploadOnCloudinary,RemoveFromCloudinary};