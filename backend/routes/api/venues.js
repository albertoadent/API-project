const express = require("express");

const { Venue, Group, Group_Member } = require("../../db/models");

const router = express.Router();

const {
  setTokenCookie,
  restoreUser,
  requireAuth,
  exists,
  isAuthorizedMember,
  fullCheck
} = require("../../utils/auth");

// router.use(requireAuth);

/*           EDIT VENUE WITH VENUE ID             */
router.put(
  "/:venueId",
  fullCheck(['organizer','co-host']),
  async (req, res, next) => {
    const { user, venue } = req;
    try {
      const updatedVenue = await venue.update(req.body);
      res.json(updatedVenue);
    } catch (err) {
      err.status = 400;
      next(err);
    }
  }
);

module.exports = router;
