import { Request, Response } from "express";
import onlineOrderService from "./online-order.service";
import { response } from "../../utils/response";

class OnlineOrderController {
  async createOnlineOrder(req: Request, res: Response) {
    try {
      const order = await onlineOrderService.createOnlineOrder(req.body);
      response(res, {
        status: 201,
        success: true,
        message: "Pedido online creado exitosamente. Se ha enviado confirmación por email.",
        data: order,
      });
    } catch (error: any) {
      console.error("Error in createOnlineOrder:", error);
      response(res, {
        status: error?.statusCode || 500,
        success: false,
        message: error?.message || "Error interno del servidor.",
        errors: error?.errors || undefined,
      });
    }
  }

  async getPendingOrders(req: Request, res: Response) {
    try {
      const {
        page = "1",
        limit = "20",
      } = req.query as Record<string, string>;

      const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort: { createdAt: -1 } as Record<string, 1 | -1>,
        populate: ["items.product"],
      };

      const result = await onlineOrderService.getPendingOnlineOrders(options);
      response(res, {
        status: 200,
        success: true,
        message: "Pedidos pendientes obtenidos exitosamente.",
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: any) {
      console.error("Error in getPendingOrders:", error);
      response(res, {
        status: error?.statusCode || 500,
        success: false,
        message: error?.message || "Error interno del servidor.",
      });
    }
  }

  async getAllOrders(req: Request, res: Response) {
    try {
      const {
        page = "1",
        limit = "20",
        status = "all",
      } = req.query as Record<string, string>;

      const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort: { createdAt: -1 } as Record<string, 1 | -1>,
        populate: ["items.product"],
        status,
      };

      const result = await onlineOrderService.getAllOnlineOrders(options);
      response(res, {
        status: 200,
        success: true,
        message: "Pedidos obtenidos exitosamente.",
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: any) {
      console.error("Error in getAllOrders:", error);
      response(res, {
        status: error?.statusCode || 500,
        success: false,
        message: error?.message || "Error interno del servidor.",
      });
    }
  }

  async getStats(req: Request, res: Response) {
    try {
      const stats = await onlineOrderService.getOnlineOrdersStats();
      response(res, {
        status: 200,
        success: true,
        message: "Estadísticas obtenidas exitosamente.",
        data: stats,
      });
    } catch (error: any) {
      console.error("Error in getStats:", error);
      response(res, {
        status: error?.statusCode || 500,
        success: false,
        message: error?.message || "Error interno del servidor.",
      });
    }
  }

  async confirmOrder(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const confirmedBy = (req as any).user?.id || 'admin'; // TODO: Get from auth middleware
      
      const order = await onlineOrderService.confirmOnlineOrder(id, confirmedBy);
      response(res, {
        status: 200,
        success: true,
        message: "Pedido confirmado exitosamente. Stock reducido y cliente notificado.",
        data: order,
      });
    } catch (error: any) {
      console.error("Error in confirmOrder:", error);
      response(res, {
        status: error?.statusCode || 500,
        success: false,
        message: error?.message || "Error interno del servidor.",
      });
    }
  }

  async rejectOrder(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const { reason = "Sin stock disponible" } = req.body as { reason?: string };
      const rejectedBy = (req as any).user?.id || 'admin'; // TODO: Get from auth middleware
      
      const order = await onlineOrderService.rejectOnlineOrder(id, reason, rejectedBy);
      response(res, {
        status: 200,
        success: true,
        message: "Pedido rechazado exitosamente.",
        data: order,
      });
    } catch (error: any) {
      console.error("Error in rejectOrder:", error);
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
      const { status, notes } = req.body as { status: string; notes?: string };
      const updatedBy = (req as any).user?.id || 'admin'; // TODO: Get from auth middleware
      
      if (!status) {
        return response(res, {
          status: 400,
          success: false,
          message: "El estado es requerido.",
        });
      }
      
      const order = await onlineOrderService.updateOrderStatus(id, status, updatedBy, notes);
      response(res, {
        status: 200,
        success: true,
        message: `Estado del pedido actualizado a ${status} exitosamente.`,
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

  async processReturn(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const returnData = req.body;
      const processedBy = (req as any).user?.id || 'admin';
      
      const order = await onlineOrderService.processReturn(id, returnData, processedBy);
      
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

export default new OnlineOrderController();