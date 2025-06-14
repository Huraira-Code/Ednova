import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import Stripe from "stripe";
import { config } from "dotenv";

import connectToDB from "./config/db.config.js";

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
// // ... (rest of your Socket.IO logic)
// });

const corsOptions = {
  origin: ["http://localhost:5173", process.env.FRONT_URL],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
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

// --- MODIFIED SECTION FOR LOCAL DEVELOPMENT ---
// Define the port. Prioritize environment variable or default to 5000.
const PORT = process.env.PORT || 5000;

// Only start listening if not in a serverless environment (e.g., Vercel)
// This check helps prevent Vercel from trying to listen on a port,
// which it handles automatically.
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is running locally on port: ${PORT}`);
    console.log(`Access your API at http://localhost:${PORT}/api/v1/`);
  });
}

// Export the Express app instance. This is crucial for Vercel.
export default app;
