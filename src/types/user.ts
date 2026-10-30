/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DeliveryOrder, Vehicle } from './index';
import { OptimizationSettings } from '../services/routing/types';

export interface UserDepot {
  name: string;
  address: string;
  lat: number;
  lng: number;
  x: number; // schematic coordinate (0-100)
  y: number; // schematic coordinate (0-100)
}

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  companyName: string;
  city: string;
  avatarColor: string;
  depot: UserDepot;
  defaultCenter: {
    lat: number;
    lng: number;
    zoom: number;
  };
  scenarioTagline: string;
  scenarioNotes: string;
}

export interface UserWorkspaceData {
  userId: string;
  orders: DeliveryOrder[];
  vehicles: Vehicle[];
  settings: OptimizationSettings;
  lastUpdated: string;
}
