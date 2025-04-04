const express = require("express");
const mongoose = require("mongoose");
const moment = require("moment");
const path = require("path");
const { exec } = require("child_process");

moment().format();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Log environment info
console.log("Current directory:", __dirname);
console.log("Views directory:", path.join(__dirname, "views"));

const mongoURI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/cses_leaderboard";

// Mock data for when MongoDB is not available
const mockUsers = [
  {
    name: "user1",
    timeline: [true, false, true, true, false, true, false],
    streak: 3,
    questionSolved: 25,
  },
  {
    name: "user2",
    timeline: [false, true, true, false, true, false, true],
    streak: 2,
    questionSolved: 18,
  },
  {
    name: "user3",
    timeline: [true, true, true, true, true, false, false],
    streak: 5,
    questionSolved: 30,
  },
  {
    name: "user4",
    timeline: [false, false, true, false, true, true, false],
    streak: 2,
    questionSolved: 15,
  },
  {
    name: "user5",
    timeline: [true, false, false, true, false, true, true],
    streak: 3,
    questionSolved: 22,
  },
];

let isConnectedToMongoDB = false;

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB!");
    isConnectedToMongoDB = true;
    return true;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    console.log(
      "Starting server without MongoDB connection. Using mock data instead."
    );
    return false;
  }
};

// Define User model
const User = mongoose.model(
  "User",
  new mongoose.Schema(
    {
      username: String,
      solved: Object,
      streak: Number,
      questionSolved: Number,
    },
    { strict: false }
  ),
  "CSES"
);

// Routes
app.get("/", async (req, res) => {
  try {
    let usersData = [];

    if (isConnectedToMongoDB) {
      const users = await User.find();
      usersData = users.map((userData) => {
        const timeline = Array(7).fill(false);
        const noOfDaysInWeek = 7;

        for (let index = 0; index < noOfDaysInWeek; index++) {
          const reqDate = moment("2024-12-08", "YYYY-MM-DD")
            .subtract(index, "days")
            .format("DD/MM/YYYY");
          const prevDate = moment("2024-12-08", "YYYY-MM-DD")
            .subtract(index + 1, "days")
            .format("DD/MM/YYYY");

          if (
            userData.solved &&
            userData.solved[reqDate] !== undefined &&
            userData.solved[prevDate] !== undefined
          ) {
            timeline[noOfDaysInWeek - index - 1] =
              parseInt(userData.solved[reqDate]) >
              parseInt(userData.solved[prevDate]);
          }
        }

        return {
          name: userData.username,
          timeline: timeline,
          streak: userData.streak || 0,
          questionSolved: userData.questionSolved || 0,
        };
      });
    } else {
      // Use mock data when MongoDB is not available
      usersData = mockUsers;
    }

    res.render("index", { data: usersData });
  } catch (error) {
    console.error("Error fetching data:", error);
    // Fallback to mock data in case of any error
    res.render("index", { data: mockUsers });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something broke!", details: err.message });
});

// Start server without browser opening functionality
const startServer = async () => {
  try {
    const connected = await connectDB();
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Server startup error:", error);
  }
};

startServer();
