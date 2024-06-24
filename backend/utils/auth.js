const jwt = require("jsonwebtoken");
const { jwtConfig } = require("../config");
const { User, Group } = require("../db/models");

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
  (Model, options = {}, allowedRoles) =>
  async (req, res, next) => {
    const { user } = req;

    let id = req.params[`${Model.name.toLowerCase()}Id`]; //This is the instance we are checking access to

    if (!id) return next();

    let modelInstance = await Model.findByPk(id);

    try {
      if (!modelInstance) {
        const err = new Error(`${Model.name} does not exist at id: ${id}`);
        err.status = 404;
        throw err;
      }
      req[`${Model.name.toLowerCase()}`] =
        req[`${Model.name.toLowerCase()}`] || modelInstance;

      if (options.through) {
        //this is the instance that has access to the user

        const throughId =
          modelInstance[
            options.through.foreignKey ||
              `${options.through.model.name.toLowerCase()}Id`
          ];

        modelInstance = await options.through.model.findByPk(throughId);
        if (!modelInstance) {
          const err = new Error(
            `${options.through.model.name} does not exist at id: ${throughId}`
          );
          err.status = 404;
          throw err;
        }
        req[`${options.through.model.name.toLowerCase()}`]
          ? req[`${options.through.model.name.toLowerCase()}`]
          : modelInstance;
      }
      const foreignKey =
        Model === Group || options.through.model === Group
          ? "organizerId"
          : "userId";
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
                modelInstance.key ? modelInstance.key : modelInstance,
                user,
                allowedRoles
              )
            : validation(
                modelInstance.key ? modelInstance.key : modelInstance,
                user,
                allowedRoles
              );
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  };

const checkAccessGroupMember = async (
  group,
  user,
  allowedRoles = ["co-host", "organizer"]
) => {
  const [member] = await group.getGroup_Members({
    where: {
      userId: user.id,
    },
  });
  // console.log("Getting Group member... =======>>>", member);
  if (!allowedRoles.includes(member.role)) {
    throw new Error("Not organizer or co-host");
  }
};

const isGroupAdmin = (
  allowedRoles = ["co-host", "organizer"],
  model = Group,
  throughModel
) =>
  checkAccessTo(
    model,
    {
      through: throughModel ? { model: throughModel } : undefined,
      validate: {
        checkAccessGroupMember,
      },
    },
    allowedRoles
  );

const exists = async (req, res, next) => {
  try {

    const promises = Object.keys(req.params).map( async (modelId)=>{
      let [modelName] = modelId.split("Id");
      const capitalizedModelName =
        modelName.charAt(0).toUpperCase() + modelName.slice(1);
      const Model = require(`../db/models`)[capitalizedModelName];
      console.log(Model);
      const modelInstance = await Model.findByPk(req.params[modelId]);
      if (!modelInstance) {
        err = new Error(
          `${capitalizedModelName} ${req.params[modelId]} does not exist`
        );
        err.status = 404;
        throw err;
      }
  
      if (!req[modelName]) req[modelName] = modelInstance;
    })
    await Promise.all(promises);
    next();
  } catch (err) {
    next(err);
  }
};

// backend/utils/auth.js
// ...

module.exports = {
  setTokenCookie,
  restoreUser,
  requireAuth,
  checkAccessTo,
  exists,
  isGroupAdmin,
};
