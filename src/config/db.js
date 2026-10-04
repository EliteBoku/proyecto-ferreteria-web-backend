import mongoose from "mongoose";
import { MONGODB_URI } from "./config.js";

export const connectDB = async () => {
  try{
    const db = await mongoose.connect(MONGODB_URI);
    console.log(`MongoDB connected: ${db.connection.host}`);  
  }catch(error){
    console.error('Error connecting to MongoDB', error.message);
    process.exit(1);
  }
}