const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const moment = require('moment');
require('dotenv').config();
// Function to extract users from HTML
function getUsers($) {
    const users = {};
    try {
        $('tr').slice(1).each((_, row) => {
            const columns = $(row).find('td');
            if (columns.length === 4) {
                const userName = $(columns[1]).text().trim();
                const solvedTasks = parseInt($(columns[2]).text().trim());
                if (userName && !isNaN(solvedTasks)) {
                    users[userName] = solvedTasks;
                }
            }
        });
    } catch (error) {
        console.error('Error parsing users:', error);
    }
    return users;
}

// Function to fetch CSES data
async function fetchCSESData() {
    const cookies = {
        PHPSESSID: process.env.PHPSESSID
    };

    const headers = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': `PHPSESSID=${cookies.PHPSESSID}`,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    };

    const users = {};
    try {
        for (let page of [1, 2]) {
            const response = await axios.get(`https://cses.fi/problemset/stats/friends/p/${page}`, {
                headers,
                timeout: 10000,
                validateStatus: status => status === 200
            });
            
            if (response.data) {
                const $ = cheerio.load(response.data);
                Object.assign(users, getUsers($));
            }
        }
        return Object.keys(users).length > 0 ? users : null;
    } catch (error) {
        console.error('Error fetching CSES data:', error.message);
        return null;
    }
}

// Function to update MongoDB
async function updateMongoDB(users) {
    if (!users) {
        console.log('No user data to update');
        return false;
    }

    let client;
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error('MongoDB URI not found in environment variables');
        }

        if (!mongoose.connection.readyState) {
            await mongoose.connect(uri, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
        }

        const collection = mongoose.connection.collection('CSES');
        const todayDate = moment().format('DD/MM/YYYY');
        const yesterdayDate = moment().subtract(1, 'days').format('DD/MM/YYYY');

        for (const [user, tasks] of Object.entries(users)) {
            const document = await collection.findOne({ username: user });
            
            if (document) {
                let streak = parseInt(document.streak || 0);
                const prevSolved = document.solved?.[yesterdayDate];
                let currSolved = prevSolved;

                if (prevSolved !== undefined && prevSolved < tasks) {
                    streak = document.prevStreak + 1;
                    currSolved = tasks;
                } else {
                    streak = 0;
                }

                document.solved = document.solved || {};
                document.solved[todayDate] = currSolved;

                await collection.updateOne(
                    { username: user },
                    {
                        $set: {
                            solved: document.solved,
                            streak: streak,
                            questionSolved: tasks,
                            prevStreak: document.prevStreak || 0 
                        }
                    }
                );
            } else {
                const data = {
                    username: user,
                    solved: { [todayDate]: tasks },
                    streak: 0,
                    questionSolved: tasks,
                    prevStreak: 0
                };
                await collection.insertOne(data);
            }
        }
        return true;
    } catch (error) {
        console.error('Error updating MongoDB:', error.message);
        return false;
    }
}

// Main function to fetch and update data
async function updateLeaderboard() {
    console.log('Starting leaderboard update:', new Date().toISOString());
    try {
        const users = await fetchCSESData();
        if (users) {
            const success = await updateMongoDB(users);
            console.log('Update completed:', success ? 'successful' : 'failed');
            return success;
        } else {
            console.log('No user data fetched');
            return false;
        }
    } catch (error) {
        console.error('Error in updateLeaderboard:', error.message);
        return false;
    }
}

module.exports = { updateLeaderboard };
