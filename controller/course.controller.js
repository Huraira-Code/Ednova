import cloudinary from "cloudinary";
import fs from "fs";
import Course from "../models/course.model.js";
import asyncHandler from "../middleware/asyncHandler.middleware.js";
import AppError from "../utils/error.utils.js";
import cloudinaryConfig from "../config/cloudinary.config.js";
import User from "../models/user.model.js";
import mongoose from 'mongoose'; // Add this line

/**
 * @CREATE_COURSE
 * @ROUTE @POST
 * @ACCESS admin {{url}}/api/v1/courses/
 */

export const createCourse = asyncHandler(async (req, res, next) => {
  const { title, description, createdBy, category, price, expiry } = req.body;
  console.log(req.body);
  console.log(req.file);
  if (!title || !description || !createdBy || !category || !price || !expiry) {
    if (req.file) fs.rmSync(`tmp/${req.file.filename}`);
    return next(new AppError("all fields are required", 409));
  }
  console.log("c");

  const isCourseExist = await Course.findOne({ title });
  if (isCourseExist) {
    if (req.file) fs.rmSync(`tmp/${req.file.filename}`);
    return next(new AppError("title is already used in another course", 400));
  }
  console.log("b");

  const course = await Course.create({
    title,
    description,
    createdBy,
    category,
    price,
    expiry, // expiry in months
    thumbnail: {
      public_id: title,
      secure_url:
        "https://www.careerguide.com/career/wp-content/tmp/2020/01/coding-programming-working-macbook-royalty-free-thumbnail.jpg",
    },
  });

  if (!course) {
    return next(new AppError("course in not created. please try again", 400));
  }
  console.log("a");
  if (req.file) {
    try {
      console.log("Entering Cloudinary upload block. req.file:", req.file); // Add this new log!
      try {
        const result = await cloudinary.v2.uploader.upload(req.file.path, {
          folder: "lms",
          width: 250,
          height: 200,
        });

        console.log("Cloudinary Upload Result:", result); // Still expecting this eventually
        console.log("mera pareesa");
        if (result) {
          console.log("abc");
          course.thumbnail.public_id = result.public_id;
          course.thumbnail.secure_url = result.secure_url;
        }
        console.log("this is result", result);
        fs.rmSync(`tmp/${req.file.filename}`);
        // ... rest of your code
      } catch (error) {
        console.error("Cloudinary Upload Error (outer catch):", error); // <--- THIS IS THE MOST IMPORTANT LOG TO LOOK FOR!
        // ... rest of your error handling
      }
    } catch (error) {
      for (const file in await fs.readdir(`tmp/`)) {
        await fs.rmSync(`tmp/${file}`);
      }
      return next(new AppError("course thumbnail is not uploaded", 400));
    }
  }

  await course.save();

  res.status(200).json({
    success: true,
    message: "course created successfully",
    course,
  });
});

/**
 * @GET_ALL_COURSES
 * @ROUTE @GET
 * @ACCESS public {{url}}/api/v1/courses
 */

export const getAllCourses = asyncHandler(async (req, res, next) => {
  const query = req.query;

  let courses = [];
  if (Object.keys(query).length !== 0) {
    let categories = query.category.split(",");
    let instructors = query.instructor.split(",");

    courses = await Course.find({
      $and: [
        { category: { $in: categories } },
        { createdBy: { $in: instructors } },
      ],
    }).select("-lectures");
  } else {
    courses = await Course.find().select("-lectures");
  }

  if (!courses) {
    return next(new AppError("courses not found", 400));
  }

  res.status(200).json({
    success: true,
    message: "course get successfully",
    courses,
  });
});

/**
 * @UPDATE_COURSE
 * @ROUTE @PUT
 * @ACCESS admin {{url}}/api/v1/courses/?courseId='
 */

export const getAllUsers = asyncHandler(async (req, res, next) => {
  console.log("USre Error");
  // Fetch all users from the database
  const users = await User.find().select("-password -__v -refreshToken");
  // We're still explicitly excluding sensitive fields like password,
  // the Mongoose version key (__v), and refreshToken for security.

  // Check if any users were found
  if (!users || users.length === 0) {
    // Return a 404 Not Found error if the database is empty
    return next(new AppError("No users found in the database", 404));
  }

  // Send a successful response with the retrieved users
  res.status(200).json({
    success: true,
    message: "All users fetched successfully",
    users,
  });
});

