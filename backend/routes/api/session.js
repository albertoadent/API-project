const express = require("express");
const { Op } = require("sequelize");
const bcrypt = require("bcryptjs");

const { setTokenCookie, restoreUser } = require("../../utils/auth");
const { User } = require("../../db/models");
const router = express.Router();

router.post("/", async (req, res, next) => {
  const { username, password, email } = req.body;
  try {
    if (!((username || email) && password))
      throw new Error("insufficient credentials given");
    const credential = username ? username : email;
    const user = await User.unscoped().findOne({
      where: {
        [Op.or]: { username: credential, email: credential },
      },
    });

    const error = new Error("Login failed");
    error.status = 401;
    error.title = "Login failed";

    if (!user) {
      error.errors = { credential: "Invalid Username or email" };
      throw error;
    }
    if (!bcrypt.compareSync(password, user.hashedPassword.toString())) {
      error.errors = { credential: "Incorrect Password" };
      throw error;
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      username: user.username,
    };

    await setTokenCookie(res, safeUser);

    return res.json({ user: safeUser });
  } catch (err) {
    next(err);
  }
});

router.delete("/", (_req, res) => {
  res.clearCookie("token");
  return res.json({ message: "success" });
});

router.get("/", (req, res) => {
  const {user} = req;
  if (user) {
    const safeUser = {
      id: user.id,
      email: user.email,
      username: user.username,
    };
    return res.json({ user: safeUser });
  } else return res.json({ user: null });
});

module.exports = router;
