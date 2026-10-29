/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CENTRAL_DEPOT } from '../../data/demoData';
import { DeliveryOrder } from '../../types';

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Transparent model constants for demo environment:
 * 100x100 SVG coordinate plane where:
 * 1 grid unit ≈ 1.25 km
 * Urban road circuity factor ≈ 1.35 (converts straight-line Euclidean to estimated street network distance)
 */
export const GRID_UNIT_KM = 1.25;
export const URBAN_CIRCUITY_FACTOR = 1.35;

export const SYNTHETIC_MODEL_DISCLOSURE =
  'Calculated using a deterministic synthetic demo grid (1 map unit ≈ 1.25 km with 1.35x urban road circuity). Transit duration is modeled from uniform speed (km/h) plus configured per-stop service dwell time, without live GPS traffic congestion. Distance and time objectives evaluate candidate legs in their respective units (km vs minutes), with the time objective using SLA delivery deadlines and vehicle active-duration balancing for tie-breaking. Heuristic algorithm (Nearest-Neighbor + 2-Opt) does not guarantee a global optimum.';

/**
 * Deterministically generates coordinate pair for orders that lack explicit coordinates.
 * Generates bounded coordinates in [15, 85] range so they remain nicely inside the map.
 */
export function getOrderCoordinates(order: DeliveryOrder): Point2D {
  if (
    order.coordinates &&
    typeof order.coordinates.x === 'number' &&
    typeof order.coordinates.y === 'number'
  ) {
    return order.coordinates;
  }

  // Deterministic string hash of id + destination
  const seedStr = `${order.id}-${order.destination || order.customerName}`;
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }

  const absHash = Math.abs(hash);
  const x = 15 + (absHash % 70);
  const y = 15 + ((absHash >> 3) % 70);

  return { x, y };
}

/**
 * Returns depot coordinate
 */
export function getDepotCoordinates(): Point2D {
  return { x: CENTRAL_DEPOT.x, y: CENTRAL_DEPOT.y };
}

/**
 * Calculates estimated road network distance between two points in kilometers.
 * Uses Euclidean distance scaled by grid unit size and urban road circuity factor.
 */
export function calculateDistanceKm(p1: Point2D, p2: Point2D): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const euclidean = Math.sqrt(dx * dx + dy * dy);
  const estimatedRoadKm = euclidean * GRID_UNIT_KM * URBAN_CIRCUITY_FACTOR;
  return Number(estimatedRoadKm.toFixed(2));
}

/**
 * Calculates estimated travel duration in minutes based on distance and average speed (km/h).
 */
export function calculateTravelTimeMinutes(distanceKm: number, speedKmH: number): number {
  const safeSpeed = Math.max(10, speedKmH);
  const hours = distanceKm / safeSpeed;
  return Math.round(hours * 60);
}
