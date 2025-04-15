import mongoose from "mongoose";

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    fname: {
      type: String,
      required: true,
    },
    lname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true, // Ensure emails are unique
      lowercase: true, // Normalize email
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
    },
    refresh_token: {
      type: String,
      default: "",
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    role: {
      type: String,
      default: "user", 
      enum: ["user", "admin"], 
    },
    isstatus: {
      type: String,
      enum: ["active", "inactive", "suspends"],
      default: "active", 
    },
    forgot_password_otp:{
      type: String,
      default: ""
    },
    forgot_password_expiry_date:{
      type: Date
    },
    
    profile: new Schema({
      bio: { type: String },
      location: [{ type: String }],
      skills: [{ type: String }],
      education: [{ type: String }],
      experience: { type: String },
      company:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"company"
      },
      projects: [{ type: String }],
      profilephoto: { type: String, default: "" },
      resume: { type: String, default: "" },
      originialname:{
        type: String,
        default: ""
      }
    }), // Prevents automatic creation of a nested _id
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
