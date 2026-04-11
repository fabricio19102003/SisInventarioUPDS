// @upds/validators — Esquemas Zod, enums y permisos del sistema

// Enums con labels para UI
export {
  // Enums
  UserRole,
  ProductCategory,
  GarmentType,
  Size,
  Gender,
  WarehouseArea,
  MovementType,
  MovementStatus,
  ManufactureOrderStatus,
  RecipientType,
  // Schemas Zod de enums
  UserRoleSchema,
  ProductCategorySchema,
  GarmentTypeSchema,
  SizeSchema,
  GenderSchema,
  WarehouseAreaSchema,
  MovementTypeSchema,
  MovementStatusSchema,
  ManufactureOrderStatusSchema,
  RecipientTypeSchema,
  // Labels para UI
  USER_ROLE_LABELS,
  PRODUCT_CATEGORY_LABELS,
  GARMENT_TYPE_LABELS,
  SIZE_LABELS,
  GENDER_LABELS,
  WAREHOUSE_AREA_LABELS,
  MOVEMENT_TYPE_LABELS,
  MOVEMENT_STATUS_LABELS,
  MANUFACTURE_ORDER_STATUS_LABELS,
  RECIPIENT_TYPE_LABELS,
  // Utilidades
  enumToOptions,
} from "./enums";

// Sistema de permisos
export {
  PERMISSIONS,
  can,
  canAll,
  canAny,
  getPermissions,
} from "./permissions";

export type { Permission } from "./permissions";

// Auth (usuarios)
export {
  loginSchema,
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  adminResetPasswordSchema,
  userFiltersSchema,
} from "./auth";

export type {
  LoginInput,
  CreateUserInput,
  UpdateUserInput,
  ChangePasswordInput,
  AdminResetPasswordInput,
  UserFiltersInput,
} from "./auth";

// Productos y variantes
export {
  createMedicalVariantSchema,
  createOfficeVariantSchema,
  createProductSchema,
  updateProductSchema,
  addVariantSchema,
  productFiltersSchema,
} from "./product";

export type {
  CreateMedicalVariantInput,
  CreateOfficeVariantInput,
  CreateProductInput,
  UpdateProductInput,
  AddVariantInput,
  ProductFiltersInput,
} from "./product";

// Fabricantes
export {
  createManufacturerSchema,
  updateManufacturerSchema,
  manufacturerFiltersSchema,
} from "./manufacturer";

export type {
  CreateManufacturerInput,
  UpdateManufacturerInput,
  ManufacturerFiltersInput,
} from "./manufacturer";

// Destinatarios/Beneficiarios
export {
  createRecipientSchema,
  updateRecipientSchema,
  recipientFiltersSchema,
} from "./recipient";

export type {
  CreateRecipientInput,
  UpdateRecipientInput,
  RecipientFiltersInput,
} from "./recipient";

// Departamentos
export {
  createDepartmentSchema,
  updateDepartmentSchema,
  departmentFiltersSchema,
} from "./department";

export type {
  CreateDepartmentInput,
  UpdateDepartmentInput,
  DepartmentFiltersInput,
} from "./department";

// Ordenes de fabricacion
export {
  createManufactureOrderSchema,
  addOrderItemSchema,
  removeOrderItemSchema,
  receiveOrderItemsSchema,
  cancelOrderSchema,
  orderFiltersSchema,
} from "./manufacture-order";

export type {
  CreateManufactureOrderInput,
  AddOrderItemInput,
  RemoveOrderItemInput,
  ReceiveOrderItemsInput,
  CancelOrderInput,
  OrderFiltersInput,
} from "./manufacture-order";

// Movimientos de inventario
export {
  createMovementSchema,
  addMovementItemSchema,
  confirmMovementSchema,
  cancelMovementSchema,
  movementFiltersSchema,
} from "./inventory-movement";

export type {
  CreateMovementInput,
  AddMovementItemInput,
  ConfirmMovementInput,
  CancelMovementInput,
  MovementFiltersInput,
} from "./inventory-movement";

// Reportes
export {
  dateRangeSchema,
  financialReportFiltersSchema,
  inventoryReportFiltersSchema,
  movementsReportFiltersSchema,
  donationsReportFiltersSchema,
  departmentConsumptionFiltersSchema,
  writeOffsReportFiltersSchema,
  auditLogFiltersSchema,
} from "./reports";

export type {
  DateRangeInput,
  DateRangeOutput,
  FinancialReportFiltersInput,
  FinancialReportFilters,
  InventoryReportFiltersInput,
  InventoryReportFilters,
  MovementsReportFiltersInput,
  MovementsReportFilters,
  DonationsReportFiltersInput,
  DonationsReportFilters,
  DepartmentConsumptionFiltersInput,
  DepartmentConsumptionFilters,
  WriteOffsReportFiltersInput,
  WriteOffsReportFilters,
  AuditLogFiltersInput,
  AuditLogFiltersOutput,
} from "./reports";
