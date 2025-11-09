import { Router } from "express";
import onlineOrderController from "../modules/online-orders/online-order.controller";
// import { verifyToken } from "../middlewares/auth";

const router = Router();

// Rutas para pedidos online (desde el carrito de clientes)
router.post("/", onlineOrderController.createOnlineOrder);

// Rutas para admin - gestión de pedidos pendientes
router.get("/pending", onlineOrderController.getPendingOrders);
router.get("/all", onlineOrderController.getAllOrders);
router.get("/stats", onlineOrderController.getStats);
router.patch("/:id/confirm", onlineOrderController.confirmOrder);
router.patch("/:id/reject", onlineOrderController.rejectOrder);
router.patch("/:id/status", onlineOrderController.updateOrderStatus);
router.patch("/:id/return", onlineOrderController.processReturn);

export default router;