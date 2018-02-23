const Promise = require("bluebird");
const _ = require("lodash");
const mySQLX = require('@mysql/xdevapi');
const joi = require('joi');
const express = require("express");
const cors = require("cors");
const compression = require('compression');
const bodyParser = require("body-parser");
const jwt = require("express-jwt");
const authorizeStaffSchema = require("./authorizeStaffSchema.js");
const updateManagerSchema = require("./updateManagerSchema.js");

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
  else { res.sendStatus(500); }
});
app.listen(5353);

let db;

const getDate = () => new Date().toISOString(); // Get current timestamp
const getAllStaffByManager = async (managerSID) => { // Get all auth records by manager
  let records = [];
  await db.find(`$.managerSID == ${JSON.stringify(managerSID)}`)
    .execute((doc) => { if (doc) records.push(doc); });
  return records;
}
const getAllStaff = async () => { // Get all auth records
  let records = [];
  await db.find("true").execute((doc) => { if (doc) records.push(doc); });
  return records;
}
const getActiveStaffByManager = async (managerSID) => { // Get active/noManager auth records by manager
  let records = [];
  await db.find(`($.status IN ('active','assignedManager')) && ($.managerSID == ${JSON.stringify(managerSID)})`)
    .execute((doc) => { if (doc) records.push(doc); });
  return records;
}
const validateAuthorizeStaff = async (postedAuths, managerSID) => { // Returns true if validation passed
  const { error, value } = joi.validate(postedAuths, authorizeStaffSchema);
  if (error) return false;
  const allowedRecords = await getActiveStaffByManager(managerSID);
  const keyedAllowedRecords = _.keyBy(allowedRecords, "_id");
  return postedAuths.every((postedAuth) => ( keyedAllowedRecords[postedAuth._id] ))
}
const authorizeStaff = (postedAuth) => {
  const time = getDate();
  db.modify(`$._id = ${JSON.stringify(postedAuth._id)}`)
    .set('$.app1', postedAuth.app1).set('$.app2', postedAuth.app2)
    .set('$.app3', postedAuth.app3).set('$.app4', postedAuth.app4)
    .set('$.lastUpdated', time).set('$.lastApproved', time).execute();
}
const validateUpdateManager = async (postedUpdates) => { // Returns true if validation passed
  const { error, value } = joi.validate(postedUpdates, updateManagerSchema);
  return !error;
}
const updateManager = async (postedUpdate) => {
  let time = getDate(), managerRecord;
  await db.find(`$._id = ${JSON.stringify(postedUpdate.manager_id)}`)
    .execute((doc) => { if (doc) managerRecord = doc; });
  if (managerRecord) db.modify(`$._id = ${JSON.stringify(postedUpdate.employee_id)}`)
    .set('$.managerSID', managerRecord.sid).set('$.lastUpdated', time)
    .set('$.managerFullName', managerRecord.fullName)
    .set('$.status', 'assignedManager').execute();
}

(async () => {

	// Connect to MySQL
  const session = await mySQLX.getSession({ host: 'localhost', port: 33061, dbUser: 'root', dbPassword: '5@nj0$3@', ssl: false });
  db = session.getSchema('paas').getCollection('authorizations');
  
  router.route("/auth")
    .get(async (req, res) => { // Get auth records for a manager's staff
      if (!req.user.roles.includes("PAAS Manager")) return res.sendStatus(401);
      let staffRecords = await getAllStaffByManager(req.user.sid);
      return res.json(staffRecords);
    })
    .post(async (req, res) => { // Update the auth records for a manager's staff
      if (!req.user.roles.includes("PAAS Manager")) return res.sendStatus(401);
      if (!(await validateAuthorizeStaff(req.body, req.user.sid))) return res.sendStatus(422);
      req.body.forEach(postedAuth => authorizeStaff(postedAuth));
      return res.sendStatus(204);
    });
  router.route("/report")
    .get(async (req, res) => { // Get all auth records for reporting
      if (!req.user.roles.some(role => role === "PAAS Security" || role === "PAAS HR")) return res.sendStatus(401);
      let userRecords = await getAllStaff();
      return res.json(userRecords);
    });
  router.route("/manager")
    .post(async (req, res) => { // Update the manager for staff
      if (!req.user.roles.includes("PAAS Security")) return res.sendStatus(401);
      if (!(await validateUpdateManager(req.body))) return res.sendStatus(422);
      req.body.forEach(postedUpdate => updateManager(postedUpdate));
      return res.sendStatus(204);
    });
})();