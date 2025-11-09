import { Schema, Types, model, Document, Model } from "mongoose";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned"
  | "refunded";
export type OrderType = "pos" | "online" | "phone" | "wholesale";
export type DeliveryType = "pickup" | "delivery" | "shipping";
export type PaymentMethod = "cash" | "card" | "transfer" | "check" | "credit";
export type PaymentStatus = "pending" | "paid" | "partial" | "refunded";

export interface ISelectedVariant {
  referenceName?: string;
  optionLabel?: string;
  optionValue?: string;
  // variantes múltiples (ej. { Color: "Negro", Tamaño: "M" })
  selections?: Record<string, string>;
}

export interface IOrderItem {
  product: Types.ObjectId;
  name: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedVariant?: ISelectedVariant;
  productSnapshot?: {
    basePrice?: number;
    category?: string;
    description?: string;
    image?: string;
  };
}

export interface ICustomerSnapshot {
  customerId?: Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  documentType?: string;
  documentNumber?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  notes?: string;
}

export interface IOrder extends Document {
  _id: Types.ObjectId;
  orderNumber: string;

  customer: ICustomerSnapshot;
  items: IOrderItem[];

  subtotal: number;
  tax: number;
  discount: number;
  shipping: number;
  total: number;

  status: OrderStatus;
  orderType: OrderType;

  deliveryType: DeliveryType;
  deliveryAddress?: ICustomerSnapshot["address"];
  deliveryDate?: Date;

  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAmount: number;

  notes?: string;
  internalNotes?: string;

  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  // Return fields
  returnInfo?: {
    reason: string;
    notes?: string;
    refundRequested: boolean;
    refundProcessed: boolean;
    refundAmount?: number;
    exchangeProductId?: Types.ObjectId;
    processedBy?: Types.ObjectId;
    processedAt?: Date;
  };

  createdAt: Date;
  updatedAt: Date;

  // virtuals
  isPaid: boolean;
  isCompleted: boolean;
  itemCount: number;

  // methods
  addItem(
    productData: any,
    quantity: number,
    variants?: ISelectedVariant | null
  ): Promise<IOrder>;
  removeItem(
    productId: Types.ObjectId,
    variants?: ISelectedVariant | null
  ): Promise<IOrder>;
}

export interface IOrderModel extends Model<IOrder> {
  findByDateRange(startDate: Date, endDate: Date): Promise<IOrder[]>;
  findByStatus(status: OrderStatus): Promise<IOrder[]>;
  getTodaysSales(): Promise<IOrder[]>;
}

const OrderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    sku: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    selectedVariant: {
      referenceName: { type: String, default: "" },
      optionLabel: { type: String, default: "" },
      optionValue: { type: String, default: "" },
      selections: { type: Schema.Types.Mixed, default: undefined },
    },
    productSnapshot: {
      basePrice: Number,
      category: String,
      description: String,
      image: String,
    },
  },
  { _id: false }
);

const CustomerSnapshotSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    documentType: { type: String, default: "" },
    documentNumber: { type: String, default: "" },
    address: {
      street: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      zipCode: { type: String, default: "" },
      country: { type: String, default: "Colombia" },
    },
    notes: { type: String, default: "" },
  },
  { _id: false }
);

