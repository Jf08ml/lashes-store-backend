import { Schema, Types, model, Document, Model } from "mongoose";

export type DocumentType = "CC" | "TI" | "CE" | "PA" | "NIT";
export type Gender = "M" | "F" | "O";
export type AddressType = "home" | "work" | "billing" | "shipping";
export type CustomerType = "retail" | "wholesale" | "vip";
export type CustomerStatus = "active" | "inactive" | "blocked";

export interface IAddress {
  type: AddressType;
  isPrimary: boolean;
  street: string;
  neighborhood?: string;
  city: string;
  state?: string;
  zipCode?: string;
  country?: string;
  notes?: string;
}

export interface IPersonalInfo {
  firstName: string;
  lastName: string;
  documentType?: DocumentType;
  documentNumber?: string;
  dateOfBirth?: Date;
  gender?: Gender;
}

export interface IContactInfo {
  phone: string;
  email?: string;
  alternativePhone?: string;
}

export interface ICommercialInfo {
  customerType: CustomerType;
  taxId?: string;
  discountPercentage: number;
  creditLimit: number;
  paymentTerms: number; // días
}

export interface IPurchaseStats {
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: Date;
  firstOrderDate?: Date;
  averageOrderValue: number;
}

export interface ICustomer extends Document {
  _id: Types.ObjectId;

  identifier: string;
  personalInfo: IPersonalInfo;
  contactInfo: IContactInfo;

  addresses: IAddress[];
  commercialInfo: ICommercialInfo;
  purchaseStats: IPurchaseStats;

  status: CustomerStatus;
  notes?: string;

  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  // virtuals
  fullName: string;
  primaryAddress?: IAddress;

  // methods
  addAddress(address: Partial<IAddress>): Promise<ICustomer>;
  updatePurchaseStats(orderTotal: number): Promise<ICustomer>;
}

export interface ICustomerModel extends Model<ICustomer> {
  findByIdentifier(identifier: string): Promise<ICustomer | null>;
  findByContact(
    phone: string,
    email?: string | null
  ): Promise<ICustomer | null>;
  searchCustomers(searchTerm: string, limit?: number): Promise<ICustomer[]>;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    _id: { type: Schema.Types.ObjectId, default: () => new Types.ObjectId() },

    identifier: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    personalInfo: {
      firstName: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
      documentType: {
        type: String,
        enum: ["CC", "TI", "CE", "PA", "NIT"],
        default: "CC",
      },
      documentNumber: { type: String, trim: true, sparse: true, index: true },
      dateOfBirth: { type: Date },
      gender: { type: String, enum: ["M", "F", "O"] },
    },

    contactInfo: {
      phone: { type: String, required: true, trim: true, index: true },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        sparse: true,
        index: true,
      },
      alternativePhone: { type: String, trim: true },
    },

    addresses: [
      {
        type: {
          type: String,
          enum: ["home", "work", "billing", "shipping"],
          default: "home",
        },
        isPrimary: { type: Boolean, default: false },
        street: { type: String, required: true, trim: true },
        neighborhood: { type: String, trim: true },
        city: { type: String, required: true, trim: true },
        state: { type: String, trim: true, default: "Huila" },
        zipCode: { type: String, trim: true },
        country: { type: String, default: "Colombia" },
        notes: { type: String, trim: true },
      },
    ],

    commercialInfo: {
      customerType: {
        type: String,
        enum: ["retail", "wholesale", "vip"],
        default: "retail",
      },
      taxId: { type: String, trim: true },
      discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
      creditLimit: { type: Number, default: 0, min: 0 },
      paymentTerms: { type: Number, default: 0, min: 0 },
    },

    purchaseStats: {
      totalOrders: { type: Number, default: 0 },
      totalSpent: { type: Number, default: 0 },
      lastOrderDate: { type: Date },
      firstOrderDate: { type: Date },
      averageOrderValue: { type: Number, default: 0 },
    },

    status: {
      type: String,
      enum: ["active", "inactive", "blocked"],
      default: "active",
    },

    notes: { type: String, trim: true, maxlength: 1000 },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// índices compuestos
CustomerSchema.index({
  "personalInfo.documentNumber": 1,
  "personalInfo.documentType": 1,
});
CustomerSchema.index({ "contactInfo.phone": 1, status: 1 });
CustomerSchema.index({ "contactInfo.email": 1, status: 1 });

// virtuals
CustomerSchema.virtual("fullName").get(function (this: ICustomer) {
  return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`.trim();
});

CustomerSchema.virtual("primaryAddress").get(function (this: ICustomer) {
  return this.addresses.find((a) => a.isPrimary) || this.addresses[0];
});

// pre-save
CustomerSchema.pre("save", function (next) {
  // asegurar una sola dirección primaria
  const primaries = this.addresses.filter((a) => a.isPrimary);
  if (primaries.length > 1) {
    this.addresses.forEach((a, i) => (a.isPrimary = i === 0));
  } else if (primaries.length === 0 && this.addresses.length > 0) {
    this.addresses[0].isPrimary = true;
  }

  // fallback: usar phone como identifier si no viene
  if (!this.identifier && this.contactInfo?.phone) {
    this.identifier = this.contactInfo.phone;
  }
  next();
});

// methods
CustomerSchema.methods.addAddress = function (
  this: ICustomer,
  address: Partial<IAddress>
) {
  if (this.addresses.length === 0) address.isPrimary = true;
  if (address.isPrimary) this.addresses.forEach((a) => (a.isPrimary = false));
  this.addresses.push({
    type: address.type ?? "home",
    isPrimary: Boolean(address.isPrimary),
    street: address.street!,
    neighborhood: address.neighborhood ?? "",
    city: address.city!,
    state: address.state ?? "Huila",
    zipCode: address.zipCode ?? "",
    country: address.country ?? "Colombia",
    notes: address.notes ?? "",
  });
  return this.save();
};

CustomerSchema.methods.updatePurchaseStats = function (
  this: ICustomer,
  orderTotal: number
) {
  this.purchaseStats.totalOrders += 1;
  this.purchaseStats.totalSpent += orderTotal;
  this.purchaseStats.lastOrderDate = new Date();
  if (!this.purchaseStats.firstOrderDate)
    this.purchaseStats.firstOrderDate = new Date();
  this.purchaseStats.averageOrderValue =
    this.purchaseStats.totalSpent / Math.max(1, this.purchaseStats.totalOrders);
  return this.save();
};

// statics
CustomerSchema.statics.findByIdentifier = function (identifier: string) {
  return this.findOne({ identifier, status: { $ne: "blocked" } });
};

CustomerSchema.statics.findByContact = function (
  phone: string,
  email?: string | null
) {
  const query: any = {
    $or: [{ "contactInfo.phone": phone }, { identifier: phone }],
    status: { $ne: "blocked" },
  };
  if (email) query.$or.push({ "contactInfo.email": email });
  return this.findOne(query);
};

CustomerSchema.statics.searchCustomers = function (
  searchTerm: string,
  limit = 10
) {
  const regex = new RegExp(searchTerm, "i");
  return this.find({
    $or: [
      { identifier: regex },
      { "personalInfo.firstName": regex },
      { "personalInfo.lastName": regex },
      { "personalInfo.documentNumber": regex },
      { "contactInfo.phone": regex },
      { "contactInfo.email": regex },
    ],
    status: { $ne: "blocked" },
  }).limit(limit);
};

export const CustomerModel = model<ICustomer, ICustomerModel>(
  "Customer",
  CustomerSchema
);
export default CustomerModel;
