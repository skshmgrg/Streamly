import { Router } from "express";
import { loginUser ,logoutUser, registerUser ,refreshAccessToken} from "../controllers/user.controller.js";
import { upload } from '../middlewares/multer.middleware.js'
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router=Router()
//added middleware of multer (named upload), .fields is used to upload multiple files
router.route('/register').post(
    // before register , we insert a middleware of file upload
    // middleware in most cases adds more fields to the request 
    // multer will give us access to req.files here , when we are handling images in registerUser
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser)
// router.route('/login').post(login)

router.route('/login').post(loginUser)

//secured routes
router.route("/logout").post(verifyJWT,logoutUser)
router.route("/refresh-token").post(refreshAccessToken)

export default router