const express = require("express");
const router = express.Router();
const {Event} = require('../../db/models');

const { requireAuth,exists } = require("../../utils/auth.js");


router.delete(
  "/:imageId",
  [requireAuth,exists()],
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