import ProductModel from '../products/product.model';
import OrderModel from '../orders/order.model';
import OnlineOrderModel from '../online-orders/online-order.model';
import CustomerModel from '../customers/customer.model';

export class FinancialService {
  
  // Dashboard general con métricas principales
  static async getDashboardAnalysis() {
    try {
      // Obtener datos básicos para el dashboard
      const [products, orders, onlineOrders, customers] = await Promise.all([
        ProductModel.find().exec(),
        OrderModel.find().exec(),
        OnlineOrderModel.find().exec(),
        CustomerModel.find().exec()
      ]);

      // Cálculos básicos
      const inventoryValue = products.reduce((total, product) => 
        total + (product.quantity * product.basePrice), 0);
      
      const totalPOSSales = orders.reduce((total, order) => total + order.total, 0);
      const totalOnlineSales = onlineOrders
        .filter(order => ['confirmed', 'preparing', 'shipped', 'delivered'].includes(order.status))
        .reduce((total, order) => total + order.total, 0);
      
      const totalRevenue = totalPOSSales + totalOnlineSales;
      const totalOrders = orders.length + onlineOrders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      return {
        overview: {
          totalRevenue,
          grossProfit: totalRevenue * 0.4, // Estimación del 40% de margen
          profitMargin: 40,
          inventoryValue,
          totalOrders,
          uniqueCustomers: customers.length,
          avgOrderValue
        },
        salesChannels: {
          posRevenue: totalPOSSales,
          onlineRevenue: totalOnlineSales,
          posPercentage: totalRevenue > 0 ? (totalPOSSales / totalRevenue) * 100 : 0,
          onlinePercentage: totalRevenue > 0 ? (totalOnlineSales / totalRevenue) * 100 : 0
        },
        trends: {
          dailyGrowth: 2.5,
          weeklyGrowth: 8.0,
          monthlyGrowth: 15.0
        },
        alerts: []
      };
    } catch (error) {
      console.error('Error in getDashboardAnalysis:', error);
      throw new Error('Error obteniendo análisis del dashboard');
    }
  }

  // Análisis detallado por período
  static async getDetailedAnalysis(period: string = 'month') {
    try {
      const dashboard = await this.getDashboardAnalysis();
      
      return {
        period,
        dateRange: { start: new Date(), end: new Date() },
        financial: {
          sales: dashboard.overview.totalRevenue,
          expenses: dashboard.overview.totalRevenue * 0.6, // 60% costos estimados
          profit: dashboard.overview.grossProfit,
          netMargin: dashboard.overview.profitMargin
        },
        products: {
          topSellers: [],
          categoryBreakdown: []
        }
      };
    } catch (error) {
      console.error('Error in getDetailedAnalysis:', error);
      throw new Error('Error obteniendo análisis detallado');
    }
  }

  // Análisis de productos
  static async getProductAnalysis() {
    try {
      const products = await ProductModel.find().populate('category').exec();
      
      const analysis = products.map(product => {
        const inventoryValue = product.quantity * product.basePrice;
        const potentialRevenue = product.quantity * product.salePrice;
        const potentialProfit = potentialRevenue - inventoryValue;
        const profitMargin = potentialRevenue > 0 ? (potentialProfit / potentialRevenue) * 100 : 0;
        
        return {
          id: product._id,
          name: product.name,
          category: (product.category as any)?.name || 'Sin categoría',
          quantity: product.quantity,
          basePrice: product.basePrice,
          salePrice: product.salePrice,
          inventoryValue,
          potentialRevenue,
          potentialProfit,
          profitMargin,
          stockStatus: this.getStockStatus(product.quantity)
        };
      });

      const totalInventoryValue = analysis.reduce((sum, p) => sum + p.inventoryValue, 0);
      const totalPotentialRevenue = analysis.reduce((sum, p) => sum + p.potentialRevenue, 0);
      const avgProfitMargin = analysis.length > 0 ? 
        analysis.reduce((sum, p) => sum + p.profitMargin, 0) / analysis.length : 0;

      return {
        products: analysis,
        summary: {
          totalProducts: products.length,
          totalInventoryValue,
          totalPotentialRevenue,
          avgProfitMargin,
          lowStockItems: analysis.filter(p => p.stockStatus === 'low').length,
          outOfStockItems: analysis.filter(p => p.stockStatus === 'out').length
        }
      };
    } catch (error) {
      console.error('Error in getProductAnalysis:', error);
      throw new Error('Error obteniendo análisis de productos');
    }
  }

