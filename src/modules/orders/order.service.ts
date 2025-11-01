import OrderModel from "./order.model";
import ProductModel from "../products/product.model";
import customerService from "../customers/customer.service";
import CustomErrors from "../../errors/CustomErrors";

const { DatabaseError, NotFoundError, ValidationError } = CustomErrors;

type GetOrdersOptions = {
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
  populate?: string[];
};

class OrderService {
  // ====== CREATE ======
  async createOrder(data: any) {
    const session = await OrderModel.startSession();
    try {
      return await session.withTransaction(async () => {
        const transformed = await this.transformOrderData(data);

        // validar stock
        await this.validateStockAvailability(transformed.items);

        // descontar stock
        await this.processStockReduction(transformed.items, session);

        // crear orden
        const saved = await new OrderModel(transformed).save({ session });

        // actualizar stats del cliente (best-effort)
        if (transformed.customer.customerId) {
          try {
            await customerService.updatePurchaseStats(
              transformed.customer.customerId,
              transformed.total
            );
          } catch (e: any) {
            console.warn("Could not update customer stats:", e?.message || e);
          }
        }

        return OrderModel.findById(saved._id).populate("items.product");
      });
    } catch (e: any) {
      console.error("Error in createOrder:", e);
      if (e instanceof ValidationError) throw e;
      if (typeof e?.message === "string" && e.message.includes("stock")) {
        throw new ValidationError(e.message);
      }
      throw new DatabaseError("Error al crear la orden.");
    } finally {
      await session.endSession();
    }
  }

  // ====== TRANSFORM ======
  async transformOrderData(data: any) {
    const d = new Date();
    const YY = d.getFullYear().toString().slice(-2);
    const MM = (d.getMonth() + 1).toString().padStart(2, "0");
    const DD = d.getDate().toString().padStart(2, "0");
    const ts = Date.now().toString().slice(-6);
    const orderNumber = `ORD-${YY}${MM}${DD}-${ts}`;

    // snapshot/alta de cliente
    const snap: any = {
      name: data.customer.name,
      email: data.customer.email || "",
      phone: data.customer.phone || "",
      documentType: data.customer.documentType || "",
      documentNumber: data.customer.documentNumber || "",
      address: {
        street: data.customer.address || "",
        city: data.customer.city || "",
        state: data.customer.state || "Huila",
        zipCode: data.customer.zipCode || "",
        country: "Colombia",
      },
      notes: data.customer.notes || "",
    };

    if (data.customer.identifier) {
      try {
        const cust = await customerService.createOrUpdate({
          identifier: data.customer.identifier,
          firstName:
            data.customer.firstName || data.customer.name.split(" ")[0],
          lastName:
            data.customer.lastName ||
            data.customer.name.split(" ").slice(1).join(" "),
          documentType: data.customer.documentType || "CC",
          documentNumber: data.customer.documentNumber,
          phone: data.customer.phone,
          email: data.customer.email,
          address: data.customer.address
            ? {
                street: data.customer.address,
                city: data.customer.city,
                state: data.customer.state || "Huila",
              }
            : null,
        });

        snap.customerId = cust._id;
        snap.name = cust.fullName;
        snap.email = cust.contactInfo.email || snap.email;
        snap.phone = cust.contactInfo.phone || snap.phone;
        snap.documentType = cust.personalInfo.documentType;
        snap.documentNumber = cust.personalInfo.documentNumber || "";

        if (cust.primaryAddress) {
          snap.address = {
            street: cust.primaryAddress.street,
            city: cust.primaryAddress.city,
            state: cust.primaryAddress.state,
            zipCode: cust.primaryAddress.zipCode || "",
            country: cust.primaryAddress.country,
          };
        }
      } catch (e: any) {
        console.warn("Could not create/update customer:", e?.message || e);
      }
    }

    const items = (data.items || []).map((it: any) => ({
      product: it.product,
      name: it.name,
      sku: it.sku || "",
      quantity: it.quantity,
      unitPrice: it.price,
      totalPrice: it.price * it.quantity,
      selectedVariant: it.selectedVariant || undefined,
      productSnapshot: {
        basePrice: it.price,
        category: "",
        description: "",
        image: it.image || "",
      },
    }));

    return {
      orderNumber,
      customer: snap,
      items,
      subtotal: data.subtotal,
      tax: 0,
      discount: data.discountAmount || 0,
      shipping: data.shippingCost || 0,
      total: data.total,
      status: data.status || "pending",
      orderType: "pos",
      deliveryType: "pickup",
      paymentMethod: data.paymentMethod,
      paymentStatus: data.paymentStatus || "pending",
      paidAmount: data.paymentStatus === "paid" ? data.total : 0,
      notes: data.customer.notes || "",
      internalNotes: data.internalNotes || "",
    };
  }

