import User from "../Model/userModel.js";
import logger from "../Utils/logger.js";
import dotenv from 'dotenv';
dotenv.config();
import generateOtp from "../Utils/generateotp.js";
import {StatusCodes} from 'http-status-codes'
import cloudinary from '../Config/cloudnary.js';
import transporter from '../Config/nodemailer.js';
import bcrypt from 'bcryptjs';
import getdatauri from '../Utils/datauri.js';
import { AccessToken, RefreshToken } from "../Middleware/generateToken.js";


const UserController = {
    register : async (req, res) => {
        try {
            const {fname, lname, email, password, role } = req.body;
            if(!fname ||!lname ||!email ||!password ||!role) {
                logger.warn("Missing required fields");
                return res.status(StatusCodes.BAD_REQUEST).json({ message: "Missing required fields", success : false });
            }
            const exitingUser = await User.findOne({email});
            if(exitingUser) {
                logger.warn("Email already exists");
                return res.status(StatusCodes.CONFLICT).json({ message: "Email already exists", success : false });
            }
            let profilephotourl = null;
            const file = req.file;
            if(file){
                const parser = getdatauri(file);
                const cloudResponse = await cloudinary.uploader.upload(parser.content,{
                    folder:"users-jobportal-finally"
                })
                profilephotourl = cloudResponse.secure_url;
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = new User({
                fname,
                lname,
                email,
                password: hashedPassword,
                role,
                profile:{
                    profilePhoto: profilephotourl
                }
            })
            await user.save();
            logger.info("User registered successfully");

            res.status(StatusCodes.ACCEPTED).json({ message: "User registered successfully", success : true, user });

        } catch (error) {
            logger.error(error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Internal Server Error", success : false });
        }
    },
    login : async (req, res) => {
        try {
            const {email, password, role} = req.body;
            if(!email ||!password ||!role) {
                logger.warn("Missing required fields");
                return res.status(StatusCodes.BAD_REQUEST).json({ message: "Missing required fields", success : false });
            }
            let user = await User.findOne({email});
            if(!user) {
                logger.warn("User not found");
                return res.status(StatusCodes.CONFLICT).json({ message: "User not found", success : false });
            }
            const isMatch = await bcrypt.compare(password, user.password);
            if(!isMatch) {
                logger.warn("Invalid credentials");
                return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid credentials", success : false });
            }
            if(role !== user.role){
                logger.warn("Invalid role");
                return res.status(StatusCodes.GONE).json({ message: "Invalid role", success : false });
            }
            if(user.isstatus === 'inactive'){
                logger.warn("User is inactive kindly contact admin");
                return res.status(StatusCodes.BAD_REQUEST).json({ message: "User is inactive kindly contact admin", success : false });
            }
            const accesstoken = await AccessToken(user._id);
            const refreshtoken = await RefreshToken(user._id);
            await User.updateOne({id: user._id},{
                $set:{
                    lastLogin: new Date()
                }
            })
            const cookieOptions = {
                httpOnly : true,
                sameSite :"lax",
                secure : process.env.NODE_ENV === 'production',
            }
            res.cookie('accesstoken', accesstoken, cookieOptions);
            res.cookie('refreshtoken', refreshtoken, cookieOptions);
            res.status(StatusCodes.ACCEPTED).json({
                message: `welcome back to ${user.fname} to ${user.lname}`,
                success : true,
                user,
                accesstoken,
                refreshtoken
            })
        } catch (error) {
            logger.error(error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Internal Server Error", success : false });
        }
    },
    updateprofile : async (req, res) => {
        try {
            const {fname, lname, email, bio, phone, skills, location, education, experience, projects} = req.body;
            const userId = req.user;
            const user = await User.findById(userId);
            if(!user){
                logger.warn("User not found");
                return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found", success : false });
            }
            let resumeurl = null;
            let originialname = null;
            const file = req.file;
            if(file){
                const parser = getdatauri(file);
                const cloudResponse = await cloudinary.uploader.upload(parser.content,{
                    folder:"users-jobportal-finally"
                })
                resumeurl = cloudResponse.secure_url;
                originialname = file.originialname;
            }
            let skillsArray = skills? skills.split(',') : [];
            let locationArray = location? location.split(',') : [];
            let educationArray = education? education.split(',') : [];
            let projectArray = projects? projects.split(',') : [];
            if(!user.isstatus){
                logger.warn("User is inactive kindly contact admin");
                return res.status(StatusCodes.BAD_REQUEST).json({ message: "User is inactive kindly contact admin", success : false });
            }
            
            if(fname)user.fname = fname;
            if(lname)user.lname = lname;
            if(email)user.email = email;
            if(bio)user.profile.bio = bio;
            if(phone)user.phone = phone;
            if(skillsArray.length>0)user.profile.skills = skillsArray;
            if(locationArray.length>0)user.profile.location = locationArray;
            if(educationArray.length>0)user.profile.education = educationArray;
            if(experience)user.profile.experience = experience;
            if(projectArray.length>0)user.profile.projects = projectArray;
            if(resumeurl)user.profile.resume = resumeurl;
            if(originialname)user.profile.resume = originialname;

            await user.save();
            logger.info("User profile updated successfully");

            return res.status(StatusCodes.ACCEPTED).json({ message: "User profile updated successfully", success : true, user });
            
        } catch (error) {
         logger.error(error);
         res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Internal Server Error", success : false });   
        }
    },
    forgotpassword : async (req, res) => {
        try {
            const { email } = req.body;
            if (!email) {
                logger.warn("Missing required fields");
                return res.status(StatusCodes.BAD_REQUEST).json({ message: "Missing required fields", success: false });
            }
    
            const user = await User.findOne({ email });
            if (!user) {
                logger.warn("User not found");
                return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found", success: false });
            }
    
            const otp = await generateOtp();
            user.forgot_password_otp = otp;
            user.forgot_password_expiry_date = new Date(Date.now() + 10 * 60 * 1000); // expires in 10 minutes
            await user.save();
    
            const mailOptions = {
                from: process.env.NODEMAILER_USER,
                to: email,
                subject: "Reset Password",
                text: `Your One Time Password (OTP) is ${otp}. It will expire in 10 minutes.`
            };
    
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    logger.error("Error sending OTP email:", error);
                    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Failed to send email", success: false });
                }
                logger.info("Password reset OTP sent successfully to", email);
                return res.status(StatusCodes.OK).json({ message: "Password reset OTP sent successfully", success: true });
            });
    
        } catch (error) {
            logger.error(error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Internal Server Error", success: false });
        }
    },
    verfiypassword : async (req, res) => {
        try {
            const { email, otp } = req.body;
            if (!email || !otp) {
                logger.warn("Missing required fields");
                return res.status(StatusCodes.BAD_REQUEST).json({ message: "Missing required fields", success: false });
            }
    
            const user = await User.findOne({ email });
            if (!user) {
                logger.warn("User not found");
                return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found", success: false });
            }
    
            if (!user.forgot_password_otp || !user.forgot_password_expiry_date) {
                logger.warn("OTP details missing");
                return res.status(StatusCodes.UNAUTHORIZED).json({ message: "OTP not generated or expired", success: false });
            }
    
            if (user.forgot_password_expiry_date < new Date()) {
                logger.warn("Expired OTP");
                return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Expired OTP", success: false });
            }
    
            if (user.forgot_password_otp !== otp) {
                logger.warn("Invalid OTP");
                return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Invalid OTP", success: false });
            }
    
            user.forgot_password_otp = null;
            user.forgot_password_expiry_date = null;
            await user.save();
    
            logger.info("Password reset OTP verified successfully");
            return res.status(StatusCodes.OK).json({ message: "Password reset OTP verified successfully", success: true });
    
        } catch (error) {
            logger.error("Error verifying OTP", error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Internal Server Error", success: false });
        }
    },
    resetpassword : async (req, res) => {
        try {
            const {email, password, confirmpassword} = req.body;
            if(!email ||!password ||!confirmpassword) {
                logger.warn("Missing required fields");
                return res.status(StatusCodes.BAD_REQUEST).json({ message: "Missing required fields", success : false });
            }
            let user = await User.findOne({email});
            if(!user) {
                logger.warn("User not found");
                return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found", success : false });
            }
            if(password!== confirmpassword){
                logger.warn("Passwords do not match");
                return res.status(StatusCodes.BAD_REQUEST).json({ message: "Passwords do not match", success : false });
            }
            user.password = await bcrypt.hash(password, 10);
            await user.save();
            logger.info("Password reset successfully");
            return res.status(StatusCodes.ACCEPTED).json({ message: "Password reset successfully", success : true });
        } catch (error) {
            logger.error(error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Internal Server Error", success : false });
        }
    },
    logout: async (req, res) => {
        try {
            const userId = req.user;
            const user = await User.findById(userId);
            
            if (!user) {
                logger.warn("User not found");
                return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found", success: false });
            }
    
            const cookieOptions = {
                httpOnly: true,
                sameSite: "lax",
                secure: process.env.NODE_ENV === 'production',
            };
    
            res.clearCookie('accesstoken', cookieOptions);
            res.clearCookie('refreshToken', cookieOptions);
    
            logger.info("User logged out successfully");
            return res.status(StatusCodes.OK).json({ message: "User logged out successfully", success: true });
        } catch (error) {
            logger.error(error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Internal Server Error", success: false });
        }
    }
    
}


export default UserController;