import { Request, Response } from "express";
import customerService from "./customer.service";
import { response } from "../../utils/response";

class CustomerController {
  async findByIdentifier(req: Request, res: Response) {
    try {
      const { identifier } = req.params as { identifier: string };
      const customer = await customerService.findByIdentifier(identifier);

      response(res, {
        status: 200,
        success: true,
        message: customer ? "Cliente encontrado." : "Cliente no encontrado.",
        data: customer,
      });
    } catch (error: any) {
      console.error("Error in findByIdentifier:", error);
      response(res, {
        status: error?.statusCode || 500,
        success: false,
        message: error?.message || "Error interno del servidor.",
      });
    }
  }

  async searchCustomers(req: Request, res: Response) {
    try {
      const { q: searchTerm, limit = "10" } = req.query as Record<
        string,
        string
      >;
      if (!searchTerm || searchTerm.trim().length < 2) {
        return response(res, {
          status: 400,
          success: false,
          message: "El término de búsqueda debe tener al menos 2 caracteres.",
        });
      }

      const customers = await customerService.searchCustomers(
        searchTerm,
        parseInt(limit, 10)
      );
      response(res, {
        status: 200,
        success: true,
        message: "Búsqueda completada.",
        data: customers,
      });
    } catch (error: any) {
      console.error("Error in searchCustomers:", error);
      response(res, {
        status: error?.statusCode || 500,
        success: false,
        message: error?.message || "Error interno del servidor.",
      });
    }
  }

  async createOrUpdate(req: Request, res: Response) {
    try {
      const customerData = req.body;
      // opcional: audit createdBy/updatedBy si tienes req.user?.id
      const customer = await customerService.createOrUpdate(customerData);
      response(res, {
        status: 201,
        success: true,
        message: "Cliente guardado exitosamente.",
        data: customer,
      });
    } catch (error: any) {
      console.error("Error in createOrUpdate:", error);
      response(res, {
        status: error?.statusCode || 500,
        success: false,
        message: error?.message || "Error interno del servidor.",
      });
    }
  }

  async getCustomer(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const customer = await customerService.getCustomer(id);
      response(res, {
        status: 200,
        success: true,
        message: "Cliente obtenido exitosamente.",
        data: customer,
      });
    } catch (error: any) {
      console.error("Error in getCustomer:", error);
      response(res, {
        status: error?.statusCode || 500,
        success: false,
        message: error?.message || "Error interno del servidor.",
      });
    }
  }

  async getCustomers(req: Request, res: Response) {
    try {
      const {
        page = "1",
        limit = "20",
        search,
        customerType,
        status,
        sortBy = "personalInfo.firstName",
        sortOrder = "asc",
      } = req.query as Record<string, string>;

      const filters: any = {};
      if (search) filters.search = search;
      if (customerType) filters.customerType = customerType;
      if (status) filters.status = status;

      const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort: { [sortBy]: sortOrder === "desc" ? -1 : 1 } as Record<
          string,
          1 | -1
        >,
      };

      const result = await customerService.getCustomers(filters, options);
      response(res, {
        status: 200,
        success: true,
        message: "Clientes obtenidos exitosamente.",
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: any) {
      console.error("Error in getCustomers:", error);
      response(res, {
        status: error?.statusCode || 500,
        success: false,
        message: error?.message || "Error interno del servidor.",
      });
    }
  }

  async deleteCustomer(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const customer = await customerService.deleteCustomer(id);
      response(res, {
        status: 200,
        success: true,
        message: "Cliente eliminado exitosamente.",
        data: customer,
      });
    } catch (error: any) {
      console.error("Error in deleteCustomer:", error);
      response(res, {
        status: error?.statusCode || 500,
        success: false,
        message: error?.message || "Error interno del servidor.",
      });
    }
  }

  async toggleStatus(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const { status } = req.body as {
        status: "active" | "inactive" | "blocked";
      };
      const customer = await customerService.toggleCustomerStatus(id, status);
      response(res, {
        status: 200,
        success: true,
        message: "Estado del cliente actualizado exitosamente.",
        data: customer,
      });
    } catch (error: any) {
      console.error("Error in toggleStatus:", error);
      response(res, {
        status: error?.statusCode || 500,
        success: false,
        message: error?.message || "Error interno del servidor.",
      });
    }
  }

  async getStats(req: Request, res: Response) {
    try {
      const stats = await customerService.getCustomerStats();
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
}

export default new CustomerController();