export const updateCourse = asyncHandler(async (req, res, next) => {
  console.log("abc");
  const { courseId } = req.query;

  const course = await Course.findById(courseId).select("-lectures");

  for (const key in req.body) {
    if (key in course) {
      course[key] = req.body[key];
    }
  }

  if (req.file) {
    try {
      await cloudinary.v2.uploader.destroy(course.thumbnail.public_id);

      const result = await cloudinary.v2.uploader.upload(req.file.path, {
        folder: "lms",
        width: 250,
        height: 200,
      });

      if (result) {
        course.thumbnail.public_id = result.public_id;
        course.thumbnail.secure_url = result.secure_url;
      }

      fs.rmSync(`tmp/${req.file.filename}`);
    } catch (error) {
      for (const file of fs.readdir(`tmp/`)) {
        fs.rmSync(`tmp/${file}`);
      }
    }
  }

  await course.save();

  res.status(200).json({
    success: true,
    message: "course updated successfully",
    course,
  });
});

/**
 * @DELETE_COURSE
 * @ROUTE @DELETE
 * @ACCESS admin {{url}}/api/v1/courses/?courseId='
 */

export const deleteCourse = asyncHandler(async (req, res, next) => {
  const { courseId } = req.query;

  const course = await Course.findByIdAndDelete(courseId);

  if (!course) {
    return next(new AppError("course not found on this id", 400));
  }

  await cloudinary.v2.uploader.destroy(course.thumbnail.public_id);

  res.status(200).json({
    success: true,
    message: "course deleted successfully",
  });
});

/**
 * @GET_LECTURES_BY_COURSE_ID
 * @ROUTE @GET
 * @ACCESS admin {{url}}/api/v1/courses/:courseId
 */

export const getLecturesByCourseId = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params;

  const course = await Course.findById(courseId);

  if (!course) {
    return next(new AppError("course not found on this id", 400));
  }

  res.status(200).json({
    success: true,
    message: "course lectures fetch successfully",
    lectures: course.lectures,
    title: course.title,
    course: course,
  });
});

/**
 * @ADD_LECTURE_INTO_COURSE_BY_ID
 * @ROUTE @POST
 * @ACCESS admin {{url}}/api/v1/courses/:courseId
 */

export const addLectureIntoCourseById = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params;
  const { name, description } = req.body;

  if (!name || !description || !req.file) {
    if (req.file) fs.rmSync(`tmp/${req.file.filename}`);
    return next(new AppError("all fields are required", 400));
  }

  const lectureData = {
    name,
    description,
    lecture: {},
  };

  if (req.file) {
    try {
      const result = await cloudinary.v2.uploader.upload(req.file.path, {
        folder: "lms",
        chunk_size: 2000000,
        resource_type: "video",
      });

      if (result) {
        lectureData.lecture.public_id = result.public_id;
        lectureData.lecture.secure_url = result.secure_url;
      }

      fs.rmSync(`tmp/${req.file.filename}`);
    } catch (error) {
      fs.rmSync(`tmp/${req.file.filename}`);
    }
  }

  await Course.updateOne(
    { _id: courseId },
    {
      $addToSet: {
        lectures: lectureData,
      },
      $inc: {
        numberOfLectures: 1,
      },
    }
  );

  res.status(200).json({
    success: true,
    message: "lecture added to course successfully",
  });
});

/**
 * @UPDATE_LECTURE_FROM_COURSE_BY_ID
 * @ROUTE @PUT
 * @ACCESS admin {{url}}/api/v1/courses/:courseId?lectureId=''
 */

