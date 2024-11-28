const express = require('express')
const mongoose = require("mongoose");
const moment = require('moment'); // require

moment().format();

const app = express()
const port = process.env.PORT || 3000

app.set('view engine' , 'ejs')
app.use(express.static("public"))
app.use(express.json());

const mongoURI = process.env.MONGODB_URI || "mongodb+srv://kanishkranjan17:kJjPjGDTqnlWZWEi@leaderboard.5gmx8.mongodb.net/leaderboard";
const databaseName = "leaderboard";



mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("Connected to MongoDB!");
        console.log(moment.locale());

        const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }), "CSES");

        app.get("/", async (req, res) => {
            try {
                const users = await User.find();
                console.log(users);
                let usersData = [] ;
                for(let userData of  users){
                  timeline = [false , false , false , false , false , false , false];
                  const noOfDaysInWeek = 7
                  for (let index = 0; index < noOfDaysInWeek; index++) {
                    const reqDate = moment("2024-12-08", "YYYY-MM-DD").subtract(index, 'days').format('DD/MM/YYYY');
                    const prevDate = moment("2024-12-08", "YYYY-MM-DD").subtract(index+1, 'days').format('DD/MM/YYYY');
                    console.log(reqDate + " " + prevDate );

                    
                    if(reqDate in userData['solved'] && prevDate in userData['solved']){
                      timeline[noOfDaysInWeek - index -1] = (parseInt(userData['solved'][reqDate]) > parseInt(userData['solved'][prevDate])) ;
                      console.log(timeline[index]);
                      console.log((parseInt(userData['solved'][reqDate])+" > "+parseInt(userData['solved'][prevDate])));
                      
                    }
                  }
                  usersData.push({name : userData.username , timeline : timeline , streak : userData.streak , questionSolved : userData.questionSolved});
                } 
                res.render("index", { data : usersData }); 
            } catch (error) {
                console.error("Error fetching data:", error);
                res.status(500).send("Error fetching data");
            }
        });

    })
    .catch((err) => console.error("Error connecting to MongoDB:", err));

// app.get('/', (req, res) => {
// //   res.send('Hello World!')
//     res.render('index' , {data : [
//         {name:"Kanishk" , timeline : [1,1,0,0,1,0] , streak : 1},
//         {name:"Neel" , timeline : [1,0,0,1,1,0] , streak : 4},
//         {name:"Ritwik" , timeline : [1,0,0,0,1,1] , streak : 3},
//         {name:"Priyanshu" , timeline : [1,0,1,0,1,0] , streak : 1},
//         {name:"Vivek" , timeline : [1,1,1,1,1,1] , streak : 10},


//     ]})
// })

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});