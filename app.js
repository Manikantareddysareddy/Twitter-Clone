const express = require("express");
const app = express();
module.exports = app;
app.use(express.json());
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dbPath = path.join(__dirname, "twitterClone.db");

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running Successfully at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB ERROR ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

//Middle Ware to Authenticate
const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];

    jwt.verify(jwtToken, "My_Secret_Token", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
        return;
      } else {
        request.username = payload.username;
        next();
      }
    });
  } else {
    response.status(401);
    response.send("Invalid JWT Token");
  }
};
//API-1 Register user
app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username='${username}';`;
  const User = await db.get(selectUserQuery);
  if (password.length < 6) {
    response.status(400);
    response.send("Password is too short");
  } else {
    if (User === undefined) {
      const insertQuery = `INSERT INTO user(username,password,name,gender)VALUES
          ('${username}','${hashedPassword}','${name}','${gender}');`;
      const AddQuery = await db.run(insertQuery);
      response.status(200);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("User already exists");
    }
  }
});
//API-2 User login
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const getUser = `SELECT * FROM user WHERE username='${username}';`;
  const user = await db.get(getUser);
  if (user === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const verifyPassword = await bcrypt.compare(password, user.password);
    if (verifyPassword === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "My_Secret_Token");
      response.status(200);
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});
//API-3
app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  let { username } = request;
  const loginUserQuery = `SELECT * FROM user WHERE username='${username}';`;
  const loginUser = await db.get(loginUserQuery);
  const userId = loginUser.user_id;
  const tweetUserQuery = `SELECT user.username as username,tweet.tweet as tweet,tweet.date_time as dateTime FROM (follower INNER JOIN tweet ON follower.following_user_id=tweet.user_id) AS M INNER JOIN user ON M.following_user_id=user.user_id WHERE follower.follower_user_id=${userId}
   OFFSET 1 LIMIT 4 ORDER BY dateTime;`;
  const tweetQuery = await db.all(tweetUserQuery);
  response.send(tweetQuery);
});
//API-4
app.get("/user/following/", authenticateToken, async (request, response) => {
  let { username } = request;
  const loginUserQuery = `SELECT * FROM user WHERE username='${username}';`;
  const loginUser = await db.get(loginUserQuery);
  const userId = loginUser.user_id;
  const userFollows = `SELECT user.name as name FROM follower INNER JOIN user ON follower.following_user_id=user.user_id WHERE follower.follower_user_id=${userId};`;
  const user_follow = await db.all(userFollows);
  response.send(user_follow);
});
//API-5
app.get("/user/following/", authenticateToken, async (request, response) => {
  let { username } = request;
  const loginUserQuery = `SELECT * FROM user WHERE username='${username}';`;
  const loginUser = await db.get(loginUserQuery);
  const userId = loginUser.user_id;
  const userFollows = `SELECT user.name as name FROM follower INNER JOIN user ON follower.follower_user_id=user.user_id WHERE follower.follower_user_id=${userId};`;
  const user_follow = await db.all(userFollows);
  response.send(user_follow);
});
//API-6
app.get("/tweets/:tweetId/", authenticateToken, async (request, response) => {
  const { tweetId } = request.params;
  let { username } = request;
  const loginUserQuery = `SELECT * FROM user WHERE username='${username}';`;
  const loginUser = await db.get(loginUserQuery);
  const userId = loginUser.user_id;
  const tweetUserId = `SELECT user_id FROM tweet WHERE tweet_id=${tweetId};`;
  const tweetUser_id = await db.get(tweetUserId);
  const tweet_user_id = tweetUser_id.user_id;
  const follower_check = `SELECT * FROM follower WHERE follower_user_id=${userId} AND following_user_id=${tweet_user_id};`;
  const result = await db.get(follower_check);
  if (result === undefined) {
    response.status(401);
    response.send("Invalid Request");
  } else {
    const AllQuery = `SELECT T.tweet,count(T.reply) as replies,count(like.like_id) as likes,T.date_time as dateTime FROM (tweet INNER JOIN reply ON tweet.tweet_id=reply.tweet_id) as T INNER JOIN like ON T.tweet_id=like.tweet_id WHERE tweet.tweet_id=${tweet_user_id};`;
    const Allquery = await db.get(AllQuery);
    response.send(Allquery);
  }
});
//API-7
app.get(
  "/tweets/:tweetId/likes/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    let { username } = request;
    const loginUserQuery = `SELECT * FROM user WHERE username='${username}';`;
    const loginUser = await db.get(loginUserQuery);
    const userId = loginUser.user_id;
    const tweetUserId = `SELECT user_id FROM tweet WHERE tweet_id=${tweetId};`;
    const tweetUser_id = await db.get(tweetUserId);
    const tweet_user_id = tweetUser_id.user_id;
    const follower_check = `SELECT * FROM follower WHERE follower_user_id=${userId} AND following_user_id=${tweet_user_id};`;
    const result = await db.get(follower_check);
    if (result === undefined) {
      response.status(401);
      response.send("Invalid Request");
    } else {
      const AllQuery = `SELECT user.username as likes FROM like INNER JOIN user ON like.user_id=user.user_id WHERE like.tweet_id=${tweet_user_id};`;
      const Allquery = await db.all(AllQuery);
      let namesArr = [];
      console.log(Allquery);
      for (let name of Allquery) {
        namesArr.push(name.likes);
      }
      const replies = {
        likes: namesArr,
      };
      response.send(replies);
    }
  }
);
//API-8
app.get(
  "/tweets/:tweetId/replies/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    let { username } = request;
    const loginUserQuery = `SELECT * FROM user WHERE username='${username}';`;
    const loginUser = await db.get(loginUserQuery);
    const userId = loginUser.user_id;
    const tweetUserId = `SELECT user_id FROM tweet WHERE tweet_id=${tweetId};`;
    const tweetUser_id = await db.get(tweetUserId);
    const tweet_user_id = tweetUser_id.user_id;
    const follower_check = `SELECT * FROM follower WHERE follower_user_id=${userId} AND following_user_id=${tweet_user_id};`;
    const result = await db.get(follower_check);

    if (result === undefined) {
      response.status(401);
      response.send("Invalid Request");
    } else {
      const AllQuery = `SELECT user.name as name,reply.reply as reply FROM reply INNER JOIN user ON reply.user_id=user.user_id WHERE reply.tweet_id=${tweet_user_id};`;
      const Allquery = await db.all(AllQuery);
      const replies = {
        replies: Allquery,
      };
      response.send(replies);
    }
  }
);
//API-9
app.get("/user/tweets/", authenticateToken, async (request, response) => {
  let { username } = request;
  const loginUserQuery = `SELECT * FROM user WHERE username='${username}';`;
  const loginUser = await db.get(loginUserQuery);
  const userId = loginUser.user_id;
  const userTweets = `SELECT T.tweet as tweet,count(like.like_id) as likes,count(T.reply) as replies, T.date_time as dateTime FROM (tweet INNER JOIN reply ON tweet.user_id=reply.user_id) as T INNER JOIN like ON T.user_id=like.user_id WHERE tweet.user_id=${userId};`;

  const userTweet = await db.all(userTweets);
  response.send(userTweet);
});
//ApI-10
app.post("/user/tweets/", authenticateToken, async (request, response) => {
  const { tweet } = request.body;
  const AddQuery = `INSERT INTO tweet (tweet) VALUES ('${tweet}');`;
  const addQuery = await db.run(AddQuery);
  response.send("Created a Tweet");
});
//API-11
app.delete(
  "/tweets/:tweetId/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    let { username } = request;
    const loginUserQuery = `SELECT * FROM user WHERE username='${username}';`;
    const loginUser = await db.get(loginUserQuery);
    const userId = loginUser.user_id;
    const deleteOthers = `SELECT * FROM tweet WHERE tweet.tweet_id=${tweetId} AND tweet.user_id=${userId};`;
    const tweet = await db.all(deleteOthers);
    if (tweet === undefined) {
      response.status(401);
      response.send("Invalid Request");
    } else {
      const deleteQuery = `DELETE FROM tweet WHERE tweet_id=${tweetId};`;
      const deleted = await db.run(deleteQuery);
      response.send("Tweet Removed");
    }
  }
);
