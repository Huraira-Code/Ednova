import MyCourse from "../models/my.course.model.js";
import Payment from "../models/payment.model.js";
import asyncHandler from "../middleware/asyncHandler.middleware.js";
import AppError from "../utils/error.utils.js";
import User from "../models/user.model.js";
import Badges from "../models/badges.model.js";

/**
 * @GET_MY_COURSE_LIST
 * @ROUTE @GET
 * @ACCESS course purchased user only {{url}}/api/v1/my-courses
 */

export const getMyAllCourses = asyncHandler(async (req, res, next) => {
  const { id } = req.user;

  const myPurchasedCourseList = await Payment.aggregate([
    {
      $match: {
        userId: id,
      },
    },
    {
      $unwind: "$purchasedCourse",
    },
    {
      $project: {
        _id: 0,
        courseId: {
          $toObjectId: "$purchasedCourse.courseId",
        },
      },
    },
    {
      $lookup: {
        from: "courses",
        localField: "courseId",
        foreignField: "_id",
        as: "purchasedCourses",
        pipeline: [
          {
            $project: {
              title: 1,
              thumbnail: 1,
            },
          },
        ],
      },
    },
    {
      $project: {
        purchasedCourses: {
          $first: "$purchasedCourses",
        },
      },
    },
    {
      $group: {
        _id: null,
        courseList: {
          $push: "$purchasedCourses",
        },
      },
    },
    {
      $project: {
        _id: 0,
      },
    },
  ]);

  res.status(200).json({
    success: true,
    courseList: myPurchasedCourseList[0]?.courseList || [],
  });
});

/**
 * @GET_MY_COURSE_LECTURE_PROGRESS
 * @ROUTE @GET
 * @ACCESS course purchased user only {{url}}/api/v1/my-courses/:courseId
 */

export const getMyCourseLectureProgress = asyncHandler(
  async (req, res, next) => {
    const { id } = req.user;
    const { courseId } = req.params;

    const myCourseProgress = await MyCourse.findOne(
      { userId: id },
      {
        myPurchasedCourses: {
          $elemMatch: {
            courseId: courseId,
          },
        },
      }
    );
    console.log("kumi meri jaan", myCourseProgress);
    res.status(200).json({
      success: true,
      courseProgress: myCourseProgress.myPurchasedCourses[0],
    });
  }
);

/**
 * @ADD_NOTE_INTO_LECTURE
 * @ROUTE @POST
 * @ACCESS course purchased user only {{url}}/api/v1/my-courses/:courseId/:lectureId
 */

export const addNote = asyncHandler(async (req, res, next) => {
  const { id } = req.user;
  const { note } = req.body;
  const { courseId } = req.params;
  const { lectureId } = req.query;

  const myCourse = await MyCourse.findOneAndUpdate(
    {
      userId: id,
      "myPurchasedCourses.courseId": courseId,
    },
    {
      $addToSet: {
        "myPurchasedCourses.$[elem].lectureProgress.$[subElem].notes": note,
      },
    },
    {
      arrayFilters: [
        { "elem.courseId": courseId },
        { "subElem.lectureId": lectureId },
      ],
      upsert: true,
      new: true,
    }
  );

  const courseIndex = myCourse.myPurchasedCourses.findIndex(
    (item) => item.courseId === courseId
  );

  const lectureIndex = myCourse.myPurchasedCourses[
    courseIndex
  ].lectureProgress.findIndex((item) => item.lectureId === lectureId);

  if (lectureIndex === -1) {
    myCourse.myPurchasedCourses[courseIndex].lectureProgress.push({
      lectureId,
      notes: [note],
    });

    await myCourse.save();
  }

  res.status(200).json({
    success: true,
    message: "note added successfully",
  });
});

/**
 * @UPDATE_LECTURE_CHECK_MARK
 * @ROUTE @PUT
 * @ACCESS course purchased user only {{url}}/api/v1/my-courses/:courseId/:lectureId
 */

