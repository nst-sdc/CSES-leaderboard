# CSES Leaderboard

**CSES Leaderboard** is a web application designed to track and display the rankings and performance of programmers solving problems on the [CSES Problem Set](https://cses.fi/problemset/). The platform allows users to visualize their progress, compare scores, and compete with others.

---

## Features

- **Global Leaderboard**: Displays rankings of all registered users based on the number of problems solved.
- **User Profiles**: Shows detailed statistics for individual users, including problem-solving streaks and time spent.
- **Comparison Tool**: Compare your performance with friends or rivals.
- **Filters and Search**: Search for users or filter results by country or institution.
- **Live Updates**: The leaderboard updates in real-time as users solve problems.
- **Responsive Design**: Optimized for desktop and mobile views.

---

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/nst-sdc/CSES-leaderboard.git
   cd CSES-leaderboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your MongoDB connection string and CSES PHP session ID:
   ```plaintext
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.ghfmv2l.mongodb.net/leaderboard?retryWrites=true&w=majority
   PHPSESSID=your_phpsessid_value
   ```

4. Start the application:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000` to view the leaderboard.

---

## Usage

- The application fetches user data from CSES and updates the MongoDB database.
- The leaderboard displays user rankings based on the number of problems solved.
- You can view individual user profiles for detailed statistics.

---

## Technologies Used

- **Node.js**: JavaScript runtime for building the application.
- **Express**: Web framework for Node.js to handle routing and middleware.
- **MongoDB**: NoSQL database for storing user data.
- **Mongoose**: ODM library for MongoDB and Node.js.
- **Axios**: Promise-based HTTP client for making requests to CSES.
- **Cheerio**: jQuery-like library for parsing and manipulating HTML.
- **Moment.js**: Library for parsing, validating, manipulating, and formatting dates.

---

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any suggestions or improvements.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [CSES Problem Set](https://cses.fi/problemset/) for providing the platform for competitive programming.
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) for hosting the database.

---

Feel free to customize any sections as needed, especially the installation instructions and any specific usage details that might be relevant to your project. Let me know if you need any further modifications!