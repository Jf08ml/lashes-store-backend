import { Router } from "express";
import {
  createCategory,
  getCategories,
  getCategory,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
  getCategoryHierarchy,
  reorderCategories,
  getCategoryStats,
} from "../modules/categories/category.controller";
// import { verifyToken } from "../middlewares/auth";

const router = Router();

// públicas
router.get("/categories", getCategories);
router.get("/categories/tree", getCategories); // ?tree=true
router.get("/categories/slug/:slug", getCategoryBySlug);
router.get("/categories/:id", getCategory);
router.get("/categories/:id/hierarchy", getCategoryHierarchy);

// CRUD (protege cuando quieras)
// router.use(verifyToken);
router.post("/categories", createCategory);
router.put("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);

// extras
router.patch("/categories/reorder", reorderCategories);
router.get("/categories-stats", getCategoryStats);

export default router;
