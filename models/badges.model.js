import { Schema, model } from "mongoose";

const badgesSchema = new Schema(
  {
    title: {
      type: String,
      required: [true],
      trim: true,
      maxlength: [50, "Title cannot be more than 200 characters."],
    },
    content: {
      type: String,
      required: [true, "Content content is required."],
      maxlength: [200, "Title cannot be more than 200 characters."],
    },
    BadgesUrl: {
      type: String,
    },
    XP: {
      type: Number,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps
  }
);

const Badges = model("Badges", badgesSchema);

export default Badges;
