export type OrderPriority = 'low' | 'normal' | 'high' | 'urgent';
export type OrderStatus =
  | 'pending'
  | 'assigned'
  | 'in-transit'
  | 'delivered'
  | 'cancelled'
  | 'dispatched'; // 'dispatched' kept for backward compatibility with Module 1

export interface DeliveryOrder {
  id: string;
  customerName: string;
  phoneNumber?: string;
  pickupAddress: string;
  destination: string; // Delivery address
  deliveryAddress?: string; // Explicit alias for clarity
  weightKg: number;
  packageWeightKg?: number; // Explicit alias
  packageDescription: string;
  priority: OrderPriority;
  status: OrderStatus;
  deliveryDeadline: string; // e.g. '14:30' or '02:30 PM'
  estimatedArrival: string; // Display arrival window
  createdAt: string; // ISO 8601 string
  assignedVehicleId?: string;
  specialInstructions?: string;
  notes?: string; // Alias for backward compatibility
  coordinates?: { x: number; y: number };
}

export type VehicleStatus = 'Available' | 'On Route' | 'Maintenance' | 'Offline' | 'At Capacity';

export interface Vehicle {
  id: string; // e.g. 'VAN-101'
  registrationNumber: string; // e.g. '7XKP-401'
  licensePlate?: string; // Alias for backward compatibility
  name: string; // e.g. 'Small Electric Courier Van'
  vehicleType: string; // e.g. 'Small Van', 'Medium Van', 'Large Cargo Truck', 'Sprint Courier'
  capacityKg: number; // Maximum cargo capacity in kilograms
  maxCapacityKg?: number; // Alias
  maxStops: number; // Maximum delivery stops supported
  stopsCount?: number; // Assigned stops count
  driverName: string;
  driverPhone?: string;
  status: VehicleStatus;
  currentDepot: string; // e.g. 'RouteWise Central Hub (Depot)'
  currentLocation?: string; // Alias
  currentZone?: string; // e.g. 'North Sector'
  activeRouteName?: string;
  fuelType?: string; // e.g. 'Electric (EV)', 'Hybrid', 'Diesel'
  fuelOrBattery?: string; // e.g. '82% Battery'
  notes?: string;
  color: string;
  createdAt: string; // ISO 8601 string
  currentLoadKg?: number; // Dynamic or cached load in kg
}

export interface MapStop {
  id: string;
  orderId?: string;
  name: string;
  address: string;
  x: number; // percentage in SVG coordinate space (0-100)
  y: number; // percentage in SVG coordinate space (0-100)
  vehicleId?: string;
  status: OrderStatus | 'depot';
  eta?: string;
}

export type NavigationPage =
  | 'dashboard'
  | 'orders'
  | 'fleet'
  | 'planner'
  | 'insights'
  | 'rescue'
  | 'settings';