export const updateLectureIntoCourseById = asyncHandler(
  async (req, res, next) => {
    const { courseId } = req.params;
    const { lectureId } = req.query;

    if (!courseId || !lectureId) {
      if (req.file) fs.rmSync(`tmp/${req.file.filename}`);
      return next(new AppError("course id or lecture id is not found", 400));
    }

    const lectureData = await Course.findOne(
      { _id: courseId },
      { lectures: { $elemMatch: { _id: lectureId } } }
    );

    lectureData.lectures[0] = {
      ...req.body,
      lecture: { ...lectureData.lectures[0].lecture },
    };

    if (req.file) {
      try {
        if (lectureData.lectures[0].lecture.public_id) {
          await cloudinary.v2.uploader.destroy(
            lectureData.lectures[0].lecture.public_id,
            { resource_type: "video" }
          );
        }

        const result = await cloudinary.v2.uploader.upload(req.file.path, {
          folder: "lms",
          chunk_size: 2000000,
          resource_type: "video",
        });

        if (result) {
          lectureData.lectures[0].lecture = {
            public_id: result.public_id,
            secure_url: result.secure_url,
          };
        }

        fs.rmSync(`tmp/${req.file.filename}`);
      } catch (error) {
        fs.rmSync(`tmp/${req.file.filename}`);
      }
    }

    await lectureData.save();

    res.status(200).json({
      success: true,
      message: "lecture updated successfuly",
    });
  }
);

/**
 * @REMOVE_LECTURE_FROM_COURSE_BY_ID
 * @ROUTE @DELETE
 * @ACCESS admin {{url}}/api/v1/courses/:courseId?lectureId=''
 */

export const removeLectureFromCourseById = asyncHandler(
  async (req, res, next) => {
    const { courseId } = req.params;
    const { lectureId } = req.query;

    if (!courseId || !lectureId) {
      return next(new AppError("course id or lecture is does not found", 400));
    }

    const lectureData = await Course.findOne(
      { _id: courseId },
      {
        lectures: {
          $elemMatch: { _id: lectureId },
        },
      }
    );

    if (lectureData.lectures[0].lecture) {
      await cloudinary.v2.uploader.destroy(
        lectureData.lectures[0].lecture.public_id,
        { resource_type: "video" }
      );
    }

    await Course.findOneAndUpdate(
      { _id: courseId },
      {
        $pull: {
          lectures: { _id: lectureId },
        },
        $inc: {
          numberOfLectures: -1,
        },
      }
    );

    res.status(200).json({
      success: true,
      message: "lecture is successfully remove from this course",
    });
  }
);

/**
 * @GET_FILTER_LIST
 * @ROUTE @GET
 * @ACCESS public {{url}}/api/v1/course/filters
 */

export const getFilterList = asyncHandler(async (req, res, next) => {
  const filterList = await Course.aggregate([
    {
      $group: {
        _id: null,
        categories: {
          $addToSet: "$category",
        },
        instructors: {
          $addToSet: "$createdBy",
        },
      },
    },
    {
      $project: {
        _id: 0,
      },
    },
  ]);

  res.status(200).json(filterList[0]);
});

/**
 * @ADD_NEW_QUIZ_TO_COURSE
 * @ROUTE @POST
 * @ACCESS admin {{url}}/api/v1/courses/:courseId/quizzes
 * @BODY { title: String, description: String (optional), questions: [{ question: String, options: [String], correctAnswer: String, points: Number (optional) }] }
 */
export const addNewQuizToCourse = asyncHandler(async (req, res, next) => {
  console.log("mezjhssaj")
  const { courseId } = req.params;
  const { title, description, questions } = req.body;

  if (!title) {
    return next(new AppError("Quiz title is required.", 400));
  }

  // Basic validation for questions array if provided
  if (questions && !Array.isArray(questions)) {
    return next(new AppError("Questions must be an array.", 400));
  }
  if (questions && questions.length > 0) {
      for (const q of questions) {
          if (!q.question || !q.options || !Array.isArray(q.options) || q.options.length < 2 || !q.correctAnswer) {
              return next(new AppError("Each question must have a question text, at least two options, and a correct answer.", 400));
          }
          if (!q.options.includes(q.correctAnswer)) {
              return next(new AppError(`Correct answer '${q.correctAnswer}' for question '${q.question}' is not one of the provided options.`, 400));
          }
      }
  }


  const quizData = {
    title,
    description: description || "",
    questions: questions || [],
    totalPoints: questions ? questions.reduce((sum, q) => sum + (q.points || 1), 0) : 0,
  };

  const updatedCourse = await Course.updateOne(
    { _id: courseId },
    {
      $push: { quizzes: quizData },
    }
  );

  if (updatedCourse.modifiedCount === 0) {
    return next(new AppError("Course not found or quiz could not be added.", 404));
  }

  res.status(201).json({
    success: true,
    message: "New quiz added to course successfully",
  });
});

