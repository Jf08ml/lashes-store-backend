import { Router } from 'express';
import { FinancialController } from '../modules/financial/financial.controller';
import authMiddleware from '../middlewares/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Dashboard general
router.get('/dashboard', FinancialController.getDashboardAnalysis);

// Análisis detallado por período
router.get('/detailed', FinancialController.getDetailedAnalysis);

// Análisis de productos
router.get('/products', FinancialController.getProductAnalysis);

// Análisis de flujo de caja
router.get('/cashflow', FinancialController.getCashFlowAnalysis);

// KPIs del negocio
router.get('/kpis', FinancialController.getKPIAnalysis);

// Análisis de rentabilidad
router.get('/profitability', FinancialController.getProfitabilityAnalysis);

// Análisis de inventario
router.get('/inventory', FinancialController.getInventoryAnalysis);

// Pronóstico financiero
router.get('/forecast', FinancialController.getForecastAnalysis);

// Resumen ejecutivo
router.get('/executive-summary', FinancialController.getExecutiveSummary);

export default router;