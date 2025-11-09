import { Request, Response } from 'express';
import { asyncHandler } from '../../libs/asyncHandler';
import { FinancialService } from './financial.service';
import sendResponse from '../../utils/response';

export class FinancialController {
  
  static getDashboardAnalysis = asyncHandler(async (req: Request, res: Response) => {
    const analysis = await FinancialService.getDashboardAnalysis();
    
    sendResponse(res, 200, analysis, 'Análisis financiero obtenido exitosamente');
  });

  static getDetailedAnalysis = asyncHandler(async (req: Request, res: Response) => {
    const { period } = req.query;
    
    const analysis = await FinancialService.getDetailedAnalysis(period as string);
    
    sendResponse(res, 200, analysis, 'Análisis detallado obtenido exitosamente');
  });

  static getProductAnalysis = asyncHandler(async (req: Request, res: Response) => {
    const analysis = await FinancialService.getProductAnalysis();
    
    sendResponse(res, 200, analysis, 'Análisis de productos obtenido exitosamente');
  });

  static getCashFlowAnalysis = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;
    
    const analysis = await FinancialService.getCashFlowAnalysis(
      startDate as string, 
      endDate as string
    );
    
    sendResponse(res, 200, analysis, 'Análisis de flujo de caja obtenido exitosamente');
  });

  static getKPIAnalysis = asyncHandler(async (req: Request, res: Response) => {
    const kpis = await FinancialService.getKPIAnalysis();
    
    sendResponse(res, 200, kpis, 'KPIs obtenidos exitosamente');
  });

  static getProfitabilityAnalysis = asyncHandler(async (req: Request, res: Response) => {
    const analysis = await FinancialService.getProfitabilityAnalysis();
    
    sendResponse(res, 200, analysis, 'Análisis de rentabilidad obtenido exitosamente');
  });

  static getInventoryAnalysis = asyncHandler(async (req: Request, res: Response) => {
    const analysis = await FinancialService.getInventoryAnalysis();
    
    sendResponse(res, 200, analysis, 'Análisis de inventario obtenido exitosamente');
  });

  static getForecastAnalysis = asyncHandler(async (req: Request, res: Response) => {
    const { months } = req.query;
    
    const forecast = await FinancialService.getForecastAnalysis(
      parseInt(months as string) || 3
    );
    
    sendResponse(res, 200, forecast, 'Pronóstico financiero obtenido exitosamente');
  });

  static getExecutiveSummary = asyncHandler(async (req: Request, res: Response) => {
    const summary = await FinancialService.getExecutiveSummary();
    
    sendResponse(res, 200, summary, 'Resumen ejecutivo obtenido exitosamente');
  });
}