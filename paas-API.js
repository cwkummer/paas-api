const Promise = require("bluebird");
const _ = require("lodash");
const mySQLX = require('@mysql/xdevapi');
const joi = require('joi');
const express = require("express");
const cors = require("cors");
const compression = require('compression')
const bodyParser = require("body-parser");
const jwt = require("express-jwt");
const authSchema = require("./authSchema.js"); // Schema for post validation

const app = express(); // Express config
app.use(cors());
app.use(compression());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(jwt({ secret: "reactFTW!!!reactFTW!!!reactFTW!!!" }));
const router = express.Router();
app.use("/paas", router);
app.use((err, req, res, next) => { 
  if (err.status===401) { res.sendStatus(401); }
  else { res.status(500).send('Something broke!'); }
});
app.listen(5353);

let db;

const getDate = () => new Date().toISOString(); // Get current timestamp
const getAllStaff = async () => { // Get all auth records
  let records = [];
  await db.find("true").execute((doc) => { if (doc) records.push(doc); });
  return records;
}
const getActiveStaffByManager = async (managerSID) => { // Get active/noManager auth records by manager
  let records = [];
  await db.find(`($.status IN ('active','noManager')) && ($.managerSID == ${JSON.stringify(managerSID)})`)
    .execute((doc) => { if (doc) records.push(doc); });
  return records;
}
const getAllStaffByManager = async (managerSID) => { // Get all auth records by manager
  let records = [];
  await db.find(`$.managerSID == ${JSON.stringify(managerSID)}`)
    .execute((doc) => { if (doc) records.push(doc); });
  return records;
}
const updateStaff = (postedAuth) => {
  let time = getDate();
  db.modify(`($.sid == ${JSON.stringify(postedAuth.sid)}) && ($.status == "active")`)
    .set('$.app1', JSON.stringify(postedAuth.app1)).set('$.app2', JSON.stringify(postedAuth.app2))
    .set('$.app3', JSON.stringify(postedAuth.app3)).set('$.app4', JSON.stringify(postedAuth.app4))
    .set('$.lastUpdated', time).set('$.lastApproved', time)
    .execute();
}
const validatePost = async (postedAuths, managerSID) => {
  const { error, value } = joi.validate(postedAuths, authSchema, { allowUnknown: true });
  if (error) return false;
  const allowedRecords = await getActiveStaffByManager(managerSID);
  const keyedAllowedRecords = _.keyBy(allowedRecords, "sid");
  return postedAuths.every((postedAuth) => ( keyedAllowedRecords[postedAuth.sid] ))
}

(async () => {

	// Connect to MySQL
  const session = await mySQLX.getSession({ host: 'localhost', port: 33061, dbUser: 'root', dbPassword: '5@nj0$3@', ssl: false });
  db = session.getSchema('paas').getCollection('authorizations');
  
  router.route("/") // Routes
    .get(async (req, res) => { // Get auth records for a manager's staff
      if (req.user.roles.includes("PAAS Manager")) {
        console.time("get");
        let staffRecords = await getAllStaffByManager(req.user.sid);
        console.timeEnd("get");
        res.json(staffRecords);
      } else { res.status(401).send("The user is not a member of the PAAS Managers group."); }
    })
    .post(async (req, res) => { // Update the auth records for a manager's staff
      if (req.user.roles.includes("PAAS Manager")) {
        if (await validatePost(req.body, req.user.sid)) {
          let updates = [];
          let time = getDate();
          req.body.forEach(postedAuth => updateStaff(postedAuth) );
          res.sendStatus(204);
        } else { res.status(422).send("The request fails validation."); }
      } else { res.status(401).send("The user is not a member of the PAAS Managers group."); }
    });
  router.route("/reports") // Get all auth records for reporting
    .get(async (req, res) => {
      if (req.user.roles.includes("PAAS Reports")) {
        console.time("getAll");
        let userRecords = await getAllStaff();
        console.timeEnd("getAll");
        res.json(userRecords);
      } else { res.status(401).send("The user is not a member of the PAAS Reports group."); }
    });
})();