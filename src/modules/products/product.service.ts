import ProductModel, { IProduct } from "./product.model";
import CategoryModel from "../categories/category.model";
import CustomErrors from "../../errors/CustomErrors";

const { DatabaseError, NotFoundError, ValidationError } = CustomErrors;

type Filters = Record<string, any>;
type Options = {
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
  populate?: string[];
};

class ProductService {
  async createProduct(data: Partial<IProduct>) {
    try {
      if (data.category) {
        const exists = await CategoryModel.findById(data.category);
        if (!exists) ValidationError.throw("La categoría especificada no existe.");
      }
      if (typeof data.quantity === "number") data.stock = data.quantity;

      const doc = new ProductModel(data as IProduct);
      const saved = await doc.save();
      return ProductModel.findById(saved._id).populate("category");
    } catch (error: any) {
      if (error?.code === 11000) ValidationError.throw("El SKU ya existe.");
      DatabaseError.throw("Error al crear el producto.");
    }
  }

  async getProducts(filters: Filters = {}, options: Options = {}) {
    try {
      const {
        page,
        limit = 50,
        sort = { uploadData: -1 },
        populate = ["category"],
      } = options;

      let query = ProductModel.find(filters);

      if (populate.includes("category")) {
        query = query.populate("category", "name slug color icon");
      }
      if (populate.includes("createdBy")) {
        query = query.populate("createdBy", "name email");
      }
      if (populate.includes("updatedBy")) {
        query = query.populate("updatedBy", "name email");
      }

      query = query.sort(sort);

      if (page && limit) {
        const skip = (page - 1) * limit;
        query = query.skip(skip).limit(limit);

        const total = await ProductModel.countDocuments(filters);
        const products = await query;

        return {
          data: products,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
          },
        };
      }

      return query;
    } catch {
      DatabaseError.throw("Error al obtener los productos.");
    }
  }

  async getProduct(id: string) {
    try {
      const product = await ProductModel.findById(id)
        .populate("category", "name slug color icon path")
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email");

      if (!product) NotFoundError.throw("Producto no encontrado.");
      return product!;
    } catch (error: any) {
      if (error?.name === "CastError") NotFoundError.throw("ID de producto inválido.");
      DatabaseError.throw("Error al obtener el producto.");
    }
  }

  async updateProduct(productId: string, updateData: Partial<IProduct>) {
    try {
      if (updateData.category) {
        const exists = await CategoryModel.findById(updateData.category);
        if (!exists) ValidationError.throw("La categoría especificada no existe.");
      }
      if (typeof updateData.quantity === "number") updateData.stock = updateData.quantity;

      const updated = await ProductModel.findByIdAndUpdate(productId, updateData, {
        new: true,
        runValidators: true,
      })
        .populate({ path: "category", select: "name slug color icon" })
        .populate({ path: "createdBy", select: "name email" })
        .populate({ path: "updatedBy", select: "name email" });

      if (!updated) NotFoundError.throw("Producto no encontrado para actualizar.");
      return updated!;
    } catch (error: any) {
      if (error?.code === 11000) ValidationError.throw("El SKU ya existe.");
      DatabaseError.throw("Error al actualizar el producto.");
    }
  }

  async updateStock(productId: string, quantity: number, operation: "set" | "add" | "subtract" = "set") {
    try {
      const product = await ProductModel.findById(productId);
      if (!product) NotFoundError.throw("Producto no encontrado.");

      const updated = await product!.updateStock(quantity, operation);
      return ProductModel.findById(updated._id).populate("category");
    } catch {
      DatabaseError.throw("Error al actualizar el stock.");
    }
  }

  async deleteProduct(productId: string) {
    try {
      const deleted = await ProductModel.findByIdAndDelete(productId);
      if (!deleted) NotFoundError.throw("Producto no encontrado para eliminar.");
      return deleted;
    } catch {
      DatabaseError.throw("Error al eliminar el producto.");
    }
  }

  async getProductStats() {
    try {
      const stats = await ProductModel.aggregate([
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            activeProducts: {
              $sum: { $cond: [{ $eq: ["$isActiveInCatalog", true] }, 1, 0] },
            },
            totalValue: { $sum: "$salePrice" },
            avgPrice: { $avg: "$salePrice" },
            lowStockCount: {
              $sum: {
                $cond: [
                  { $and: [{ $lte: ["$stock", "$minStock"] }, { $gt: ["$stock", 0] }] },
                  1,
                  0,
                ],
              },
            },
            outOfStockCount: { $sum: { $cond: [{ $lte: ["$stock", 0] }, 1, 0] } },
          },
        },
      ]);

      const categoryStats = await ProductModel.aggregate([
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "categoryInfo",
          },
        },
        {
          $group: {
            _id: "$category",
            categoryName: { $first: { $arrayElemAt: ["$categoryInfo.name", 0] } },
            count: { $sum: 1 },
            avgPrice: { $avg: "$salePrice" },
            totalValue: { $sum: "$salePrice" },
          },
        },
        { $sort: { count: -1 } },
      ]);

      return {
        overview: stats[0] || {
          totalProducts: 0,
          activeProducts: 0,
          totalValue: 0,
          avgPrice: 0,
          lowStockCount: 0,
          outOfStockCount: 0,
        },
        categoryBreakdown: categoryStats,
      };
    } catch {
      DatabaseError.throw("Error al obtener estadísticas.");
    }
  }

  async getLowStockProducts() {
    try {
      return await ProductModel.findLowStock();
    } catch {
      DatabaseError.throw("Error al obtener productos con stock bajo.");
    }
  }

  async getProductsByCategory(categoryId: string) {
    try {
      return ProductModel.findByCategory(categoryId);
    } catch {
      DatabaseError.throw("Error al obtener productos por categoría.");
    }
  }

  async searchProducts(searchTerm: string, filters: Filters = {}) {
    try {
      const regex = new RegExp(searchTerm, "i");
      const searchFilters = {
        ...filters,
        $or: [
          { name: regex },
          { namePublic: regex },
          { description: regex },
          { characteristics: regex },
          { sku: regex },
        ],
      };

      return ProductModel.find(searchFilters)
        .populate("category", "name slug color")
        .sort({ uploadData: -1 })
        .limit(20);
    } catch {
      DatabaseError.throw("Error en la búsqueda de productos.");
    }
  }
}

export default new ProductService();
