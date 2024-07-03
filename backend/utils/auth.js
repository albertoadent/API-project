const jwt = require("jsonwebtoken");
const { jwtConfig } = require("../config");
const {
  User,
  Venue,
  Group,
  Group_Member,
  Sequelize,
  Event,
  Event_Member,
  Image,
  Event_Image,
  Group_Image,
} = require("../db/models");
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
  return _res.status(err.status).json({
    message: "Authentication required",
  });
  return next(err);
};

const getGroups = async (instance, Model) => {
  if (!instance) throw new Error("instance is null");
  console.log(instance.toJSON(), Model.name, "in get groups function");
  switch (Model) {
    case User:
    case Image:
      return instance.getGroups();
    case Group:
      return [instance];
    case Group_Member:
    case Group_Image:
    case Event:
    case Venue:
      const group = await instance.getGroup();
      return [group];
    case Event_Image:
      const event = await instance.getEvent();
      return getGroups(event, Event);
    case Event_Member:
      const membership = await instance.getGroup_Member();
      return getGroups(membership, Group_Member);
    default:
      throw new Error("relationship not supported for this model");
  }
};

const hasAccess = async (group, user, clearance = ["organizer"]) => {
  console.log(
    group.toJSON(),
    user.toJSON(),
    clearance,
    "in has access function"
  );
  const [hasClearance] = await user.getGroup_Members({
    where: {
      groupId: group.id,
      role: { [Sequelize.Op.in]: clearance },
    },
  });
  return !!hasClearance;
};

const checkUserAccessTo = async (user, Model, modelId, clearance) => {
  console.log(
    user.toJSON(),
    Model.name,
    modelId,
    clearance,
    "in check user access to function"
  );
  const instance = await Model.findByPk(modelId); //should be checked by exists
  if (!instance) {
    return false;
  }
  if (Model === User) {
    await populateUser(instance);
  }
  const groups = await getGroups(instance, Model);
  if (!groups[0]) return false;
  for (const group of groups) {
    const hasAccessBool = await hasAccess(group, user, clearance);
    if (hasAccessBool) return true;
  }
  return false;
};

const clearForAccess = (allowedRoles) => async (req, res, next) => {
  await populateUser(req.user);
  const paramArray = Object.keys(req.params);
  console.log(paramArray, allowedRoles, "In clear for access function");
  try {
    for (const param of paramArray) {
      const modelName =
        param.charAt(0).toUpperCase() + param.slice(1, param.indexOf("Id"));
      const Model = require(`../db/models`)[modelName];
      const isClear = await checkUserAccessTo(
        req.user,
        Model,
        req.params[param],
        allowedRoles
      );
      if (!isClear) {
        console.log("not clear");
        return res.status(403).json({ message: "Forbidden" });
      }
      console.log("clear");
    }
    return next();
  } catch (err) {
    next(err);
  }
};

const populateUser = async (user) => {
  const memberships = await user.getGroup_Members({
    attributes: ["id", "groupId", "userId", "role"],
  });
  console.log(memberships.map((em) => em.toJSON()));
  user.memberships = memberships;

  let validGroupIds = memberships.map((membership) => membership.groupId);

  const attendances = await Promise.all(
    memberships.flatMap(async (member) => {
      const attendances = await Event_Member.findAll({
        attributes: ["id", "groupMemberId", "eventId"],
        where: {
          groupMemberId: member.id,
        },
      });

      return attendances.map((attend) => attend);
    })
  );
  user.attendances = attendances.flatMap((attendace) =>
    attendace.map((ele) => ele)
  );

  console.log(user.attendances.map((e) => e.toJSON()));
};

