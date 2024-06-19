// backend/routes/api/index.js
const router = require("express").Router();

const { restoreUser, requireAuth,setTokenCookie } = require("../../utils/auth.js");

const { User } = require("../../db/models");
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


router.get(
  '/require-auth',
  requireAuth,
  (req, res) => {
    return res.json(req.user);
    }
    );
    
    */

// restore the surrect user session to req.user
//all routes that don't require authentication

router.use(restoreUser);

router.get("/restore-user", (req, res) => {
  return res.json(req.user);
});

router.post("/test", (req, res) => {
  res.json({ requestBody: req.body });
});

router.get("/set-token-cookie", async (_req, res) => {
  const user = await User.findOne({
    where: {
      username: "Demo-lition",
    },
  });
  setTokenCookie(res, user);
  return res.json({ user: user });
});

const sessionRouter = require("./session");
const usersRouter = require("./users");

router.use("/session", sessionRouter);
router.use("/users", usersRouter);

router.use(requireAuth);

// router.use([() => null]); //all routes that require authentication

module.exports = router;
