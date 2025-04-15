import express from 'express';
import UserController from '../Controller/userController.js';
import {profilephotoUpload, ResumeUpload} from '../Utils/multer.js'
import { VerifyToken } from '../Middleware/generateToken.js';
const router = express.Router();

router.post('/register', profilephotoUpload, UserController.register);
router.post('/login', UserController.login);
router.post('/update', VerifyToken, ResumeUpload, UserController.updateprofile);
router.post('/forgot-password', UserController.forgotpassword);
router.post('/verfy-password', UserController.verfiypassword);
router.post('/reset-password', UserController.resetpassword);
router.post('/logout', VerifyToken, UserController.logout);

export default router;