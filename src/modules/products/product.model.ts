import { Schema, Types, model, Document, Model } from "mongoose";

export interface IProduct extends Document {
  _id: Types.ObjectId;

  // info básica
  name: string;
  namePublic?: string;
  description?: string;
  characteristics?: string;

  // categorización
  category?: Types.ObjectId | null;
  tags?: string[];

  // identificación
  sku?: string | null;
  batch?: string;

  // inventario
  quantity: number;
  stock: number;
  minStock: number;
  quantitiesSold: number;

  // precios
  basePrice: number;
  salePrice: number;
  wholesalePrice?: number;
  wholesaleQuantity?: number;

  // media
  images: string[];

  // variantes
  references?: Array<{
    name: string;
    options: Array<{ label: string; value: string; stocks?: number }>;
  }>;

  // flags
  isActiveInCatalog: boolean;
  isActive: boolean;
  isWholesaleMix: boolean;
  isOffer: boolean;

  // rating
  rating: number;

  // auditoría
  uploadData: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  // virtuals
  isLowStock: boolean;
  isOutOfStock: boolean;
  totalVariantStock: number;

  // métodos
  updateStock(
    newStock: number,
    operation?: "set" | "add" | "subtract"
  ): Promise<IProduct>;
}

export interface IProductModel extends Model<IProduct> {
  findByCategory(categoryId: Types.ObjectId | string): Promise<IProduct[]>;
  findLowStock(): Promise<IProduct[]>;
  findActiveProducts(): Promise<IProduct[]>;
}

const ProductSchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, default: () => new Types.ObjectId() },

    name: { type: String, required: true, trim: true, maxlength: 200 },
    namePublic: { type: String, default: "", trim: true, maxlength: 200 },
    description: { type: String, default: "", maxlength: 1000 },
    characteristics: { type: String, default: "", maxlength: 1000 },

    category: { type: Schema.Types.ObjectId, ref: "Category", required: false },
    tags: [{ type: String, trim: true }],

    sku: {
      type: String,
      trim: true,
    },
    batch: { type: String, default: "", trim: true },

    quantity: { type: Number, default: 0, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    minStock: { type: Number, default: 5, min: 0 },
    quantitiesSold: { type: Number, default: 0, min: 0 },

    basePrice: { type: Number, default: 0, min: 0, required: true },
    salePrice: { type: Number, default: 0, min: 0, required: true },
    wholesalePrice: { type: Number, default: 0, min: 0 },
    wholesaleQuantity: { type: Number, default: 1, min: 1 },

    images: [{ type: String }],

    references: [
      {
        name: { type: String, required: true },
        options: [
          {
            label: { type: String, required: true },
            value: { type: String, required: true },
            stocks: { type: Number, default: 0, min: 0 },
          },
        ],
      },
    ],

    isActiveInCatalog: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isWholesaleMix: { type: Boolean, default: false },
    isOffer: { type: Boolean, default: false },

    rating: { type: Number, default: 0, min: 0, max: 5 },

    uploadData: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// índices
ProductSchema.index({
  name: "text",
  description: "text",
  characteristics: "text",
});
ProductSchema.index({ category: 1, isActiveInCatalog: 1 });
ProductSchema.index({ salePrice: 1 });
ProductSchema.index({ stock: 1 });
ProductSchema.index({ isActiveInCatalog: 1, isActive: 1 });
ProductSchema.index({ sku: 1 }, { unique: true, sparse: true });

// virtuals
ProductSchema.virtual("isLowStock").get(function (this: IProduct) {
  return this.stock <= this.minStock && this.stock > 0;
});
ProductSchema.virtual("isOutOfStock").get(function (this: IProduct) {
  return this.stock <= 0;
});
ProductSchema.virtual("totalVariantStock").get(function (this: IProduct) {
  if (!this.references || this.references.length === 0) return this.stock;
  return this.references.reduce((acc, ref) => {
    return acc + ref.options.reduce((o, opt) => o + (opt.stocks || 0), 0);
  }, 0);
});

// pre-save
ProductSchema.pre("save", function (next) {
  if (!this.sku) {
    const ts = Date.now().toString().slice(-6);
    this.sku = `PRD-${ts}`;
  }
  if (this.isModified("stock")) {
    this.quantity = this.stock;
  }
  next();
});

// métodos
ProductSchema.methods.updateStock = function (
  this: IProduct,
  newStock: number,
  operation: "set" | "add" | "subtract" = "set"
) {
  if (operation === "add") this.stock += newStock;
  else if (operation === "subtract")
    this.stock = Math.max(0, this.stock - newStock);
  else this.stock = Math.max(0, newStock);

  this.quantity = this.stock;
  return this.save();
};

// estáticos
ProductSchema.statics.findByCategory = function (
  categoryId: Types.ObjectId | string
) {
  return this.find({ category: categoryId, isActive: true }).populate(
    "category"
  );
};
ProductSchema.statics.findLowStock = function () {
  return this.find({
    $expr: { $lte: ["$stock", "$minStock"] },
    stock: { $gt: 0 },
    isActive: true,
  });
};
ProductSchema.statics.findActiveProducts = function () {
  return this.find({ isActive: true, isActiveInCatalog: true }).populate(
    "category"
  );
};

export const ProductModel = model(
  "Product",
  ProductSchema
);
export default ProductModel;
