import { Router } from "express";
import {
  signup,
  login,
  refreshTokens,
  getUser,
  updateUser,
  updatePassword,
  userRole,
} from "../modules/users/user.controller";
import { verifyToken } from "../middlewares/auth";

const router = Router();

// públicas
router.post("/signup", signup);
router.post("/login", login);
router.post("/refreshtokens", refreshTokens);

// protegidas
router.get("/getuser", verifyToken, getUser);
router.put("/updateuser", verifyToken, updateUser);
router.put("/updatepassword", verifyToken, updatePassword);
router.get("/userrole", verifyToken, userRole);

export default router;
