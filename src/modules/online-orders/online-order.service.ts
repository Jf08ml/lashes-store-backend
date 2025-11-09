import OnlineOrderModel from "./online-order.model";
import ProductModel from "../products/product.model";
import customerService from "../customers/customer.service";
import EmailService from "../../services/ses-email.service";
import { generatePaymentEmailTemplate } from "../../services/email-templates.service";
import CustomErrors from "../../errors/CustomErrors";
import { Types } from "mongoose";

const { DatabaseError, NotFoundError, ValidationError } = CustomErrors;

type GetOrdersOptions = {
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
  populate?: string[];
};

class OnlineOrderService {
  // ====== CREATE ONLINE ORDER ======
  async createOnlineOrder(data: any) {
    const session = await OnlineOrderModel.startSession();
    try {
      return await session.withTransaction(async () => {
        const transformed = await this.transformOnlineOrderData(data);

        // Para pedidos online, NO reducimos stock inmediatamente
        // Solo validamos disponibilidad
        await this.validateStockAvailability(transformed.items);

        // Crear pedido con estado 'pending_confirmation'
        const saved = await new OnlineOrderModel({
          ...transformed,
          status: "pending_confirmation", // Estado especial para pedidos online
          paymentStatus: "pending",
        }).save({ session });

        const order = await OnlineOrderModel.findById(saved._id).populate(
          "items.product"
        );

        // Si hay error enviando email, log warning pero no fallar la orden
        if (order && transformed.customer.email) {
          try {
            await this.sendOrderConfirmationEmail(order);
          } catch (emailError: any) {
            // Email error - no afecta el pedido
          }
        }

        return order;
      });
    } catch (e: any) {
      if (e instanceof ValidationError) throw e;
      throw new DatabaseError("Error al crear el pedido online.");
    } finally {
      await session.endSession();
    }
  }

  // ====== CONFIRM ONLINE ORDER (Admin action) ======
  async confirmOnlineOrder(orderId: string, confirmedBy: string) {
    const session = await OnlineOrderModel.startSession();
    try {
      return await session.withTransaction(async () => {
        const order = await OnlineOrderModel.findById(orderId).session(session);
        if (!order) throw new NotFoundError("Pedido no encontrado.");

        if (order.status !== "pending_confirmation") {
          throw new ValidationError("El pedido ya fue procesado.");
        }

        // Validar stock nuevamente al momento de confirmar
        await this.validateStockAvailability(order.items as any[]);

        // Reducir stock ahora que se confirma
        await this.processStockReduction(order.items as any[], session);

        // Actualizar estado
        order.status = "confirmed";
        order.confirmationEmailSent = true;
        order.internalNotes =
          `${order.internalNotes || ""}\nConfirmado por admin: ${confirmedBy}`.trim();

        await order.save({ session });

        return order;
      });
    } catch (e: any) {
      if (e instanceof ValidationError || e instanceof NotFoundError) throw e;
      throw new DatabaseError("Error al confirmar el pedido online.");
    } finally {
      await session.endSession();
    }
  }

  // ====== REJECT ONLINE ORDER (Admin action) ======
  async rejectOnlineOrder(orderId: string, reason: string, rejectedBy: string) {
    try {
      const order = await OnlineOrderModel.findById(orderId);
      if (!order) throw new NotFoundError("Pedido no encontrado.");

      if (order.status !== "pending_confirmation") {
        throw new ValidationError("El pedido ya fue procesado.");
      }

      // Actualizar estado a rechazado
      order.status = "rejected";
      order.rejectionReason = reason;
      order.internalNotes =
        `${order.internalNotes || ""}\nRechazado por admin: ${rejectedBy}. Razón: ${reason}`.trim();

      await order.save();

      return order;
    } catch (e: any) {
      if (e instanceof ValidationError || e instanceof NotFoundError) throw e;
      throw new DatabaseError("Error al rechazar el pedido online.");
    }
  }

