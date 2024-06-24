const express = require("express");

const {
  Venue,
  Group,
  Group_Member,
  Event,
  Event_Image,
  Image,
} = require("../../db/models");

const router = express.Router();

const {
  setTokenCookie,
  restoreUser,
  requireAuth,
  checkAccessTo,
  exists,
  isGroupAdmin,
} = require("../../utils/auth");

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

router.post(
  "/:eventId/images",
  [requireAuth, exists, isGroupAdmin(Event, Group)],
  async (req, res, next) => {
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
  }
);

router.put(
  "/:eventId",
  [requireAuth, exists, isGroupAdmin(Event, Group)],
  async (req, res, next) => {
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
  }
);
router.delete(
  "/:eventId",
  [requireAuth, exists, isGroupAdmin(Event, Group)],
  async (req, res, next) => {
    const { event } = req;
    try {
      await event.destroy();
      res.json({ message: "Successfully deleted" });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;