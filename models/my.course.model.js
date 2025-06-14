import { Schema, model } from "mongoose";

const myCourseSchema = new Schema(
  {
    userId: {
      type: String,
      required: [true, "user id is required to store user course progress"],
      unique: [true, "user id must be unique"],
    },
    myPurchasedCourses: [
      {
        courseId: {
          type: String,
          required: true,
        },
        lectureProgress: [
          {
            lectureId: {
              type: String,
              required: true,
            },
            marked: {
              type: Boolean,
              default: false,
            },
            notes: [
              {
                type: String,
                maxlength: [200, "write note less than 200 character"],
                trim: true,
              },
            ],
          },
        ],
        quizScores: [
          {
            quizId: {
              type: String,
              required: true,
            },
            score: {
              // Points obtained by the user in this quiz attempt
              type: Number,
              required: true,
              default: 0,
            },
            totalPoints: {
              // Total possible points for the quiz
              type: Number,
              required: true,
            },
            submittedAt: {
              type: Date,
              default: Date.now,
            },
            // Optionally, you could store user's answers for review
            // userAnswers: [
            //   {
            //     questionId: String,
            //     submittedAnswer: String,
            //     isCorrect: Boolean,
            //   }
            // ],
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

const MyCourse = model("MyCourse", myCourseSchema);

export default MyCourse;
