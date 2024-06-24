const express = require("express");

const { Group, Venue, Event, User } = require("../../db/models");

const router = express.Router();

const {
  setTokenCookie,
  restoreUser,
  requireAuth,
  checkAccessTo,
  /*custom authenticator that checks if 
  the current user has access to the model 
  they are attemting to access*/
  exists,
  isGroupAdmin,
} = require("../../utils/auth");
const user = require("../../db/models/user");
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
router.post(
  "/:groupId/images",
  [exists, requireAuth, isGroupAdmin(["organizer"])],
  async (req, res, next) => {
    const { groupId } = req.params;
    try {
      const group = await Group.findByPk(groupId);

      const img = await group.createImage(req.body);
      res.json(img);
    } catch (err) {
      next(err);
    }
  }
);

/*           EDIT A GROUP WITH GROUP ID              */
router.put(
  "/:groupId",
  [exists, requireAuth, isGroupAdmin(["organizer"])],
  async (req, res, next) => {
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
  }
);

/*           DELETE GROUP WITH GROUP ID             */
router.delete(
  "/:groupId",
  [exists, requireAuth, isGroupAdmin(["organizer"])],
  async (req, res, next) => {
    const { groupId } = req.params;
    try {
      const group = await Group.findByPk(groupId);
      await group.destroy();
      return res.status(200).json({ message: "Successfully deleted" });
    } catch (err) {
      next(err);
    }
  }
);

/*           GET VENUES WITH GROUP ID             */
router.get(
  "/:groupId/venues",
  [requireAuth, exists, isGroupAdmin()],
  async (req, res, next) => {
    const { user, group } = req;
    const venues = await group.getVenues();
    res.json(venues);
  }
);

/*           CREATE VENUE WITH GROUP ID             */
router.post(
  "/:groupId/venues",
  [requireAuth, exists, isGroupAdmin],
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
  [exists, isGroupAdmin()],
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
  [requireAuth, exists, isGroupAdmin()],
  async (req, res, next) => {
    const [{ group, user }, { groupId }] = [req, req.params];
    const { memberId, status } = req.body;
    
    try {

      if (user.id === memberId) {
        const error = new Error("Validation Error");
        error.status = 400;
        error.errors = {
          status: "Cannot update your own status",
        };
        throw error;
      }

      const [userMembership] = await group.getGroup_Members({
        where: {
          userId: user.id,
        },
      });

      const isUser = await User.findByPk(memberId);

      if (status === "pending") {
        const error = new Error("Validation Error");
        error.status = 400;
        error.errors = {
          status: "Cannot change a membership status to pending",
        };
        throw error;
      }
      if (!isUser) {
        const error = new Error("Validation Error");
        error.status = 404;
        error.errors = {
          memberId: "User couldn't be found",
        };
        throw error;
      }

      const [member] = await group.getGroup_Members({
        where: {
          userId: memberId,
        },
      });

      if (!member) {
        const error = new Error(
          "Membership between the user and the group does not exist"
        );
        error.status = 404;
        throw error;
      }

      if (status === "co-host" && userMembership.role !== "organizer") {
        const error = new Error(
          "You do not have permission to make somebody co-host"
        );
        error.status = 403;
        throw error;
      }

      if (status === "co-host" || status === "member") {
        const data = await member.update({ userId: memberId, role: status });

        res.json({
          id: data.id,
          groupId: groupId,
          memberId: memberId,
          status: data.role,
        });
      }

      const error = new Error("Validation Error");
      error.status = 400;
      error.errors = {
        status: "Attempted to update to invalid status",
      };
      throw error;
    } catch (err) {
      next(err);
    }
  }
);

/*           DELETE MEMBERSHIP WITH GROUP ID             */
router.delete(
  "/:groupId/membership/:userId",
  [requireAuth, exists, checkAccessTo(Group)],
  async (req, res, next) => {
    const [{ group, user }, { groupId, userId }] = [req, req.params];
    try {

      
      const organizer = await group.getOrganizer();
      
      console.log(userId,organizer.id,user.id);
      const [deleteMembership] =await group.getGroup_Members({
        where:{
          userId:userId
        }
      });

      if (!deleteMembership) {
        const error = new Error(
          "Membership between the user and the group does not exist"
        );
        error.status = 404;
        throw error;
      }
      
      if (organizer.id == user.id) {
        
        console.log('USER IS ORGANIZER')
        console.log(userId,organizer.id,user.id);

        if (user.id == userId) {
          console.log("ORGANIZER ATTEMPTING TO DELTE THEMSELVES")
          const error = new Error("Validation Error");
          error.status = 400;
          error.errors = {
            status: "Cannot delete your membership to your group",
          };
          throw error;
        }

        console.log("ORGANIZER ATTEMPTING TO DESTROY SOMEONE ELSE")

        await deleteMembership.destroy();

        return res.json({
          "message": "Successfully deleted membership from group"
        })
      }

      if (user.id == userId) {

        await deleteMembership.destroy();

        return res.json({
          "message": "Successfully deleted your membership from group"
        })

      }
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
