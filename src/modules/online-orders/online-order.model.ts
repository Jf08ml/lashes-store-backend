import { Schema, Types, model, Document, Model } from "mongoose";

// Estados específicos para pedidos online
export type OnlineOrderStatus =
  | "pending_confirmation"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "rejected"
  | "returned";

// Tipos de entrega específicos para pedidos online
export type OnlineDeliveryType =
  | "Entrega normal (1 día habil sin costo)"
  | "Entrega express (2-4 horas)"
  | "Recoger en tienda";

// Métodos de pago específicos para pedidos online
export type OnlinePaymentMethod =
  | "contraentrega"
  | "transferencia"
  | "tarjeta_credito"
  | "pse";

export type PaymentStatus = "pending" | "paid" | "partial" | "refunded";

export interface ISelectedVariant {
  referenceName?: string;
  optionLabel?: string;
  optionValue?: string;
  selections?: Record<string, string>;
}

export interface IOnlineOrderItem {
  product: Types.ObjectId;
  name: string;
  sku?: string;
  quantity: number;
  price: number; // Precio unitario
  image?: string;
  selectedVariant?: ISelectedVariant;
}

export interface IOnlineCustomer {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  notes?: string;
}

export interface IStatusHistoryEntry {
  status: string;
  timestamp: Date;
  updatedBy: string;
  notes: string;
}

export interface IOnlineOrder extends Document {
  _id: Types.ObjectId;
  orderNumber: string;

  customer: IOnlineCustomer;
  items: IOnlineOrderItem[];

  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  total: number;

  status: OnlineOrderStatus;
  deliveryType: OnlineDeliveryType;
  paymentMethod: OnlinePaymentMethod;
  paymentStatus: PaymentStatus;

  notes?: string;
  internalNotes?: string;
  rejectionReason?: string;

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

  emailSent: boolean;
  confirmationEmailSent: boolean;

  statusHistory?: IStatusHistoryEntry[];

  createdAt: Date;
  updatedAt: Date;
}

export interface IOnlineOrderModel extends Model<IOnlineOrder> {
  findPending(): Promise<IOnlineOrder[]>;
  findByStatus(status: OnlineOrderStatus): Promise<IOnlineOrder[]>;
}

const OnlineOrderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    sku: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: "" },
    selectedVariant: {
      referenceName: { type: String, default: "" },
      optionLabel: { type: String, default: "" },
      optionValue: { type: String, default: "" },
      selections: { type: Schema.Types.Mixed, default: undefined },
    },
  },
  { _id: false }
);

const OnlineCustomerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    notes: { type: String, default: "" },
  },
  { _id: false }
);

const OnlineOrderSchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, default: () => new Types.ObjectId() },

    orderNumber: {
      type: String,
      default: "", // Valor por defecto vacío
    },

    customer: { type: OnlineCustomerSchema, required: true },
    items: { type: [OnlineOrderItemSchema], required: true },

    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    shippingCost: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: [
        "pending_confirmation",
        "confirmed",
        "preparing",
        "shipped",
        "delivered",
        "cancelled",
        "rejected",
        "returned",
      ],
      default: "pending_confirmation",
    },

    deliveryType: {
      type: String,
      enum: [
        "Entrega normal (1 día habil sin costo)",
        "Entrega express (2-4 horas)",
        "Recoger en tienda",
      ],
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: ["contraentrega", "transferencia", "tarjeta_credito", "pse"],
      default: "contraentrega",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "partial", "refunded"],
      default: "pending",
    },

    notes: { type: String, default: "" },
    internalNotes: { type: String, default: "" },
    rejectionReason: { type: String, default: "" },

    // Return information
    returnInfo: {
      reason: { type: String },
      notes: { type: String, maxlength: 500 },
      refundRequested: { type: Boolean, default: false },
      refundProcessed: { type: Boolean, default: false },
      refundAmount: { type: Number, min: 0 },
      exchangeProductId: { type: Schema.Types.ObjectId, ref: "Product" },
      processedBy: { type: Schema.Types.ObjectId, ref: "User" },
      processedAt: { type: Date },
    },

    emailSent: { type: Boolean, default: false },
    confirmationEmailSent: { type: Boolean, default: false },
    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        updatedBy: String,
        notes: String,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
OnlineOrderSchema.index({ orderNumber: 1 }, { unique: true });
OnlineOrderSchema.index({ status: 1 });
OnlineOrderSchema.index({ createdAt: -1 });
OnlineOrderSchema.index({ "customer.email": 1 });

// Pre-save: generar número de orden
OnlineOrderSchema.pre("save", function (next) {
  if (!this.orderNumber || this.orderNumber === "") {
    const d = new Date();
    const YY = d.getFullYear().toString().slice(-2);
    const MM = (d.getMonth() + 1).toString().padStart(2, "0");
    const DD = d.getDate().toString().padStart(2, "0");
    const ts = Date.now().toString().slice(-6);
    this.orderNumber = `WEB-${YY}${MM}${DD}-${ts}`;
  }
  next();
});

// Statics
OnlineOrderSchema.statics.findPending = function () {
  return this.find({ status: "pending_confirmation" })
    .populate("items.product")
    .sort({ createdAt: -1 });
};

OnlineOrderSchema.statics.findByStatus = function (status: OnlineOrderStatus) {
  return this.find({ status })
    .populate("items.product")
    .sort({ createdAt: -1 });
};

export const OnlineOrderModel = model(
  "OnlineOrder",
  OnlineOrderSchema
);

export default OnlineOrderModel;
