const express = require("express");

const {
  Venue,
  User,
  Group,
  Group_Member,
  Event_Member,
  Event,
  Event_Image,
  Image,
  Sequelize,
} = require("../../db/models");

const router = express.Router();

const {
  setTokenCookie,
  restoreUser,
  requireAuth,
  exists,
  isAuthorizedMember,
  fullCheck,
} = require("../../utils/auth");
const event = require("../../db/models/event");
const { check } = require("express-validator");
const {
  handleValidationErrors,
  validateValidId,
} = require("../../utils/validation");

const goodQuery = [
  check("page")
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage(
      "Page must be greater than or equal to 1 and less than or equal to 10"
    ),
  check("size")
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage(
      "Size must be greater than or equal to 1 and less than or equal to 20"
    ),
  check("name").optional().isString().withMessage("Name must be a string"),
  check("type")
    .optional()
    .isIn(["Online", "In person"])
    .withMessage("Type must be 'Online' or 'In person'"),
  check("startDate")
    .optional()
    .isDate()
    .withMessage("Start date must be a valid datetime"),
  handleValidationErrors,
];

router.get("/", goodQuery, async (req, res, next) => {
  try {
    let { page = 1, size = 20, name, type, startDate } = req.query;
    page = parseInt(page);
    size = parseInt(size);

    const options = { where: {} };
    options.limit = size;
    options.offset = size * (page - 1);

    if (name) {
      options.where.name = { [Sequelize.Op.like]: "%" + name + "%" };
    }
    if (type) {
      options.where.type = { [Sequelize.Op.like]: "%" + type + "%" };
    }
    if (startDate) {
      options.where.startDate = {
        [Sequelize.Op.gt]: startDate,
      };
    }

    const events = await Event.findAll({
      attributes: {
        exclude: ["price"],
      },
      include: [
        { model: Group, attributes: ["id", "name", "city", "state"] },
        {
          model: Image,
          attributes: ["url"],
          where: {
            preview: true,
          },
          required: false,
        },
        { model: Venue, attributes: ["id", "city", "state"] },
      ],
      ...options,
    });
    const flatten = events.map((event) => {
      const previewImage = event.Images[0] ? event.Images[0].url : null;
      return {
        ...event.toJSON(),
        Images: undefined,
        previewImage,
      };
    });
    return res.json({ Events: flatten });
  } catch (e) {
    next(e);
  }
});

router.get("/:eventId", exists(), async (req, res, next) => {
  const event = await Event.findByPk(req.params.eventId, {
    attributes: {
      include: ["capacity"],
    },
    include: [
      {
        model: Group,
        attributes: ["id", "name", "private", "city", "state"],
      },
      {
        model: Venue,
        attributes: ["id", "address", "city", "state", "lat", "lng"],
      },
      {
        model: Image,
        through: { model: Event_Image, attributes: [] },
        attributes: ["id", "url", "preview"],
      },
    ],
  });
  res.json({ ...event.toJSON(), EventImages: event.Images, Images: undefined });
});

router.post("/:eventId/images", fullCheck(), async (req, res, next) => {
  const { event } = req;
  try {
    const image = await event.createImage(req.body);
    const safeImage = image.toJSON();
    res.status(201).json({
      id: safeImage.id,
      url: safeImage.url,
      preview: safeImage.preview,
    });
  } catch (err) {
    err.status = 400;
    next(err);
  }
});

const inRange =
  (range = [0, Infinity]) =>
  (num) => {
    const [lower, upper] = range;
    if (num < lower || num > upper) {
      throw new Error("value is not in range");
    }
    return true;
  };

const isAfterDate =
  (field) =>
  (value, { req }) => {
    const comparisonDate = field ? new Date(req.body[field]) : new Date();

    if (new Date(value) <= comparisonDate) {
      throw new Error("Date must be in the future");
    }

    return true;
  };

const eventValidation = [
  check("venueId")
    .optional()
    .custom(validateValidId(Venue))
    .withMessage("Venue does not exist"),
  check("name")
    .exists()
    .isLength({ min: 5 })
    .withMessage("Name must be at least 5 characters"),
  check("type")
    .exists()
    .isIn(["Online", "In person"])
    .withMessage("Type must be Online or In person"),
  check("capacity").exists().isInt().withMessage("Capacity must be an integer"),
  check("price").exists().isDecimal().withMessage("Price is invalid"),
  check("price").exists().custom(inRange()).withMessage("Price is invalid"),
  check("description").exists().withMessage("Description is required"),
  check("startDate")
    .exists()
    .custom(isAfterDate())
    .withMessage("Start date must be in the future"),
  check("endDate")
    .exists()
    .custom(isAfterDate("startDate"))
    .withMessage("End date is less than start date"),
  check("previewImage")
    .optional()
    .isString()
    .withMessage("provide a valid url"),
  handleValidationErrors,
];

