import CustomerModel, { ICustomer, CustomerStatus } from "./customer.model";
import CustomErrors from "../../errors/CustomErrors";

const { DatabaseError, NotFoundError, ValidationError } = CustomErrors;

type Filters = Record<string, any>;
type Options = { page?: number; limit?: number; sort?: Record<string, 1 | -1> };

class CustomerService {
  async findByIdentifier(identifier: string) {
    try {
      return (CustomerModel as any).findByIdentifier(identifier);
    } catch (e) {
      console.error("Error in findByIdentifier:", e);
      throw new DatabaseError("Error al buscar cliente.");
    }
  }

  async findByContact(phone: string, email: string | null = null) {
    try {
      return (CustomerModel as any).findByContact(phone, email);
    } catch (e) {
      console.error("Error in findByContact:", e);
      throw new DatabaseError("Error al buscar cliente por contacto.");
    }
  }

  async searchCustomers(searchTerm: string, limit = 10) {
    try {
      return (CustomerModel as any).searchCustomers(searchTerm, limit);
    } catch (e) {
      console.error("Error in searchCustomers:", e);
      throw new DatabaseError("Error al buscar clientes.");
    }
  }

  async createOrUpdate(customerData: any) {
    try {
      const {
        identifier,
        firstName,
        lastName,
        documentType = "CC",
        documentNumber,
        phone,
        email,
        address,
      } = customerData;

      let customer = await (CustomerModel as any).findByIdentifier(identifier);

      if (customer) {
        // update
        customer.personalInfo.firstName =
          firstName ?? customer.personalInfo.firstName;
        customer.personalInfo.lastName =
          lastName ?? customer.personalInfo.lastName;
        customer.personalInfo.documentType = documentType;
        customer.personalInfo.documentNumber =
          documentNumber ?? customer.personalInfo.documentNumber;

        customer.contactInfo.phone = phone ?? customer.contactInfo.phone;
        customer.contactInfo.email = email ?? customer.contactInfo.email;

        if (address?.street && address?.city) {
          const exists = customer.addresses.find(
            (a: any) => a.street === address.street && a.city === address.city
          );
          if (!exists) {
            await customer.addAddress({
              type: address.type ?? "home",
              street: address.street,
              neighborhood: address.neighborhood ?? "",
              city: address.city,
              state: address.state ?? "Huila",
              zipCode: address.zipCode ?? "",
              country: "Colombia",
              notes: address.notes ?? "",
              isPrimary: Boolean(address.isPrimary),
            });
          }
        }

        await customer.save();
      } else {
        // create
        const newData: Partial<ICustomer> = {
          identifier,
          personalInfo: {
            firstName,
            lastName,
            documentType,
            documentNumber,
          } as any,
          contactInfo: { phone, email } as any,
          addresses: [],
        };

        if (address?.street && address?.city) {
          (newData.addresses as any[]) = [
            {
              type: address.type ?? "home",
              isPrimary: true,
              street: address.street,
              neighborhood: address.neighborhood ?? "",
              city: address.city,
              state: address.state ?? "Huila",
              zipCode: address.zipCode ?? "",
              country: "Colombia",
              notes: address.notes ?? "",
            },
          ];
        }

        customer = new CustomerModel(newData);
        await customer.save();
      }

      return customer;
    } catch (e: any) {
      console.error("Error in createOrUpdate:", e);
      if (e?.code === 11000)
        throw new ValidationError(
          "Ya existe un cliente con ese identificador."
        );
      throw new DatabaseError("Error al crear o actualizar cliente.");
    }
  }

  async getCustomer(id: string) {
    try {
      const customer = await CustomerModel.findById(id);
      if (!customer) throw new NotFoundError("Cliente no encontrado.");
      return customer;
    } catch (e) {
      if (e instanceof NotFoundError) throw e;
      console.error("Error in getCustomer:", e);
      throw new DatabaseError("Error al obtener cliente.");
    }
  }

  async getCustomers(filters: Filters = {}, options: Options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sort = { "personalInfo.firstName": 1 },
      } = options;

      const query: any = { status: { $ne: "blocked" } };

      if (filters.search) {
        const regex = new RegExp(filters.search, "i");
        query.$or = [
          { "personalInfo.firstName": regex },
          { "personalInfo.lastName": regex },
          { "personalInfo.documentNumber": regex },
          { "contactInfo.phone": regex },
          { "contactInfo.email": regex },
          { identifier: regex },
        ];
      }

      if (filters.customerType)
        query["commercialInfo.customerType"] = filters.customerType;
      if (filters.status) query.status = filters.status;

      const skip = (page - 1) * limit;

      // Ejecutar consultas por separado para evitar problemas de tipos complejos
      const items = await CustomerModel.find(query).sort(sort).skip(skip).limit(limit);
      const total = await CustomerModel.countDocuments(query);

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
      console.error("Error in getCustomers:", e);
      throw new DatabaseError("Error al obtener clientes.");
    }
  }

  async updatePurchaseStats(customerId: string, orderTotal: number) {
    try {
      const customer = await CustomerModel.findById(customerId);
      if (customer) await (customer as any).updatePurchaseStats(orderTotal);
      return customer ?? null;
    } catch (e) {
      console.error("Error in updatePurchaseStats:", e);
      // no re-throw para no romper flujos de órdenes
      return null;
    }
  }

  // soft delete → inactive
  async deleteCustomer(id: string) {
    try {
      const customer = await CustomerModel.findByIdAndUpdate(
        id,
        { status: "inactive" satisfies CustomerStatus },
        { new: true }
      );
      if (!customer) throw new NotFoundError("Cliente no encontrado.");
      return customer;
    } catch (e) {
      if (e instanceof NotFoundError) throw e;
      console.error("Error in deleteCustomer:", e);
      throw new DatabaseError("Error al eliminar cliente.");
    }
  }

  async toggleCustomerStatus(id: string, status: CustomerStatus) {
    try {
      const valid: CustomerStatus[] = ["active", "inactive", "blocked"];
      if (!valid.includes(status))
        throw new ValidationError(`Estado inválido: ${status}`);

      const customer = await CustomerModel.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );
      if (!customer) throw new NotFoundError("Cliente no encontrado.");
      return customer;
    } catch (e) {
      if (e instanceof NotFoundError || e instanceof ValidationError) throw e;
      console.error("Error in toggleCustomerStatus:", e);
      throw new DatabaseError("Error al cambiar estado del cliente.");
    }
  }

  async getCustomerStats() {
    try {
      const stats = await CustomerModel.aggregate([
        {
          $group: {
            _id: null,
            totalCustomers: { $sum: 1 },
            activeCustomers: {
              $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
            },
            retailCustomers: {
              $sum: {
                $cond: [
                  { $eq: ["$commercialInfo.customerType", "retail"] },
                  1,
                  0,
                ],
              },
            },
            wholesaleCustomers: {
              $sum: {
                $cond: [
                  { $eq: ["$commercialInfo.customerType", "wholesale"] },
                  1,
                  0,
                ],
              },
            },
            totalSpent: { $sum: "$purchaseStats.totalSpent" },
            totalOrders: { $sum: "$purchaseStats.totalOrders" },
          },
        },
      ]);
      return (
        stats[0] || {
          totalCustomers: 0,
          activeCustomers: 0,
          retailCustomers: 0,
          wholesaleCustomers: 0,
          totalSpent: 0,
          totalOrders: 0,
        }
      );
    } catch (e) {
      console.error("Error in getCustomerStats:", e);
      throw new DatabaseError("Error al obtener estadísticas de clientes.");
    }
  }
}

export default new CustomerService();
