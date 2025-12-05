import { Router } from "express";
import {
  createProduct,
  getProducts,
  getProduct,
  getProductsCatalog,
  updateProduct,
  updateStock,
  deleteProduct,
  getProductStats,
  getLowStockProducts,
  getProductsByCategory,
} from "../modules/products/product.controller";
// import { verifyToken } from "../middlewares/auth";

const router = Router();

// Endpoint de prueba
router.get("/test", (req, res) => {
  res.json({
    status: "success",
    message: "Endpoint de productos funcionando",
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: req.headers,
  });
});

// públicas
router.get("/productsCatalog", getProductsCatalog);
router.get("/productDetail/:id", getProduct);

// protegidas (cuando actives auth)
// router.get("/products/stats", verifyToken, getProductStats);
router.get("/products/stats", getProductStats);
// router.get("/products/lowStock", verifyToken, getLowStockProducts);
router.get("/products/lowStock", getLowStockProducts);
// router.get("/products/category/:categoryId", verifyToken, getProductsByCategory);
router.get("/products/category/:categoryId", getProductsByCategory);

// CRUD
// router.use(verifyToken);
router.post("/addProduct", createProduct);
router.get("/products", getProducts);
router.put("/products/:id", updateProduct);
router.delete("/productRemove/:id", deleteProduct);

// stock
router.patch("/products/:id/stock", updateStock);

export default router;
