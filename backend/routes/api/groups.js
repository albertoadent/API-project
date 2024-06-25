const express = require("express");

const {
  Group,
  Venue,
  Event,
  User,
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
const { Hooks } = require("sequelize/lib/hooks");
const { where } = require("sequelize");

/*           GET ALL GROUPS               */
router.get("/", async (req, res) => {
  const Groups = await Group.findAll();
  return res.json({ Groups });
});

/*           GET ALL USER'S GROUPS               */
router.get("/current", [requireAuth], async (req, res) => {
  const { user } = req;
  const Groups = await user.getGroups();
  return res.json({ Groups });
});

/*           GET GROUP BY ID               */
router.get("/:groupId", [exists], async (req, res) => {
  const group = await Group.findByPk(req.params.groupId, {
    attributes: { exclude: ["previewImage"] },
  });

  const GroupImages = await group.getImages({
    attributes: ["id", "url", "preview"],
    joinTableAttributes: [],
  });

  const Venues = await group.getVenues({
    attributes: { exclude: ["createdAt", "updatedAt"] },
  });

  return res.json({ ...group.toJSON(), GroupImages, Venues });
});

/*        CREATE GROUP WITH LOGGED IN USER             */
router.post("/", requireAuth, async (req, res, next) => {
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
    res.json(img);
  } catch (err) {
    next(err);
  }
});

/*           EDIT A GROUP WITH GROUP ID              */
router.put("/:groupId", fullCheck(), async (req, res, next) => {
  const { user } = req;
  const { groupId } = req.params;
  try {
    const group = await Group.findByPk(groupId);
    const data = await group.update({ ...req.body, updatedAt: Date.now() });
    return res.json({ data });
  } catch (err) {
    err.status = 400;
    next(err);
  }
});

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
  fullCheck("organizer", "co-host"),
  async (req, res, next) => {
    const { user, group } = req;
    const venues = await group.getVenues();
    res.json(venues);
  }
);

/*           CREATE VENUE WITH GROUP ID             */
router.post(
  "/:groupId/venues",
  fullCheck(["organizer", "co-host"]),
  async (req, res, next) => {
    const { user, group } = req;
    try {
      const venue = await group.createVenue(req.body);
      res.json(venue);
    } catch (err) {
      err.status = 400;
      next(err);
    }
  }
);

/*           GET EVENTS WITH GROUP ID             */
router.get("/:groupId/events", exists, async (req, res, next) => {
  const Events = await Event.findAll({
    include: [
      { model: Group, attributes: ["id", "name", "city", "state"] },
      { model: Venue, attributes: ["id", "city", "state"] },
    ],
    where: {
      groupId: req.params.groupId,
    },
  });
  res.json({ Events });
});

/*           CREATE EVENTS WITH GROUP ID             */
router.post(
  "/:groupId/events",
  fullCheck(["organizer", "co-host"]),
  async (req, res, next) => {
    const [{ group }, { groupId }] = [req, req.params];
    try {
      const data = await group.createEvent({ groupId: +groupId, ...req.body });
      res.json(data);
    } catch (err) {
      err.status = 400;
      next(err);
    }
  }
);

/*           GET MEMBERS WITH GROUP ID             */
router.get("/:groupId/members", [exists], async (req, res, next) => {
  const [{ group, user }, { groupId }] = [req, req.params];
  try {
    const members = await group.getMembers();
    const organizer = await group.getOrganizer();
    const coHosts = await group.getCoHosts();

    const data = { organizer, coHosts, members };

    const [membership] = await group.getGroup_Members({
      where: {
        userId: user.id,
      },
    });

    let role = "none";

    if (membership) {
      role = membership.role;
    }

    const autorizedRoles = ["organizer", "co-host"];

    if (autorizedRoles.includes(role)) {
      const pending = await group.getPendings();
      data.pending = pending;
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
});

/*           REQUEST MEMBERSHIP WITH GROUP ID             */
router.post(
  "/:groupId/membership",
  [requireAuth, exists],
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

      res.json({ memberId: user.id, status: member.role });
    } catch (err) {
      next(err);
    }
  }
);
/*           CHANGE MEMBERSHIP STATUS WITH GROUP ID             */
router.put(
  "/:groupId/membership",
  fullCheck("organizer", "co-host"),
  async (req, res, next) => {
    const [{ group, user }, { groupId }] = [req, req.params];
    const { memberId, status } = req.body;

    const validStatus = ["member", "co-host"];
    try {
      const otherUser = await User.findByPk(memberId);
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

      const member = otherUser;

      if (status === "pending") {
        const error = new Error("Validation Error");
        error.status = 400;
        error.errors = {
          status: "Cannot change a membership status to pending",
        };
        throw error;
      }
      if (!member) {
        const error = new Error("Validation Error");
        error.status = 404;
        error.errors = {
          memberId: "Member couldn't be found in group",
        };
        throw error;
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
      next(err);
    }
  }
);

/*           DELETE MEMBERSHIP WITH GROUP ID             */
router.delete(
  "/:groupId/membership/:userId",
  fullCheck("organizer", "co-host", "member", "pending"),
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

      await Group_Member.destroy({
        where: {
          ...deleteMembership.toJSON()
        },
      });

      return res.json({
        message: "Successfully deleted membership from group",
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