  // ====== UPDATE ORDER STATUS (Admin action) ======
  async updateOrderStatus(
    orderId: string,
    newStatus: string,
    updatedBy: string,
    notes?: string
  ) {
    try {
      const order = await OnlineOrderModel.findById(orderId);
      if (!order) throw new NotFoundError("Pedido no encontrado.");

      // Validar transiciones de estado válidas
      const validTransitions: Record<string, string[]> = {
        pending_confirmation: ["confirmed", "rejected"],
        confirmed: ["preparing", "cancelled"],
        preparing: ["shipped", "cancelled"],
        shipped: ["delivered"],
        delivered: [], // Estado final
        rejected: [], // Estado final
        cancelled: [], // Estado final
      };

      const allowedStatuses = validTransitions[order.status] || [];
      if (!allowedStatuses.includes(newStatus)) {
        throw new ValidationError(
          `No se puede cambiar de estado '${order.status}' a '${newStatus}'. Estados permitidos: ${allowedStatuses.join(", ")}`
        );
      }

      // Actualizar estado
      const oldStatus = order.status;
      order.status = newStatus as any;

      // Registrar en historial de estados
      if (!order.statusHistory) {
        (order as any).statusHistory = [];
      }
      order.statusHistory.push({
        status: newStatus,
        timestamp: new Date(),
        updatedBy,
        notes: notes || `Cambio automático de ${oldStatus} a ${newStatus}`,
      });

      // Agregar nota interna sobre el cambio
      const statusNote = `\nCambio de estado: ${oldStatus} → ${newStatus} por ${updatedBy}`;
      const userNote = notes ? `\nNota: ${notes}` : "";
      order.internalNotes =
        `${order.internalNotes || ""}${statusNote}${userNote}`.trim();

      await order.save();

      return order;
    } catch (e: any) {
      if (e instanceof ValidationError || e instanceof NotFoundError) throw e;
      throw new DatabaseError("Error al actualizar el estado del pedido.");
    }
  }

  // ====== GET PENDING ORDERS FOR ADMIN ======
  async getPendingOnlineOrders(options: GetOrdersOptions = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sort = { createdAt: -1 },
        populate = ["items.product"],
      } = options;

      let q = OnlineOrderModel.find({ status: "pending_confirmation" });
      if (populate.includes("items.product"))
        q = q.populate("items.product", "name sku images category");
      q = q.sort(sort);

