import mongoose from'mongoose';
import dotenv from 'dotenv';
import logger from '../Utils/logger.js';
dotenv.config();

const Mongodb = process.env.MONGO_URI;

if(!Mongodb){
    logger.warn(`mongodb is connexion string not provided. Please provide it in the.env file.`);
}

const HandleCOnnection = async () => {
    try {
        await mongoose.connect(Mongodb);
        logger.info('MongoDB connected successfully');
    } catch (error) {
        logger.error(`Failed to connect to MongoDB: ${error.message}`);
    }
}

export default HandleCOnnection;