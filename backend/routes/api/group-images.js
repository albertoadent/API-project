const express = require("express");
const router = express.Router();

const { fullCheck } = require("../../utils/auth.js");


router.delete(
  "/:imageId",
  fullCheck(["organizer", "co-host"]),
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