  // Resto de métodos simplificados
  static async getCashFlowAnalysis(startDate?: string, endDate?: string) {
    try {
      return {
        period: { start: new Date(), end: new Date() },
        dailyCashFlow: [],
        summary: {
          totalIncome: 0,
          totalOrders: 0,
          avgDailyIncome: 0,
          bestDay: null,
          worstDay: null
        }
      };
    } catch (error) {
      console.error('Error in getCashFlowAnalysis:', error);
      throw new Error('Error obteniendo análisis de flujo de caja');
    }
  }

  static async getKPIAnalysis() {
    try {
      const currentDate = new Date();
      const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const twoMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1);

      // Órdenes del mes actual y anterior
      const [currentMonthOrders, lastMonthOrders] = await Promise.all([
        OrderModel.find({
          status: 'completed',
          createdAt: { $gte: lastMonth }
        }).exec(),
        OrderModel.find({
          status: 'completed',
          createdAt: { 
            $gte: twoMonthsAgo,
            $lt: lastMonth
          }
        }).exec()
      ]);

      const currentRevenue = currentMonthOrders.reduce((sum, order) => sum + order.total, 0);
      const lastRevenue = lastMonthOrders.reduce((sum, order) => sum + order.total, 0);
      
      const monthlyGrowth = lastRevenue > 0 ? 
        ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0;

      const avgOrderValue = currentMonthOrders.length > 0 ? 
        currentRevenue / currentMonthOrders.length : 0;

      // Obtener datos de productos para rotación
      const products = await ProductModel.find().exec();
      const totalInventoryValue = products.reduce((sum, p) => sum + (p.quantity * p.basePrice), 0);
      const inventoryTurnover = totalInventoryValue > 0 ? 
        (currentRevenue / totalInventoryValue) * 12 : 0; // Anualizado

      return {
        monthly_growth: monthlyGrowth,
        avg_order_value: avgOrderValue,
        inventory_turnover: inventoryTurnover,
        customer_retention: 75, // Estimación
        conversion_rate: 3.5, // Estimación
        growth: { 
          monthly: monthlyGrowth, 
          target: 15 
        },
        customer: { 
          retention: 75, 
          avgOrderValue, 
          target: 80 
        },
        operations: { 
          conversionRate: 3.5, 
          inventoryTurnover, 
          target: 6 
        },
        profitability: { 
          margin: 40, 
          target: 40 
        }
      };
    } catch (error) {
      console.error('Error in getKPIAnalysis:', error);
      throw new Error('Error obteniendo KPIs');
    }
  }

  static async getProfitabilityAnalysis() {
    try {
      const products = await ProductModel.find().populate('category').exec();
      
      const productProfitability = products.map(product => {
        const profit = product.salePrice - product.basePrice;
        const margin = product.salePrice > 0 ? (profit / product.salePrice) * 100 : 0;
        
        return {
          product: product.name,
          category: (product.category as any)?.name || 'Sin categoría',
          basePrice: product.basePrice,
          salePrice: product.salePrice,
          profit,
          margin,
          quantity: product.quantity,
          totalPotentialProfit: profit * product.quantity
        };
      });

      const avgMargin = productProfitability.length > 0 ? 
        productProfitability.reduce((sum, p) => sum + p.margin, 0) / productProfitability.length : 0;
      
      const totalPotentialProfit = productProfitability.reduce((sum, p) => sum + p.totalPotentialProfit, 0);

      return {
        byProduct: productProfitability.sort((a, b) => b.margin - a.margin),
        byCategory: [],
        summary: {
          avgMargin,
          totalPotentialProfit,
          bestMarginProduct: productProfitability.length > 0 ? 
            productProfitability.reduce((best, p) => 
              p.margin > best.margin ? p : best) : null,
          worstMarginProduct: productProfitability.length > 0 ? 
            productProfitability.reduce((worst, p) => 
              p.margin < worst.margin ? p : worst) : null
        }
      };
    } catch (error) {
      console.error('Error in getProfitabilityAnalysis:', error);
      throw new Error('Error obteniendo análisis de rentabilidad');
    }
  }

  static async getInventoryAnalysis() {
    try {
      const products = await ProductModel.find().populate('category').exec();
      
      const inventory = products.map(product => {
        const value = product.quantity * product.basePrice;
        const potentialValue = product.quantity * product.salePrice;
        
        return {
          id: product._id,
          name: product.name,
          category: (product.category as any)?.name || 'Sin categoría',
          quantity: product.quantity,
          basePrice: product.basePrice,
          salePrice: product.salePrice,
          value,
          potentialValue,
          stockStatus: this.getStockStatus(product.quantity),
          daysOfStock: 30, // Estimación
          reorderPoint: 5
        };
      });

      const totalValue = inventory.reduce((sum, item) => sum + item.value, 0);
      const totalPotentialValue = inventory.reduce((sum, item) => sum + item.potentialValue, 0);

      return {
        items: inventory,
        summary: {
          totalItems: products.length,
          totalValue,
          totalPotentialValue,
          lowStock: inventory.filter(item => item.stockStatus === 'low').length,
          outOfStock: inventory.filter(item => item.stockStatus === 'out').length,
          overstocked: inventory.filter(item => item.stockStatus === 'overstock').length,
          avgDaysOfStock: 30
        },
        recommendations: []
      };
    } catch (error) {
      console.error('Error in getInventoryAnalysis:', error);
      throw new Error('Error obteniendo análisis de inventario');
    }
  }

  static async getForecastAnalysis(months: number = 3) {
    try {
      const forecast = [];
      const currentDate = new Date();
      
      for (let i = 1; i <= months; i++) {
        const forecastDate = new Date(currentDate);
        forecastDate.setMonth(forecastDate.getMonth() + i);
        
        const monthName = forecastDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        
        forecast.push({
          month: monthName,
          projectedSales: 1000000 * (1 + i * 0.1), // Simulación de crecimiento
          projectedProfit: 400000 * (1 + i * 0.1),
          confidence: Math.max(0.6, 0.9 - (i * 0.1)),
          assumptions: {
            growthRate: 10,
            seasonalFactor: 1.0,
            avgProfitMargin: 40
          }
        });
      }

      return {
        forecast,
        trends: {
          avgMonthlySales: 1000000,
          avgProfitMargin: 40,
          growthRate: 10
        },
        recommendations: []
      };
    } catch (error) {
      console.error('Error in getForecastAnalysis:', error);
      throw new Error('Error obteniendo pronóstico financiero');
    }
  }

  // Métodos auxiliares
  private static getStockStatus(quantity: number) {
    if (quantity === 0) return 'out';
    if (quantity < 5) return 'low';
    if (quantity > 100) return 'overstock';
    return 'normal';
  }

  static async getExecutiveSummary() {
    try {
      // Obtener datos básicos
      const [dashboardData, profitabilityData, kpisData] = await Promise.all([
        this.getDashboardAnalysis(),
        this.getProfitabilityAnalysis(),
        this.getKPIAnalysis()
      ]);

      // Generar recomendaciones inteligentes
      const recommendations = [];

      // Análisis de rentabilidad
      if (profitabilityData.summary.avgMargin < 20) {
        recommendations.push({
          type: 'warning',
          category: 'Rentabilidad',
          title: 'Margen de ganancia bajo',
          description: 'El margen de ganancia está por debajo del 20%. Considera revisar costos o ajustar precios.',
          priority: 'high',
          impact: 'financial'
        });
      }

      // Análisis de inventario
      if (kpisData.operations.inventoryTurnover < 4) {
        recommendations.push({
          type: 'warning',
          category: 'Inventario',
          title: 'Rotación de inventario lenta',
          description: 'La rotación de inventario es baja. Considera estrategias de marketing o descuentos.',
          priority: 'medium',
          impact: 'operational'
        });
      }

      // Análisis de ventas
      const monthlyGrowth = kpisData.growth.monthly;
      if (monthlyGrowth > 10) {
        recommendations.push({
          type: 'success',
          category: 'Crecimiento',
          title: 'Excelente crecimiento mensual',
          description: `Crecimiento del ${monthlyGrowth.toFixed(1)}%. Mantén las estrategias actuales.`,
          priority: 'low',
          impact: 'strategic'
        });
      } else if (monthlyGrowth < 0) {
        recommendations.push({
          type: 'error',
          category: 'Ventas',
          title: 'Decrecimiento en ventas',
          description: 'Las ventas han disminuido. Urgente revisar estrategias comerciales.',
          priority: 'critical',
          impact: 'financial'
        });
      }

      // Análisis de flujo de caja
      if (dashboardData.overview.totalRevenue < dashboardData.overview.inventoryValue * 0.1) {
        recommendations.push({
          type: 'warning',
          category: 'Flujo de Caja',
          title: 'Ingresos bajos vs inventario',
          description: 'Los ingresos están muy bajos comparado con el valor del inventario.',
          priority: 'high',
          impact: 'financial'
        });
      }

      // Resumen ejecutivo
      const summary = {
        period: `${new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`,
        total_revenue: dashboardData.overview.totalRevenue,
        total_orders: dashboardData.overview.totalOrders,
        profit_margin: profitabilityData.summary.avgMargin,
        monthly_growth: monthlyGrowth,
        top_insights: [
          `Ingresos totales: $${dashboardData.overview.totalRevenue.toLocaleString()}`,
          `Margen de ganancia: ${profitabilityData.summary.avgMargin.toFixed(1)}%`,
          `Crecimiento mensual: ${monthlyGrowth.toFixed(1)}%`,
          `Total de órdenes: ${dashboardData.overview.totalOrders}`
        ],
        recommendations,
        health_score: this.calculateHealthScore(dashboardData, profitabilityData, kpisData),
        next_actions: recommendations
          .filter(r => r.priority === 'critical' || r.priority === 'high')
          .slice(0, 3)
          .map(r => r.title)
      };

      return summary;
    } catch (error) {
      console.error('Error en getExecutiveSummary:', error);
      throw new Error('Error al obtener resumen ejecutivo');
    }
  }

  private static calculateHealthScore(dashboard: any, profitability: any, kpis: any): number {
    let score = 100;
    
    // Penalizar por margen bajo
    if (profitability.summary.avgMargin < 15) score -= 30;
    else if (profitability.summary.avgMargin < 25) score -= 15;
    
    // Penalizar por crecimiento negativo
    if (kpis.growth.monthly < 0) score -= 25;
    else if (kpis.growth.monthly < 5) score -= 10;
    
    // Penalizar por rotación baja
    if (kpis.operations.inventoryTurnover < 3) score -= 20;
    else if (kpis.operations.inventoryTurnover < 6) score -= 10;
    
    // Penalizar por ingresos bajos vs inventario
    if (dashboard.overview.totalRevenue < dashboard.overview.inventoryValue * 0.05) score -= 15;
    
    return Math.max(score, 0);
  }
}