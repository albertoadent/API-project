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
      res.json(data);
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
      const otherUserMemberIds = otherUser.memberships.map(
        (membership) => {
          return membership.toJSON().id
        }
      );
      // console.log(otherUserMemberIds);
      const [attendance] = await event.getEvent_Members({
        where: {
          groupMemberId:{[Sequelize.Op.in]:otherUserMemberIds}
        },
      });
      // console.log(attendance);
      const isSelf = user.id === otherUser.id;
      const group = await event.getGroup();
      const isAdmin = group.organizerId === user.id;

      if ((isSelf && isAdmin) || (!isSelf && !isAdmin)) {
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
