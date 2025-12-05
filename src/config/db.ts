import mongoose from "mongoose";
import "dotenv/config";

const DB_URI = process.env.MONGODB_URI || process.env.DB_URI || process.env.MONGO_URI;
const MAX_RETRIES = 2; // Reducir reintentos para serverless
const RETRY_DELAY = 1000; // 1 segundo más rápido

// Configuración ultra optimizada para serverless
const mongooseOptions = {
  maxPoolSize: 5, // Reducir pool para serverless
  serverSelectionTimeoutMS: 3000, // Timeout muy agresivo para serverless
  socketTimeoutMS: 15000, // Socket timeout más corto
  connectTimeoutMS: 5000, // Timeout de conexión corto
  maxIdleTimeMS: 30000, // Cerrar conexiones idle más rápido
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
