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

const {handleValidationErrors} = require("../../utils/validation");

const {check} = require('express-validator')

// router.use(requireAuth);

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

const validate = [
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

/*           EDIT VENUE WITH VENUE ID             */
router.put(
  "/:venueId",
  [...validate,...fullCheck(['organizer','co-host'])],
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
