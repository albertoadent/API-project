const express = require("express");

const {Venue} = require('../../db/models');

const router = express.Router();

const { setTokenCookie, restoreUser,requireAuth } = require("../../utils/auth");

router.use(requireAuth);

router.get('/')


module.exports = router;