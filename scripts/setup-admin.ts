import "dotenv/config";
import { connectDB } from "../src/config/db";
import RoleModel from "../src/modules/roles/role.model";
import UserModel from "../src/modules/users/user.model";

const setupAdmin = async (): Promise<void> => {
  try {
    console.log("🔄 Conectando a la base de datos...");
    await connectDB();

    // 1. Crear roles si no existen
    console.log("🔄 Verificando roles...");

    const roles = [
      { name: "Administrator", permissions: [] },
      { name: "Moderator", permissions: [] },
      { name: "Standard", permissions: [] },
    ];

    for (const roleData of roles) {
      const existingRole = await RoleModel.findOne({ name: roleData.name });
      if (!existingRole) {
        const role = new RoleModel(roleData);
        await role.save();
        console.log(`✅ Rol creado: ${roleData.name}`);
      } else {
        console.log(`ℹ️  Rol ya existe: ${roleData.name}`);
      }
    }

    // 2. Crear usuario administrador
    console.log("🔄 Verificando usuario administrador...");

    const adminEmail = "admin@galaxiaglamour.store";
    const adminPassword = "admin123"; // Cambiar por una contraseña segura

    const existingAdmin = await UserModel.findOne({ email: adminEmail });

    if (!existingAdmin) {
      const adminRole = await RoleModel.findOne({ name: "Administrator" });
      if (!adminRole) {
        throw new Error("No se pudo encontrar el rol Administrator");
      }

      const adminUser = new UserModel({
        email: adminEmail,
        nickname: "Admin",
        role: adminRole._id,
      });

      // Usar el setter virtual para hashear la contraseña
      (adminUser as any).password = adminPassword;

      await adminUser.save();

      console.log("✅ Usuario administrador creado:");
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Contraseña: ${adminPassword}`);
      console.log(
        "   ⚠️  IMPORTANTE: Cambia la contraseña después del primer login"
      );
    } else {
      console.log("ℹ️  Usuario administrador ya existe");
      console.log(`   Email: ${existingAdmin.email}`);
    }

    // 3. Verificar que todo está correcto
    console.log("\n🔍 Verificando configuración...");

    const allRoles = await RoleModel.find();
    console.log(`✅ Roles en DB: ${allRoles.map((r) => r.name).join(", ")}`);

    const adminUser = await UserModel.findOne({ email: adminEmail }).populate(
      "role"
    );
    if (adminUser) {
      console.log(
        `✅ Usuario admin: ${adminUser.email} (Rol: ${(adminUser.role as any).name})`
      );
      console.log(`✅ PasswordHash presente: ${!!adminUser.passwordHash}`);
    }

    console.log("\n🎉 Setup completado exitosamente!");
  } catch (error) {
    console.error("❌ Error durante el setup:", error);
  }
};

// Ejecutar setup
setupAdmin()
  .then(() => console.log("✅ Script finalizado."))
  .catch((error) => console.error("❌ Error fatal:", error));
