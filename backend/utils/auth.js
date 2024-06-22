const jwt = require("jsonwebtoken");
const { jwtConfig } = require("../config");
const { User } = require("../db/models");

const { secret, expiresIn } = jwtConfig;

const setTokenCookie = (res, user) => {
  // Create the token.
  const safeUser = {
    id: user.id,
    email: user.email,
    username: user.username,
  };
  const token = jwt.sign(
    { data: safeUser },
    secret,
    { expiresIn: parseInt(expiresIn) } // 604,800 seconds = 1 week
  );

  const isProduction = process.env.NODE_ENV === "production";

  // Set the token cookie
  res.cookie("token", token, {
    maxAge: expiresIn * 1000, // maxAge in milliseconds
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction && "Lax",
  });

  return token;
};

const restoreUser = (req, res, next) => {
  // token parsed from cookies
  const { token } = req.cookies;
  req.user = null;

  return jwt.verify(token, secret, null, async (err, jwtPayload) => {
    if (err) {
      return next();
    }

    try {
      const { id } = jwtPayload.data;
      req.user = await User.findByPk(id, {
        attributes: {
          include: ["email", "createdAt", "updatedAt"],
        },
      });
    } catch (e) {
      res.clearCookie("token");
      return next();
    }

    if (!req.user) res.clearCookie("token");

    return next();
  });
};

const requireAuth = function (req, _res, next) {
  if (req.user) return next();

  const err = new Error("Authentication required");
  err.title = "Authentication required";
  err.errors = { message: "Authentication required" };
  err.status = 401;
  return next(err);
};

/**
 * Middleware to check user access to a resource.
 *
 * @param {object} Model - The Sequelize model to check access against. (make sure that your Id is formatted {modelname}Id)
 * @param {object} options - Must include at least the foreign key that would allow access to the model (defaults to {modelname}Id)
 * @returns {Function} - The middleware function.
 */

const checkAccessTo =
  (Model, options = {}) =>
  async (req, res, next) => {
    const { user } = req;

    let id = req.params[`${Model.name.toLowerCase()}Id`];

    if (!id) return next();

    try {
      if (options.through) {
        const through = await options.through.model.findByPk(id);
        if (!through) {
          const err = new Error(`Through model does not exist at id: ${id}`);
          err.status = 404;
          throw err;
        }
        id = through.id;
      }
      const modelInstance = await Model.findByPk(id);
      if (!modelInstance) {
        const err = new Error(`${Model.name} does not exist at id: ${id}`);
        err.status = 404;
        throw err;
      }
      const foreignKey = options.foreignKey || "userId";
      if (modelInstance[foreignKey] != user.id) {
        const err = new Error(
          `User does not have access to this ${Model.name}`
        );
        err.status = 403;
        throw err;
      }
      if (options.validate) {
        // options.validate.__extra = ()=>null;
        const { key, ...validators } = options.validate;
        // console.log(validators);
        for (const validation of Object.values(validators)) {
          // console.log('Function ==>>>>',validation);
          validation instanceof Promise
            ? await validation(
                modelInstance.key ? modelInstance.key : modelInstance,user
              )
            : validation(modelInstance.key ? modelInstance.key : modelInstance,user);
        }
      }
      req[`${Model.name.toLowerCase()}`] = modelInstance;
      next();
    } catch (err) {
      next(err);
    }
  };

// backend/utils/auth.js
// ...

module.exports = { setTokenCookie, restoreUser, requireAuth, checkAccessTo };
