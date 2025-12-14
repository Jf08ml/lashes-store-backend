import express, { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import productRoutes from "./routes/product.routes";
import categoryRoutes from "./routes/category.routes";
import orderRoutes from "./routes/order.routes";
import onlineOrderRoutes from "./routes/online-order.routes";
import customerRoutes from "./routes/customer.routes";
import imagesRoutes from "./routes/image.routes";
import financialRoutes from "./routes/financial.routes";

const app = express();

// Configuración de CORS
const corsOptions: cors.CorsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Cache-Control',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  credentials: false,
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas (mismo prefix que tenías)
app.use("/api/auth", authRoutes);
app.use("/api/product", productRoutes);
app.use("/api", categoryRoutes);
app.use("/api/orders", orderRoutes); // Órdenes POS
app.use("/api/online-orders", onlineOrderRoutes); // Pedidos online
app.use("/api/customers", customerRoutes);
app.use("/api/images", imagesRoutes);
app.use("/api/financial", financialRoutes); // Análisis financiero

app.get("/", (_req: Request, res: Response) => {
  res.json({ 
    message: "API Galaxia Store funcionando", 
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test endpoint para debugging (sin MongoDB)
app.get("/api/test", (_req: Request, res: Response) => {
  console.log("🧪 Test endpoint accessed");
  res.json({
    status: "success",
    message: "Test endpoint funcionando SIN MongoDB",
    timestamp: new Date().toISOString(),
    mongodb_uri_exists: !!process.env.MONGODB_URI,
    jwt_secret_exists: !!process.env.JWT_SECRET,
    node_env: process.env.NODE_ENV,
    vercel_env: process.env.VERCEL_ENV,
    vercel_region: process.env.VERCEL_REGION,
  });
});

// Test con MongoDB
app.get("/api/test-db", async (_req: Request, res: Response) => {
  try {
    console.log("🧪 Test DB endpoint accessed");
    const { connectDB } = await import("./config/db");
    await connectDB();
    res.json({
      status: "success",
      message: "Test DB endpoint funcionando CON MongoDB",
      timestamp: new Date().toISOString(),
      mongodb_status: "connected"
    });
  } catch (error) {
    console.error("❌ Error en test-db:", error);
    res.status(500).json({
      status: "error",
      message: "Error conectando a MongoDB",
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Health check endpoint para Vercel
app.get("/api/health", (_req: Request, res: Response) => {
  console.log("🏥 Health endpoint accessed");
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: "connected" // Aquí podrías agregar verificación real de MongoDB
  });
});

// Error handler unificado
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err?.stack || err);

  const statusCode = err?.statusCode || err?.status || 500;
  let message = err?.message || "Internal Server Error";

  if (process.env.NODE_ENV === "production" && !err?.statusCode) {
    message = "Ocurrió un error en el servidor";
  }

  res.status(statusCode).json({ result: "error", message });
});

export default app;