  // ====== STOCK CHECK ======
  async validateStockAvailability(items: any[]) {
    for (const it of items) {
      const product = await ProductModel.findById(it.product);
      if (!product)
        throw new ValidationError(`Producto ${it.name} no encontrado.`);
      if (!product.isActive)
        throw new ValidationError(`Producto ${it.name} no está activo.`);

      // variantes múltiples
      if (it.selectedVariant?.selections) {
        if (
          !this.validateMultipleVariantStock(
            product,
            it.selectedVariant.selections,
            it.quantity
          )
        ) {
          throw new ValidationError(
            `Stock insuficiente para ${it.name} con las características seleccionadas. Solicitado: ${it.quantity}`
          );
        }
      }
      // variante simple
      else if (it.selectedVariant?.referenceName) {
        const opt = this.findVariantStock(product, it.selectedVariant);
        if (!opt || opt.stocks < it.quantity) {
          throw new ValidationError(
            `Stock insuficiente para ${it.name} - ${it.selectedVariant.optionLabel}. ` +
              `Disponible: ${opt?.stocks || 0}, Solicitado: ${it.quantity}`
          );
        }
      }
      // stock general
      else {
        const total = product.stock || product.quantity || 0;
        if (total < it.quantity) {
          throw new ValidationError(
            `Stock insuficiente para ${it.name}. Disponible: ${total}, Solicitado: ${it.quantity}`
          );
        }
      }
    }
  }

  validateMultipleVariantStock(
    product: any,
    selections: Record<string, string>,
    qty: number
  ) {
    if (!product.references) return false;
    for (const ref of product.references) {
      const sel = selections[ref.name];
      if (sel) {
        const opt = ref.options?.find((o: any) => o.value === sel);
        if (!opt || opt.stocks < qty) return false;
      }
    }
    const general = product.stock || product.quantity || 0;
    if (general < qty) return false;
    return true;
  }

  findVariantStock(product: any, selectedVariant: any) {
    const ref = product.references?.find(
      (r: any) => r.name === selectedVariant.referenceName
    );
    const opt = ref?.options?.find(
      (o: any) => o.value === selectedVariant.optionValue
    );
    return opt;
  }

  async processStockReduction(items: any[], session: any) {
    for (const it of items) {
      const product = await ProductModel.findById(it.product).session(session);
      if (!product) continue;

      if (it.selectedVariant?.selections) {
        await this.reduceMultipleVariantStock(
          product,
          it.selectedVariant.selections,
          it.quantity,
          session
        );
      } else if (it.selectedVariant?.referenceName) {
        await this.reduceVariantStock(
          product,
          it.selectedVariant,
          it.quantity,
          session
        );
      } else {
        const current = product.stock || product.quantity || 0;
        product.stock = Math.max(0, current - it.quantity);
        product.quantity = product.stock;
        product.quantitiesSold = (product.quantitiesSold || 0) + it.quantity;
        await product.save({ session });
      }
    }
  }

  async reduceMultipleVariantStock(
    product: any,
    selections: Record<string, string>,
    qty: number,
    session: any
  ) {
    let touched = false;
    for (const ref of product.references) {
      const sel = selections[ref.name];
      if (!sel) continue;
      const opt = ref.options?.find((o: any) => o.value === sel);
      if (opt && opt.stocks >= qty) {
        opt.stocks = Math.max(0, opt.stocks - qty);
        touched = true;
      }
    }
    if (touched) {
      const general = product.stock || product.quantity || 0;
      product.stock = Math.max(0, general - qty);
      product.quantity = product.stock;
      product.quantitiesSold = (product.quantitiesSold || 0) + qty;
      await product.save({ session });
    }
  }

  async reduceVariantStock(
    product: any,
    selectedVariant: any,
    qty: number,
    session: any
  ) {
    const ref = product.references?.find(
      (r: any) => r.name === selectedVariant.referenceName
    );
    const opt = ref?.options?.find(
      (o: any) => o.value === selectedVariant.optionValue
    );
    if (opt) {
      opt.stocks = Math.max(0, opt.stocks - qty);
      await product.save({ session });
    }
  }

  // ====== READ/LIST ======
  async getOrders(filters: any = {}, options: GetOrdersOptions = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sort = { createdAt: -1 },
        populate = ["items.product"],
      } = options;

      let q = OrderModel.find(filters);
      if (populate.includes("items.product"))
        q = q.populate("items.product", "name sku images category");
      q = q.sort(sort);

