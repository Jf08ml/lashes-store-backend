import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import RoleModel from "../modules/roles/role.model";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export async function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.headers["authorization"];
  if (!token) {
    return res
      .status(403)
      .json({ result: "error", message: "No token provided." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      role: string;
    };
    req.userId = decoded.id;
    req.user = { id: decoded.id, role: decoded.role };

    const role = await RoleModel.findById(decoded.role).lean();
    if (!role) {
      return res
        .status(404)
        .json({ result: "error", message: "Role not found." });
    }

    req.userRole = role._id.toString();
    req.userPermission = (role.permissions || []) as string[];
    next();
  } catch (error: any) {
    return res.status(401).json({ result: "error", message: error.message });
  }
}

export const authenticateToken = verifyToken;
export default verifyToken;
