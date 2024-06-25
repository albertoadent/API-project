const express = require("express");
const router = express.Router();
const {Event} = require('../../db/models');

const { fullCheck } = require("../../utils/auth.js");


router.delete(
  "/:imageId",
  fullCheck(["organizer", "co-host"],Event),
  async (req, res, next) => {
    try {
      await req.image.destroy();
      return res.json({
        message: "Successfully deleted",
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;