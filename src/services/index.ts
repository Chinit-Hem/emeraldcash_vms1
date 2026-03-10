/**
 * Services Index
 * 
 * Centralized exports for all service layer classes.
 * Provides clean imports for the OOAD service layer.
 * 
 * @module services
 */

// Vehicle Service
export {
  VehicleService,
  vehicleService,
  default as vehicleServiceDefault,
} from "./VehicleService";

// Types
export type {
  VehicleDB,
  VehicleFilters,
  VehicleStats,
  PaginatedResult,
  ServiceResult,
} from "./VehicleService";
