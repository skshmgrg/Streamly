import mongoose from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { Subscription } from "../models/subscription.models.js";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
  const { userId } = req.params;

  // Step 1: Get user stats via aggregation
  const [userStats] = await User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(userId) } },
    {
      $lookup: {
        from: "videos",
        localField: "_id",
        foreignField: "owner",
        as: "videos",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $addFields: {
        videoCount: { $size: "$videos" },
        subscriberCount: { $size: "$subscribers" },
        videoIds: "$videos._id",
      },
    },
    {
      $project: {
        _id: 1,
        username: 1,
        avatar: 1,
        videoCount: 1,
        subscriberCount: 1,
        videoIds: 1,
      },
    },
  ]);
  
  if (!userStats) {
    throw new ApiError(404, "User not found");
  }

  // Step 2: Count likes on those videos
  const likeCount = await Like.countDocuments({
    video: { $in: userStats.videoIds },
});

  // Step 3: Send response
  const data = {
    _id: userStats._id,
    username: userStats.username,
    avatar: userStats.avatar,
    videoCount: userStats.videoCount,
    subscriberCount: userStats.subscriberCount,
    likeCount,
};

  res
  .status(200)
  .json(new ApiResponse(200, data, "Dashboard stats fetched successfully"));
});


const getChannelVideos = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const skip = (Number(page) - 1) * Number(limit);

  // Step 1: Verify user exists (optional but safer)
  const userExists = await User.exists({ _id: userId });
  if (!userExists) {
    throw new ApiError(404, "User not found");
  }

  // Step 2: Aggregate user's videos with pagination and sort
  const [result] = await User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(userId) } },
    {
      $lookup: {// we are not using standard lookup with local foreign fied as we want operations like soerting and pagination to be done before making an array of seelcted videos
        from: "videos",
        let: { ownerId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$owner", "$$ownerId"] } } },
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: Number(limit) },
          {
            $project: {
              title: 1,
              thumbnail: 1,
              views: 1,
              createdAt: 1,
              description: 1,
              duration: 1
            }
          }
        ],
        as: "videos"
      }
    },
    {
      $project: {
        _id: 0,
        username: 1,
        avatar: 1,
        videos: 1
      }
    }
  ]);

  // Step 3: Response
  res.status(200).json(
    new ApiResponse(200, result?.videos || [], "Videos fetched successfully")
  );
});


export { getChannelStats, getChannelVideos };








