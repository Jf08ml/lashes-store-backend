import { Request, Response } from "express";
import orderService from "./order.service";
import { response } from "../../utils/response";

class OrderController {
  async createOrder(req: Request, res: Response) {
    try {
      const order = await orderService.createOrder(req.body);
      response(res, {
        status: 201,
        success: true,
        message: "Orden creada exitosamente.",
        data: order,
      });
    } catch (error: any) {
      console.error("Error in createOrder:", error);
      response(res, {
        status: error?.statusCode || 500,
        success: false,
        message: error?.message || "Error interno del servidor.",
        errors: error?.errors || undefined,
      });
    }
  }

  async getOrders(req: Request, res: Response) {
    try {
      const {
        page = "1",
        limit = "20",
        status,
        paymentStatus,
        dateFrom,
        dateTo,
        customerEmail,
        customerPhone,
        orderNumber,
      } = req.query as Record<string, string>;

      const filters: any = {};
      if (status) filters.status = status;
      if (paymentStatus) filters.paymentStatus = paymentStatus;
      if (customerEmail)
        filters["customer.email"] = new RegExp(customerEmail, "i");
      if (customerPhone)
        filters["customer.phone"] = new RegExp(customerPhone, "i");
      if (orderNumber) filters.orderNumber = new RegExp(orderNumber, "i");
      if (dateFrom || dateTo) {
        filters.createdAt = {};
        if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
        if (dateTo) filters.createdAt.$lte = new Date(dateTo);
      }

      const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort: { createdAt: -1 } as Record<string, 1 | -1>,
        populate: ["items.product"],
      };

      const result = await orderService.getOrders(filters, options);
      response(res, {
        status: 200,
        success: true,
        message: "Órdenes obtenidas exitosamente.",
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: any) {
      console.error("Error in getOrders:", error);
      response(res, {
        status: error?.statusCode || 500,
        success: false,
        message: error?.message || "Error interno del servidor.",
      });
    }
  }

  async getOrder(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const order = await orderService.getOrder(id);
      response(res, {
        status: 200,
        success: true,
        message: "Orden obtenida exitosamente.",
        data: order,
      });
    } catch (error: any) {
      console.error("Error in getOrder:", error);
      response(res, {
        status: error?.statusCode || 500,
        success: false,
        message: error?.message || "Error interno del servidor.",
      });
    }
  }

  async updateOrderStatus(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const { status } = req.body as { status: string };
      const updatedBy = (req as any).user?.id as string | undefined;
      const order = await orderService.updateOrderStatus(
        id,
        status,
        updatedBy || null
      );
      response(res, {
        status: 200,
        success: true,
        message: "Estado de orden actualizado exitosamente.",
        data: order,
      });
    } catch (error: any) {
      console.error("Error in updateOrderStatus:", error);
      response(res, {
        status: error?.statusCode || 500,
        success: false,
        message: error?.message || "Error interno del servidor.",
      });
    }
  }

  async cancelOrder(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const { reason = "" } = req.body as { reason?: string };
      const cancelledBy = (req as any).user?.id as string | undefined;
      const order = await orderService.cancelOrder(
        id,
        reason,
        cancelledBy || null
      );
      response(res, {
        status: 200,
        success: true,
        message: "Orden cancelada exitosamente. Stock restaurado.",
        data: order,
      });
    } catch (error: any) {
      console.error("Error in cancelOrder:", error);
      response(res, {
        status: error?.statusCode || 500,
        success: false,
        message: error?.message || "Error interno del servidor.",
      });
    }
  }

  async getSalesStats(req: Request, res: Response) {
    try {
      const { dateFrom, dateTo } = req.query as Record<string, string>;
      if (!dateFrom || !dateTo) {
        return response(res, {
          status: 400,
          success: false,
          message: "Las fechas dateFrom y dateTo son requeridas.",
        });
      }
      const stats = await orderService.getSalesStats(dateFrom, dateTo);
      response(res, {
        status: 200,
        success: true,
        message: "Estadísticas obtenidas exitosamente.",
        data: stats,
      });
    } catch (error: any) {
      console.error("Error in getSalesStats:", error);
      response(res, {
        status: error?.statusCode || 500,
        success: false,
        message: error?.message || "Error interno del servidor.",
      });
    }
  }

  async getTodaysOrders(req: Request, res: Response) {
    try {
      const orders = await orderService.getTodaysOrders();
      response(res, {
        status: 200,
        success: true,
        message: "Órdenes de hoy obtenidas exitosamente.",
        data: orders,
      });
    } catch (error: any) {
      console.error("Error in getTodaysOrders:", error);
      response(res, {
        status: error?.statusCode || 500,
        success: false,
        message: error?.message || "Error interno del servidor.",
      });
    }
  }

  async getPOSDashboard(req: Request, res: Response) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Ejecutar consultas por separado para evitar problemas de tipos complejos
      const todaysOrders = await orderService.getTodaysOrders();
      const todaysStats = await orderService.getSalesStats(today.toISOString(), tomorrow.toISOString());

      const pendingOrders = todaysOrders.filter(
        (o: any) => o.status === "pending"
      ).length;
      const completedOrders = todaysOrders.filter(
        (o: any) => o.status === "delivered"
      ).length;

      response(res, {
        status: 200,
        success: true,
        message: "Dashboard POS obtenido exitosamente.",
        data: {
          todayStats: { ...todaysStats, pendingOrders, completedOrders },
          recentOrders: todaysOrders.slice(0, 10),
        },
      });
    } catch (error: any) {
      console.error("Error in getPOSDashboard:", error);
      response(res, {
        status: error?.statusCode || 500,
        success: false,
        message: error?.message || "Error interno del servidor.",
      });
    }
  }

  async processReturn(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const returnData = req.body;
      const processedBy = (req as any).user?.id as string | undefined;
      
      const order = await orderService.processReturn(id, returnData, processedBy);
      
      response(res, {
        status: 200,
        success: true,
        message: "Devolución procesada exitosamente. Stock restaurado.",
        data: order,
      });
    } catch (error: any) {
      console.error("Error in processReturn:", error);
      response(res, {
        status: error?.statusCode || 500,
        success: false,
        message: error?.message || "Error interno del servidor.",
      });
    }
  }
}

export default new OrderController();
