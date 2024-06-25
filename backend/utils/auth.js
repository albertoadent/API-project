const jwt = require("jsonwebtoken");
const { jwtConfig } = require("../config");
const { User, Group, Group_Member, Sequelize } = require("../db/models");
const { check } = require("express-validator");

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

const isAuthorizedMember =
  (allowedRoles = ["organizer"]) =>
  async (req, res, next) => {
    try {
      const { user } = req;
      const memberships = await user.getGroup_Members({
        where: {
          role: { [Sequelize.Op.in]: allowedRoles },
        },
      });

      if (memberships && memberships.length > 0) {
        user.memberships = memberships;
      }
      let validGroupIds = memberships.map((membership) => membership.groupId);

      req.validGroupIds = validGroupIds;

      const idNames = Object.keys(req.params);

      const extractModelFromKey = (key) => {
        const modelName = key.replace("Id", "");
        return require("../db/models")[
          modelName.charAt(0).toUpperCase() + modelName.slice(1)
        ];
      };

      let ModelsIdPairs = idNames.map((key) => [
        extractModelFromKey(key),
        req.params[key],
      ]);

      ModelsIdPairs = ModelsIdPairs.filter(([Model, id]) => {
        return !(Model === User && user.id == id);
      });

      const userIsMemberOfModel = async ([Model, modelId]) => {
        //need a different approach for a User model
        const modelInstance = await Model.findByPk(modelId);

        if (!modelInstance) {
          const err = new Error(
            `${Model.name} does not exist at id: ${modelId}`
          );
          err.status = 404;
          throw err;
        }

        if (Model === User) {
          //get user memberships and filter for the ones that have the required role
          req.otherUser = modelInstance;
          
          const userMemberships = await modelInstance.getGroup_Members({
            where: {
              groupId: { [Sequelize.Op.in]: validGroupIds },
            },
          });
          //get other user memberships
          //if any of the group Ids are the same then you have permission to access them
          if (userMemberships.length <= 0) {
            const err = new Error(`You do not have access to this user`);
            err.status = 403;
            throw err;
          }

          if (req.validGroupIds) {
            req.validGroupIds = req.validGroupIds.filter((id) => {
              validGroupIds.includes(id);
            });
          } else {
            req.validGroupIds = validGroupIds;
          }
          return;
        }
        if (Model === Group) {
          if (!validGroupIds.includes(modelInstance.id)) {
            const err = new Error(`You do not have access to this group`);
            err.status = 403;
            throw err;
          }
          return;
        }
        if (Model === Group_Member) {
          if (!validGroupIds.includes(modelInstance.groupId)) {
            const err = new Error(
              `You do not have access to this group member`
            );
            err.status = 403;
            throw err;
          }
          return;
        }
        //Get memberships from user (already defined as memberships)
        req[Model.name.toLowerCase()] = modelInstance;
        //Get role of user in the common group

        const group = await modelInstance.getGroup();

        if (!group || !req.validGroupIds.includes(group.id)) {
          const err = new Error(
            `You do not have access to ${Model.name} at id: ${modelId}`
          );
          err.status = 403;
          throw err;
        }

        req.validGroupIds = [group.id];
      };

      const promises = ModelsIdPairs.map(userIsMemberOfModel);

      await Promise.all(promises);
      next();
    } catch (err) {
      next(err);
    }
  };

const exists = async (req, res, next) => {
  try {
    const promises = Object.keys(req.params).map(async (modelId) => {
      let modelName = modelId.replace("Id",'');
      const capitalizedModelName =
        modelName.charAt(0).toUpperCase() + modelName.slice(1);
      const Model = require(`../db/models`)[capitalizedModelName];
      // console.log(Model);
      const modelInstance = await Model.findByPk(req.params[modelId]);
      if (!modelInstance) {
        err = new Error(
          `${capitalizedModelName} ${req.params[modelId]} does not exist`
        );
        err.status = 404;
        throw err;
      }

      if (!req[modelName]) req[modelName] = modelInstance;
      // console.log(req[modelName]);
    });
    await Promise.all(promises);
    next();
  } catch (err) {
    next(err);
  }
};

const fullCheck = (...allowedRoles) => [
  requireAuth,
  exists,
  isAuthorizedMember(allowedRoles),
];

// backend/utils/auth.js
// ...

module.exports = {
  setTokenCookie,
  restoreUser,
  requireAuth,
  exists,
  isAuthorizedMember,
  fullCheck
};
