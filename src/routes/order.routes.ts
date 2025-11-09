import { Router } from "express";
import orderController from "../modules/orders/order.controller";
// import { verifyToken } from "../middlewares/auth";

const router = Router();

// POS / Orders
router.post("/", orderController.createOrder);
router.get("/", orderController.getOrders);
router.get("/today", orderController.getTodaysOrders);
router.get("/dashboard", orderController.getPOSDashboard);
router.get("/stats", orderController.getSalesStats);
router.get("/:id", orderController.getOrder);

// management
router.patch("/:id/status", orderController.updateOrderStatus);
router.patch("/:id/cancel", orderController.cancelOrder);
router.patch("/:id/return", orderController.processReturn);

export default router;
