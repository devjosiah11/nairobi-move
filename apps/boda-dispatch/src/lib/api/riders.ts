import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// API base URL for BodaDispatch backend
const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://boda-dispatch.up.railway.app/api'
  : 'http://localhost:3002/api';

// Get all riders with filtering and pagination
export const getRiders = createServerFn({ method: "GET" })
  .inputValidator(z.object({
    page: z.string().optional().default("1"),
    limit: z.string().optional().default("20"),
    status: z.string().optional(),
    stage_id: z.string().optional(),
    search: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const params = new URLSearchParams({
      page: data.page,
      limit: data.limit,
      ...(data.status && { status: data.status }),
      ...(data.stage_id && { stage_id: data.stage_id }),
      ...(data.search && { search: data.search }),
    });

    const response = await fetch(`${API_BASE}/riders?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch riders: ${response.statusText}`);
    }
    
    return response.json();
  });

// Get single rider by ID
export const getRider = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const response = await fetch(`${API_BASE}/riders/${data.id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch rider: ${response.statusText}`);
    }
    
    return response.json();
  });

// Create new rider
export const createRider = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    full_name: z.string().min(1),
    phone_number: z.string().min(1),
    id_number: z.string().optional(),
    stage_id: z.string().min(1),
    plate_number: z.string().min(1),
    motorcycle_make: z.string().optional(),
    psb_licence: z.string().optional(),
    next_of_kin_name: z.string().optional(),
    next_of_kin_phone: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const response = await fetch(`${API_BASE}/riders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create rider: ${response.statusText}`);
    }
    
    return response.json();
  });

// Update rider
export const updateRider = createServerFn({ method: "PUT" })
  .inputValidator(z.object({
    id: z.string(),
    full_name: z.string().optional(),
    phone_number: z.string().optional(),
    id_number: z.string().optional(),
    stage_id: z.string().optional(),
    plate_number: z.string().optional(),
    motorcycle_make: z.string().optional(),
    psb_licence: z.string().optional(),
    next_of_kin_name: z.string().optional(),
    next_of_kin_phone: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const { id, ...updateData } = data;
    
    const response = await fetch(`${API_BASE}/riders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update rider: ${response.statusText}`);
    }
    
    return response.json();
  });

// Toggle rider availability
export const toggleRiderAvailability = createServerFn({ method: "PUT" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const response = await fetch(`${API_BASE}/riders/${data.id}/toggle-availability`, {
      method: 'PUT',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to toggle rider availability: ${response.statusText}`);
    }
    
    return response.json();
  });

// Suspend rider
export const suspendRider = createServerFn({ method: "PUT" })
  .inputValidator(z.object({ 
    id: z.string(),
    reason: z.string().min(1),
  }))
  .handler(async ({ data }) => {
    const response = await fetch(`${API_BASE}/riders/${data.id}/suspend`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: data.reason }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to suspend rider: ${response.statusText}`);
    }
    
    return response.json();
  });

// Reinstate rider
export const reinstateRider = createServerFn({ method: "PUT" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const response = await fetch(`${API_BASE}/riders/${data.id}/reinstate`, {
      method: 'PUT',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to reinstate rider: ${response.statusText}`);
    }
    
    return response.json();
  });
