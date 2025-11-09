import "dotenv/config";
import { connectDB } from "../src/config/db";
import RoleModel from "../src/modules/roles/role.model";
import UserModel from "../src/modules/users/user.model";

const checkDatabase = async (): Promise<void> => {
  try {
    console.log("🔄 Conectando a la base de datos...");
    await connectDB();

    console.log("\n📋 ROLES:");
    const roles = await RoleModel.find();
    if (roles.length === 0) {
      console.log("❌ No hay roles en la base de datos");
    } else {
      roles.forEach(role => {
        console.log(`✅ ${role.name} (ID: ${role._id})`);
      });
    }

    console.log("\n👥 USUARIOS:");
    const users = await UserModel.find().populate("role");
    if (users.length === 0) {
      console.log("❌ No hay usuarios en la base de datos");
    } else {
      users.forEach(user => {
        console.log(`✅ ${user.email} | Rol: ${(user.role as any)?.name || 'Sin rol'} | PasswordHash: ${!!user.passwordHash}`);
      });
    }

    console.log(`\n📊 Total: ${roles.length} roles, ${users.length} usuarios`);
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
};

// Ejecutar
checkDatabase()
  .then(() => console.log("✅ Verificación completada."))
  .catch((error) => console.error("❌ Error fatal:", error));