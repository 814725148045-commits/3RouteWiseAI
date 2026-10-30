/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { KpiCards } from './components/dashboard/KpiCards';
import { RouteMapOverview } from './components/dashboard/RouteMapOverview';
import { FleetStatusCard } from './components/dashboard/FleetStatusCard';
import { RecentDeliveriesTable } from './components/dashboard/RecentDeliveriesTable';
import { OrdersView } from './components/orders/OrdersView';
import { FleetView } from './components/fleet/FleetView';
import { RoutePlannerView } from './components/planner/RoutePlannerView';
import { AiInsightsView } from './components/insights/AiInsightsView';
import { AiInsightsSummaryCard } from './components/dashboard/AiInsightsSummaryCard';
import { RouteRescueView } from './components/rescue/RouteRescueView';
import { DisruptionIncident, RecoveryPlan } from './services/rescue/types';
import {
  loadIncidentsFromStorage,
  saveIncidentsToStorage,
  loadRecoveryPlansFromStorage,
  saveRecoveryPlansToStorage,
} from './services/rescue/rescueStorage';
import { applyRecoveryPlan, calculateRecoveryPlan } from './services/rescue/recoveryEngine';
import { DemoScenarioKey } from './components/rescue/DemoScenarioSelector';
import { GeminiAiInsightsReport } from './services/ai/insightsTypes';
import { loadInsightsFromStorage, saveInsightsToStorage } from './services/ai/insightsStorage';
import { computeDataFingerprint } from './services/ai/sanitizePayload';
import { generateAiInsights } from './services/ai/aiService';
import { optimizeRoutes, DEFAULT_OPTIMIZATION_SETTINGS } from './services/routing/optimizer';
import { OptimizationResult } from './services/routing/types';
import { OrderFormModal } from './components/modals/OrderFormModal';
import { OrderDetailsDrawer } from './components/modals/OrderDetailsDrawer';
import { VehicleFormModal } from './components/modals/VehicleFormModal';
import { VehicleDetailsModal } from './components/modals/VehicleDetailsModal';
import { ConfirmationModal, ConfirmationType } from './components/modals/ConfirmationModal';
import { ModulePlaceholder } from './components/placeholders/ModulePlaceholder';
import { INITIAL_ORDERS } from './data/demoData';
import { loadOrdersFromStorage, saveOrdersToStorage, resetOrdersStorage } from './utils/orderStorage';
import {
  loadVehiclesFromStorage,
  saveVehiclesToStorage,
  resetVehiclesStorage,
  computeVehicleMetrics,
} from './utils/fleetStorage';
import { DeliveryOrder, NavigationPage, OrderStatus, Vehicle, VehicleStatus } from './types';
import { CheckCircle2, Info, AlertCircle, X } from 'lucide-react';

