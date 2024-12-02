const express = require('express');
const mongoose = require("mongoose");
const moment = require('moment');
const path = require('path');
const { updateLeaderboard } = require('./fetcher');

moment().format();
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Log environment info
console.log('Current directory:', __dirname);
console.log('Views directory:', path.join(__dirname, 'views'));

const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
    console.error('MONGODB_URI environment variable is not set');
    process.exit(1);
}

// Connect to MongoDB
const connectDB = async () => {
    let retries = 5;
    while (retries > 0) {
        try {
            if (mongoose.connection.readyState === 1) {
                console.log('MongoDB already connected');
                return;
            }
            await mongoose.connect(mongoURI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000
            });
            console.log("Connected to MongoDB!");
            return;
        } catch (error) {
            retries--;
            if (retries === 0) {
                console.error("Failed to connect to MongoDB after 5 attempts:", error);
                process.exit(1);
            }
            console.log(`Failed to connect. Retrying... (${retries} attempts remaining)`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
};

// Define User model
const User = mongoose.model("User", new mongoose.Schema({
    username: String,
    solved: Object,
    streak: Number,
    questionSolved: Number,
    lastUpdated: Date
}), "CSES");

// Routes
app.get("/", async (req, res, next) => {
    try {
        await connectDB();
        const users = await User.find();
        const usersData = users.map(userData => {
            const timeline = Array(7).fill(false);
            const noOfDaysInWeek = 7;
            
            for (let index = 0; index < noOfDaysInWeek; index++) {
                const reqDate = moment().subtract(index, 'days').format('DD/MM/YYYY');
                const prevDate = moment().subtract(index + 1, 'days').format('DD/MM/YYYY');
                
                timeline[noOfDaysInWeek - index - 1] = parseInt(userData.solved?.[reqDate] || 0) > parseInt(userData.solved?.[prevDate] || 0);
            }
            
            return {
                name: userData.username,
                timeline: timeline,
                streak: userData.streak || 0,
                questionSolved: userData.questionSolved || 0,
                lastUpdated: userData.lastUpdated
            };
        });
        
        // Sort users by questionSolved in descending order
        usersData.sort((a, b) => b.questionSolved - a.questionSolved);
        
        res.render("index", { data: usersData });
    } catch (error) {
        next(error);
    }
});

// Manual update endpoint (protected)
app.post("/update", async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'];
        if (apiKey !== process.env.API_KEY) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        await connectDB();
        await updateLeaderboard();
        res.json({ status: "success" });
    } catch (error) {
        next(error);
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(statusCode).json({ error: message });
});

// Start server
const startServer = async () => {
    try {
        await connectDB();
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

// Schedule regular updates
setInterval(async () => {
    try {
        await updateLeaderboard();
    } catch (error) {
        console.error('Scheduled update failed:', error);
    }
}, 3600000);
