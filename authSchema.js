const joi = require('joi');
const auth = joi.object().keys({
  sid: joi.string().required(),
  app1: joi.number().integer().min(0).max(1),
  app2: joi.number().integer().min(0).max(1),
  app3: joi.number().integer().min(0).max(1),
  app4: joi.number().integer().min(0).max(1),
});
const auths = joi.array().items(auth);
module.exports = auths;