export const updateLectureMark = asyncHandler(async (req, res, next) => {
  const { id } = req.user; // User ID from authenticated request
  const { checked, gainXP } = req.body; // 'checked' status of lecture, and XP gained/lost
  const { courseId } = req.params; // ID of the course
  const { lectureId } = req.query; // ID of the lecture

  console.log(`Gain XP: ${gainXP}`);
  console.log(
    `User ID: ${id}, Checked: ${checked}, Course ID: ${courseId}, Lecture ID: ${lectureId}`
  );

  // Find and update the user's course progress for the specific lecture
  const myCourse = await MyCourse.findOneAndUpdate(
    {
      userId: id,
      "myPurchasedCourses.courseId": courseId,
    },
    {
      $set: {
        "myPurchasedCourses.$[elem].lectureProgress.$[subElem].marked": checked,
      },
    },
    {
      arrayFilters: [
        { "elem.courseId": courseId }, // Filter for the specific course
        { "subElem.lectureId": lectureId }, // Filter for the specific lecture within the course
      ],
      upsert: true, // Create the document if it doesn't exist (though typically the user/course exist here)
      new: true, // Return the modified document rather than the original
    }
  );

  console.log("Updated MyCourse document:", myCourse);

  // Handle case where myCourse document is not found
  if (!myCourse) {
    return next(new ErrorResponse("Course progress not found for user.", 404));
  }

  // Find the index of the relevant course in the user's purchased courses array
  const courseIndex = myCourse.myPurchasedCourses.findIndex(
    (item) => item.courseId === courseId
  );

  // Handle case where the course is not found in the user's purchased courses
  if (courseIndex === -1) {
    return next(
      new ErrorResponse("Course not found in user's purchased courses.", 404)
    );
  }

  const lectureProgressArray =
    myCourse.myPurchasedCourses[courseIndex].lectureProgress;
  const lectureIndex = lectureProgressArray.findIndex(
    (item) => item.lectureId === lectureId
  );
  console.log(`Lecture Index: ${lectureIndex}`);

  // Determine the XP change based on 'checked' status (gain if checked, lose if unchecked)
  let xpChange = checked ? gainXP : -gainXP;
  console.log(`Calculated XP Change: ${xpChange}`);

  let updatedUser; // To hold the user document after XP update
  let badgeStatusChanges = []; // Array to store info about acquired/removed badges

  // Logic to handle lecture marking and XP update
  if (lectureIndex === -1) {
    console.log(
      "Marking for the first time: lecture not found in progress array."
    );
    // If the lecture is being marked for the first time, push new progress
    lectureProgressArray.push({
      lectureId,
      marked: checked,
    });
    await myCourse.save(); // Save changes to myCourse document

    // Adjust user's XP in the User model
    try {
      updatedUser = await User.findByIdAndUpdate(
        id,
        { $inc: { XP: xpChange } }, // Increment/decrement XP
        { new: true } // Return the updated user document
      );
      console.log(`User ${id} XP updated by ${xpChange} (first time mark).`);
    } catch (error) {
      console.error(`Error updating user XP for ${id}:`, error);
      return next(new ErrorResponse("Failed to update user XP", 500));
    }
  } else {
    console.log("Lecture progress already exists.");
    // If the lecture progress already exists, handle updates to 'marked' status
    const currentMarkedStatus = lectureProgressArray[lectureIndex].marked;
    console.log(
      `Current marked status: ${currentMarkedStatus}, New checked status: ${checked}`
    );

    // Only adjust XP and save if the marked status actually changed
    if (checked == currentMarkedStatus) {
      console.log("Marked status changed, updating XP and lecture status.");
      // Update the 'marked' status in the local object before saving MyCourse
      lectureProgressArray[lectureIndex].marked = checked;
      await myCourse.save(); // Save the updated lecture progress in MyCourse

      // Adjust XP in User model
      try {
        updatedUser = await User.findByIdAndUpdate(
          id,
          { $inc: { XP: xpChange } },
          { new: true }
        );
        console.log(`User ${id} XP updated by ${xpChange} (status changed).`);
      } catch (error) {
        console.error(
          `Error updating user XP or lecture status for ${id}:`,
          error
        );
        return next(
          new ErrorResponse("Failed to update user XP or lecture status", 500)
        );
      }
    } else {
      console.log(
        "Marked status did not change, no XP adjustment needed for this action."
      );
      // If the marked status didn't change, we still need to get the user's current XP for badge checks
      updatedUser = await User.findById(id); // Fetch current user document
    }
  }

  // --- Badge Assignment and Removal Logic ---
  if (updatedUser) {
    // Ensure user document is available
    try {
      const allBadges = await Badges.find({}); // Fetch all available badges
      // Ensure 'BadgesID' exists as an array on the user document (or initialize it)
      const userCurrentBadgeIds = updatedUser.BadgesID
        ? updatedUser.BadgesID.map((id) => id.toString())
        : [];
      console.log("meoo1", userCurrentBadgeIds);
      let newBadgesToAwardIds = [];
      let badgesToPullIds = [];

      for (const badge of allBadges) {
        console.log("mer1", badge);
        const badgeIdString = badge._id.toString();
        const userHasBadge = userCurrentBadgeIds.includes(badgeIdString);

        // Condition to Award Badge
        if (updatedUser.XP >= badge.XP && !userHasBadge) {
          newBadgesToAwardIds.push(badge._id);
          console.log("error word" , badge)
          badgeStatusChanges.push({ badge: badge, status: "acquired" });
          console.log(`User ${id} acquired badge: ${badge.title}`);
        }
        // Condition to Remove Badge (if XP drops below requirement AND user has the badge)
        else if (updatedUser.XP < badge.XP && userHasBadge) {
          console.log("removing" , badge)
          badgesToPullIds.push(badge._id);
          badgeStatusChanges.push({ badge: badge, status: "removed" });
          console.log(`User ${id} removed badge: ${badge.title}`);
        }
      }

      // Perform updates to user's badges array only if there are changes
      if (newBadgesToAwardIds.length > 0 || badgesToPullIds.length > 0) {
        const updateQuery = {};
        if (newBadgesToAwardIds.length > 0) {
          updateQuery.$addToSet = { BadgesID: { $each: newBadgesToAwardIds } };
        }
        if (badgesToPullIds.length > 0) {
          updateQuery.$pullAll = { BadgesID: badgesToPullIds };
        }

        await User.findByIdAndUpdate(
          id,
          updateQuery,
          { new: true } // Return the updated user document (after badge changes)
        );
      }
    } catch (error) {
      console.error(`Error assigning/removing badges for user ${id}:`, error);
      // This error will be logged but won't stop the main lecture update response
    }
  }

  console.log("Final awarded/removed badges for response:", badgeStatusChanges);

  res.status(200).json({
    success: true,
    message: `lecture ${checked ? "marked" : "unmarked"}`,
    XP: updatedUser ? updatedUser.XP : null, // Return the user's new total XP
    badgeStatusChanges: badgeStatusChanges, // Return information about acquired/removed badges
  });
});
/**
 * @DELETE_LECTURE_CHECK_MARK
 * @ROUTE @DELETE
 * @ACCESS course purchased user only {{url}}/api/v1/my-courses/:courseId/:lectureId
 */

export const deleteNote = asyncHandler(async (req, res, next) => {
  const { id } = req.user;
  const { noteIndex } = req.body;
  const { lectureId } = req.query;
  const { courseId } = req.params;
  console.log(noteIndex);

  const myCourse = await MyCourse.findOne(
    { userId: id },
    {
      myPurchasedCourses: {
        $elemMatch: {
          courseId: courseId,
        },
      },
    }
  );

  const lectureIndex = myCourse.myPurchasedCourses[0].lectureProgress.findIndex(
    (item) => item.lectureId === lectureId
  );

  if (lectureIndex === -1) {
    return next(new AppError(`you don't have access to this course`, 400));
  }

  if (
    !myCourse.myPurchasedCourses[0].lectureProgress[lectureIndex].notes[
      noteIndex
    ]
  ) {
    return next(new AppError(`no note found on this note index`, 400));
  }

  myCourse.myPurchasedCourses[0].lectureProgress[lectureIndex].notes.splice(
    noteIndex,
    1
  );

  myCourse.save();

  res.status(200).json({
    success: true,
    message: "notes removed from lecture progress",
  });
});
