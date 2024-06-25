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
const { where } = require("sequelize");

// router.use(requireAuth);
router.get("/", async (req, res, next) => {
  const events = await Event.findAll({
    include: [
      { model: Group, attributes: ["id", "name", "city", "state"] },
      { model: Venue, attributes: ["id", "city", "state"] },
    ],
  });
  res.json(events);
});

router.get("/:eventId", exists, async (req, res, next) => {
  const event = await Event.findByPk(req.params.eventId, {
    include: [
      { model: Group, attributes: ["id", "name", "private", "city", "state"] },
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
  res.json(event);
});

router.post("/:eventId/images", fullCheck(), async (req, res, next) => {
  const { event } = req;
  try {
    const image = await event.createImage(req.body);
    const safeImage = image.toJSON();
    res.json({
      id: safeImage.id,
      url: safeImage.url,
      preview: safeImage.preview,
    });
  } catch (err) {
    err.status = 400;
    next(err);
  }
});

router.put("/:eventId", fullCheck(), async (req, res, next) => {
  const { event } = req;
  try {
    await event.update(req.body);

    const data = await Event.findByPk(event.id, {
      include: { model: Venue },
      attributes: { exclude: ["createdAt", "updatedAt"] },
    });

    res.json({ Event: data });
  } catch (err) {
    err.status = 400;
    next(err);
  }
});
router.delete(
  "/:eventId",
  fullCheck("organizer", "co-host"),
  async (req, res, next) => {
    const { event } = req;
    try {
      console.log("we made it");
      // await event.destroy();
      await Event.destroy({
        where: {
          id: event.id,
        },
      });
      res.json({ message: "Successfully deleted" });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/:eventId/attendees", exists, async (req, res, next) => {
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
      return { ...user.toJSON().User, ...user.toJSON().Event_Members[0] };
    });
    return res.json({ Attendees: flatten });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/:eventId/attendance",
  fullCheck("organizer", "co-host", "member"),
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
        err.title = "Validation Error"
        err.message =
        alreadyDid.toJSON().status == "pending"
            ? "Attendance has already been requested"
            : "User is already an attendee of the event";
        throw err;
      }
      const data = await validMembership.createEvent_Member({
        eventId: event.id,
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;