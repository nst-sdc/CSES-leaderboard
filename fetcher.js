const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const moment = require('moment');

// Function to extract users from HTML
function getUsers($) {
    const users = {};
    $('tr').slice(1).each((_, row) => {
        const columns = $(row).find('td');
        if (columns.length === 4) {
            const userName = $(columns[1]).text().trim();
            const solvedTasks = parseInt($(columns[2]).text().trim());
            users[userName] = solvedTasks;
        }
    });
    return users;
}

// Function to fetch CSES data
async function fetchCSESData() {
    const cookies = {
        PHPSESSID: process.env.CSES_PHPSESSID || 'b614b76259290f9aaccda2a2afdd428118304b9a'
    };

    const headers = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Connection': 'keep-alive',
        'Cookie': `PHPSESSID=${cookies.PHPSESSID}`,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
    };

    const users = {};
    try {
        for (let page of [1, 2]) {
            const response = await axios.get(`https://cses.fi/problemset/stats/friends/p/${page}`, {
                headers,
                timeout: 10000
            });
            const $ = cheerio.load(response.data);
            Object.assign(users, getUsers($));
        }
        return users;
    } catch (error) {
        console.error('Error fetching CSES data:', error.message);
        return null;
    }
}

// Function to update MongoDB
async function updateMongoDB(users) {
    if (!users) return false;

    try {
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
                    streak += (todayDate !== document.lastUpdate ? 1 : 0);
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
                            lastUpdate: todayDate
                        }
                    }
                );
            } else {
                const data = {
                    username: user,
                    solved: { [todayDate]: tasks },
                    streak: 0,
                    questionSolved: tasks,
                    lastUpdate: todayDate
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
        } else {
            console.log('No user data fetched');
        }
    } catch (error) {
        console.error('Error in updateLeaderboard:', error.message);
    }
}

module.exports = { updateLeaderboard };
