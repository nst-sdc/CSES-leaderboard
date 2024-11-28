const express = require('express');
const mongoose = require("mongoose");
const moment = require('moment');
const path = require('path');

moment().format();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const mongoURI = process.env.MONGODB_URI || "mongodb+srv://kanishkranjan17:kJjPjGDTqnlWZWEi@leaderboard.5gmx8.mongodb.net/leaderboard";

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("Connected to MongoDB!");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
};

// Define User model
const User = mongoose.model("User", new mongoose.Schema({
    username: String,
    solved: Object,
    streak: Number,
    questionSolved: Number
}, { strict: false }), "CSES");

// Routes
app.get("/", async (req, res) => {
    try {
        const users = await User.find();
        const usersData = users.map(userData => {
            const timeline = Array(7).fill(false);
            const noOfDaysInWeek = 7;
            
            for (let index = 0; index < noOfDaysInWeek; index++) {
                const reqDate = moment("2024-12-08", "YYYY-MM-DD")
                    .subtract(index, 'days')
                    .format('DD/MM/YYYY');
                const prevDate = moment("2024-12-08", "YYYY-MM-DD")
                    .subtract(index + 1, 'days')
                    .format('DD/MM/YYYY');
                
                if (userData.solved && 
                    userData.solved[reqDate] !== undefined && 
                    userData.solved[prevDate] !== undefined) {
                    timeline[noOfDaysInWeek - index - 1] = 
                        parseInt(userData.solved[reqDate]) > parseInt(userData.solved[prevDate]);
                }
            }
            
            return {
                name: userData.username,
                timeline: timeline,
                streak: userData.streak || 0,
                questionSolved: userData.questionSolved || 0
            };
        });
        
        res.render("index", { data: usersData });
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "Error fetching data", details: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something broke!", details: err.message });
});

// Start server
const startServer = async () => {
    try {
        await connectDB();
        app.listen(port, () => {
            console.log(`Server running on http://localhost:${port}`);
        });
    } catch (error) {
        console.error("Server startup error:", error);
        process.exit(1);
    }
};

startServer();