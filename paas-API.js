const Promise = require("bluebird");
const _ = require("lodash");
const MongoClient = require("mongodb").MongoClient;
const joi = require('joi');
const express = require("express");
const cors = require("cors");
const compression = require('compression')
const bodyParser = require("body-parser");
const jwt = require("express-jwt");

const app = express(); // Express config
app.use(cors());
app.use(compression());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(jwt({ secret: "reactFTW!!!reactFTW!!!reactFTW!!!" }));
const router = express.Router();
app.use("/paas", router);
app.use((err, req, res, next) => { res.status(500).send('Something broke!') });
app.listen(5353);

const url = "mongodb://localhost:27017"; // Mongo config
let users;

const authorizationSchema = require("./authorizationSchema.js"); // Schema for post validation

const getDate = () => new Date().toISOString(); // Get currennt timestamp
const getAllUsers = () => users.find({}).toArray(); // Get all users
const getActiveUsers = (userSID) => users.find({ managerSID: userSID, status: "active" }).toArray(); // Get active users by manager
const getUsers = (userSID) => users.find({ managerSID: userSID }).toArray(); // Get users by manager
const validatePost = async (authorizations, userSID) => {
  const { error, value } = joi.validate(authorizations, authorizationSchema);
  if (error) return false;
  const allowedUsers = await getActiveUsers(userSID);
  const keyedAllowedUsers = _.keyBy(allowedUsers, "sid");
  return authorizations.every((approval) => ( keyedAllowedUsers[approval.sid] ))
}

(async () => {
  const client = await MongoClient.connect(url); // Connect to Mongo
  users = client.db("paas").collection("users");
  router.route("/") // Routes
    .get(async (req, res) => { // Get a manager's users
      if (req.user.roles.includes("PAAS Manager")) {
        let userRecords = await getUsers(req.user.sid);
        res.json(userRecords);
      } else { res.status(401).send("The user is not a member of the PAAS Managers group."); }
    })
    .post(async (req, res) => { // Update the authorizations for a manager's users
      if (req.user.roles.includes("PAAS Manager")) {
        if (await validatePost(req.body, req.user.sid)) {
          let updates = [];
          let time = getDate();
          req.body.forEach(approval => {
            updates.push({ updateOne: { filter: { sid: approval.sid, status: "active" }, update: { $set: { app1: approval.app1, app2: approval.app2, app3: approval.app3, app4: approval.app4, lastUpdated: time, lastApproved: time } } } });
          });
          await users.bulkWrite(updates);
          res.sendStatus(204);
        } else { res.status(422).send("The request fails validation."); }
      } else { res.status(401).send("The user is not a member of the PAAS Managers group."); }
    });
  router.route("/reports") // Get all users for reporting
    .get(async (req, res) => {
      if (req.user.roles.includes("PAAS Reports")) {
        let userRecords = await getAllUsers();
        res.json(userRecords);
      } else { res.status(401).send("The user is not a member of the PAAS Reports group."); }
    });
})();