const express = require("express");

const { Group } = require("../../db/models");

const router = express.Router();

const {
  setTokenCookie,
  restoreUser,
  requireAuth,
  checkAccessTo,
  /*custom authenticator that checks if 
  the current user has access to the model 
  they are attemting to access*/
} = require("../../utils/auth");

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
router.get("/:groupId", async (req, res) => {
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
  [requireAuth, checkAccessTo(Group, { foregnKey: "organizerId" })],
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

/*           CREATE IMAGE WITH A GROUP ID              */
router.put(
  "/:groupId",
  [requireAuth, checkAccessTo(Group, { foregnKey: "organizerId" })],
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
  [requireAuth, checkAccessTo(Group, { foregnKey: "organizerId" })],
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

const checkAccessGroupMember = async (group, user) => {
  const [member] = await group.getGroup_Members({
    where: {
      userId: user.id,
    },
  });
  // console.log("Getting Group member... =======>>>", member);
  const allowedRoles = ["co-host", "organizer"];
  if (!allowedRoles.includes(member.role)) {
    throw new Error("Not organizer or co-host");
  }
};

/*           GET VENUE WITH GROUP ID             */
router.get(
  "/:groupId/venues",
  requireAuth,
  checkAccessTo(Group, {
    foreignKey: "organizerId",
    validate: {
      hasPermission: checkAccessGroupMember,
    },
  }),
  async (req, res, next) => {
    const { user, group } = req;
    const venues = await group.getVenues();
    res.json(venues);
  }
);

/*           CREATE VENUE WITH GROUP ID             */
router.post(
  "/:groupId/venues",
  requireAuth,
  checkAccessTo(Group, {
    foreignKey: "organizerId",
    validate: {
      hasPermission: checkAccessGroupMember,
    },
  }),
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
module.exports = router;