router.put(
  "/:eventId",
  [eventValidation, ...fullCheck(['organizer','co-host'])],
  async (req, res, next) => {
    const { event } = req;
    try {
      await event.update(req.body);

      const data = await Event.findByPk(event.id, {
        attributes: {
          exclude: ["createdAt", "updatedAt", "numAttending"],
          include: ["capacity"],
        },
      });

      res.json(data);
    } catch (err) {
      err.status = 400;
      next(err);
    }
  }
);
router.delete(
  "/:eventId",
  fullCheck(["organizer", "co-host"]),
  async (req, res, next) => {
    const { event } = req;
    try {
      console.log("we made it");
      // await event.destroy();
      await event.destroy();
      res.json({ message: "Successfully deleted" });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/:eventId/attendees", exists(), async (req, res, next) => {
  try {
    const { event, user } = req;
    const group = await event.getGroup();
    const [groupAdmin] = await Group_Member.findAll({
      where: {
        groupId: group.id,
        role: { [Sequelize.Op.in]: ["organizer", "co-host"] },
        userId: user.id,
      },
    });
    const where = { status: { [Sequelize.Op.not]: "pending" } };
    const users = await Group_Member.findAll({
      attributes: [],
      include: [
        {
          model: User,
          attributes: ["id", "firstName", "lastName"],
        },
        {
          model: Event_Member,
          attributes: ["status"],
          where: groupAdmin ? undefined : where,
        },
      ],
      where: {
        groupId: group.id,
      },
    });
    const flatten = users.map((user) => {
      return {
        ...user.toJSON().User,
        Attendance: { ...user.toJSON().Event_Members[0] },
      };
    });
    return res.json({ Attendees: flatten });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/:eventId/attendance",
  fullCheck(["organizer", "co-host", "member"]),
  async (req, res, next) => {
    const { event, user } = req;
    const [validMembership] = user.memberships.filter(
      (membership) => membership.groupId === event.groupId
    );
    try {
      const [alreadyDid] = await validMembership.getEvent_Members({
        where: {
          eventId: event.id,
        },
      });
      if (alreadyDid) {
        const err = new Error("Validation Error");
        err.status = 400;
        err.title = "Validation Error";
        err.message =
          alreadyDid.toJSON().status == "pending"
            ? "Attendance has already been requested"
            : "User is already an attendee of the event";
        throw err;
      }
      const data = await validMembership.createEvent_Member({
        eventId: event.id,
      });
      res.status(201).json({...data.toJSON(),createdAt:undefined,updatedAt:undefined});
    } catch (err) {
      next(err);
    }
  }
);

const setParams = (req, res, next) => {
  if (req.body.userId) {
    req.params.userId = req.body.userId;
  }
  next();
};

router.put(
  "/:eventId/attendance",
  [setParams, ...fullCheck(["organizer", "co-host"])],
  async (req, res, next) => {
    // const [validMembership] = user.memberships.filter(
    //   (membership) => membership.groupId === event.groupId
    // );
    const { event, user, otherUser } = req;

    try {
      const [attendance] = otherUser.attendances.filter(
        (attend) => attend.eventId === event.id
      );

      // const otherUser = await User.findByPk(req.body.userId);

      if (!attendance) {
        const err = new Error("Validation Error");
        err.status = 400;
        err.title = "Validation Error";
        err.message = "Attendance between the user and the event does not exist";
        throw err;
      }

      if (req.body.status === "pending") {
        const err = new Error("Validation Error");
        err.status = 400;
        err.title = "Validation Error";
        err.message = "Cannot change an attendance status to pending";
        throw err;
      }

      const updatedData = await attendance.update(req.body, {
        attributes: ["id", "eventId", "status"],
      });
      res.json({
        ...updatedData.toJSON(),
        updatedAt: undefined,
        groupMemberId: undefined,
        userId: otherUser.id,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/:eventId/attendance/:userId",
  fullCheck(["organizer", "co-host", "member", "pending"]),
  async (req, res, next) => {
    try {
      const { event, user, otherUser } = req;
      // otherUser.memberships = await otherUser.getGroup_Members();
      // console.log(otherUser.memberships);
      const otherUserMemberIds = otherUser.memberships.map((membership) => {
        return membership.toJSON().id;
      });
      // console.log(otherUserMemberIds);
      const [attendance] = await event.getEvent_Members({
        where: {
          groupMemberId: { [Sequelize.Op.in]: otherUserMemberIds },
        },
      });
      // console.log(attendance);
      const isSelf = user.id === otherUser.id;
      const group = await event.getGroup();
      const isAdmin = group.organizerId === user.id;
      
      // console.log(otherUser.toJSON(),user.toJSON(),group.organizerId)
      if ((!isAdmin) && (!isSelf)) {
        return res.status(404).json({
          message: "Only the User or organizer may delete an Attendance",
        });
      }

      if (!attendance) {
        return res.status(403).json({
          message: "Attendance does not exist for this User",
        });
      }

      await attendance.destroy();

      return res.json({
        message: "Successfully deleted attendance from event",
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
