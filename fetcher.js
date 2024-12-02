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
    if (!users || Object.keys(users).length === 0) {
        console.log('No user data to update');
        return false;
    }

    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        
        const collection = mongoose.connection.collection('CSES');
        const todayDate = moment().format('DD/MM/YYYY');
        const yesterdayDate = moment().subtract(1, 'days').format('DD/MM/YYYY');

        const operations = [];
        for (const [user, tasks] of Object.entries(users)) {
            const document = await collection.findOne({ username: user }, { session });
            
            if (document) {
                const prevSolved = document.solved?.[yesterdayDate] || 0;
                const currentStreak = document.streak || 0;
                
                let newStreak = 0;
                if (tasks > prevSolved) {
                    newStreak = currentStreak + 1;
                }

                operations.push({
                    updateOne: {
                        filter: { username: user },
                        update: {
                            $set: {
                                [`solved.${todayDate}`]: tasks,
                                streak: newStreak,
                                questionSolved: tasks,
                                lastUpdated: new Date()
                            }
                        }
                    }
                });
            } else {
                operations.push({
                    insertOne: {
                        document: {
                            username: user,
                            solved: { [todayDate]: tasks },
                            streak: 0,
                            questionSolved: tasks,
                            lastUpdated: new Date()
                        }
                    }
                });
            }
        }

        if (operations.length > 0) {
            await collection.bulkWrite(operations, { session });
            console.log(`Updated ${operations.length} users`);
        }

        await session.commitTransaction();
        return true;
    } catch (error) {
        await session.abortTransaction();
        console.error('Error updating MongoDB:', error);
        throw error;
    } finally {
        await session.endSession();
    }
}

// Main function to fetch and update data
async function updateLeaderboard() {
    try {
        console.log('Starting leaderboard update...');
        const users = await fetchCSESData();
        
        if (!users || Object.keys(users).length === 0) {
            throw new Error('No user data received from CSES');
        }
        
        await updateMongoDB(users);
        console.log('Leaderboard update completed successfully');
        return true;
    } catch (error) {
        console.error('Error updating leaderboard:', error);
        throw error;
    }
}

module.exports = { updateLeaderboard };