      const skip = (page - 1) * limit;
      const [items, total] = await Promise.all([
        q.skip(skip).limit(limit).exec(),
        OrderModel.countDocuments(filters),
      ]);
      return {
        data: items,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      };
    } catch (e) {
      console.error("Error in getOrders:", e);
      throw new DatabaseError("Error al obtener las órdenes.");
    }
  }

  async getOrder(id: string) {
    try {
      const order = await OrderModel.findById(id).populate(
        "items.product",
        "name sku images category"
      );
      if (!order) throw new NotFoundError("Orden no encontrada.");
      return order;
    } catch (e) {
      if (e instanceof NotFoundError) throw e;
      console.error("Error in getOrder:", e);
      throw new DatabaseError("Error al obtener la orden.");
    }
  }

  // ====== UPDATE STATUS / CANCEL ======
  async updateOrderStatus(
    orderId: string,
    status: string,
    updatedBy: string | null = null
  ) {
    try {
      const valid = [
        "pending",
        "confirmed",
        "preparing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ];
      if (!valid.includes(status))
        throw new ValidationError(`Estado inválido: ${status}`);

      const updated = await OrderModel.findByIdAndUpdate(
        orderId,
        { status, updatedBy },
        { new: true, runValidators: true }
      ).populate("items.product");

      if (!updated)
        throw new NotFoundError("Orden no encontrada para actualizar.");
      return updated;
    } catch (e) {
      if (e instanceof NotFoundError || e instanceof ValidationError) throw e;
      console.error("Error in updateOrderStatus:", e);
      throw new DatabaseError("Error al actualizar el estado de la orden.");
    }
  }

  async cancelOrder(
    orderId: string,
    reason = "",
    cancelledBy: string | null = null
  ) {
    const session = await OrderModel.startSession();
    try {
      return await session.withTransaction(async () => {
        const order = await OrderModel.findById(orderId).session(session);
        if (!order) throw new NotFoundError("Orden no encontrada.");
        if (order.status === "cancelled")
          throw new ValidationError("La orden ya está cancelada.");
        if (order.status === "delivered")
          throw new ValidationError(
            "No se puede cancelar una orden entregada."
          );

        // restaurar stock
        await this.restoreStock(order.items as any[], session);

        // marcar cancelada
        order.status = "cancelled";
        order.internalNotes = `${
          order.internalNotes || ""
        }\nCancelada: ${reason}`.trim();
        order.updatedBy = cancelledBy as any;
        await order.save({ session });

        return order;
      });
    } catch (e) {
      if (e instanceof NotFoundError || e instanceof ValidationError) throw e;
      console.error("Error in cancelOrder:", e);
      throw new DatabaseError("Error al cancelar la orden.");
    } finally {
      await session.endSession();
    }
  }

  async restoreStock(items: any[], session: any) {
    for (const it of items) {
      const product = await ProductModel.findById(it.product).session(session);
      if (!product) continue;

      if (it.selectedVariant?.selections) {
        await this.restoreMultipleVariantStock(
          product,
          it.selectedVariant.selections,
          it.quantity,
          session
        );
      } else if (it.selectedVariant?.referenceName) {
        await this.restoreVariantStock(
          product,
          it.selectedVariant,
          it.quantity,
          session
        );
      } else {
        product.stock += it.quantity;
        product.quantity = product.stock;
        product.quantitiesSold = Math.max(
          0,
          (product.quantitiesSold || 0) - it.quantity
        );
        await product.save({ session });
      }
    }
  }

  async restoreMultipleVariantStock(
    product: any,
    selections: Record<string, string>,
    qty: number,
    session: any
  ) {
    let touched = false;
    for (const ref of product.references) {
      const sel = selections[ref.name];
      if (!sel) continue;
      const opt = ref.options?.find((o: any) => o.value === sel);
      if (opt) {
        opt.stocks += qty;
        touched = true;
      }
    }
    if (touched) await product.save({ session });
  }

  async restoreVariantStock(
    product: any,
    selectedVariant: any,
    qty: number,
    session: any
  ) {
    const ref = product.references?.find(
      (r: any) => r.name === selectedVariant.referenceName
    );
    const opt = ref?.options?.find(
      (o: any) => o.value === selectedVariant.optionValue
    );
    if (opt) {
      opt.stocks += qty;
      await product.save({ session });
    }
  }

  // ====== STATS & TODAY ======
  async getSalesStats(dateFrom: string, dateTo: string) {
    try {
      const match = {
        paymentStatus: "paid",
        createdAt: { $gte: new Date(dateFrom), $lte: new Date(dateTo) },
      };
      const stats = await OrderModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalSales: { $sum: "$total" },
            totalOrders: { $sum: 1 },
            avgOrderValue: { $avg: "$total" },
            totalItems: { $sum: { $sum: "$items.quantity" } },
          },
        },
      ]);
      return (
        stats[0] || {
          totalSales: 0,
          totalOrders: 0,
          avgOrderValue: 0,
          totalItems: 0,
        }
      );
    } catch (e) {
      console.error("Error in getSalesStats:", e);
      throw new DatabaseError("Error al obtener estadísticas de ventas.");
    }
  }

  async getTodaysOrders() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return OrderModel.find({ createdAt: { $gte: today, $lt: tomorrow } })
        .populate("items.product")
        .sort({ createdAt: -1 });
    } catch (e) {
      console.error("Error in getTodaysOrders:", e);
      throw new DatabaseError("Error al obtener órdenes de hoy.");
    }
  }
}

export default new OrderService();
