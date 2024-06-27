const express = require("express");

const {
  Group,
  Venue,
  Event,
  User,
  Group_Image,
  Image,
  Group_Member,
  sequelize,
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
const { check } = require("express-validator");
const {
  handleValidationErrors,
  validateValidId,
} = require("../../utils/validation");

/*           GET ALL GROUPS               */
router.get("/", async (req, res) => {
  const groups = await Group.findAll({
    include: [
      {
        model: Image,
        attributes: ["url"],
        where: {
          preview: true,
        },
        required: false,
      },
    ],
  });
  const flatten = groups.map((group) => {
    return {
      ...group.toJSON(),
      previewImage: group.toJSON().Images[0]
        ? group.toJSON().Images[0].url
        : null,
      Images: undefined,
    };
  });
  return res.json({ Groups: flatten });
});

/*           GET ALL USER'S GROUPS               */
router.get("/current", [requireAuth], async (req, res) => {
  const { user } = req;
  const groups = await user.getGroups({
    include: [
      {
        model: Image,
        attributes: ["url"],
        where: {
          preview: true,
        },
        required: false,
      },
    ],
  });
  const flatten = groups.map((group) => {
    return {
      ...group.toJSON(),
      previewImage: group.toJSON().Images[0]
        ? group.toJSON().Images[0].url
        : null,
      Images: undefined,
    };
  });
  return res.json({ Groups: flatten });
});

/*           GET GROUP BY ID               */
router.get("/:groupId", [exists()], async (req, res) => {
  const group = await Group.findByPk(req.params.groupId, {
    attributes: { exclude: ["previewImage"] },
  });
  console.log(group.toJSON())

  const GroupImages = await group.getImages({
    attributes: ["id", "url", "preview"],
    joinTableAttributes: [],
  });


  const Organizer = await group.getOrganizer({
    attributes: ["id", "firstName", "lastName"],
  });

  const Venues = await group.getVenues({
    attributes: { exclude: ["createdAt", "updatedAt"] },
  });


  return res.json({ ...group.toJSON(), GroupImages, Organizer, Venues });
});

/*        CREATE GROUP WITH LOGGED IN USER             */

const validate = [
  check("name")
    .isLength({ min: 1, max: 60 })
    .withMessage("Name must be 60 characters or less"),
  check("about")
    .isLength({ min: 50, max: 255 })
    .withMessage("About must be 60 characters or more"),
  check("type")
    .isIn(["Online", "In person"])
    .withMessage("Type must be 'Online' or 'In person'"),
  check("city").exists().withMessage("City is required"),
  check("state").exists().withMessage("State is required"),
  handleValidationErrors,
];

router.post("/", [requireAuth, ...validate], async (req, res, next) => {
  const { user } = req;
  try {
    const group = await user.createGroup(req.body);

    res.status(201).json(group);
  } catch (err) {
    err.status = 400;
    next(err);
  }
});

/*           CREATE IMAGE WITH A GROUP ID              */
router.post("/:groupId/images", fullCheck(), async (req, res, next) => {
  const { groupId } = req.params;
  try {
    const group = await Group.findByPk(groupId);

    const img = await group.createImage(req.body);
    res
      .status(201)
      .json({ ...img.toJSON(), updatedAt: undefined, createdAt: undefined });
  } catch (err) {
    next(err);
  }
});

/*           EDIT A GROUP WITH GROUP ID              */
router.put(
  "/:groupId",
  [...validate, ...fullCheck()],
  async (req, res, next) => {
    const { user } = req;
    const { groupId } = req.params;
    try {
      const group = await Group.findByPk(groupId);
      const data = await group.update({ ...req.body, updatedAt: Date.now() });
      return res.json({ ...data.toJSON(), numMembers: undefined });
    } catch (err) {
      err.status = 400;
      next(err);
    }
  }
);

/*           DELETE GROUP WITH GROUP ID             */
router.delete("/:groupId", fullCheck(), async (req, res, next) => {
  const { groupId } = req.params;
  try {
    const group = await Group.findByPk(groupId);
    await group.destroy();
    return res.status(200).json({ message: "Successfully deleted" });
  } catch (err) {
    next(err);
  }
});

/*           GET VENUES WITH GROUP ID             */
router.get(
  "/:groupId/venues",
  fullCheck(["organizer", "co-host"]),
  async (req, res, next) => {
    const { user, group } = req;
    const venues = await group.getVenues();
    res.json({
      Venues: venues.map((venue) => {
        return {
          ...venue.toJSON(),
          createdAt: undefined,
          updatedAt: undefined,
        };
      }),
    });
  }
);

const validateLatitude = (value) => {
  if (typeof value !== "number") {
    throw new Error("Latitude must be a number");
  }
  if (value < -90 || value > 90) {
    throw new Error("Latitude must be between -90 and 90");
  }
  return true;
};

const validateLongitude = (value) => {
  if (typeof value !== "number") {
    throw new Error("Longitude must be a number");
  }
  if (value < -180 || value > 180) {
    throw new Error("Longitude must be between -180 and 180");
  }
  return true;
};

const venueValidate = [
  check("address").exists().withMessage("Street address is required"),
  check("city").exists().withMessage("City is required"),
  check("state").exists().withMessage("State is required"),
  check("lat")
    .exists()
    .isDecimal({ decimal_digits: "1," })
    .withMessage("Latitude is not valid"),
  check("lng")
    .exists()
    .isDecimal({ decimal_digits: "1," })
    .withMessage("Longitude is not valid"),
  check("lat")
    .exists()
    .custom(validateLatitude)
    .withMessage("Latitude is not valid"),
  check("lng")
    .exists()
    .custom(validateLongitude)
    .withMessage("Longitude is not valid"),
  handleValidationErrors,
];

/*           CREATE VENUE WITH GROUP ID             */
router.post(
  "/:groupId/venues",
  [ ...fullCheck(["organizer", "co-host"],...venueValidate)],
  async (req, res, next) => {
    const { user, group } = req;
    try {
      const venue = await group.createVenue(req.body);
      res.status(201).json({
        ...venue.toJSON(),
        createdAt: undefined,
        updatedAt: undefined,
      });
    } catch (err) {
      err.status = 400;
      next(err);
    }
  }
);

/*           GET EVENTS WITH GROUP ID             */
router.get("/:groupId/events", exists(), async (req, res, next) => {
  const events = await Event.findAll({
    include: [
      { model: Group, attributes: ["id", "name", "city", "state"] },
      { model: Venue, attributes: ["id", "city", "state"] },
      {
        model: Image,
        attributes: ["url"],
        where: {
          preview: true,
        },
        required: false,
      },
    ],
    where: {
      groupId: req.params.groupId,
    },
  });
  const flatten = events.map((event) => {
    const previewImage = event.Images[0] ? event.Images[0].url : null;
    return {
      ...event.toJSON(),
      Images: undefined,
      previewImage,
    };
  });
  res.json({ Events: flatten });
});

/*           CREATE EVENTS WITH GROUP ID             */

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

router.post(
  "/:groupId/events",
  [...fullCheck(["organizer", "co-host"],...eventValidation)],
  async (req, res, next) => {
    const [{ group }, { groupId }, { previewImage }] = [
      req,
      req.params,
      req.body,
    ];
    try {
      const data = await Event.create(
        {
          groupId,
          ...req.body,
        },
        { previewImage }
      );
      res
        .status(201)
        .json({ ...data.toJSON(), updatedAt: undefined, createdAt: undefined });
    } catch (err) {
      err.status = 400;
      next(err);
    }
  }
);

/*           GET MEMBERS WITH GROUP ID             */
router.get("/:groupId/members", [exists()], async (req, res, next) => {
  const [{ group, user }, { groupId }] = [req, req.params];
  try {
    const autorizedRoles = ["organizer", "co-host"];

    const [isAdmin] = await user.getGroup_Members({
      where: {
        role: { [Sequelize.Op.in]: autorizedRoles },
        groupId: groupId,
      },
    });

    autorizedRoles.push("member");

    if (isAdmin) autorizedRoles.push("pending");

    const memberships = await group.getUsers({
      through: {
        where: {
          role: { [Sequelize.Op.in]: autorizedRoles },
        },
      },
    });

    const Members = memberships.map((membership) => {
      return {
        ...membership.toJSON(),
        username: undefined,
        Membership: { status: membership.Group_Member.role },
        Group_Member: undefined,
      };
    });

    res.json({ Members });
  } catch (err) {
    next(err);
  }
});

/*           REQUEST MEMBERSHIP WITH GROUP ID             */
router.post(
  "/:groupId/membership",
  [requireAuth, exists()],
  async (req, res, next) => {
    const [{ group, user }, { groupId }] = [req, req.params];
    try {
      const [membership] = await group.getGroup_Members({
        where: {
          userId: user.id,
        },
      });

      let role = "pending";

      if (membership) {
        if (membership.role === "pending") {
          return res.status(400).json({
            message: "Membership has already been requested",
          });
        }
        return res.status(400).json({
          message: "User is already a member of the group",
        });
      }
      const membershipRequest = { userId: user.id, role };

      const member = await group.createGroup_Member(membershipRequest);

      res.status(201).json({ memberId: user.id, status: member.role });
    } catch (err) {
      next(err);
    }
  }
);
/*           CHANGE MEMBERSHIP STATUS WITH GROUP ID             */
// const validateStatusChange = [
//   check("memberId")
//     .exists().custom(validateValidId(User))
//     .withMessage("User couldn't be found"),
//   check("status")
//     .exists().isIn(["member", "co-host"])
//     .withMessage("Cannot change a membership status to pending"),
//   handleValidationErrors,
// ];

router.put(
  "/:groupId/membership",
  fullCheck(["organizer", "co-host"]),
  async (req, res, next) => {
    const [{ group, user }, { groupId }] = [req, req.params];
    const { memberId, status } = req.body;

    const validStatus = ["member", "co-host"];
    try {
      const otherUser = await User.findByPk(memberId);
      if (!otherUser) {
        const error = new Error("Validation Error");
        error.errors = { memberId: "User couldn't be found" };
        error.status = 400;
        throw error;
      }
      if (!validStatus.includes(status)) {
        const error = new Error("Validation Error");
        error.status = 400;
        error.errors = {
          status: "Invalid Status",
        };
        throw error;
      }
      if (user.id === memberId) {
        const error = new Error("Validation Error");
        error.status = 400;
        error.errors = {
          status: "Cannot update your own status",
        };
        throw error;
      }

      const [userMembership] = user.memberships.filter(
        (member) => member.groupId === group.id
      );

      const [member] = await otherUser.getGroup_Members({
        where: {
          groupId,
        },
      });

      if (status === "pending") {
        const error = new Error("Validation Error");
        error.status = 400;
        error.errors = {
          status: "Cannot change a membership status to pending",
        };
        throw error;
      }
      if (!member) {
        return res.status(404).json({
          message: "Membership between the user and the group does not exist",
        });
      }

      if (status === "co-host" && userMembership.role !== "organizer") {
        const error = new Error(
          "You do not have permission to make somebody co-host"
        );
        error.status = 403;
        throw error;
      }

      const data = await member.update({ userId: memberId, role: status });

      res.json({
        id: data.id,
        groupId: +groupId,
        memberId: memberId,
        status: data.role,
      });
    } catch (err) {
      if (err.errors && err.errors.status) {
        err.errors.status = "Cannot change a membership status to " + status;
      }
      next(err);
    }
  }
);

/*           DELETE MEMBERSHIP WITH GROUP ID             */
router.delete(
  "/:groupId/membership/:userId",
  fullCheck(["organizer", "co-host", "member", "pending"]),
  async (req, res, next) => {
    const [{ group, user, otherUser }, { groupId, userId }] = [req, req.params];
    try {
      const isAdmin = user.id == group.organizerId;
      const isSelf = user.id == userId;
      if (isSelf && isAdmin) {
        const error = new Error("Validation Error");
        error.status = 403;
        error.errors = {
          status: "Cannot delete your membership to your group",
        };
        throw error;
      }
      if (!isAdmin && !isSelf) {
        const error = new Error("Forbidden");
        error.status = 403;
        error.errors = {
          status: "You do not have permission to delete from this group",
        };
        throw error;
      }

      let [deleteMembership] = await otherUser.getGroup_Members({
        where: {
          groupId: groupId,
        },
      });

      if (!deleteMembership) {
        return res.status(404).json({
          message: "Membership does not exist for this User",
        });
      }

      await deleteMembership.destroy();

      return res.json({
        message: "Successfully deleted membership from group",
      });
    } catch (err) {
      next(err);
    }
  }
);

router.use("/:groupId/membership/:userId", (err, req, res, next) => {
  if (
    err.status === 404 &&
    err.message === "You do not have access to this user"
  ) {
    return res.status(404).json({
      message: "Membership does not exist for this User",
    });
  }
  next(err);
});

module.exports = router;
