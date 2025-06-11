import Badges from "../models/badges.model.js";

/**
 * @desc    Create a new announcement
 * @route   POST /api/announcements
 * @access  Private (You should protect this route with authentication middleware)
 */
// import AppError from "../utils/error.util.js"; // Adjust the import path as needed
import cloudinary from "cloudinary";
import fs from "fs/promises"; // Using the promise-based version of fs for async cleanup
import AppError from "../utils/error.utils.js";

export const createBadges = async (req, res, next) => {
  // 1. Destructure the expected fields from the request body
  const { title, content, XP } = req.body;
  console.log(req.body);
  // 2. Basic validation to ensure required fields and file are present
  if (!title || !content || !XP) {
    return next(new AppError("Please provide title, content, and XP.", 400));
  }

  if (!req.file) {
    return next(new AppError("A badge image file is required.", 400));
  }

  // 3. Create a new badge instance (initially without the URL)
  const newBadge = new Badges({
    title,
    content,
    XP,
    BadgesUrl: "", // Will be updated after upload
  });

  try {
    // 4. Upload the file to Cloudinary
    const result = await cloudinary.v2.uploader.upload(req.file.path, {
      folder: "lms/badges", // A dedicated folder for badges
      width: 150,
      height: 150,
      crop: "fill",
      gravity: "face", // Good for profile-like images
    });
    console.log(result);
    if (result) {
      // 5. Update the badge instance with the secure URL from Cloudinary
      newBadge.BadgesUrl = result.secure_url;
      // It's also good practice to save the public_id for future deletions
      // newBadge.public_id = result.public_id; // Uncomment if you have this field in your schema
    }

    // 6. Remove the file from the local server
    await fs.rm(`uploads/${req.file.filename}`);
  } catch (error) {
    // If Cloudinary upload fails, delete the local file and return an error
    await fs.rm(`uploads/${req.file.filename}`);
    console.error("Error during Cloudinary upload:", error);
    return next(
      new AppError("File could not be uploaded, please try again.", 500)
    );
  }
  console.log(newBadge);

  try {
    // 7. Save the new badge with the Cloudinary URL to the database
    const savedBadge = await newBadge.save();
    console.log(savedBadge);
    // 8. Respond with the created badge and a success message
    res.status(201).json({
      success: true,
      message: "Badge created successfully.",
      data: savedBadge,
    });
  } catch (error) {
    // 9. Handle potential database errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: messages,
      });
    }

    console.error("Error creating badge in DB:", error);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred on the server.",
    });
  }
};

//================================================================
// GET ALL ANNOUNCEMENTS
//================================================================
/**
 * @desc    Get all announcements
 * @route   GET /api/announcements
 * @access  Public or Private (depending on your application's needs)
 */
export const getAllBadges = async (req, res) => {
  console.log("abhuf");
  try {
    // 1. Fetch all announcements from the database
    // 2. Sort the results to show the most recent announcements first
    const badges = await Badges.find({}).sort({ createdAt: -1 });

    // 3. Respond with the count and the data
    res.status(200).json({
      success: true,
      data: badges,
    });
  } catch (error) {
    // 4. Handle any potential server errors
    console.error("Error fetching announcements:", error); // Log for debugging
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred on the server.",
    });
  }
};


//================================================================
// DELETE A BADGE
//================================================================
/**
 * @desc    Delete a single badge by its ID
 * @route   DELETE /api/v1/badges/:id
 * @access  Private (Admin only)
 */
export const deleteBadge = async (req, res, next) => {
  const { id } = req.params;

  try {
    const badge = await Badges.findById(id);

    if (!badge) {
      return next(new AppError("Badge not found with this ID", 404));
    }

    // If a public_id exists, delete the image from Cloudinary
    if (badge.public_id) {
      await cloudinary.v2.uploader.destroy(badge.public_id);
    }

    await Badges.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Badge deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting badge:", error);
    return next(new AppError("Failed to delete the badge.", 500));
  }
};