import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';

const videoSchema=new Schema(
    {
   videoFile:{
        type:String,
        required:true,
    },
    thumbnail:{
        type:String,
        required:true,
    },
    title:{
        type:String,
        required:true,
    },
    description:{
        type:String,// cloudinary url
        required:true,  
    },
    duration:{
        type:Number,
        required:true,
    },
    views:{
            type:Number,
            default:0,
        },
    isPublished:{
        type:Boolean,
        default:true,
    },
      visibility: {
        type: String,
        enum: ["public", "members"],
        default: "public"
    },
    owner:{
        type:Schema.Types.ObjectId,
        ref:'User'
    },
    likedBy: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      dislikedBy: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      ],


},{timestamps:true}
)

videoSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'video'
});

videoSchema.set('toObject', { virtuals: true });
videoSchema.set('toJSON', { virtuals: true });



videoSchema.plugin(mongooseAggregatePaginate);
export const Video=mongoose.model("Video",videoSchema);