const isAuthorizedMember =
  (allowedRoles = ["organizer"], CheckModel = Group) =>
  async (req, res, next) => {
    try {
      const { user } = req;
      // console.log(allowedRoles);

      const memberships = await user.getGroup_Members({
        attributes: ["id", "groupId", "userId", "role"],
        where: {
          role: { [Sequelize.Op.in]: allowedRoles },
        },
      });

      // console.log(memberships);
      user.memberships = memberships;

      let validGroupIds = memberships.map((membership) => membership.groupId);

      const attendances = await Promise.all(
        memberships.flatMap(async (member) => {
          const attendances = await member.getEvent_Members({
            attributes: ["id", "groupMemberId", "eventId"],
          });
          return attendances.map((attend) => attend);
        })
      );

      user.attendances = attendances.flatMap((attendace) =>
        attendace.map((ele) => ele)
      );
      // console.log(user.attendances);
      let validEventIds = attendances.flatMap((attendace) =>
        attendace.map((ele) => ele.eventId)
      );

      // console.log("attendances",user.attendances)
      // console.log("validEventIds",validEventIds)

      req.validGroupIds = validGroupIds;
      req.validEventIds = validEventIds;

      // console.log(req.params);
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

      // ModelsIdPairs = ModelsIdPairs.filter(([Model, id]) => {
      //   return !(Model === User && user.id == id);
      // });

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
            attributes: ["id", "groupId", "userId"],
            where: {
              groupId: { [Sequelize.Op.in]: validGroupIds },
            },
          });

          const userAttendances = await Promise.all(
            userMemberships.map(
              async (member) =>
                await member.getEvent_Members({
                  attributes: ["id", "groupMemberId", "eventId"],
                })
            )
          );

          req.otherUser.memberships = userMemberships;
          req.otherUser.attendances = userAttendances.flatMap((attendace) =>
            attendace.map((ele) => ele)
          );
          // console.log('THIS IS IT =>>>>',req.otherUser.attendances);
          //get other user memberships
          //if any of the group Ids are the same then you have permission to access them

          if (
            (CheckModel === Group && userMemberships.length <= 0) ||
            (CheckModel === Event && userAttendances.length <= 0)
          ) {
            const err = new Error(`You do not have access to this user`);
            err.status = 404;
            throw err;
          }

          if (req.validGroupIds) {
            req.validGroupIds = req.validGroupIds.filter((id) => {
              validGroupIds.includes(id);
            });
          } else {
            req.validGroupIds = validGroupIds;
          }
          if (req.validEventIds) {
            req.validEventIds = req.validEventIds.filter((id) => {
              validEventIds.includes(id);
            });
          } else {
            req.validEventIds = validEventIds;
          }
          return;
        }
        if (Model === CheckModel) {
          if (!validGroupIds.includes(modelInstance.id)) {
            const err = new Error(
              `You do not have access to this ${CheckModel.name.toLowerCase()}`
            );
            err.status = 403;
            throw err;
          }
          return;
        }
        if (Model === Group_Member && CheckModel === Group) {
          if (!validGroupIds.includes(modelInstance.groupId)) {
            const err = new Error(
              `You do not have access to this group member`
            );
            err.status = 403;
            throw err;
          }
          return;
        }
        if (Model === Event_Member && CheckModel === Event) {
          if (!validGroupIds.includes(modelInstance.groupId)) {
            const err = new Error(
              `You do not have access to this event member`
            );
            err.status = 403;
            throw err;
          }
          return;
        }
        //Get memberships from user (already defined as memberships)
        req[Model.name.toLowerCase()] = modelInstance;
        //Get role of user in the common group

        let group;
        let event;
        // console.log(validGroupIds);

        try {
          group = req.group || (await modelInstance.getGroup());
        } catch {
          [group] = await modelInstance.getGroups({
            where: {
              id: { [Sequelize.Op.in]: validGroupIds },
            },
          });
        }

        try {
          event = req.event || (await modelInstance.getEvent());
        } catch {
          [event] = await modelInstance.getEvents({
            where: {
              id: { [Sequelize.Op.in]: validEventIds },
            },
          });
        }
        if (CheckModel === Group) {
          if (!group || !req.validGroupIds.includes(group.id)) {
            const err = new Error(
              `You do not have access to ${Model.name} at id: ${modelId}`
            );
            err.status = 403;
            throw err;
          }

          req.validGroupIds = [group.id];
          req.group = group;
        }
        if (CheckModel === Event) {
          if (!event || !validEventIds.includes(event.id)) {
            const err = new Error(
              `You do not have access to ${Model.name} at id: ${modelId}`
            );
            err.status = 403;
            throw err;
          }

          req.valideventIds = [event.id];
          req.event = event;
        }
      };

      const promises = ModelsIdPairs.map(userIsMemberOfModel);

      await Promise.all(promises);
      next();
    } catch (err) {
      if (err.status === 403) {
        return res.status(403).json({ message: "Forbidden" });
      }
      next(err);
    }
  };

const exists = (messageModel) => async (req, res, next) => {
  try {
    const promises = Object.keys(req.params).map(async (modelId) => {
      let modelName = modelId.replace("Id", "");
      const capitalizedModelName =
        modelName.charAt(0).toUpperCase() + modelName.slice(1);
      const Model = require(`../db/models`)[capitalizedModelName];
      // console.log(Model);
      const modelInstance = await Model.findByPk(req.params[modelId]);
      console.log("modelInstance");
      if (!modelInstance) {
        err = new Error(
          `${
            messageModel ? messageModel.name : capitalizedModelName
          } couldn't be found`
        );
        err.status = 404;
        throw err;
      }
      if (modelName === "user") {
        await populateUser(modelInstance);
        req.otherUser = modelInstance;
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

const fullCheck = (allowedRoles = ["organizer"]) => [
  requireAuth,
  exists(),
  clearForAccess(allowedRoles),
];

// backend/utils/auth.js
// ...

module.exports = {
  setTokenCookie,
  restoreUser,
  requireAuth,
  exists,
  clearForAccess,
  fullCheck,
};
