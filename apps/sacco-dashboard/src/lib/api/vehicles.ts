import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// API base URL for SACCO Dashboard backend
const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://fleetpulse.up.railway.app/api'
  : 'http://localhost:3001/api';

// Get all vehicles with filtering and pagination
export const getVehicles = createServerFn({ method: "GET" })
  .inputValidator(z.object({
    page: z.string().optional().default("1"),
    limit: z.string().optional().default("20"),
    status: z.string().optional(),
    route_number: z.string().optional(),
    sacco_id: z.string().optional(),
    search: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const params = new URLSearchParams({
      page: data.page,
      limit: data.limit,
      ...(data.status && { status: data.status }),
      ...(data.route_number && { route_number: data.route_number }),
      ...(data.sacco_id && { sacco_id: data.sacco_id }),
      ...(data.search && { search: data.search }),
    });

    const response = await fetch(`${API_BASE}/vehicles?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch vehicles: ${response.statusText}`);
    }
    
    return response.json();
  });

// Get single vehicle by ID
export const getVehicle = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const response = await fetch(`${API_BASE}/vehicles/${data.id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch vehicle: ${response.statusText}`);
    }
    
    return response.json();
  });

// Create new vehicle
export const createVehicle = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    sacco_id: z.string().min(1),
    plate_number: z.string().min(1),
    vehicle_type: z.string().min(1),
    route_number: z.string().min(1),
    driver_name: z.string().min(1),
    driver_phone: z.string().min(1),
    conductor_name: z.string().optional(),
    conductor_phone: z.string().optional(),
    capacity: z.number().min(1),
    insurance_expiry: z.string().optional(),
    inspection_expiry: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const response = await fetch(`${API_BASE}/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || `Failed to create vehicle: ${response.statusText}`);
    }
    
    return result;
  });

// Update vehicle
export const updateVehicle = createServerFn({ method: "PUT" })
  .inputValidator(z.object({
    id: z.string(),
    sacco_id: z.string().optional(),
    plate_number: z.string().optional(),
    vehicle_type: z.string().optional(),
    route_number: z.string().optional(),
    driver_name: z.string().optional(),
    driver_phone: z.string().optional(),
    conductor_name: z.string().optional(),
    conductor_phone: z.string().optional(),
    capacity: z.number().optional(),
    insurance_expiry: z.string().optional(),
    inspection_expiry: z.string().optional(),
    is_active: z.boolean().optional(),
  }))
  .handler(async ({ data }) => {
    const { id, ...updateData } = data;
    
    const response = await fetch(`${API_BASE}/vehicles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || `Failed to update vehicle: ${response.statusText}`);
    }
    
    return result;
  });

// Update vehicle location
export const updateVehicleLocation = createServerFn({ method: "PUT" })
  .inputValidator(z.object({
    id: z.string(),
    current_location: z.string().min(1),
    current_stage_id: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }))
  .handler(async ({ data }) => {
    const { id, ...locationData } = data;
    
    const response = await fetch(`${API_BASE}/vehicles/${id}/location`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(locationData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update vehicle location: ${response.statusText}`);
    }
    
    return response.json();
  });

// Get vehicle statistics
export const getVehicleStats = createServerFn({ method: "GET" })
  .inputValidator(z.object({
    sacco_id: z.string().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const params = new URLSearchParams();
    if (data.sacco_id) params.append('sacco_id', data.sacco_id);
    if (data.date_from) params.append('date_from', data.date_from);
    if (data.date_to) params.append('date_to', data.date_to);

    const response = await fetch(`${API_BASE}/vehicles/stats?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch vehicle stats: ${response.statusText}`);
    }
    
    return response.json();
  });

// Get active vehicles
export const getActiveVehicles = createServerFn({ method: "GET" })
  .inputValidator(z.object({
    sacco_id: z.string().optional(),
    route_number: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const params = new URLSearchParams();
    if (data.sacco_id) params.append('sacco_id', data.sacco_id);
    if (data.route_number) params.append('route_number', data.route_number);

    const response = await fetch(`${API_BASE}/vehicles/active?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch active vehicles: ${response.statusText}`);
    }
    
    return response.json();
  });
