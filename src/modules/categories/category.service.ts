import { Types } from "mongoose";
import CategoryModel, { ICategory } from "./category.model";
import ProductModel from "../products/product.model";
import CustomErrors from "../../errors/CustomErrors";

const { DatabaseError, NotFoundError, ValidationError } = CustomErrors;

type Filters = Record<string, any>;
type Options = {
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
  populate?: string[];
};

class CategoryService {
  generateSlug(name: string) {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async createCategory(data: Partial<ICategory>) {
    try {
      if (!data.slug && data.name) data.slug = this.generateSlug(data.name);

      if (data.slug) {
        const existing = await CategoryModel.findOne({ slug: data.slug });
        if (existing)
          ValidationError.throw("Ya existe una categoría con ese slug.");
      }

      if (data.parent) {
        const parent = await CategoryModel.findById(data.parent);
        if (!parent) NotFoundError.throw("Categoría padre no encontrada.");
        if (parent && parent.level >= 4)
          ValidationError.throw(
            "No se pueden crear más de 5 niveles de categorías."
          );
      }

      const doc = new CategoryModel(data as ICategory);
      await doc.save();
      return doc.populate("parent");
    } catch (error: any) {
      if (error?.code === 11000)
        ValidationError.throw("Ya existe una categoría con ese nombre o slug.");
      DatabaseError.throw("Error al crear la categoría.");
    }
  }

  async getCategories(filters: Filters = {}, options: Options = {}) {
    try {
      const {
        page,
        limit = 50,
        sort = { sortOrder: 1, name: 1 },
        populate = ["parent", "children"],
      } = options;

      let query = CategoryModel.find(filters);

      if (populate.includes("parent")) {
        query = query.populate("parent", "name slug level");
      }
      if (populate.includes("children")) {
        query = query.populate(
          "children",
          "name slug level sortOrder isActive"
        );
      }
      if (populate.includes("productCount")) {
        query = query.populate("productCount");
      }

      query = query.sort(sort);

      if (page && limit) {
        const skip = (page - 1) * limit;
        query = query.skip(skip).limit(limit);

        const total = await CategoryModel.countDocuments(filters);
        const categories = await query;

        return {
          data: categories,
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
      DatabaseError.throw("Error al obtener las categorías.");
    }
  }

  async getCategory(id: string) {
    try {
      const category = await CategoryModel.findById(id)
        .populate("parent", "name slug level")
        .populate("children", "name slug level sortOrder isActive")
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email");

      if (!category) NotFoundError.throw("Categoría no encontrada.");
      return category!;
    } catch (error: any) {
      if (error?.name === "CastError")
        NotFoundError.throw("ID de categoría inválido.");
      DatabaseError.throw("Error al obtener la categoría.");
    }
  }

  async getCategoryBySlug(slug: string) {
    try {
      const category = await CategoryModel.findOne({ slug, isActive: true })
        .populate("parent", "name slug level")
        .populate("children", "name slug level sortOrder isActive");

      if (!category) NotFoundError.throw("Categoría no encontrada.");
      return category!;
    } catch {
      DatabaseError.throw("Error al obtener la categoría.");
    }
  }

  private async checkCircularReference(
    categoryId: string,
    parentId: string
  ): Promise<boolean> {
    if (categoryId === parentId) return true;
    const parent = await CategoryModel.findById(parentId);
    if (!parent || !parent.parent) return false;
    return this.checkCircularReference(categoryId, String(parent.parent));
  }

  async updateCategory(categoryId: string, updateData: Partial<ICategory>) {
    try {
      if (updateData.slug) {
        const existing = await CategoryModel.findOne({
          slug: updateData.slug,
          _id: { $ne: categoryId },
        });
        if (existing)
          ValidationError.throw("Ya existe una categoría con ese slug.");
      }

      if (updateData.parent) {
        const circular = await this.checkCircularReference(
          categoryId,
          String(updateData.parent)
        );
        if (circular)
          ValidationError.throw("No se puede crear una referencia circular.");
      }

      const updated = await CategoryModel.findByIdAndUpdate(
        categoryId,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      )
        .populate({ path: "parent", select: "name slug level" })
        .populate({
          path: "children",
          select: "name slug level sortOrder isActive",
        });

      if (!updated)
        NotFoundError.throw("Categoría no encontrada para actualizar.");
      return updated!;
    } catch (error: any) {
      if (error?.code === 11000)
        ValidationError.throw("Ya existe una categoría con ese nombre o slug.");
      DatabaseError.throw("Error al actualizar la categoría.");
    }
  }

  async deleteCategory(categoryId: string) {
    try {
      // validar productos asociados
      const productCount = await ProductModel.countDocuments({
        category: categoryId,
      });
      if (productCount > 0) {
        ValidationError.throw(
          `No se puede eliminar la categoría porque tiene ${productCount} producto(s) asociado(s).`
        );
      }

      // validar subcategorías
      const childrenCount = await CategoryModel.countDocuments({
        parent: categoryId,
      });
      if (childrenCount > 0) {
        ValidationError.throw(
          `No se puede eliminar la categoría porque tiene ${childrenCount} subcategoría(s).`
        );
      }

      await CategoryModel.findByIdAndDelete(categoryId);
      return true;
    } catch {
      DatabaseError.throw("Error al eliminar la categoría.");
    }
  }

  async getCategoryTree(parentId: Types.ObjectId | null = null) {
    try {
      const categories = await CategoryModel.find({
        parent: parentId,
        isActive: true,
      })
        .sort({ sortOrder: 1, name: 1 })
        .lean();

      for (const cat of categories as any[]) {
        cat.children = await this.getCategoryTree(cat._id);
        cat.productCount = await ProductModel.countDocuments({
          category: cat._id,
          isActive: true,
        });
      }
      return categories;
    } catch {
      DatabaseError.throw("Error al obtener el árbol de categorías.");
    }
  }

  async getCategoryHierarchy(categoryId: string) {
    try {
      const category = await CategoryModel.findById(categoryId);
      if (!category) NotFoundError.throw("Categoría no encontrada.");
      return category!.getHierarchy();
    } catch {
      DatabaseError.throw("Error al obtener la jerarquía de la categoría.");
    }
  }

  async reorderCategories(
    categories: Array<{ id: string; sortOrder: number }>
  ) {
    try {
      const ops = categories.map((c) => ({
        updateOne: {
          filter: { _id: c.id },
          update: { sortOrder: c.sortOrder },
        },
      }));
      return CategoryModel.bulkWrite(ops);
    } catch {
      DatabaseError.throw("Error al reordenar categorías.");
    }
  }

  async getCategoryStats() {
    try {
      const totalCategories = await CategoryModel.countDocuments();
      const activeCategories = await CategoryModel.countDocuments({
        isActive: true,
      });
      const rootCategories = await CategoryModel.countDocuments({
        parent: null,
      });

      const levelStats = await CategoryModel.aggregate([
        { $group: { _id: "$level", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]);

      const categoriesWithProducts = await CategoryModel.aggregate([
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "category",
            as: "products",
          },
        },
        {
          $project: {
            name: 1,
            slug: 1,
            productCount: { $size: "$products" },
          },
        },
        { $sort: { productCount: -1 } },
        { $limit: 10 },
      ]);

      return {
        overview: {
          total: totalCategories,
          active: activeCategories,
          inactive: totalCategories - activeCategories,
          root: rootCategories,
        },
        levelBreakdown: levelStats,
        topCategories: categoriesWithProducts,
      };
    } catch {
      DatabaseError.throw("Error al obtener estadísticas de categorías.");
    }
  }

  async getRootCategories() {
    try {
      return CategoryModel.getRootCategories();
    } catch {
      DatabaseError.throw("Error al obtener categorías raíz.");
    }
  }
}

export default new CategoryService();
