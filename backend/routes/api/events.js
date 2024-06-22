const express = require("express");

const { Venue, Group, Group_Member,Event } = require("../../db/models");

const router = express.Router();

const {
  setTokenCookie,
  restoreUser,
  requireAuth,
  checkAccessTo,
} = require("../../utils/auth");

// router.use(requireAuth);


module.exports = router;