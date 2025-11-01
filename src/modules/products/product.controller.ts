import { Request, Response, NextFunction } from "express";
import ProductService from "./product.service";
import sendResponse from "../../utils/response";

export async function createProduct(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const productData: any = req.body.product || req.body;
    if (req.user?.id) {
      productData.createdBy = req.user.id;
      productData.updatedBy = req.user.id;
    }
    const newProduct = await ProductService.createProduct(productData);
    sendResponse(res, 201, newProduct, "Producto creado exitosamente.");
  } catch (error) {
    next(error);
  }
}

export async function getProducts(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const {
      category,
      search,
      isActiveInCatalog,
      sortBy = "uploadData",
      sortOrder = "desc",
      page = "1",
      limit = "50",
      includeLowStock,
      includeOutOfStock,
    } = req.query as Record<string, string>;

    const filters: any = {};
    if (category) filters.category = category;
    if (isActiveInCatalog !== undefined)
      filters.isActiveInCatalog = isActiveInCatalog === "true";

    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: "i" } },
        { namePublic: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { characteristics: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    if (includeLowStock === "only") {
      filters.$expr = { $lte: ["$stock", "$minStock"] };
      filters.stock = { $gt: 0 };
    } else if (includeOutOfStock === "only") {
      filters.stock = { $lte: 0 };
    } else if (includeOutOfStock === "false") {
      filters.stock = { $gt: 0 };
    }

    const options = {
      page: Number(page),
      limit: Number(limit),
      sort: { [sortBy]: sortOrder === "desc" ? -1 : 1 } as Record<
        string,
        1 | -1
      >,
      populate: ["category"],
    };

    const products = await ProductService.getProducts(filters, options);
    const data = (products as any).data ?? products;

    sendResponse(
      res,
      200,
      products,
      Array.isArray(data) && data.length > 0
        ? "Productos encontrados."
        : "No se encontraron productos."
    );
  } catch (error) {
    next(error);
  }
}

export async function getProduct(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const product = await ProductService.getProduct(req.params.id);
    sendResponse(res, 200, product, "Producto encontrado.");
  } catch (error) {
    next(error);
  }
}

export async function getProductsCatalog(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const {
      category,
      search,
      minPrice,
      maxPrice,
      sortBy = "uploadData",
      sortOrder = "desc",
      page = "1",
      limit = "20",
    } = req.query as Record<string, string>;

    const filters: any = { isActiveInCatalog: true, isActive: true };
    if (category) filters.category = category;

    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: "i" } },
        { namePublic: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { characteristics: { $regex: search, $options: "i" } },
      ];
    }

    if (minPrice || maxPrice) {
      filters.salePrice = {};
      if (minPrice) filters.salePrice.$gte = Number(minPrice);
      if (maxPrice) filters.salePrice.$lte = Number(maxPrice);
    }

    const options = {
      page: Number(page),
      limit: Number(limit),
      sort: { [sortBy]: sortOrder === "desc" ? -1 : 1 } as Record<
        string,
        1 | -1
      >,
      populate: ["category"],
    };

    const productsCatalog = await ProductService.getProducts(filters, options);
    const data = (productsCatalog as any).data ?? productsCatalog;

    sendResponse(
      res,
      200,
      productsCatalog,
      Array.isArray(data) && data.length > 0
        ? "Productos de catálogo encontrados."
        : "No se encontraron productos de catálogo."
    );
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const updateData: any = { ...req.body };
    if (req.user?.id) updateData.updatedBy = req.user.id;

    const updated = await ProductService.updateProduct(
      req.params.id,
      updateData
    );
    sendResponse(res, 200, updated, "Producto actualizado con éxito.");
  } catch (error) {
    next(error);
  }
}

export async function updateStock(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { quantity, operation = "set" } = req.body as {
      quantity: number;
      operation?: "set" | "add" | "subtract";
    };
    if (typeof quantity !== "number" || quantity < 0) {
      return sendResponse(res, 400, null, "Cantidad inválida.");
    }
    const updated = await ProductService.updateStock(
      req.params.id,
      quantity,
      operation
    );
    sendResponse(res, 200, updated, "Stock actualizado con éxito.");
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    await ProductService.deleteProduct(req.params.id);
    sendResponse(res, 200, null, "Producto eliminado con éxito.");
  } catch (error) {
    next(error);
  }
}

export async function getProductStats(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const stats = await ProductService.getProductStats();
    sendResponse(res, 200, stats, "Estadísticas obtenidas con éxito.");
  } catch (error) {
    next(error);
  }
}

export async function getLowStockProducts(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const low = await ProductService.getLowStockProducts();
    sendResponse(
      res,
      200,
      low,
      low && low.length > 0
        ? "Productos con stock bajo encontrados."
        : "No hay productos con stock bajo."
    );
  } catch (error) {
    next(error);
  }
}

export async function getProductsByCategory(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { categoryId } = req.params;
    const products = await ProductService.getProductsByCategory(categoryId);
    sendResponse(
      res,
      200,
      products,
      products && products.length > 0
        ? "Productos de la categoría encontrados."
        : "No se encontraron productos en esta categoría."
    );
  } catch (error) {
    next(error);
  }
}