export default function App() {
  // Navigation: Route Optimization is the primary feature of the system
  const [currentPage, setCurrentPage] = useState<NavigationPage>('planner');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Core Data State (Loaded from LocalStorage with clean fallbacks)
  const [orders, setOrders] = useState<DeliveryOrder[]>(() => loadOrdersFromStorage());
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => loadVehiclesFromStorage());

  // Synchronize orders and vehicles to LocalStorage on state updates
  useEffect(() => {
    saveOrdersToStorage(orders);
  }, [orders]);

  useEffect(() => {
    saveVehiclesToStorage(vehicles);
  }, [vehicles]);

  // Shared Route Optimization State (Module 4)
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(() => {
    try {
      return optimizeRoutes(orders, vehicles, DEFAULT_OPTIMIZATION_SETTINGS);
    } catch {
      return null;
    }
  });

  // Re-run optimization on orders/vehicles change to keep telemetry fresh
  useEffect(() => {
    try {
      const fresh = optimizeRoutes(orders, vehicles, DEFAULT_OPTIMIZATION_SETTINGS);
      setOptimizationResult(fresh);
    } catch {
      // Keep previous
    }
  }, [orders, vehicles]);

  // Current operational fingerprint for staleness detection (Module 5)
  const currentDataFingerprint = useMemo(() => {
    return computeDataFingerprint(orders, vehicles, optimizationResult);
  }, [orders, vehicles, optimizationResult]);

  // AI Insights Report State (Module 5)
  const [insightsReport, setInsightsReport] = useState<GeminiAiInsightsReport | null>(() => {
    return loadInsightsFromStorage();
  });

  useEffect(() => {
    if (insightsReport) {
      saveInsightsToStorage(insightsReport);
    }
  }, [insightsReport]);

  const isInsightsStale = useMemo(() => {
    if (!insightsReport) return false;
    return insightsReport.dataFingerprint !== currentDataFingerprint;
  }, [insightsReport, currentDataFingerprint]);

  const [isRefreshingInsights, setIsRefreshingInsights] = useState(false);

  const handleQuickRefreshInsights = async () => {
    setIsRefreshingInsights(true);
    try {
      const res = await generateAiInsights(orders, vehicles, optimizationResult);
      setInsightsReport(res.report);
      showToast('Gemini AI insights refreshed with latest operational data.', 'success');
    } catch (err: any) {
      showToast('Failed to refresh insights.', 'warning');
    } finally {
      setIsRefreshingInsights(false);
    }
  };

  // Route Rescue State (Module 6)
  const [incidents, setIncidents] = useState<DisruptionIncident[]>(() => loadIncidentsFromStorage());
  const [recoveryPlans, setRecoveryPlans] = useState<RecoveryPlan[]>(() => loadRecoveryPlansFromStorage());

  useEffect(() => {
    saveIncidentsToStorage(incidents);
  }, [incidents]);

  useEffect(() => {
    saveRecoveryPlansToStorage(recoveryPlans);
  }, [recoveryPlans]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<DeliveryOrder | null>(null);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<DeliveryOrder | null>(null);

  // Vehicle Modals
  const [isVehicleFormOpen, setIsVehicleFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [inspectingVehicle, setInspectingVehicle] = useState<Vehicle | null>(null);

  // Confirmation Dialog State
  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean;
    type: ConfirmationType;
    title: string;
    message: string;
    confirmLabel: string;
    confirmButtonClass?: string;
    action: () => void;
  } | null>(null);

  // Toast / Status Notification
  const [toast, setToast] = useState<{
    id: number;
    message: string;
    type: 'success' | 'info' | 'warning';
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 4500);
  };

  // ----------------------------------------------------
  // ORDER ACTIONS
  // ----------------------------------------------------
  const handleOpenAddOrder = () => {
    setEditingOrder(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditOrder = (order: DeliveryOrder) => {
    setEditingOrder(order);
    setIsFormModalOpen(true);
  };

  const handleSaveOrder = (orderData: DeliveryOrder) => {
    setOrders((prev) => {
      const existsIndex = prev.findIndex((o) => o.id === orderData.id);
      if (existsIndex >= 0) {
        const updated = [...prev];
        updated[existsIndex] = orderData;
        return updated;
      }
      return [orderData, ...prev];
    });

    if (selectedOrderForDetail?.id === orderData.id) {
      setSelectedOrderForDetail(orderData);
    }

    const actionText = editingOrder ? 'updated' : 'registered';
    showToast(`Order ${orderData.id} ${actionText} for ${orderData.customerName}.`, 'success');
  };

  const handleRequestDeliverOrder = (order: DeliveryOrder) => {
    if (order.status === 'cancelled') {
      showToast('Cancelled orders cannot be marked as delivered.', 'warning');
      return;
    }
    if (order.status === 'delivered') {
      showToast('Order is already marked delivered.', 'info');
      return;
    }

    setConfirmationState({
      isOpen: true,
      type: 'deliver',
      title: 'Confirm Delivery Completion',
      message: `Are you sure you want to mark order ${order.id} (${order.customerName}) as Delivered? This will finalize the delivery drop and update SLA metrics.`,
      confirmLabel: 'Mark Delivered',
      confirmButtonClass: 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold',
      action: () => {
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, status: 'delivered' } : o))
        );
        if (selectedOrderForDetail?.id === order.id) {
          setSelectedOrderForDetail((prev) => (prev ? { ...prev, status: 'delivered' } : null));
        }
        showToast(`Order ${order.id} marked as Delivered.`, 'success');
        setConfirmationState(null);
      },
    });
  };

  const handleRequestCancelOrder = (order: DeliveryOrder) => {
    if (order.status === 'delivered') {
      showToast('Delivered orders cannot be cancelled.', 'warning');
      return;
    }
    if (order.status === 'cancelled') {
      showToast('Order is already cancelled.', 'info');
      return;
    }

    setConfirmationState({
      isOpen: true,
      type: 'cancel',
      title: 'Cancel Delivery Order',
      message: `Are you sure you want to cancel order ${order.id} (${order.customerName})? Cancelled orders are removed from active scheduling and cannot be marked as delivered.`,
      confirmLabel: 'Yes, Cancel Order',
      confirmButtonClass: 'bg-rose-500 hover:bg-rose-600 text-white font-semibold',
      action: () => {
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, status: 'cancelled' } : o))
        );
        if (selectedOrderForDetail?.id === order.id) {
          setSelectedOrderForDetail((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
        }
        showToast(`Order ${order.id} cancelled.`, 'info');
        setConfirmationState(null);
      },
    });
  };

  const handleRequestResetDemoData = () => {
    setConfirmationState({
      isOpen: true,
      type: 'reset',
      title: 'Reset Demo Dataset',
      message:
        'This will reset all orders back to the initial 14 demo deliveries and clear custom modifications from browser storage. Are you sure?',
      confirmLabel: 'Reset Dataset',
      confirmButtonClass: 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold',
      action: () => {
        const fresh = resetOrdersStorage();
        setOrders(fresh);
        setSearchQuery('');
        setSelectedOrderForDetail(null);
        showToast('Demo dataset reloaded to initial state (14 orders).', 'info');
        setConfirmationState(null);
      },
    });
  };

  const handleUpdateStatus = (orderId: string, newStatus: OrderStatus) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    if (targetOrder.status === 'cancelled' && newStatus === 'delivered') {
      showToast('Cancelled orders cannot be marked as delivered.', 'warning');
      return;
    }

    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order))
    );
    if (selectedOrderForDetail?.id === orderId) {
      setSelectedOrderForDetail((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    showToast(`Order ${orderId} status set to ${newStatus}.`, 'info');
  };

  // ----------------------------------------------------
  // FLEET ACTIONS (MODULE 3)
  // ----------------------------------------------------
  const handleOpenAddVehicle = () => {
    setEditingVehicle(null);
    setIsVehicleFormOpen(true);
  };

  const handleOpenEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setIsVehicleFormOpen(true);
  };

  const handleSaveVehicle = (vehicleData: Vehicle) => {
    setVehicles((prev) => {
      const existsIndex = prev.findIndex((v) => v.id === vehicleData.id);
      if (existsIndex >= 0) {
        const updated = [...prev];
        updated[existsIndex] = vehicleData;
        return updated;
      }
      return [vehicleData, ...prev];
    });

    if (inspectingVehicle?.id === vehicleData.id) {
      setInspectingVehicle(vehicleData);
    }

    const actionText = editingVehicle ? 'updated' : 'registered';
    showToast(`Vehicle ${vehicleData.id} (${vehicleData.registrationNumber}) ${actionText}.`, 'success');
  };

  const handleRequestChangeVehicleStatus = (vehicle: Vehicle, newStatus: VehicleStatus) => {
    if (vehicle.status === newStatus) return;

    const metrics = computeVehicleMetrics(vehicle, orders);
    const hasActiveDeliveries = metrics.activeOrders.length > 0;

    // Warning confirmation when putting a vehicle with active deliveries into Maintenance or Offline
    if ((newStatus === 'Maintenance' || newStatus === 'Offline') && hasActiveDeliveries) {
      setConfirmationState({
        isOpen: true,
        type: 'cancel',
        title: `Vehicle Has Active Deliveries`,
        message: `Warning: ${vehicle.id} (${vehicle.registrationNumber}) currently has ${metrics.activeOrders.length} active assigned deliveries (${metrics.currentLoadKg} kg). Putting this vehicle into ${newStatus} will take it off the road. Its assignments will be preserved and flagged for review. Reassignment will be executed in Route Rescue. Proceed?`,
        confirmLabel: `Mark as ${newStatus}`,
        confirmButtonClass: 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold',
        action: () => {
          setVehicles((prev) =>
            prev.map((v) => (v.id === vehicle.id ? { ...v, status: newStatus } : v))
          );
          if (inspectingVehicle?.id === vehicle.id) {
            setInspectingVehicle((prev) => (prev ? { ...prev, status: newStatus } : null));
          }
          showToast(
            `${vehicle.id} set to ${newStatus}. ${metrics.activeOrders.length} assigned deliveries flagged for dispatcher attention.`,
            'warning'
          );
          setConfirmationState(null);
        },
      });
      return;
    }

    // Direct transition for other states or vehicles with no active orders
    setVehicles((prev) =>
      prev.map((v) => (v.id === vehicle.id ? { ...v, status: newStatus } : v))
    );
    if (inspectingVehicle?.id === vehicle.id) {
      setInspectingVehicle((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    showToast(`${vehicle.id} status changed to ${newStatus}.`, 'info');
  };

  const handleRequestDeleteVehicle = (vehicle: Vehicle) => {
    const metrics = computeVehicleMetrics(vehicle, orders);
    const hasActiveOrders = metrics.activeOrders.length > 0;

    setConfirmationState({
      isOpen: true,
      type: 'cancel',
      title: `Delete Vehicle ${vehicle.id}`,
      message: hasActiveOrders
        ? `Warning: ${vehicle.id} has ${metrics.activeOrders.length} active assigned deliveries. Deleting this vehicle will unassign these orders and set their status to Pending. Are you sure you want to remove this vehicle from the fleet?`
        : `Are you sure you want to remove ${vehicle.id} (${vehicle.registrationNumber}) from the fleet roster?`,
      confirmLabel: 'Delete Vehicle',
      confirmButtonClass: 'bg-rose-500 hover:bg-rose-600 text-white font-semibold',
      action: () => {
        // Safely unassign active orders
        if (hasActiveOrders) {
          setOrders((prev) =>
            prev.map((o) =>
              o.assignedVehicleId === vehicle.id
                ? { ...o, assignedVehicleId: undefined, status: o.status === 'assigned' ? 'pending' : o.status }
                : o
            )
          );
        }

        // Remove from fleet
        setVehicles((prev) => prev.filter((v) => v.id !== vehicle.id));
        if (inspectingVehicle?.id === vehicle.id) {
          setInspectingVehicle(null);
        }
        showToast(
          `Vehicle ${vehicle.id} removed from fleet.${hasActiveOrders ? ` ${metrics.activeOrders.length} orders returned to Pending queue.` : ''}`,
          'info'
        );
        setConfirmationState(null);
      },
    });
  };

  const handleRequestResetDemoFleet = () => {
    setConfirmationState({
      isOpen: true,
      type: 'reset',
      title: 'Reset Demo Fleet Roster',
      message:
        'This will reset the fleet roster back to the initial 5 demo vehicles (Small ~500kg, Medium ~1000kg, Heavy ~1500kg, Available, Maintenance) and restore default specifications. Proceed?',
      confirmLabel: 'Reset Fleet',
      confirmButtonClass: 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold',
      action: () => {
        const fresh = resetVehiclesStorage();
        setVehicles(fresh);
        setInspectingVehicle(null);
        showToast('Fleet roster reset to initial 5 demo vehicles.', 'info');
        setConfirmationState(null);
      },
    });
  };

  // ----------------------------------------------------
  // ROUTE PLANNER ACTIONS (MODULE 4)
  // ----------------------------------------------------
  const handleApplyPlan = (updatedOrders: DeliveryOrder[]) => {
    setOrders(updatedOrders);
    const assignedCount = updatedOrders.filter(
      (o) => o.assignedVehicleId && o.status !== 'cancelled' && o.status !== 'delivered'
    ).length;
    showToast(
      `Plan applied: Updated ${assignedCount} active order assignments across the fleet.`,
      'success'
    );
  };

  // ----------------------------------------------------
  // ROUTE RESCUE ACTIONS (MODULE 6)
  // ----------------------------------------------------
  const handleAddIncident = (incident: DisruptionIncident) => {
    setIncidents((prev) => [incident, ...prev]);

    // If breakdown, flag vehicle as 'Maintenance'
    if (incident.type === 'vehicle_breakdown' && incident.vehicleId) {
      setVehicles((prev) =>
        prev.map((v) => (v.id === incident.vehicleId ? { ...v, status: 'Maintenance' as const } : v))
      );
    }

    showToast(`Disruption incident recorded: ${incident.title}.`, 'warning');
  };

  const handleAddUrgentOrder = (order: DeliveryOrder, incident: DisruptionIncident) => {
    setOrders((prev) => [order, ...prev]);
    setIncidents((prev) => [incident, ...prev]);
    showToast(`Urgent order ${order.id} registered. Recovery incident created.`, 'success');
  };

  const handleSaveRecoveryPlan = (plan: RecoveryPlan) => {
    setRecoveryPlans((prev) => {
      const idx = prev.findIndex((p) => p.id === plan.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = plan;
        return next;
      }
      return [plan, ...prev];
    });
  };

  const handleApplyRecoveryPlan = (plan: RecoveryPlan): boolean => {
    const res = applyRecoveryPlan(plan, orders, vehicles, optimizationResult);
    if (!res.success) {
      showToast(res.errorMessage || 'Failed to apply recovery plan.', 'warning');
      return false;
    }

    setOrders(res.updatedOrders);
    setVehicles(res.updatedVehicles);

    // Update plan status to Applied
    const updatedPlan: RecoveryPlan = {
      ...plan,
      status: 'Applied',
      appliedAt: new Date().toISOString(),
    };
    handleSaveRecoveryPlan(updatedPlan);

    // Resolve associated incident
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === plan.incidentId ? { ...inc, status: 'resolved' as const } : inc))
    );

    showToast(`Recovery plan ${plan.id} applied atomically. Fleet re-routed.`, 'success');
    return true;
  };

  const handleRejectRecoveryPlan = (plan: RecoveryPlan) => {
    const updatedPlan: RecoveryPlan = {
      ...plan,
      status: 'Rejected',
      rejectedAt: new Date().toISOString(),
    };
    handleSaveRecoveryPlan(updatedPlan);
    showToast(`Recovery plan ${plan.id} rejected. Current routing unchanged.`, 'info');
  };

  const handleLoadDemoScenario = (scenarioKey: DemoScenarioKey) => {
    if (scenarioKey === 'scenario-a') {
      // Scenario A: Vehicle Breakdown with Fleet Absorption
      const freshVehicles = resetVehiclesStorage();
      const freshOrders = resetOrdersStorage();

      // Optimize first to obtain realistic assignments
      const opt = optimizeRoutes(freshOrders, freshVehicles, DEFAULT_OPTIMIZATION_SETTINGS);
      const routedOrders = freshOrders.map((o) => {
        for (const r of opt.routes) {
          if (r.stops.some((s) => s.order.id === o.id)) {
            return { ...o, assignedVehicleId: r.vehicle.id, status: 'assigned' as const };
          }
        }
        return o;
      });

      const van101Orders = routedOrders.filter((o) => o.assignedVehicleId === 'VAN-101');
      const brokenVehicles = freshVehicles.map((v) =>
        v.id === 'VAN-101' ? { ...v, status: 'Maintenance' as const } : v
      );

      const incidentA: DisruptionIncident = {
        id: `INC-SCENARIO-A`,
        type: 'vehicle_breakdown',
        title: 'Breakdown: VAN-101 Courier (Flat Tire / Puncture)',
        description: 'VAN-101 disabled on West Sector Highway with 4 deliveries on board. Remaining available vans have sufficient payload capacity.',
        createdAt: new Date().toISOString(),
        status: 'active',
        vehicleId: 'VAN-101',
        breakdownLocation: 'West Sector Highway, Exit 14',
        breakdownTime: '09:15 AM',
        reason: 'Flat Tire / Puncture',
        estimatedRepairTime: '90 minutes',
        affectedOrderIds: van101Orders.map((o) => o.id),
        affectedVehicleIds: ['VAN-101'],
      };

      setVehicles(brokenVehicles);
      setOrders(routedOrders);
      setIncidents([incidentA]);
      setRecoveryPlans([]);

      // Auto-calculate the recovery plan for immediate inspection
      const planA = calculateRecoveryPlan(incidentA, routedOrders, brokenVehicles, opt);
      setRecoveryPlans([planA]);

      setCurrentPage('rescue');
      showToast('Loaded Scenario A: VAN-101 breakdown. Reassignment solvable by surviving fleet.', 'info');
    } else if (scenarioKey === 'scenario-b') {
      // Scenario B: Urgent Delivery Drop
      const freshVehicles = resetVehiclesStorage();
      const freshOrders = resetOrdersStorage();
      const opt = optimizeRoutes(freshOrders, freshVehicles, DEFAULT_OPTIMIZATION_SETTINGS);

      const urgentDrop: DeliveryOrder = {
        id: 'ORD-9100',
        customerName: 'St. Jude Cardiology Pavilion',
        pickupAddress: 'RouteWise Central Hub, 100 Logistics Blvd',
        destination: '700 Health Ave, Suite 300',
        deliveryAddress: '700 Health Ave, Suite 300',
        weightKg: 15.0,
        packageWeightKg: 15.0,
        packageDescription: 'Urgent Cold-Chain Cardiology Medications',
        priority: 'urgent',
        status: 'pending',
        deliveryDeadline: '11:30 AM',
        estimatedArrival: 'Pending Recovery',
        createdAt: new Date().toISOString(),
        specialInstructions: 'Critical cold-chain parcel. Must drop before 11:30 AM.',
      };

      const allOrders = [urgentDrop, ...freshOrders];
      const incidentB: DisruptionIncident = {
        id: 'INC-SCENARIO-B',
        type: 'urgent_delivery',
        title: 'Urgent Request: ORD-9100 (St. Jude Cardiology)',
        description: 'Time-critical 15kg medication with strict 11:30 AM hard deadline. Re-routing required to service before deadline window closes.',
        createdAt: new Date().toISOString(),
        status: 'active',
        orderId: 'ORD-9100',
        affectedOrderIds: ['ORD-9100'],
        affectedVehicleIds: [],
      };

      setVehicles(freshVehicles);
      setOrders(allOrders);
      setIncidents([incidentB]);
      setRecoveryPlans([]);

      const planB = calculateRecoveryPlan(incidentB, allOrders, freshVehicles, opt);
      setRecoveryPlans([planB]);

      setCurrentPage('rescue');
      showToast('Loaded Scenario B: Urgent delivery ORD-9100 added. Evaluates slotting without SLA penalty.', 'info');
    } else if (scenarioKey === 'scenario-c') {
      // Scenario C: Heavy Breakdown with Infeasible Deficit
      const freshVehicles = resetVehiclesStorage();
      const freshOrders = resetOrdersStorage();

      // Restrict available fleet so only 1 small van is available
      const restrictedVehicles = freshVehicles.map((v) => {
        if (v.id === 'VAN-103') return { ...v, status: 'Maintenance' as const };
        if (v.id === 'VAN-102') return { ...v, status: 'Maintenance' as const };
        if (v.id === 'VAN-104') return { ...v, status: 'Offline' as const };
        if (v.id === 'VAN-105') return { ...v, status: 'Maintenance' as const };
        return v;
      });

      // Add a heavy industrial order (450kg) assigned to VAN-103 that is now broken
      const heavyOrders = freshOrders.map((o) =>
        o.id === 'ORD-8022' ? { ...o, weightKg: 450, assignedVehicleId: 'VAN-103', status: 'assigned' as const } : o
      );

      const incidentC: DisruptionIncident = {
        id: 'INC-SCENARIO-C',
        type: 'vehicle_breakdown',
        title: 'Catastrophic Breakdown: VAN-103 Heavy Cargo (Engine Seized)',
        description: 'VAN-103 disabled carrying 450kg heavy freight. Surviving active fleet lacks payload capacity, creating an unsolvable deficit.',
        createdAt: new Date().toISOString(),
        status: 'active',
        vehicleId: 'VAN-103',
        breakdownLocation: 'Industrial Expressway Mile 4',
        breakdownTime: '10:00 AM',
        reason: 'Engine Seized',
        estimatedRepairTime: '48 hours',
        affectedOrderIds: ['ORD-8022'],
        affectedVehicleIds: ['VAN-103'],
      };

      setVehicles(restrictedVehicles);
      setOrders(heavyOrders);
      setIncidents([incidentC]);
      setRecoveryPlans([]);

      const planC = calculateRecoveryPlan(incidentC, heavyOrders, restrictedVehicles, null);
      setRecoveryPlans([planC]);

      setCurrentPage('rescue');
      showToast('Loaded Scenario C: Heavy cargo breakdown with capacity deficit. Feasibility checks triggered.', 'warning');
    }
  };

  // Export Demo Data as JSON file
  const handleExportData = () => {
    try {
      const exportPayload = {
        exportedAt: new Date().toISOString(),
        system: 'RouteWise AI — Smart Delivery Planning System',
        modulesActive: [
          'Module 1: Fleet Overview',
          'Module 2: Orders Management',
          'Module 3: Fleet Management',
          'Module 4: Route Optimization Engine',
        ],
        storageStrategy: 'Browser LocalStorage Demo',
        fleetMetrics: {
          totalVehicles: vehicles.length,
          availableVehicles: vehicles.filter((v) => v.status === 'Available').length,
          onRouteVehicles: vehicles.filter((v) => v.status === 'On Route').length,
          maintenanceVehicles: vehicles.filter((v) => v.status === 'Maintenance').length,
          offlineVehicles: vehicles.filter((v) => v.status === 'Offline').length,
        },
        orderMetrics: {
          totalOrders: orders.length,
          pending: orders.filter((o) => o.status === 'pending').length,
          assigned: orders.filter((o) => o.status === 'assigned' || o.status === 'dispatched').length,
          inTransit: orders.filter((o) => o.status === 'in-transit').length,
          delivered: orders.filter((o) => o.status === 'delivered').length,
          cancelled: orders.filter((o) => o.status === 'cancelled').length,
        },
        vehicles,
        orders,
      };

      const jsonStr = JSON.stringify(exportPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `routewise-system-manifest-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Exported full system manifest (${vehicles.length} vehicles, ${orders.length} orders) as JSON.`, 'success');
    } catch {
      showToast('Failed to export manifest file.', 'warning');
    }
  };

  const handleSelectOrderById = (orderId: string) => {
    const found = orders.find((o) => o.id === orderId);
    if (found) {
      setSelectedOrderForDetail(found);
    }
  };

  // Dynamic KPI calculation reflecting order modifications
  const totalDeliveriesMetric = useMemo(() => {
    return 24 + (orders.length - INITIAL_ORDERS.length);
  }, [orders.length]);

  // Active operational vehicles count
  const activeVehiclesCount = useMemo(() => {
    return vehicles.filter((v) => v.status === 'On Route' || v.status === 'Available').length;
  }, [vehicles]);

  return (
    <div className="min-h-screen bg-[#090e1a] text-slate-100 flex flex-col md:flex-row font-sans selection:bg-teal-500/30 selection:text-teal-200">
      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        onSelectPage={setCurrentPage}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* Top Header */}
        <Header
          currentPage={currentPage}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenAddOrder={handleOpenAddOrder}
          onResetData={currentPage === 'fleet' ? handleRequestResetDemoFleet : handleRequestResetDemoData}
          onExportData={handleExportData}
        />

        {/* Dynamic Content View */}
        <main className="flex-1 p-4 lg:p-8">
          {/* Section A: Delivery Dashboard */}
          {currentPage === 'dashboard' && (
            <div className="max-w-7xl mx-auto space-y-6">
              {/* 1. Essential KPI Cards */}
              <KpiCards
                totalDeliveries={orders.length}
                availableFleetSize={vehicles.filter((v) => v.status === 'Available').length}
                vehiclesUsedCount={optimizationResult?.vehiclesUsedCount ?? 0}
                totalDistanceKm={optimizationResult?.totalDistanceKm ?? 0}
                deliveriesMeetingWindows={optimizationResult?.timeWindowsMetCount ?? 0}
                lateOrInfeasibleDeliveries={
                  (optimizationResult?.timeWindowsMissedCount ?? 0) +
                  (optimizationResult?.totalUnassignedOrders ?? 0)
                }
              />

              {/* 2. Responsive Two-Column Layout (Route Overview Map + Fleet Status) */}
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Column A: Route Overview Map (7 cols on desktop) */}
                <div className="lg:col-span-7 xl:col-span-8">
                  <RouteMapOverview
                    orders={orders}
                    onSelectOrder={handleSelectOrderById}
                  />
                </div>

                {/* Column B: Fleet Status (5 cols on desktop) */}
                <div className="lg:col-span-5 xl:col-span-4">
                  <FleetStatusCard
                    vehicles={vehicles}
                    orders={orders}
                    selectedVehicleId={undefined}
                  />
                </div>
              </section>

              {/* 3. Recent Deliveries Table */}
              <section>
                <RecentDeliveriesTable
                  orders={orders}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onViewOrder={setSelectedOrderForDetail}
                  onOpenAddOrder={handleOpenAddOrder}
                  onUpdateStatus={handleUpdateStatus}
                />
              </section>
            </div>
          )}

          {/* Section B: Customer Deliveries */}
          {currentPage === 'orders' && (
            <OrdersView
              orders={orders}
              vehicles={vehicles}
              onOpenAddOrder={handleOpenAddOrder}
              onOpenEditOrder={handleOpenEditOrder}
              onViewOrderDetails={setSelectedOrderForDetail}
              onRequestDeliverOrder={handleRequestDeliverOrder}
              onRequestCancelOrder={handleRequestCancelOrder}
              onResetDemoData={handleRequestResetDemoData}
              onExportData={handleExportData}
            />
          )}

          {/* Section C: Fleet Management */}
          {currentPage === 'fleet' && (
            <FleetView
              vehicles={vehicles}
              orders={orders}
              onOpenAddVehicle={handleOpenAddVehicle}
              onOpenEditVehicle={handleOpenEditVehicle}
              onViewVehicleDetails={setInspectingVehicle}
              onRequestChangeStatus={handleRequestChangeVehicleStatus}
              onRequestDeleteVehicle={handleRequestDeleteVehicle}
              onResetDemoFleet={handleRequestResetDemoFleet}
            />
          )}

          {/* Section D: Route Optimization (Main Feature) */}
          {currentPage === 'planner' && (
            <RoutePlannerView
              orders={orders}
              vehicles={vehicles}
              onApplyPlan={handleApplyPlan}
              onResetData={handleRequestResetDemoData}
            />
          )}
        </main>

        {/* Global Minimal Footer */}
        <footer className="border-t border-slate-800/80 px-4 lg:px-8 py-3.5 bg-[#0b1329]/80 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">RouteWise Fleet</span>
            <span aria-hidden="true">·</span>
            <span>DT-LSC-10: Small Delivery Fleet Under Time Windows</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span>Lexicographic Optimization Engine</span>
            <span aria-hidden="true">·</span>
            <span className="text-teal-400">Deterministic Heuristic</span>
          </div>
        </footer>
      </div>

      {/* Order Form Modal (Add & Edit) */}
      <OrderFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingOrder(null);
        }}
        onSaveOrder={handleSaveOrder}
        initialOrder={editingOrder}
        existingOrdersCount={orders.length}
        vehicles={vehicles}
      />

      {/* Order Details Drawer */}
      <OrderDetailsDrawer
        order={selectedOrderForDetail}
        onClose={() => setSelectedOrderForDetail(null)}
        onEdit={(order) => {
          setSelectedOrderForDetail(null);
          handleOpenEditOrder(order);
        }}
        onConfirmDeliver={(order) => {
          handleRequestDeliverOrder(order);
        }}
        onConfirmCancel={(order) => {
          handleRequestCancelOrder(order);
        }}
        vehicles={vehicles}
      />

      {/* Vehicle Form Modal (Add & Edit) */}
      <VehicleFormModal
        isOpen={isVehicleFormOpen}
        onClose={() => {
          setIsVehicleFormOpen(false);
          setEditingVehicle(null);
        }}
        onSaveVehicle={handleSaveVehicle}
        initialVehicle={editingVehicle}
        existingVehicles={vehicles}
      />

      {/* Vehicle Details Modal */}
      <VehicleDetailsModal
        vehicle={inspectingVehicle}
        orders={orders}
        onClose={() => setInspectingVehicle(null)}
        onEdit={(v) => {
          setInspectingVehicle(null);
          handleOpenEditVehicle(v);
        }}
        onRequestChangeStatus={handleRequestChangeVehicleStatus}
      />

      {/* Universal Confirmation Modal */}
      {confirmationState && (
        <ConfirmationModal
          isOpen={confirmationState.isOpen}
          type={confirmationState.type}
          title={confirmationState.title}
          message={confirmationState.message}
          confirmLabel={confirmationState.confirmLabel}
          confirmButtonClass={confirmationState.confirmButtonClass}
          onConfirm={confirmationState.action}
          onCancel={() => setConfirmationState(null)}
        />
      )}

      {/* Global Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700/80 text-white shadow-2xl text-xs animate-in slide-in-from-bottom-3 duration-200 max-w-md">
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-teal-400 shrink-0" />}
          {toast.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
          <span className="font-medium text-slate-200 leading-snug">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white ml-2 p-0.5 rounded shrink-0"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
