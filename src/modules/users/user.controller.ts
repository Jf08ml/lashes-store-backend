import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import sendResponse from "../../utils/response";
import UserService from "./user.service";
import RoleService from "../roles/role.service";
import UserModel from "./user.model";
import RoleModel from "../roles/role.model";
import CustomErrors from "../../errors/CustomErrors";

// Interfaz personalizada para Request con propiedades adicionales
interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: { id: string; role: string };
  userRole?: string;
  userPermission?: string[];
}

const { NotFoundError, DuplicateKeyError } = CustomErrors;
const { JWT_SECRET = "dev-secret", JWT_REFRESH_SECRET = "dev-refresh" } =
  process.env;

// =================== helpers ===================
function buildTokens(user: any) {
  const roleId = user.role?._id || user.role;
  const token = jwt.sign({ id: user._id, role: roleId }, JWT_SECRET, {
    expiresIn: "1h",
  });
  const refreshToken = jwt.sign(
    { id: user._id, role: roleId },
    JWT_REFRESH_SECRET,
    {
      expiresIn: "24h",
    }
  );

  const tokenDuration = 3600;
  const refreshTokenDuration = 86400;
  const now = new Date();
  const tokenExpiration = new Date(now.getTime() + tokenDuration * 1000);
  const refreshTokenExpiration = new Date(
    now.getTime() + refreshTokenDuration * 1000
  );

  return { token, refreshToken, tokenExpiration, refreshTokenExpiration };
}

// =================== controllers ===================

export async function signup(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const standardRole = await RoleService.getRoles({ name: "Standard" });
    
    if (!standardRole || standardRole.length === 0) {
      console.error("No Standard role found in database");
      return sendResponse(res, 500, null, "Error de configuración: rol Standard no encontrado");
    }

    const userData = {
      email,
      password,
      role: standardRole[0]._id,
    };

    const created = await UserService.createUser(userData);
    const { token, refreshToken } = buildTokens(created);

    const accessToken = { token, refreshToken };
    const data = { user: created, accessToken };

    sendResponse(res, 201, data, "User created successfully");
  } catch (error) {
    console.error("Signup error:", error);
    if (error instanceof DuplicateKeyError) {
      return sendResponse(res, 409, null, error.message);
    }
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body as { email: string; password: string };
    
    const user = await UserService.getUser({ email });
    
    if (!user.passwordHash) {
      return sendResponse(
        res,
        500,
        null,
        "Error interno: usuario sin contraseña configurada."
      );
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendResponse(
        res,
        401,
        null,
        "Verifique credenciales, email o contraseña incorrectos."
      );
    }

    const { token, refreshToken } = buildTokens(user);
    const accessToken = { token, refreshToken };
    const data = { user, accessToken };

    sendResponse(res, 201, data, "The user has logged in successfully.");
  } catch (error) {
    console.error("Login error:", error);
    if (error instanceof NotFoundError) {
      return sendResponse(res, 404, null, error.message);
    }
    next(error);
  }
}

export async function refreshTokens(req: Request, res: Response) {
  try {
    const { refreshTokenUser } = req.body as { refreshTokenUser: string };

    jwt.verify(refreshTokenUser, JWT_REFRESH_SECRET, async (err, decoded) => {
      if (err || !decoded) {
        return res
          .status(401)
          .json({ error: "RefreshTokenError", message: err?.name || "Error" });
      }

      const { id } = decoded as { id: string; role: string };
      const user = await UserModel.findById(id).populate("role");
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const token = jwt.sign(
        { id: user._id, role: user.role._id },
        JWT_SECRET,
        {
          expiresIn: "1h",
        }
      );
      const newRefreshToken = jwt.sign(
        { id: user._id, role: user.role._id },
        JWT_REFRESH_SECRET,
        { expiresIn: "24h" }
      );

      return res
        .status(200)
        .json({ result: "success", token, refreshToken: newRefreshToken });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getUser(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId!;
    const user = await UserModel.findById(userId).select("-passwordHash");
    res.status(200).json({ user });
  } catch {
    res.status(500).json({ message: "Error al obtener el usuario" });
  }
}

export async function updateUser(req: AuthenticatedRequest, res: Response) {
  const { nickname, email } = req.body as { nickname?: string; email?: string };
  try {
    const userId = req.userId!;
    const user = await UserModel.findById(userId);
    if (!user) {
      return res
        .status(401)
        .json({ result: "errorUser", message: "Unauthorized updateUser" });
    }

    // nickname duplicado
    if (nickname) {
      const nicknameExists = await UserModel.findOne({
        nickname,
        _id: { $ne: userId },
      });
      if (nicknameExists) {
        return res
          .status(400)
          .json({
            result: "errorNickname",
            message: "Nickname already exists",
          });
      }
      user.nickname = nickname;
    }

    // email duplicado
    if (email) {
      const emailExists = await UserModel.findOne({
        email,
        _id: { $ne: userId },
      });
      if (emailExists) {
        return res
          .status(400)
          .json({ result: "errorEmail", message: "Email already exists" });
      }
      user.email = email;
    }

    await user.save();
    res.status(200).json({
      result: "success",
      message: "User information updated successfully",
    });
  } catch (err) {
    res.status(500).json({ result: "error", message: String(err) });
  }
}

export async function updatePassword(req: AuthenticatedRequest, res: Response) {
  const { currentPassword, newPassword } = req.body as {
    currentPassword: string;
    newPassword: string;
  };
  try {
    const userId = req.userId!;
    const user = await UserModel.findById(userId);
    if (!user) {
      return res
        .status(401)
        .json({ result: "error", message: "Unauthorized updateUser" });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        result: "errorpassword",
        message: "Invalid password. Please check your password.",
      });
    }

    // usa setter virtual -> re-hash
    // @ts-ignore
    user.password = newPassword;
    await user.save();

    res
      .status(200)
      .json({ result: "success", message: "Password update success" });
  } catch (err) {
    res.status(500).json({ result: "error", message: String(err) });
  }
}

export async function userRole(req: AuthenticatedRequest, res: Response) {
  const rolId = req.userRole!;
  try {
    const response = await RoleModel.findById(rolId);
    res.status(200).json({
      result: "success",
      message: "Role read success",
      rol: response,
    });
  } catch {
    res.status(500).json({ message: "servidor error" });
  }
}
