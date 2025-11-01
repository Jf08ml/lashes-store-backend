import express, { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import productRoutes from "./routes/product.routes";
import categoryRoutes from "./routes/category.routes";
import orderRoutes from "./routes/order.routes";
import customerRoutes from "./routes/customer.routes";
import imagesRoutes from "./routes/image.routes";

const app = express();

// Si quieres lista blanca, descomenta y ajusta
// const allowedOrigins = ["http://localhost:9000", "https://www.zybizobazar.com"];
// const corsOptions: cors.CorsOptions = {
//   origin(origin, cb) {
//     if (!origin || allowedOrigins.includes(origin)) cb(null, true);
//     else cb(new Error("Origen no permitido por CORS"));
//   },
// };
app.use(cors({ origin: "*" }));

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas (mismo prefix que tenías)
app.use("/api/auth", authRoutes);
app.use("/api/product", productRoutes);
app.use("/api", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/images", imagesRoutes);

app.get("/", (_req: Request, res: Response) => {
  res.send("API galaxia store funcionando");
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
