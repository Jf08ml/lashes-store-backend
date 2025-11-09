import mongoose from "mongoose";
import "dotenv/config";

const DB_URI = process.env.MONGODB_URI || process.env.DB_URI || process.env.MONGO_URI;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // ms = 2 segundos (más rápido para serverless)

// Configuración optimizada para serverless
const mongooseOptions = {
  maxPoolSize: 10, // Mantener hasta 10 conexiones de socket
  serverSelectionTimeoutMS: 5000, // Mantener intentando seleccionar un servidor por 5 segundos
  socketTimeoutMS: 45000, // Cerrar sockets después de 45 segundos de inactividad
  // Removiendo bufferCommands y bufferMaxEntries que pueden causar problemas
};

export async function connectDB(): Promise<void> {
  if (!DB_URI) {
    console.error("❌ MONGODB_URI no está configurada");
    throw new Error("MONGODB_URI no configurada");
  }

  // Para entornos serverless, verificar si ya hay conexión
  if (mongoose.connections[0].readyState === 1) {
    console.log("📡 MongoDB ya conectado - reutilizando conexión");
    return;
  }

  let attempts = 0;

  const connectWithRetry = async (): Promise<void> => {
    try {
      console.log(`🔄 Intentando conectar a MongoDB (intento ${attempts + 1}/${MAX_RETRIES})`);
      
      await mongoose.connect(DB_URI, mongooseOptions);
      console.log("📡 Conexión establecida con MongoDB");

      // Para serverless, no necesitamos eventos de reconexión
      if (process.env.NODE_ENV !== 'production') {
        mongoose.connection.on("disconnected", () => {
          console.warn("⚠️ Conexión con MongoDB perdida");
        });

        mongoose.connection.on("reconnected", () => {
          console.log("✅ Reconexión con MongoDB exitosa");
        });
      }
    } catch (error) {
      attempts++;
      console.error(
        `❌ Error al conectar con MongoDB (intento ${attempts}/${MAX_RETRIES}):`,
        (error as Error).message
      );

      if (attempts < MAX_RETRIES) {
        console.log(
          `🔁 Reintentando conexión en ${RETRY_DELAY / 1000} segundos...`
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        return connectWithRetry();
      } else {
        console.error("💥 Máximo número de reintentos alcanzado");
        throw new Error(`No se pudo conectar a MongoDB después de ${MAX_RETRIES} intentos: ${(error as Error).message}`);
      }
    }
  };

  await connectWithRetry();
}
