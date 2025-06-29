import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from '../models/user.models.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/ApiResponse.js";
import { application, response } from "express";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens=async(userId)=>{
    try{
        const user=await User.findById(userId);
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken;
        await user.save({validateBeforeSave:false});

        return {accessToken,refreshToken};

    }catch(error)
    {
        throw new ApiError(500,"something went wrong while generating access and refresh tokens");
    }
}


const registerUser = asyncHandler(async (req,res) =>{
    // res.status(200).json({
    //     message:"ok"
    // })
    //get user data from frontend
    //validation- not empty
    //check if user already exists:username,email
    //check for images
    //check for avatar
    //upload them on cloudinary,avatar
    //create user object of user
    //create entry in db
    //remove password and refresh token field from response
    //check for user creation
    //return res
    
    const {fullName , email ,username ,password}= req.body;
    
    // console.log(req)
    if (
        [fullName,email,username,password].some((field)=>
        field?.trim()==="")
    )
    {
        throw new ApiError(400,"All fields are required")
    }

    const existedUser=await User.findOne({
        $or:[{username},{email}]
    })
    
    if(existedUser)
    {
        throw new ApiError(409,"user with this email or username already exists")
    }
    console.log(req.files)

    const avatarLocalPath=req.files?.avatar?.[0]?.path;
    const coverImageLocalPath=req.files?.coverImage?.[0]?.path;

    // if(req.files && )

    //these local paths may be there or may not be there

    if(!avatarLocalPath)
    {
        throw new ApiError(400,"Avatar file is required");
    }
    
    //upload on cloudinary
    
    const avatar=await uploadOnCloudinary(avatarLocalPath);
    // console.log(avatarLocalPath)
    const coverImage=await uploadOnCloudinary(coverImageLocalPath);
    // console.log(coverImageLocalPath)
    
    if(!avatar)
    {   
       throw new ApiError(400,"Avatar file is required");
    }  

    const user=await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.urln|| "",
        email,
        password,
        username:username.toLowerCase() 

    })
    //_id field is automatically added by mongodb itself
    //.select method has weird syntax
    const createdUser= await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser)
    {
        throw new ApiError(500,"Something went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User Registered Successfully")
    )

})

const loginUser=asyncHandler(async(req,res)=>{
    //req.body->data
    //username or email
    //finduser
    //check password
    //access and refresh token
    //send cookie


    console.log("--- Inside loginUser Controller (Attempting JSON Parsing) ---");
    console.log("Request Headers:", req.headers); // Check 'content-type'
    console.log("Request Body:", req.body);      // This should now show your JSON data
    console.log("--- End Debug ---");

    const {email,username,password}=req.body

    // console.log(req)

    if(!(username||email))
    {
        throw new ApiError(400,"username or email is required")
    }

    const user=await User.findOne({
        $or:[{username},{email}]
    })

    console.log(user);

    if(!user){
        throw new ApiError(404,"user doesnt exist");
    }

    const isPasswordValid=await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials");
    }

    const{accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)

    const loggedInUser=await User.findById(user._id)
    .select("-password -refreshToken")

    const options={
        httpOnly:true,
        secure:true
        //secure true makes the cookie only server modifiable , frontend cant modify it then
    }
    console.log(res);

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,refreshToken
            },
            "User logged in successfully"
        )
    )


})

const logoutUser=asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )

    const options={
        httpOnly:true,
        secure:true
        //secure true makes the cookie only server modifiable , frontend cant modify it then
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged out"))
})


const refreshAccessToken= asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookie.refreshToken||req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized request");
    }
    
    try {
        const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);//this gives us the decoded token
        const user=await User.findById(decodedToken?._id);
    
        if(!user)
        {
            throw new ApiError(401,"Invalid refresh token");
        }
    
        if(incomingRefreshToken!=user?.refreshToken)
        {
            throw new ApiError(401,"Refresh token is expired or used");
        }
    
        const options={
            httpOnly:true,
            secure:true
        }
    
        const {newAccessToken,newRefreshToken}=await generateAccessAndRefreshTokens(user._id);
    
        return res
        .status(200)
        .cookie("accessToken",newAccessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(new ApiResponse(200,{accessToken:newAccessToken,refreshToken:newRefreshToken},"Access token refreshed"));
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token");
    }
})

export {logoutUser,loginUser,registerUser,refreshAccessToken}