const joi = require('joi');
const updateManager = joi.object().keys({
  employee_id: joi.string().hex().length(32).required(),
  manager_id: joi.string().hex().length(32).required()
});
const updateManagers = joi.array().items(updateManager);
module.exports = updateManagers;