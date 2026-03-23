// @upds/services — Logica de negocio pura

// Auditoria
export { createAuditLog, diffValues } from "./audit";
export type {
  DbClient,
  AuditAction,
  AuditEntityType,
  CreateAuditLogParams,
} from "./audit";

// Auth (usuarios)
export { AuthService } from "./auth";
export type { SafeUser, ServiceResult, AuditContext } from "./auth";

// Productos y variantes
export { ProductService } from "./product";
export type { ProductData, ProductVariantData, LowStockAlert } from "./product";

// Fabricantes
export { ManufacturerService } from "./manufacturer";
export type { ManufacturerData } from "./manufacturer";

// Destinatarios/Beneficiarios
export { RecipientService } from "./recipient";
export type { RecipientData } from "./recipient";

// Departamentos
export { DepartmentService } from "./department";
export type { DepartmentData } from "./department";

// Ordenes de fabricacion
export { ManufactureOrderService } from "./manufacture-order";
export type {
  ManufactureOrderData,
  ManufactureOrderItemData,
} from "./manufacture-order";

// Movimientos de inventario
export { InventoryMovementService, generateMovementNumber } from "./inventory-movement";
export type { MovementData, MovementItemData } from "./inventory-movement";

// Dashboard / Reportes
export { DashboardService } from "./dashboard";
export type { DashboardStats, StockByArea, OrderStatusSummary, RecentMovement, MonthlyMovements } from "./dashboard";
