import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

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
     console.error(error);
    console.error(error.message);
    console.error(error.http_code);
    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    return null;
  }
};


const RemoveFromCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    //upload the file on cloudinary
    const response = await cloudinary.uploader.destroy(localFilePath);
    return response;
  }
  catch (error) {
    // fs.unlinkSync(localFilePath)//remove the locally saved temporary file as the upload operation got failed.
    return null;
  }
}





async function uploadHLSFolderToCloudinary(folderPath, lessonId) {

  try{

  const files = fs.readdirSync(folderPath);


  const uploadedFiles = [];

  // 1. Upload .ts files first
  for (const file of files) {
    if (file.endsWith(".ts")) {
      const filePath = path.join(folderPath, file);
      const result = await cloudinary.uploader.upload(filePath, {
        folder: `courses/${lessonId}`,
        resource_type: "video",
        use_filename: true,
        unique_filename: false
      });
      uploadedFiles.push(result.secure_url);
    }
  }

  // 2. Update .m3u8 file with Cloudinary URLs
  const m3u8File = files.find(f => f.endsWith(".m3u8"));
     if (!m3u8File) {
      console.error("❌ No .m3u8 file found!");
      return;
    }
    const m3u8Path = path.join(folderPath, m3u8File);
    let content = fs.readFileSync(m3u8Path, "utf-8");


    uploadedFiles.forEach(url => {
      const tsFileName = path.basename(url);
      const regex = new RegExp(tsFileName, "g"); // replace all matches
      content = content.replace(regex, url);
    });

    fs.writeFileSync(m3u8Path, content);


    // 3. Upload updated .m3u8
    const result = await cloudinary.uploader.upload(m3u8Path, {
      folder: `courses/${lessonId}`,
      resource_type: "raw", // m3u8 is a text file
      use_filename: true,
      unique_filename: false
    });

    uploadedFiles.push(result.secure_url);
  

  return uploadedFiles;
  }
  catch (err) {
    console.error("❌ Error uploading HLS folder:", err);
  }
}





export { UploadOnCloudinary, RemoveFromCloudinary, uploadHLSFolderToCloudinary };