/**
 * @GET_ALL_QUIZZES_FOR_COURSE
 * @ROUTE @GET
 * @ACCESS public {{url}}/api/v1/courses/:courseId/quizzes
 */
export const getAllQuizzesForCourse = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params;

  const course = await Course.findById(courseId).select('quizzes');

  if (!course) {
    return next(new AppError("Course not found on this ID", 404));
  }

  res.status(200).json({
    success: true,
    message: "Quizzes fetched successfully",
    quizzes: course.quizzes,
  });
});

/**
 * @GET_SINGLE_QUIZ_BY_ID
 * @ROUTE @GET
 * @ACCESS public {{url}}/api/v1/courses/:courseId/quizzes/:quizId
 */
export const getSingleQuizById = asyncHandler(async (req, res, next) => {
  const { courseId, quizId } = req.params;

  const course = await Course.findOne(
    { _id: courseId, "quizzes._id": quizId },
    { "quizzes.$": 1 } // Project only the matching quiz
  );

  if (!course || !course.quizzes || course.quizzes.length === 0) {
    return next(new AppError("Course or Quiz not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Quiz fetched successfully",
    quiz: course.quizzes[0],
  });
});

/**
 * @UPDATE_QUIZ_DETAILS_BY_ID
 * @ROUTE @PUT
 * @ACCESS admin {{url}}/api/v1/courses/:courseId/quizzes/:quizId
 * @BODY { title: String, description: String }
 */
export const updateQuizDetailsById = asyncHandler(async (req, res, next) => {
  const { courseId, quizId } = req.params;
  const { title, description } = req.body;

  if (!courseId || !quizId) {
    return next(new AppError("Course ID or Quiz ID is missing", 400));
  }

  if (!title && !description) {
    return next(new AppError("No update data provided for the quiz.", 400));
  }

  const updatedCourse = await Course.updateOne(
    { _id: courseId, "quizzes._id": quizId },
    {
      $set: {
        ...(title && { "quizzes.$.title": title }),
        ...(description && { "quizzes.$.description": description }),
      },
    }
  );

  if (updatedCourse.modifiedCount === 0) {
    return next(new AppError("Course not found or quiz could not be updated.", 404));
  }

  res.status(200).json({
    success: true,
    message: "Quiz details updated successfully",
  });
});


/**
 * @DELETE_QUIZ_FROM_COURSE
 * @ROUTE @DELETE
 * @ACCESS admin {{url}}/api/v1/courses/:courseId/quizzes/:quizId
 */
export const deleteQuizFromCourse = asyncHandler(async (req, res, next) => {
  const { courseId, quizId } = req.params;

  if (!courseId || !quizId) {
    return next(new AppError("Course ID or Quiz ID is missing", 400));
  }

  const updatedCourse = await Course.updateOne(
    { _id: courseId },
    {
      $pull: {
        quizzes: { _id: quizId },
      },
    }
  );

  if (updatedCourse.modifiedCount === 0) {
    return next(new AppError("Course not found or quiz could not be removed (quiz ID might be incorrect).", 404));
  }

  res.status(200).json({
    success: true,
    message: "Quiz successfully removed from this course",
  });
});


/**
 * @ADD_QUESTION_TO_QUIZ
 * @ROUTE @POST
 * @ACCESS admin {{url}}/api/v1/courses/:courseId/quizzes/:quizId/questions
 * @BODY { question: String, options: [String], correctAnswer: String, points: Number (optional) }
 */
export const addQuestionToQuiz = asyncHandler(async (req, res, next) => {
  const { courseId, quizId } = req.params;
  const { question, options, correctAnswer, points } = req.body;

  if (!question || !options || !Array.isArray(options) || options.length < 2 || !correctAnswer) {
    return next(new AppError("Question text, at least two options, and the correct answer are all required for the question.", 400));
  }
  if (!options.includes(correctAnswer)) {
      return next(new AppError("The correct answer must be one of the provided options.", 400));
  }

  const questionData = {
    question,
    options,
    correctAnswer,
    points: points || 1,
  };

  // Find the course and then the specific quiz to push the question into
  const updatedCourse = await Course.updateOne(
    { _id: courseId, "quizzes._id": quizId },
    {
      $push: { "quizzes.$.questions": questionData }, // Use positional operator to push into the found quiz's questions array
      $inc: { "quizzes.$.totalPoints": questionData.points || 1 }, // Increment total points for the quiz
    }
  );

  if (updatedCourse.modifiedCount === 0) {
    return next(new AppError("Course or Quiz not found, or question could not be added.", 404));
  }

  res.status(201).json({
    success: true,
    message: "Question added to quiz successfully",
  });
});

/**
 * @GET_ALL_QUESTIONS_FOR_QUIZ
 * @ROUTE @GET
 * @ACCESS public {{url}}/api/v1/courses/:courseId/quizzes/:quizId/questions
 */
export const getAllQuestionsForQuiz = asyncHandler(async (req, res, next) => {
  const { courseId, quizId } = req.params;

  const course = await Course.findOne(
    { _id: courseId, "quizzes._id": quizId },
    { "quizzes.questions.$": 1, "quizzes.title": 1 } // Project only the questions and title of the matching quiz
  );

  if (!course || !course.quizzes || course.quizzes.length === 0) {
    return next(new AppError("Course or Quiz not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Questions fetched successfully",
    quizTitle: course.quizzes[0].title,
    questions: course.quizzes[0].questions,
  });
});

/**
 * @UPDATE_QUESTION_IN_QUIZ
 * @ROUTE @PUT
 * @ACCESS admin {{url}}/api/v1/courses/:courseId/quizzes/:quizId/questions/:questionId
 * @BODY { question: String, options: [String], correctAnswer: String, points: Number }
 */
export const updateQuestionInQuiz = asyncHandler(async (req, res, next) => {
  const { courseId, quizId, questionId } = req.params;
  const { question, options, correctAnswer, points } = req.body;

  if (!courseId || !quizId || !questionId) {
    return next(new AppError("Course ID, Quiz ID, or Question ID is missing", 400));
  }

  if (!question && !options && !correctAnswer && points === undefined) {
    return next(new AppError("No update data provided for the question.", 400));
  }

  const course = await Course.findById(courseId);

  if (!course) {
    return next(new AppError("Course not found", 404));
  }

  const quiz = course.quizzes.id(quizId);
  if (!quiz) {
    return next(new AppError("Quiz not found in this course", 404));
  }

  const questionToUpdate = quiz.questions.id(questionId);
  if (!questionToUpdate) {
    return next(new AppError("Question not found in this quiz", 404));
  }

  const oldPoints = questionToUpdate.points;

  // Update question fields if provided
  if (question) questionToUpdate.question = question;
  if (options) {
    if (!Array.isArray(options) || options.length < 2) {
      return next(new AppError("Options must be an array with at least two items.", 400));
    }
    questionToUpdate.options = options;
  }
  if (correctAnswer) questionToUpdate.correctAnswer = correctAnswer;
  if (points !== undefined) questionToUpdate.points = points;

  // Re-validate correctAnswer if options or correctAnswer changed
  if ((options || correctAnswer) && !questionToUpdate.options.includes(questionToUpdate.correctAnswer)) {
      return next(new AppError("The updated correct answer must be one of the provided options.", 400));
  }

  // Update totalPoints in quiz if points changed for the question
  if (points !== undefined && oldPoints !== questionToUpdate.points) {
      quiz.totalPoints = quiz.totalPoints - oldPoints + questionToUpdate.points;
  }

  await course.save();

  res.status(200).json({
    success: true,
    message: "Question updated successfully",
  });
});

/**
 * @DELETE_QUESTION_FROM_QUIZ
 * @ROUTE @DELETE
 * @ACCESS admin {{url}}/api/v1/courses/:courseId/quizzes/:quizId/questions/:questionId
 */
export const deleteQuestionFromQuiz = asyncHandler(async (req, res, next) => {
  const { courseId, quizId, questionId } = req.params;

  if (!courseId || !quizId || !questionId) {
    return next(new AppError("Course ID, Quiz ID, or Question ID is missing", 400));
  }

  const course = await Course.findById(courseId);

  if (!course) {
    return next(new AppError("Course not found", 404));
  }

  const quiz = course.quizzes.id(quizId);
  if (!quiz) {
    return next(new AppError("Quiz not found in this course", 404));
  }

  const questionToRemove = quiz.questions.id(questionId);
  if (!questionToRemove) {
    return next(new AppError("Question not found in this quiz", 404));
  }

  // Subtract points of the removed question from quiz's totalPoints
  quiz.totalPoints -= questionToRemove.points;
  // Remove the question from the array
  quiz.questions.pull(questionId);

  await course.save();

  res.status(200).json({
    success: true,
    message: "Question removed from quiz successfully",
  });
});


/**
 * @GET_COURSE_SEQUENCE
 * @ROUTE @GET
 * @ACCESS loggedIn, purchasedCourse {{url}}/api/v1/courses/:courseId/sequence
 */
export const getCourseSequence = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params;

  // Find the course and select the necessary fields
  const course = await Course.findById(courseId).select('lectures quizzes courseSequence title');

  if (!course) {
    return next(new AppError("Course not found.", 404));
  }

  // Create maps for quick lookup of lecture and quiz details
  const lectureMap = new Map(
    course.lectures.map(lecture => [
      lecture._id.toString(),
      {
        name: lecture.name,
        description: lecture.description,
        // You might want to include secure_url here if the user is authorized to view it
        // lectureUrl: lecture.lecture.secure_url,
      }
    ])
  );

  const quizMap = new Map(
    course.quizzes.map(quiz => [
      quiz._id.toString(),
      {
        title: quiz.title,
        description: quiz.description,
        totalPoints: quiz.totalPoints,
      }
    ])
  );

  const structuredSequence = course.courseSequence.map(item => {
    const contentId = item.contentId.toString(); // Convert ObjectId to string for map lookup
    if (item.type === 'video') {
      const lectureDetails = lectureMap.get(contentId);
      if (lectureDetails) {
        return {
          type: 'video',
          id: contentId,
          ...lectureDetails,
        };
      }
    } else if (item.type === 'quiz') {
      const quizDetails = quizMap.get(contentId);
      if (quizDetails) {
        return {
          type: 'quiz',
          id: contentId,
          ...quizDetails,
        };
      }
    }
    // Handle cases where contentId might not be found (e.g., deleted lecture/quiz)
    return { type: item.type, id: contentId, name: 'Content Not Found', description: 'This item might have been removed.' };
  });


  res.status(200).json({
    success: true,
    message: "Course sequence fetched successfully",
    courseTitle: course.title,
    sequence: structuredSequence,
  });
});


