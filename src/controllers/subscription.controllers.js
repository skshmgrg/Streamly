import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    const userId=req.user._id;
    if(!mongoose.Types.ObjectId.isValid(userId))
    {
        throw new ApiError(400,"Not a valid user");
    }
    if(!mongoose.Types.ObjectId.isValid(channelId))
    {
        throw new ApiError(400,"Not a valid channel");
    }
    const subscription=await Subscription.findOne({
        channel:channelId,
        subscriber:userId        
    })
    let subscribed;
    if(subscription)
        {
            await subscription.deleteOne();
            subscribed=false;
        }
        else
        {
            await Subscription.create({
                subscriber:userId,
                channel:channelId
            })
            subscribed=true;
        }
        
        return res.status(200).json(new ApiResponse(200,{subscribed},"Toggled subscribe successfully"));

        // TODO: toggle subscription
    })
    
// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
        const {channelId} = req.params
        if(!mongoose.Types.ObjectId.isValid(channelId))
        {
            throw new ApiError(400,"Not a valid channel");
        }
        const subscribers=await Subscription.find({
            channel:channelId
        }).populate({
        path:'subscriber',
        select:'username avatar'
    })
    return res.status(200).json(new ApiResponse(200,subscribers,"Subsriber list fetched successfully"))

})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
    throw new ApiError(400, "Invalid subscriber ID");
  }

  // Find all subscriptions where this user is the subscriber
  const subscriptions = await Subscription.find({ subscriber: subscriberId }).populate({
    path: "channel",
    select: "username avatar"
  });

  // Extract just the populated channel info
  const subscribedChannels = subscriptions.map(sub => sub.channel);

  return res.status(200).json(
    new ApiResponse(200, subscribedChannels, "Subscribed channels fetched successfully")
  );
});


export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}