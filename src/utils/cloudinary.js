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
    console.log("File uploaded to Cloudinary in utils/cloudinary:", response);

    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
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
    console.log("error in removing file from cloudinary");
    // fs.unlinkSync(localFilePath)//remove the locally saved temporary file as the upload operation got failed.
    return null;
  }
}





async function uploadHLSFolderToCloudinary(folderPath, lessonId) {

  try{

   console.log(`📂 Starting upload for HLS folder: ${folderPath}`);
  const files = fs.readdirSync(folderPath);

   console.log(`Found ${files.length} files:`, files);

  const uploadedFiles = [];

  // 1. Upload .ts files first
  for (const file of files) {
    if (file.endsWith(".ts")) {
      const filePath = path.join(folderPath, file);
       console.log(`⬆️ Uploading: ${filePath}`);
      const result = await cloudinary.uploader.upload(filePath, {
        folder: `courses/${lessonId}`,
        resource_type: "video",
        use_filename: true,
        unique_filename: false
      });
       console.log(`✅ Uploaded ${file} → ${result.secure_url}`);
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

    console.log("📜 Original .m3u8 content:\n", content);

    uploadedFiles.forEach(url => {
      const tsFileName = path.basename(url);
      const regex = new RegExp(tsFileName, "g"); // replace all matches
      console.log(`🔄 Replacing ${tsFileName} in .m3u8 with ${url}`);
      content = content.replace(regex, url);
    });

    fs.writeFileSync(m3u8Path, content);

     console.log("📜 Updated .m3u8 content:\n", content);

    // 3. Upload updated .m3u8
    const result = await cloudinary.uploader.upload(m3u8Path, {
      folder: `courses/${lessonId}`,
      resource_type: "raw", // m3u8 is a text file
      use_filename: true,
      unique_filename: false
    });
    console.log(`✅ Uploaded .m3u8 → ${result.secure_url}`);

    uploadedFiles.push(result.secure_url);
  

  return uploadedFiles;
  }
  catch (err) {
    console.error("❌ Error uploading HLS folder:", err);
  }
}





export { UploadOnCloudinary, RemoveFromCloudinary, uploadHLSFolderToCloudinary };