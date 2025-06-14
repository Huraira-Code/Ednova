import { Schema, model } from "mongoose";

// --- NEW: Define a schema for individual questions ---
const questionSchema = new Schema(
  {
    question: {
      type: String,
      required: [true, "Question text is required"],
      trim: true,
    },
    options: {
      type: [String], // Array of strings for multiple-choice options
      required: [true, "Options are required"],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length >= 2; // Must have at least 2 options
        },
        message: (props) => `${props.path} must contain at least two options!`,
      },
    },
    correctAnswer: {
      type: String, // Stores the exact text of the correct option
      required: [true, "Correct answer is required"],
    },
    points: {
      // Optional: Points awarded for answering this question correctly
      type: Number,
      default: 1,
      min: [0, "Points cannot be negative"],
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt to each question
  }
);

// --- NEW: Define a schema for a quiz, which contains multiple questions ---
const quizSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Quiz title is required"],
      trim: true,
      minLength: [3, "Quiz title must be at least 3 characters long"],
      maxLength: [100, "Quiz title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxLength: [500, "Quiz description cannot exceed 500 characters"],
    },
    questions: [questionSchema], // Array of questions using the questionSchema
    totalPoints: {
      // Derived from sum of question points (can be calculated on the fly or pre-calculated)
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt to each quiz
  }
);

const courseSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "title is required"],
      minLength: [5, "title must be atleast 5 character long"],
      maxLength: [50, "title should be less than 50 character"],
      unique: [true, "title is already given"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "description is required"],
      minLength: [8, "description must be atleast 8 character long"],
      maxLength: [500, "description should be less than 500 character"],
    },
    createdBy: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: [true, "category is required"],
    },
    price: {
      type: Number,
      required: true,
    },
    expiry: {
      type: Number,
      required: true,
    },
    numberOfLectures: {
      type: Number,
      default: 0,
    },
    thumbnail: {
      public_id: {
        type: String,
        required: true,
      },
      secure_url: {
        type: String,
        required: true,
      },
    },
    lectures: [
      {
        name: String,
        description: String,
        lecture: {
          public_id: String,
          secure_url: String,
        },
      },
    ],

    // --- UPDATED: Quizzes array now holds quizSchema objects ---
    quizzes: [quizSchema],
    courseSequence: [
      {
        type: {
          type: String,
          enum: ["video", "quiz"], // Enforce type to be either 'video' or 'quiz'
          required: true,
        },
        contentId: {
          // This will store the _id of the lecture or quiz
          type: Schema.Types.ObjectId,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to ensure correctAnswer is one of the options for each question within each quiz
courseSchema.pre("save", function (next) {
  this.quizzes.forEach((quiz) => {
    quiz.questions.forEach((question) => {
      if (!question.options.includes(question.correctAnswer)) {
        // If the correct answer is not among the options, you might want to throw an error
        // Or handle it by setting correctAnswer to null/first option, depending on business logic
        const err = new Error(
          `Validation Error: Correct answer '${question.correctAnswer}' for question '${question.question}' is not one of the provided options.`
        );
        return next(err); // Pass error to stop saving
      }
    });
  });
  next(); // Continue with saving
});

const Course = model("Course", courseSchema);

export default Course;
