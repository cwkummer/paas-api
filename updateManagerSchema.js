const joi = require('joi');
const updateManager = joi.object().keys({
  _id: joi.string().hex().length(32).required(),
  managerFullName: joi.string().required(),
  managerSID: joi.string().required()
});
const updateManagers = joi.array().items(updateManager);
module.exports = updateManagers;