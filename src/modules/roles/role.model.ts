import { Schema, Types, model } from "mongoose";

const RoleSchema = new Schema(
  {
    _id: {
      type: Schema.Types.ObjectId,
      default: () => new Types.ObjectId(),
    },
    name: {
      type: String,
      enum: ["Administrator", "Moderator", "Standard"],
      required: true,
      index: true,
      unique: true,
    },
    // Puedes tipar mejor si conoces el shape de permissions
    permissions: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

export type RoleDoc = {
  _id: Types.ObjectId;
  name: "Administrator" | "Moderator" | "Standard";
  permissions: any[];
  createdAt: Date;
  updatedAt: Date;
};

export const RoleModel = model("Role", RoleSchema);
export default RoleModel;
