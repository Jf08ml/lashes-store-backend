import { Schema, Types, model, Document, Model } from "mongoose";
import ProductModel from "../products/product.model"; // ← usamos Product

export interface ICategory extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;

  icon?: string;
  color?: string;
  image?: string;

  parent: Types.ObjectId | null;
  level: number;
  path: string;

  isActive: boolean;
  isVisibleInMenu: boolean;
  sortOrder: number;

  seo?: {
    title?: string;
    description?: string;
    keywords?: string;
  };

  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  generatePath(): Promise<void>;
  getHierarchy(): Promise<
    Array<{ _id: Types.ObjectId; name: string; slug: string; level: number }>
  >;
}

export interface ICategoryModel extends Model<ICategory> {
  getTree(parentId?: Types.ObjectId | null): Promise<ICategory[]>;
  getRootCategories(): Promise<ICategory[]>;
}

const CategorySchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, default: () => new Types.ObjectId() },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    description: { type: String, default: "", maxlength: 500 },

    icon: { type: String, default: "category" },
    color: { type: String, default: "#6B7280" },
    image: { type: String, default: "" },

    parent: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    level: { type: Number, default: 0, min: 0, max: 5 },
    path: { type: String, default: "" },

    isActive: { type: Boolean, default: true },
    isVisibleInMenu: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },

    seo: {
      title: { type: String, default: "" },
      description: { type: String, default: "" },
      keywords: { type: String, default: "" },
    },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// índices
CategorySchema.index({ slug: 1 }, { unique: true });
CategorySchema.index({ parent: 1, level: 1 });
CategorySchema.index({ isActive: 1, isVisibleInMenu: 1 });
CategorySchema.index({ sortOrder: 1 });
CategorySchema.index({ path: 1 });

// virtuals
CategorySchema.virtual("children", {
  ref: "Category",
  localField: "_id",
  foreignField: "parent",
});

CategorySchema.virtual("products", {
  ref: "Product",
  localField: "_id",
  foreignField: "category",
});

CategorySchema.virtual("productCount", {
  ref: "Product",
  localField: "_id",
  foreignField: "category",
  count: true,
});

// pre-save: slug & path
CategorySchema.pre("save", async function (next) {
  if (this.isModified("name") || !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  if (this.isModified("parent") || this.isModified("slug")) {
    await (this as any).generatePath();
  }
  next();
});

CategorySchema.methods.generatePath = async function () {
  if (!this.parent) {
    this.path = this.slug;
    this.level = 0;
  } else {
    const parent = await (this.constructor as ICategoryModel).findById(
      this.parent
    );
    if (parent) {
      this.path = `${parent.path}/${this.slug}`;
      this.level = parent.level + 1;
    }
  }
};

CategorySchema.methods.getHierarchy = async function () {
  const hierarchy: Array<{
    _id: Types.ObjectId;
    name: string;
    slug: string;
    level: number;
  }> = [];
  let current: ICategory | null = this as ICategory;

  while (current) {
    hierarchy.unshift({
      _id: current._id,
      name: current.name,
      slug: current.slug,
      level: current.level,
    });
    if (current.parent) {
      current = await (this.constructor as ICategoryModel).findById(
        current.parent
      );
    } else {
      break;
    }
  }
  return hierarchy;
};

CategorySchema.statics.getTree = function (
  parentId: Types.ObjectId | null = null
) {
  return this.find({ parent: parentId, isActive: true })
    .sort({ sortOrder: 1, name: 1 })
    .populate("children");
};

CategorySchema.statics.getRootCategories = function () {
  return this.find({ parent: null, isActive: true }).sort({
    sortOrder: 1,
    name: 1,
  });
};

// limpiar referencias al borrar: desasociar productos y reparentar hijos
CategorySchema.pre("findOneAndDelete", async function () {
  const categoryId = this.getQuery()._id as Types.ObjectId;

  // quitar la categoría en productos que la usan
  await ProductModel.updateMany(
    { category: categoryId },
    { $unset: { category: 1 } }
  );

  // re-parent subcategorías al padre de la categoría eliminada
  const cat = await (this as any).model.findById(categoryId);
  if (cat) {
    await (this as any).model.updateMany(
      { parent: categoryId },
      { parent: cat.parent }
    );
  }
});

export const CategoryModel = model(
  "Category",
  CategorySchema
);
export default CategoryModel;
