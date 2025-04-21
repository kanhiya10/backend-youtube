import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/temp')
    },
    filename: function (req, file, cb) {
      cb(null, file.fieldname + "-" + uuidv4() + path.extname(file.originalname))
    }
  })
  
  export const upload = multer({ storage, }) 


// "multer".diskStorage: This function creates a storage configuration for storing uploaded files on disk.

// "destination": This function specifies where the uploaded files should be stored. In this case, files will be saved to the ./public/temp directory. The cb function (callback) is called with 
// null for errors and the path to the destination directory.

// "filename": This function specifies the name of the file when it’s saved. Here, it uses the original file name (file.originalname). Again, cb is called with null for errors and the desired filename.



// "multer({ storage })": This creates an instance of the multer middleware with the specified storage configuration. The upload constant can be used as middleware in your Express 
// routes to handle file uploads.