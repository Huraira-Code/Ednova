import Announcement from "../models/announcement.model.js";


/**
 * @desc    Create a new announcement
 * @route   POST /api/announcements
 * @access  Private (You should protect this route with authentication middleware)
 */
export const createAnnouncement = async (req, res) => {
  // 1. Destructure the expected fields from the request body
  const { title, content, announcementCategory } = req.body;

  // 2. Basic validation to ensure required fields are present
  if (!title || !content || !announcementCategory) {
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields: title, content, and announcementCategory.",
    });
  }

  try {
    // 3. Create a new announcement instance
    const newAnnouncement = new Announcement({
      title,
      content,
      announcementCategory,
    });

    // 4. Save the new announcement to the database
    const savedAnnouncement = await newAnnouncement.save();

    // 5. Respond with the created announcement and a success message
    res.status(201).json({
      success: true,
      message: "Announcement created successfully.",
      data: savedAnnouncement,
    });
  } catch (error) {
    // 6. Comprehensive error handling
    if (error.name === "ValidationError") {
      // Handle Mongoose validation errors (e.g., enum mismatch, maxlength exceeded)
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: messages,
      });
    }

    // Handle other potential errors (e.g., database connection issues)
    console.error("Error creating announcement:", error); // Log the error for debugging
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
export const getAllAnnouncements = async (req, res) => {
  try {
    // 1. Fetch all announcements from the database
    // 2. Sort the results to show the most recent announcements first
    const announcements = await Announcement.find({}).sort({ createdAt: -1 });

    // 3. Respond with the count and the data
    res.status(200).json({
      success: true,
      count: announcements.length,
      data: announcements,
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


