import { Router } from "express";
import customerController from "../modules/customers/customer.controller";
// import { verifyToken } from "../middlewares/auth";

const router = Router();

// router.use(verifyToken);
router.get("/find/:identifier", customerController.findByIdentifier);
router.get("/search", customerController.searchCustomers);

// stats + list + item
router.get("/stats", customerController.getStats);
router.get("/", customerController.getCustomers);
router.get("/:id", customerController.getCustomer);

// create/update + status + delete
router.post("/", customerController.createOrUpdate);
router.put("/:id/status", customerController.toggleStatus);
router.delete("/:id", customerController.deleteCustomer);

export default router;
