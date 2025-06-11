import cloudinary from "cloudinary";
import dotenv from 'dotenv';
// Load environment variables IMMEDIATELY at the start of the app
dotenv.config();
console.log("thi sis me ", process.env.CLOUD_NAME)
export default cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
  secure: true,
});
