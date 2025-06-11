import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
// import { createServer } from "node:http"; // Not needed if you're not listening yourself
// import { Server } from "socket.io"; // See explanation below for Socket.IO on Vercel
import Stripe from "stripe";
import { config } from "dotenv";

import connectToDB from "./config/db.config.js";
// import Message from "./models/message.model.js"; // Only uncomment if used outside Socket.IO
// import Chatroom from "./models/chatroom.model.js"; // Only uncomment if used outside Socket.IO

config(); // Load environment variables from .env
connectToDB();
import "./config/cloudinary.config.js";

const app = express();

// Initialize Stripe (assuming you'll use it in your routes)
export const stripe = Stripe(process.env.STRIPE_SECRET);

// --- IMPORTANT: Socket.IO on Vercel ---
// Running a traditional Socket.IO server (which relies on persistent WebSockets)
// directly within a Vercel Serverless Function is generally not feasible or recommended.
// Serverless functions are designed to be stateless and ephemeral.
// A dedicated HTTP server (like the one 'createServer(app)' creates)
// and the 'io = new Server(server)' setup will NOT work as expected on Vercel
// because Vercel wraps your Express app and doesn't expose the underlying HTTP server
// in a way that allows you to attach Socket.IO to it for long-lived connections.
//
// The Socket.IO related code (createServer, new Server, socket.on, io.emit, etc.)
// will effectively be non-functional in this serverless setup.
// You will need a different approach for real-time communication on Vercel.
// See the explanation below for recommended solutions.
// For now, we'll comment out the Socket.IO server setup to fix the main Express app.
// const server = createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: "http://localhost:5174", // Make sure this matches your frontend URL
//   },
// });

// // track the online users
// let users = [];

// // handle events on user connect
// io.on("connection", (socket) => {
//   socket.on("addUser", (userId) => {
//     const isUserExist = users.find((user) => userId === user.userId);
//     if (!isUserExist) {
//       users.push({ userId, socketId: socket.id });
//     }
//     io.emit("getUsers", users);
//   });

//   socket.on(
//     "send message",
//     async ({ senderId, receiverId, content, chatroomId }) => {
//       const sender = users.find((user) => user.userId === senderId);
//       const receiver = users.find((user) => user.userId === receiverId);

//       const message = new Message({
//         sender: senderId,
//         chatroomId,
//         content,
//       });

//       const resullt = await message.save();

//       if (resullt) {
//         if (receiver) {
//           io.to(sender.socketId)
//             .to(receiver.socketId)
//             .emit("get message", message);
//         } else {
//           io.to(sender.socketId).emit("get message", message);
//           await Chatroom.findOneAndUpdate(
//             { "unreadCounts.user": senderId, _id: chatroomId },
//             { $inc: { "unreadCounts.$.count": 1 } },
//             { new: true }
//           );
//         }
//       }
//     }
//   );

//   socket.on("disconnect", () => {
//     users = users.filter((user) => user.socketId !== socket.id);
//     io.emit("getUsers", users);
//   });
// });

const corsOptions = {
  origin: ["http://localhost:5173", process.env.FRONT_URL],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  // Removed "Access-Control-Allow-Origin" from allowedHeaders as it's a response header.
  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors(corsOptions));

// importing all routes
import errorMiddleware from "./middleware/error.middleware.js";
import courseRoutes from "./routes/course.route.js";
import myCourseRoutes from "./routes/my.course.route.js";
import paymentRoutes from "./routes/payment.route.js";
import userRoutes from "./routes/user.routes.js";
import chatRoutes from "./routes/chat.route.js";
import AdminRoutes from "./routes/admin.dashboard.route.js";
import Announcement from "./routes/announcement.route.js";
import Badges from "./routes/badges.route.js";

// set routes to base url
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/course", courseRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/my-course", myCourseRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/admin", AdminRoutes);
app.use("/api/v1/announcement", Announcement);
app.use("/api/v1/badges", Badges);

// page not found
app.all("*", (req, res) => {
  res.send("opps ! 404 error. page not found");
});

// handle error and send resopnse
app.use(errorMiddleware);

// --- THIS IS THE KEY CHANGE FOR VERCEL ---
// Export the Express app instance directly.
// Vercel will then handle the HTTP listening and routing to your app.
export default app;
// Remove the server.listen() call as Vercel handles this
// server.listen(PORT, () => {
//   console.log(`server is running on port: ${PORT}`);
// });
