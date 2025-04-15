import winston from 'winston';
import dotenv from 'dotenv';
dotenv.config();

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.errors({stack : true }),
        winston.format.simple(),
    ),
    defaultMeta:{service :"identify-service"},
    transports: [
        new winston.transports.Console(
            winston.format.timestamp(),
            winston.format.splat(),
            winston.format.colorize()
        ),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
})

export default logger;