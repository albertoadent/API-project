// backend/routes/api/index.js
const router = require("express").Router();

const { restoreUser, requireAuth } = require("../../utils/auth.js");

/*

router.post("/test", (req, res) => {
  res.json({ requestBody: req.body });
});

// GET /api/set-token-cookie
const {
  setTokenCookie,
  restoreUser,
  requireAuth,
} = require("../../utils/auth.js");

const { User } = require("../../db/models");
router.get("/set-token-cookie", async (_req, res) => {
  const user = await User.findOne({
    where: {
      username: "Demo-lition",
    },
  });
  setTokenCookie(res, user);
  return res.json({ user: user });
});

// GET /api/restore-user

router.use(restoreUser);

router.get("/restore-user", (req, res) => {
  return res.json(req.user);
});

router.get(
  '/require-auth',
  requireAuth,
  (req, res) => {
    return res.json(req.user);
  }
);

*/

// restore the surrect user session to req.user
router.use(restoreUser);

router.use([() => null]); //all routes that don't require authentication

router.use(requireAuth);

router.use([() => null]); //all routes that require authentication

module.exports = router;