/**
 * @UPDATE_COURSE_SEQUENCE
 * @ROUTE @PUT
 * @ACCESS admin {{url}}/api/v1/courses/:courseId/sequence
 * @BODY { sequence: [{ type: String ('video' | 'quiz'), contentId: String }] }
 */
export const updateCourseSequence = asyncHandler(async (req, res, next) => {
  console.log("abc")
  const { courseId } = req.params;
  const { sequence: newSequence } = req.body;

  if (!Array.isArray(newSequence)) {
    return next(new AppError("Sequence must be an array of objects.", 400));
  }

  const course = await Course.findById(courseId).select('lectures quizzes');

  if (!course) {
    return next(new AppError("Course not found.", 404));
  }

  const validLectureIds = new Set(course.lectures.map(lec => lec._id.toString()));
  const validQuizIds = new Set(course.quizzes.map(quiz => quiz._id.toString()));

  // Validate each item in the new sequence
  for (const item of newSequence) {
    if (!item.type || !item.contentId) {
      return next(new AppError("Each sequence item must have a 'type' and 'contentId'.", 400));
    }
    if (!['video', 'quiz'].includes(item.type)) {
      return next(new AppError(`Invalid type '${item.type}'. Type must be 'video' or 'quiz'.`, 400));
    }
    if (!mongoose.Types.ObjectId.isValid(item.contentId)) { // Assuming mongoose is imported for ObjectId validation
        return next(new AppError(`Invalid contentId format: ${item.contentId}`, 400));
    }

    const contentIdStr = item.contentId.toString();

    if (item.type === 'video' && !validLectureIds.has(contentIdStr)) {
      return next(new AppError(`Lecture with ID ${item.contentId} not found in this course.`, 400));
    }
    if (item.type === 'quiz' && !validQuizIds.has(contentIdStr)) {
      return next(new AppError(`Quiz with ID ${item.contentId} not found in this course.`, 400));
    }
  }

  // If all validations pass, update the course sequence
  course.courseSequence = newSequence;
  await course.save();

  res.status(200).json({
    success: true,
    message: "Course sequence updated successfully",
  });
});