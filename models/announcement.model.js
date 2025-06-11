import { Schema, model } from "mongoose";


const announcementSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Announcement title is required."],
      trim: true,
      maxlength: [200, "Title cannot be more than 200 characters."],
    },
    content: {
      type: String,
      required: [true, "Announcement content is required."],
    },

    announcementCategory : {
        type : String ,
        enum : ["Technical Issues" , "General Guidance" , "Warning"]
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps
  }
);

const Announcement = model("Announcement", announcementSchema);

export default Announcement;