// Esquema básico sin referencias complejas
const OrderSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, default: () => new Types.ObjectId() },
  orderNumber: { type: String, required: true },
  subtotal: { type: Number, required: true, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  shipping: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  status: { type: String, default: "pending" },
  orderType: { type: String, default: "pos" },
  deliveryType: { type: String, default: "pickup" },
  deliveryDate: { type: Date },
  paymentMethod: { type: String, default: "cash" },
  paymentStatus: { type: String, default: "pending" },
  paidAmount: { type: Number, default: 0, min: 0 },
  notes: { type: String, default: "", maxlength: 500 },
  internalNotes: { type: String, default: "", maxlength: 500 },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

// Agregar campos complejos después
OrderSchema.add({
  customer: { type: CustomerSnapshotSchema, required: true },
  items: [OrderItemSchema]
});

// Agregar returnInfo después para evitar problemas de tipos complejos
OrderSchema.add({
  returnInfo: {
    reason: { type: String },
    notes: { type: String, maxlength: 500 },
    refundRequested: { type: Boolean, default: false },
    refundProcessed: { type: Boolean, default: false },
    refundAmount: { type: Number, min: 0 },
    exchangeProductId: { type: Schema.Types.ObjectId, ref: "Product" },
    processedBy: { type: Schema.Types.ObjectId, ref: "User" },
    processedAt: { type: Date }
  }
});

// Indexes
OrderSchema.index({ orderNumber: 1 }, { unique: true });
OrderSchema.index({ status: 1 });
OrderSchema.index({ orderType: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ "customer.email": 1 });
OrderSchema.index({ "customer.phone": 1 });

// Virtuals
OrderSchema.virtual("isPaid").get(function (this: IOrder) {
  return this.paymentStatus === "paid" || this.paidAmount >= this.total;
});
OrderSchema.virtual("isCompleted").get(function (this: IOrder) {
  return ["delivered", "cancelled", "returned", "refunded"].includes(this.status);
});
OrderSchema.virtual("itemCount").get(function (this: IOrder) {
  return (this.items || []).reduce((sum, it) => sum + it.quantity, 0);
});

// Pre-save: generar número, recalcular totales
OrderSchema.pre("save", function (next) {
  if (!this.orderNumber) {
    const d = new Date();
    const YY = d.getFullYear().toString().slice(-2);
    const MM = (d.getMonth() + 1).toString().padStart(2, "0");
    const DD = d.getDate().toString().padStart(2, "0");
    const ts = Date.now().toString().slice(-6);
    this.orderNumber = `ORD-${YY}${MM}${DD}-${ts}`;
  }
  this.subtotal = ((this as any).items || []).reduce((s: number, i: any) => s + i.totalPrice, 0);
  this.total =
    this.subtotal +
    (this.tax || 0) +
    (this.shipping || 0) -
    (this.discount || 0);
  next();
});

// Methods
OrderSchema.methods.addItem = function (
  productData: any,
  quantity: number,
  variants?: ISelectedVariant | null
) {
  const idx = this.items.findIndex(
    (it: { product: { toString: () => any }; selectedVariant: any }) =>
      it.product.toString() === productData._id.toString() &&
      JSON.stringify(it.selectedVariant || {}) ===
        JSON.stringify(variants || {})
  );

  if (idx >= 0) {
    this.items[idx].quantity += quantity;
    this.items[idx].totalPrice =
      this.items[idx].quantity * this.items[idx].unitPrice;
  } else {
    this.items.push({
      product: productData._id,
      name: productData.name,
      sku: productData.sku || "",
      quantity,
      unitPrice: productData.salePrice,
      totalPrice: quantity * productData.salePrice,
      selectedVariant: variants || undefined,
      productSnapshot: {
        basePrice: productData.basePrice,
        category: productData.category?.name || "",
        description: productData.description,
        image: productData.images?.[0] || "",
      },
    });
  }
  return this.save();
};

OrderSchema.methods.removeItem = function (
  productId: Types.ObjectId,
  variants?: ISelectedVariant | null
) {
  this.items = this.items.filter(
    (it: { product: { toString: () => string }; selectedVariant: any }) =>
      !(
        it.product.toString() === productId.toString() &&
        JSON.stringify(it.selectedVariant || {}) ===
          JSON.stringify(variants || {})
      )
  );
  return this.save();
};

// Statics
OrderSchema.statics.findByDateRange = function (
  startDate: Date,
  endDate: Date
) {
  return this.find({ createdAt: { $gte: startDate, $lte: endDate } }).populate(
    "items.product"
  );
};

OrderSchema.statics.findByStatus = function (status: OrderStatus) {
  return this.find({ status }).populate("items.product");
};

OrderSchema.statics.getTodaysSales = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return this.find({
    createdAt: { $gte: today, $lt: tomorrow },
    paymentStatus: "paid",
  });
};

export const OrderModel = model("Order", OrderSchema);
export default OrderModel;
