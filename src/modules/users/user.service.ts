import UserModel, { IUser } from "./user.model";
import { Types } from "mongoose";
import CustomErrors from "../../errors/CustomErrors";

const { DatabaseError, NotFoundError, DuplicateKeyError } = CustomErrors;

class UserService {
  async createUser(data: {
    email: string;
    password: string;
    role: Types.ObjectId;
    nickname?: string;
  }) {
    try {
      const { email } = data;

      const existing = await UserModel.findOne({ $or: [{ email }] });
      if (existing) {
        if (existing.email === email) {
          throw new DuplicateKeyError("El email ya está registrado.");
        }
      }

      const doc = new UserModel({
        email,
        role: data.role,
        nickname: data.nickname,
      } as Partial<IUser>);
      
      // dispara el virtual "password" (hash)
      (doc as any).password = data.password;

      const saved = await doc.save();

      const populated = await UserModel.findById(saved._id)
        .select("-passwordHash") // no exponer hash
        .populate("role")
        .exec();

      return populated!;
    } catch (error: any) {
      console.error("Error in createUser:", error);
      console.error("Error stack:", error.stack);
      
      if (error instanceof DuplicateKeyError) {
        throw error;
      }
      
      // Si es un error de validación de Mongoose, devolver mensaje más específico
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map((err: any) => err.message);
        throw new DatabaseError(`Error de validación: ${validationErrors.join(', ')}`);
      }
      
      if (error.code === 11000) {
        throw new DuplicateKeyError("El email ya está registrado.");
      }
      
      throw new DatabaseError(`Error al crear el usuario: ${error.message}`);
    }
  }

  async getUsers(options: Record<string, unknown> = {}) {
    try {
      return await UserModel.find(options);
    } catch (error) {
      throw new DatabaseError("Error al obtener los usuarios.");
    }
  }

  async getUser(options: Record<string, unknown> = {}) {
    try {
      const user = await UserModel.findOne(options).populate("role").exec();
      if (!user) throw new NotFoundError("Usuario no encontrado.");
      return user;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError("Error al obtener el usuario.");
    }
  }

  async updateUser(userId: string, updateData: Partial<IUser>) {
    try {
      const updated = await UserModel.findByIdAndUpdate(userId, updateData, {
        new: true,
      });
      if (!updated)
        throw new NotFoundError("Usuario no encontrado para actualizar.");
      return updated;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError("Error al actualizar el usuario.");
    }
  }

  async deleteUser(userId: string) {
    try {
      const deleted = await UserModel.findByIdAndDelete(userId);
      if (!deleted)
        throw new NotFoundError("Usuario no encontrado para eliminar.");
      return deleted;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError("Error al eliminar el usuario.");
    }
  }
}

export default new UserService();
