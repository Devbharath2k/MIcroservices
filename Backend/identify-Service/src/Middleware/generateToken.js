import jwt from "jsonwebtoken";
import logger from "../Utils/logger.js";
import dotenv from "dotenv";
import User from "../Model/userModel.js";
dotenv.config();

const AccessToken = async (userId) => {
  try {
    const token = jwt.sign({ id: userId }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "1d",
    });
    return token;
  } catch (error) {
    logger.error(error);
    return null;
  }
};

const RefreshToken = async (userId) => {
  try {
    const token = jwt.sign({ id: userId }, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: "1d",
    });
    const updatetoken = await User.updateOne(
      { id: User._id },
      {
        $set: {
          refresh_token: token,
        },
      }
    );
    return token;
  } catch (error) {
    logger.error(error);
    return null;
  }
};

const VerifyToken = async (req, res, next) => {
  try {
    const token = req.cookies.accesstoken || req.headers.authorization?.split(" ")[1];
    if (!token) {
      logger.warn(`no token found`);
      return res
        .status(401)
        .json({ message: "No token provided", success: false });
    }
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    if (!decoded) {
      logger.warn(`invalid token`);
      return res.status(403).json({ message: "Invalid token", success: false });
    }
    req.user = decoded.id;
    next();
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Server error", success: false });
  }
};


export {AccessToken, RefreshToken, VerifyToken };