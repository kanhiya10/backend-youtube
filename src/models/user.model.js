import mongoose,{Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema=new Schema(
    {
    username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
    },
    fullName:{
        type:String,
        required:true,
        lowercase:true,
        index:true,
    },
    avatar:{
        type:String,// cloudinary url
        required:true,  
    },
    coverImage:{
            type:String,// cloudinary url
    },
    watchHistory:[
        {
            type:Schema.Types.ObjectId,
            ref:'Video',
        }
    ],
    password:{
        type:String,
        required:[true,'Password is required'],
    },
    refreshToken:{
        type:String,
    }


},{timestamps:true}
)

//this is the middleware which is used to perform actions before a document is saved to the database. 
//This particular middleware is set up to hash a user's password before saving it to the database.
userSchema.pre("save",async function (next){
    if(!this.isModified("password")) return next();

    console.log(this.password);
    this.password=await bcrypt.hash(this.password,10);//bcrypt encrypts the password
    next();
})


//The code allows you to compare a plain text password with a hashed password stored in the database. 
userSchema.methods.isPasswordCorrect=async function(password){
    return await bcrypt.compare(password,this.password);
}

userSchema.methods.generateAccessToken=function(){
    return jwt.sign({
        _id:this.id,
        email:this.email,
        username:this.username,
        fullName:this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY,
    }
)
}


userSchema.methods.generateRefreshToken=function(){

    return jwt.sign({
        _id:this.id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn:process.env.REFRESH_TOKEN_EXPIRY,
    }
)
    
}
export const User=mongoose.model("User",userSchema);