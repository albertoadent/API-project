const { validationResult } = require("express-validator");
const { Model } = require("sequelize");

// middleware for formatting errors from express-validator middleware
// (to customize, see express-validator's documentation)
const handleValidationErrors = (req, _res, next) => {
  const validationErrors = validationResult(req);

  if (!validationErrors.isEmpty()) {
    const errors = {};
    validationErrors
      .array()
      .forEach((error) => (errors[error.path] = error.msg));

    const err = Error("Bad request");
    err.errors = errors;
    err.status = 400;
    err.title = "Bad request";
    next(err);
  }
  next();
};

const validateValidId = (model) => async (id) => {
  if(id === null)return
  if (typeof model == "function" && model.prototype instanceof Model) {
    const instance = await model.findByPk(id);
    if (!instance){
      throw new Error(`id: ${id} is not a valid id in the ${model.name} model`);
    }
  } else if (typeof model === 'string') {
    // Try to require the model by its name
    const models = require('../db/models');
    const ModelClass = models[model.charAt(0).toUpperCase() + model.slice(1)];
    
    if (!ModelClass || !(ModelClass.prototype instanceof Model)) {
      throw new Error(`Model ${model} is not defined`);
    }

    const instance = await ModelClass.findByPk(id);
    if (!instance) {
      throw new Error(`ID: ${id} is not a valid ID in the ${ModelClass.name} model`);
    }
  } else {
    throw new Error(`Invalid model type provided: ${model}`);
  }
};

module.exports = {
  handleValidationErrors,
  validateValidId,
};
