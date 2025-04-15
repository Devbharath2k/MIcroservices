import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import HandleCOnnection from "./Config/db.js";
import morgan from "morgan";
import logger from "./Utils/logger.js";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import RedisClient from "ioredis";
import router from "./Router/identify-route.js";

const app = express();
const port = process.env.PORT;
const redis = new RedisClient(process.env.REDIS_URL);

const limter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "middleware",
  points: 10,
  duration: 1,
});

app.use((req, res, next) => {
  limter
    .consume(req.ip)
    .then(() => next())
    .catch(() => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({ success: false, message: "Too many requests" });
    });
});

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    optionsSuccessStatus: 200,
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

const sensitiveEndpointsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ success: false, message: "Too many requests" });
  },
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
});

app.use("/api/v1/register", sensitiveEndpointsLimiter);
app.use("/api/v1/login", sensitiveEndpointsLimiter);
app.use("/api/v1/update", sensitiveEndpointsLimiter);
app.use("/api/v1/forgot-password", sensitiveEndpointsLimiter);
app.use("/api/v1/verify-password", sensitiveEndpointsLimiter);
app.use("/api/v1/reset-password", sensitiveEndpointsLimiter);
app.use("/api/v1/logout", sensitiveEndpointsLimiter);

app.use("/api/v1", router);

app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
  HandleCOnnection();
});
