import RoleModel from "./role.model";
import CustomErrors from "../../errors/CustomErrors";

const { DatabaseError, NotFoundError } = CustomErrors;

class RoleService {
  async createRole(data: { name: string; permissions?: any[] }) {
    try {
      const doc = new RoleModel(data as any);
      return await doc.save();
    } catch (error) {
      throw new DatabaseError("Error al crear el rol.");
    }
  }

  async getRoles(options: Record<string, unknown> = {}) {
    try {
      const roles = await RoleModel.find(options);
      if (!roles || roles.length === 0)
        throw new NotFoundError("Rol no encontrado.");
      return roles;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError("Error al obtener los roles.");
    }
  }

  // En tu JS había un bug: usaba { options } sin definir.
  async getRole(options: Record<string, unknown>) {
    try {
      const role = await RoleModel.findOne(options);
      if (!role) throw new NotFoundError("Rol no encontrado.");
      return role;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError("Error al obtener el rol.");
    }
  }

  async updateRole(roleId: string, updateData: Record<string, unknown>) {
    try {
      const updated = await RoleModel.findByIdAndUpdate(roleId, updateData, {
        new: true,
      });
      if (!updated)
        throw new NotFoundError("Rol no encontrado para actualizar.");
      return updated;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError("Error al actualizar el rol.");
    }
  }

  async deleteRole(roleId: string) {
    try {
      const deleted = await RoleModel.findByIdAndDelete(roleId);
      if (!deleted) throw new NotFoundError("Rol no encontrado para eliminar.");
      return deleted;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError("Error al eliminar el rol.");
    }
  }
}

export default new RoleService();
