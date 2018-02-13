const joi = require('joi');
const authorizeStaff = joi.object().keys({
  _id: joi.string().hex().length(32).required(),
  app1: joi.string().valid("0", "1").required(),
  app2: joi.string().valid("0", "1").required(),
  app3: joi.string().valid("0", "1").required(),
  app4: joi.string().valid("0", "1").required()
});
const authorizeStaffs = joi.array().items(authorizeStaff);
module.exports = authorizeStaffs;