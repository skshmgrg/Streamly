import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";

const app = express()

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({limit:"16kb"}))            // Parse JSON bodies (max 16kb) (like we use it to read data in form of json that we send in post requests)
app.use(express.urlencoded({extended:true,limit:"16kb"})) // Parse URL-encoded bodies (max 16kb)
app.use(express.static("public"))                // Serve static files from "public/"
app.use(cookieParser())                          // Parse cookies and attach to req.cookies

//routes import

import userRouter from './routes/user.routes.js'

//routes declaration

app.use("/api/v1/users",userRouter)

// http://localhost:8000/api/v1/users


export default app;




// app.get("/",(req,res)=>{
//     res.status(200).json({
//         success:true,
//         message:"Welcome to the Chai and Backend API"
//     })
// })