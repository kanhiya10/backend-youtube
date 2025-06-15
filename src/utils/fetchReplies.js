import { Comment } from "../models/comment.model.js";


// Recursive function to fetch replies
// export const getCommentWithReplies = async (commentId) => {
//   const comment = await Comment.findById(commentId)
//     .populate("user", "fullName avatar")
//     .lean();

//   if (!comment) return null;

//   const replies = await Comment.find({ parentComment: comment._id })
//     .populate("user", "fullName avatar")
//     .lean();

//   // Recursively fetch replies of replies
//   for (let i = 0; i < replies.length; i++) {
//     replies[i].replies = await getRepliesRecursive(replies[i]._id);
//   }

//   return { ...comment, replies };
// };

// // Just the recursive part
// const getRepliesRecursive = async (commentId, depth = 0, maxDepth = 3) => {
//   if (depth > maxDepth) return [];

//   const replies = await Comment.find({ parentComment: commentId })
//     .populate("user", "fullName avatar")
//     .lean();

//   for (let i = 0; i < replies.length; i++) {
//     replies[i].replies = await getRepliesRecursive(replies[i]._id, depth + 1, maxDepth);
//   }

//   return replies;
// };

export async function getCommentWithReplies(commentId) {
  const comment = await Comment.findById(commentId)
    .populate("user", "fullName avatar") // populate user info
    .populate("likes", "_id") // optional
    .populate("dislikes", "_id")
    .lean();

  if (!comment) return null;

  // console.log('replies:', comment.replies);

  const replies = await Comment.find({ parentComment: comment._id })
    .populate("user", "name")
    .lean();

  comment.replies = await Promise.all(
    replies.map(reply => getCommentWithReplies(reply._id))
  );

  // console.log('comment returned',comment);

  return comment;
}