      const skip = (page - 1) * limit;
      // Ejecutar consultas por separado para evitar problemas de tipos complejos
      const items = await q.skip(skip).limit(limit).exec();
      const total = await OnlineOrderModel.countDocuments({ status: "pending_confirmation" });

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
      throw new DatabaseError("Error al obtener pedidos pendientes.");
    }
  }

  // ====== GET ALL ONLINE ORDERS FOR ADMIN ======
  async getAllOnlineOrders(
    options: GetOrdersOptions & { status?: string } = {}
  ) {
    try {
      const {
        page = 1,
        limit = 20,
        sort = { createdAt: -1 },
        populate = ["items.product"],
        status,
      } = options;

      const filters: any = {};
      if (status && status !== "all") {
        filters.status = status;
      }

      let q = OnlineOrderModel.find(filters);
      if (populate.includes("items.product"))
        q = q.populate("items.product", "name sku images category");
      q = q.sort(sort);

      const skip = (page - 1) * limit;
      // Ejecutar consultas por separado para evitar problemas de tipos complejos
      const items = await q.skip(skip).limit(limit).exec();
      const total = await OnlineOrderModel.countDocuments(filters);

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
      throw new DatabaseError("Error al obtener pedidos online.");
    }
  }

  // ====== GET STATS FOR ADMIN ======
  async getOnlineOrdersStats() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [
        pendingCount,
        confirmedToday,
        rejectedToday,
        totalPending,
        totalConfirmedToday,
      ] = await Promise.all([
        OnlineOrderModel.countDocuments({ status: "pending_confirmation" }),
        OnlineOrderModel.countDocuments({
          status: "confirmed",
          createdAt: { $gte: today, $lt: tomorrow },
        }),
        OnlineOrderModel.countDocuments({
          status: "rejected",
          createdAt: { $gte: today, $lt: tomorrow },
        }),
        OnlineOrderModel.aggregate([
          { $match: { status: "pending_confirmation" } },
          { $group: { _id: null, total: { $sum: "$total" } } },
        ]),
        OnlineOrderModel.aggregate([
          {
            $match: {
              status: "confirmed",
              createdAt: { $gte: today, $lt: tomorrow },
            },
          },
          { $group: { _id: null, total: { $sum: "$total" } } },
        ]),
      ]);

      return {
        pendingCount,
        confirmedToday,
        rejectedToday,
        totalPendingValue: totalPending[0]?.total || 0,
        totalConfirmedTodayValue: totalConfirmedToday[0]?.total || 0,
      };
    } catch (e) {
      throw new DatabaseError("Error al obtener estadísticas.");
    }
  }

  // ====== TRANSFORM DATA FOR ONLINE ORDERS ======
  async transformOnlineOrderData(data: any) {
    // Snapshot del cliente para pedidos online
    const customer = {
      name: data.customer.name,
      email: data.customer.email || "",
      phone: data.customer.phone || "",
      address: data.customer.address || "",
      city: data.customer.city || "",
      state: data.customer.state || "Huila",
      notes: data.customer.notes || "",
    };

    const items = (data.items || []).map((it: any) => ({
      product: it.product,
      name: it.name,
      sku: it.sku || "",
      quantity: it.quantity,
      price: it.price,
      image: it.image || "",
      selectedVariant: it.selectedVariant || undefined,
    }));

    return {
      customer,
      items,
      subtotal: data.subtotal,
      discountAmount: data.discountAmount || 0,
      shippingCost: data.shippingCost || 0,
      total: data.total,
      deliveryType:
        data.deliveryType || "Entrega normal (1 día habil sin costo)",
      paymentMethod: data.paymentMethod || "contraentrega",
      notes: data.customer.notes || "",
      internalNotes: data.internalNotes || "",
    };
  }

  // ====== SEND EMAIL CONFIRMATION ======
  async sendOrderConfirmationEmail(order: any) {
    if (!order.customer.email) {
      return;
    }

    const emailData = {
      orderNumber: order.orderNumber,
      customer: {
        name: order.customer.name,
        email: order.customer.email,
        phone: order.customer.phone,
        address: {
          street: order.customer.address.street,
          city: order.customer.address.city,
          state: order.customer.address.state,
        },
      },
      items: order.items.map((item: any) => ({
        name: item.name,
        image: item.productSnapshot?.image,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        selectedVariant: item.selectedVariant,
      })),
      total: order.total,
      deliveryType: order.deliveryType,
    };

    const htmlContent = generatePaymentEmailTemplate(emailData);

    await EmailService.sendEmail({
      to: order.customer.email,
      subject: `Confirmación de Pedido #${order.orderNumber} - Galaxia Glamour`,
      htmlContent,
      fromName: "Galaxia Glamour Store",
    });
  }

  // ====== STOCK VALIDATION (No reduction yet) ======
  async validateStockAvailability(items: any[]) {
    for (const it of items) {
      const product = await ProductModel.findById(it.product);
      if (!product)
        throw new ValidationError(`Producto ${it.name} no encontrado.`);
      if (!product.isActive)
        throw new ValidationError(`Producto ${it.name} no está activo.`);

      // Check stock availability without reducing it
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
      } else {
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

  // ====== STOCK REDUCTION (Only when confirmed) ======
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
    let allVariantsFound = true;
    
    // Primero verificar que TODAS las variantes existen y tienen stock
    for (const ref of product.references || []) {
      const selectedValue = selections[ref.name];
      if (!selectedValue) continue;
      
      const option = ref.options?.find((o: any) => o.value === selectedValue);
      if (!option || (option.stocks || 0) < qty) {
        allVariantsFound = false;
        break;
      }
    }
    
    // Solo proceder si TODAS las variantes tienen stock suficiente
    if (allVariantsFound) {
      let variantStockReduced = false;
      
      // Reducir stock en cada variante específica
      for (const ref of product.references || []) {
        const selectedValue = selections[ref.name];
        if (!selectedValue) continue;
        
        const option = ref.options?.find((o: any) => o.value === selectedValue);
        if (option) {
          const oldStock = option.stocks || 0;
          option.stocks = Math.max(0, oldStock - qty);
          variantStockReduced = true;
        }
      }
      
      // CRÍTICO: Marcar el campo references como modificado para Mongoose
      if (variantStockReduced) {
        product.markModified('references');
      }
      
      // También reducir stock general
      const currentGeneral = product.stock || product.quantity || 0;
      const oldGeneralStock = currentGeneral;
      product.stock = Math.max(0, currentGeneral - qty);
      product.quantity = product.stock;
      product.quantitiesSold = (product.quantitiesSold || 0) + qty;
      
      await product.save({ session });
    } else {
      throw new Error(`Cannot reduce stock - insufficient variant stock for product ${product.name}`);
    }
  }

  // ====== RETURNS ======
  async processReturn(orderId: string, returnData: any, processedBy?: string) {
    const session = await OnlineOrderModel.startSession();
    try {
      return await session.withTransaction(async () => {
        const order = await OnlineOrderModel.findById(orderId).session(session);
        if (!order) {
          throw new NotFoundError("Orden no encontrada.");
        }

        // Validar que la orden pueda ser devuelta
        if (!["delivered"].includes(order.status)) {
          throw new ValidationError(
            "Solo se pueden devolver órdenes entregadas."
          );
        }

        // Restaurar stock si es necesario
        if (returnData.restoreStock !== false) {
          await this.restoreStockFromOrder(order.items, session);
        }

        // Validar y convertir processedBy a ObjectId válido o null
        const validProcessedBy = this.validateObjectId(processedBy);

        // Actualizar orden con información de devolución
        const updateData: any = {
          status: "returned",
          updatedBy: validProcessedBy,
          returnInfo: {
            reason: returnData.reason,
            notes: returnData.notes || "",
            refundRequested: returnData.refundRequested || false,
            refundProcessed: false,
            refundAmount: returnData.refundRequested ? order.total : 0,
            exchangeProductId: returnData.exchangeProductId || null,
            processedBy: validProcessedBy,
            processedAt: new Date(),
          },
        };

        const updatedOrder = await OnlineOrderModel.findByIdAndUpdate(
          orderId,
          updateData,
          { new: true, session }
        ).populate("items.product");

        return updatedOrder;
      });
    } catch (e: any) {
      if (e instanceof ValidationError || e instanceof NotFoundError) throw e;
      throw new DatabaseError("Error al procesar la devolución.");
    } finally {
      await session.endSession();
    }
  }

  // Helper para validar ObjectId
  private validateObjectId(id?: string): Types.ObjectId | null {
    if (!id || id === "admin" || !Types.ObjectId.isValid(id)) {
      return null;
    }
    return new Types.ObjectId(id);
  }

  // Restaurar stock de productos
  private async restoreStockFromOrder(items: any[], session: any) {
    for (const item of items) {
      try {
        const product = await ProductModel.findById(item.product).session(
          session
        );
        if (!product) continue;

        // Si tiene variantes específicas, restaurar por variante
        if (item.selectedVariant?.selections) {
          await this.restoreMultipleVariantStock(
            product,
            item.selectedVariant.selections,
            item.quantity,
            session
          );
        } else {
          // Si no tiene variantes, restaurar stock general
          await ProductModel.findByIdAndUpdate(
            item.product,
            { $inc: { stock: item.quantity, quantity: item.quantity } },
            { session }
          );
        }
      } catch (e) {
        // Silently ignore restore errors
      }
    }
  }

  // Restaurar stock de variantes específicas
  async restoreMultipleVariantStock(
    product: any,
    selections: Record<string, string>,
    qty: number,
    session: any
  ) {
    let variantStockRestored = false;

    // Restaurar stock en cada referencia específica
    for (const ref of product.references || []) {
      const selectedValue = selections[ref.name];
      if (!selectedValue) continue;

      const option = ref.options?.find((o: any) => o.value === selectedValue);
      if (option) {
        const oldStock = option.stocks || 0;
        option.stocks = oldStock + qty;
        variantStockRestored = true;
      }
    }

    if (variantStockRestored) {
      // CRÍTICO: Marcar el campo references como modificado para Mongoose
      product.markModified('references');
      
      // También restaurar stock general
      const currentGeneral = product.stock || product.quantity || 0;
      const oldGeneralStock = currentGeneral;
      product.stock = currentGeneral + qty;
      product.quantity = product.stock;

      // Reducir cantidades vendidas
      product.quantitiesSold = Math.max(0, (product.quantitiesSold || 0) - qty);
      
      await product.save({ session });
    }
  }
}

export default new OnlineOrderService();
