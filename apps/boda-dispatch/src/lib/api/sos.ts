import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// API base URL for BodaDispatch backend
const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://boda-dispatch.up.railway.app/api'
  : 'http://localhost:3002/api';

// Get all SOS events with filtering and pagination
export const getSosEvents = createServerFn({ method: "GET" })
  .inputValidator(z.object({
    page: z.string().optional().default("1"),
    limit: z.string().optional().default("20"),
    status: z.string().optional(),
    rider_id: z.string().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const params = new URLSearchParams({
      page: data.page,
      limit: data.limit,
      ...(data.status && { status: data.status }),
      ...(data.rider_id && { rider_id: data.rider_id }),
      ...(data.date_from && { date_from: data.date_from }),
      ...(data.date_to && { date_to: data.date_to }),
    });

    const response = await fetch(`${API_BASE}/sos?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch SOS events: ${response.statusText}`);
    }
    
    return response.json();
  });

// Get single SOS event by ID
export const getSosEvent = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const response = await fetch(`${API_BASE}/sos/${data.id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch SOS event: ${response.statusText}`);
    }
    
    return response.json();
  });

// Trigger new SOS event
export const triggerSos = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    rider_id: z.string().min(1),
    location_description: z.string().min(1),
    lat: z.number().optional(),
    lng: z.number().optional(),
    incident_type: z.string().optional(),
    notes: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const response = await fetch(`${API_BASE}/sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to trigger SOS: ${response.statusText}`);
    }
    
    return response.json();
  });

// Resolve SOS event
export const resolveSos = createServerFn({ method: "PUT" })
  .inputValidator(z.object({
    id: z.string(),
    resolution_notes: z.string().min(1),
    follow_up_required: z.boolean().optional().default(false),
    follow_up_notes: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const response = await fetch(`${API_BASE}/sos/${data.id}/resolve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resolution_notes: data.resolution_notes,
        follow_up_required: data.follow_up_required,
        follow_up_notes: data.follow_up_notes,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to resolve SOS: ${response.statusText}`);
    }
    
    return response.json();
  });

// Get SOS statistics
export const getSosStats = createServerFn({ method: "GET" })
  .inputValidator(z.object({
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    rider_id: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const params = new URLSearchParams();
    if (data.date_from) params.append('date_from', data.date_from);
    if (data.date_to) params.append('date_to', data.date_to);
    if (data.rider_id) params.append('rider_id', data.rider_id);

    const response = await fetch(`${API_BASE}/sos/stats?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch SOS stats: ${response.statusText}`);
    }
    
    return response.json();
  });

// Get active SOS events (for dashboard/alerting)
export const getActiveSosEvents = createServerFn({ method: "GET" })
  .handler(async () => {
    const response = await fetch(`${API_BASE}/sos/active`);
    if (!response.ok) {
      throw new Error(`Failed to fetch active SOS events: ${response.statusText}`);
    }
    
    return response.json();
  });
