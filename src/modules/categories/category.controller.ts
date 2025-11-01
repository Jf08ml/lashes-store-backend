import { Request, Response, NextFunction } from "express";
import CategoryService from "./category.service";
import sendResponse from "../../utils/response";

export async function createCategory(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const categoryData: any = { ...req.body };
    if (req.user?.id) {
      categoryData.createdBy = req.user.id;
      categoryData.updatedBy = req.user.id;
    }
    const created = await CategoryService.createCategory(categoryData);
    sendResponse(res, 201, created, "Categoría creada exitosamente.");
  } catch (error) {
    next(error);
  }
}

export async function getCategories(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const {
      includeInactive = "false",
      parent,
      level,
      tree = "false",
      page,
      limit,
    } = req.query as Record<string, string>;

    if (tree === "true") {
      const data = await CategoryService.getCategoryTree(null);
      return sendResponse(
        res,
        200,
        data,
        data && data.length
          ? "Categorías encontradas."
          : "No se encontraron categorías."
      );
    }

    const filters: any = {};
    if (includeInactive !== "true") filters.isActive = true;
    if (parent !== undefined)
      filters.parent = parent === "null" ? null : parent;
    if (level !== undefined) filters.level = parseInt(level);

    const options: any = { populate: ["parent", "children"] };
    if (page) options.page = Number(page);
    if (limit) options.limit = Number(limit);

    const categories = await CategoryService.getCategories(filters, options);
    const data = (categories as any).data ?? categories;

    sendResponse(
      res,
      200,
      categories,
      Array.isArray(data) && data.length > 0
        ? "Categorías encontradas."
        : "No se encontraron categorías."
    );
  } catch (error) {
    next(error);
  }
}

export async function getCategory(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const category = await CategoryService.getCategory(req.params.id);
    sendResponse(res, 200, category, "Categoría encontrada.");
  } catch (error) {
    next(error);
  }
}

export async function getCategoryBySlug(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const category = await CategoryService.getCategoryBySlug(req.params.slug);
    sendResponse(res, 200, category, "Categoría encontrada.");
  } catch (error) {
    next(error);
  }
}

export async function updateCategory(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const updateData: any = { ...req.body };
    if (req.user?.id) updateData.updatedBy = req.user.id;

    const updated = await CategoryService.updateCategory(
      req.params.id,
      updateData
    );
    sendResponse(res, 200, updated, "Categoría actualizada con éxito.");
  } catch (error) {
    next(error);
  }
}

export async function deleteCategory(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    await CategoryService.deleteCategory(req.params.id);
    sendResponse(res, 200, null, "Categoría eliminada con éxito.");
  } catch (error) {
    next(error);
  }
}

export async function getCategoryHierarchy(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const hierarchy = await CategoryService.getCategoryHierarchy(req.params.id);
    sendResponse(res, 200, hierarchy, "Jerarquía de categoría obtenida.");
  } catch (error) {
    next(error);
  }
}

export async function reorderCategories(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { categories } = req.body as {
      categories: Array<{ id: string; sortOrder: number }>;
    };
    const result = await CategoryService.reorderCategories(categories);
    sendResponse(res, 200, result, "Categorías reordenadas con éxito.");
  } catch (error) {
    next(error);
  }
}

export async function getCategoryStats(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const stats = await CategoryService.getCategoryStats();
    sendResponse(res, 200, stats, "Estadísticas de categorías obtenidas.");
  } catch (error) {
    next(error);
  }
}
