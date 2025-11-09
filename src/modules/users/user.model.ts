import { Schema, Types, model, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  nickname?: string;
  password: string; // plain solo en set, nunca devolver
  passwordHash: string; // persistido
  role: Types.ObjectId; // ref a Role
  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidate: string): Promise<boolean>;
}

// Permito que tu código anterior que hacía `user.password = newPassword` siga funcionando
const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true },
    nickname: { type: String },
    passwordHash: { type: String, required: true },
    role: { type: Schema.Types.ObjectId, ref: "Role", required: true },
  },
  { timestamps: true }
);

// setter virtual "password" para no guardar el plano
UserSchema.virtual("password")
  // @ts-ignore - mongoose virtual setter signature
  .set(function (this: IUser, value: string) {
    // guardo hash inmediatamente
    // nota: 10 salt rounds como tenías
    this.passwordHash = bcrypt.hashSync(value, 10);
  });

// método de comparación
UserSchema.methods.comparePassword = function (candidate: string) {
  if (!this.passwordHash) {
    console.error("comparePassword called but passwordHash is undefined");
    throw new Error("Usuario sin contraseña configurada");
  }
  return bcrypt.compare(candidate, this.passwordHash);
};

export const UserModel = model<IUser>("User", UserSchema);
export default UserModel;
