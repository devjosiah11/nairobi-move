import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// API base URL for MatatuPulse backend
const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://matatu-pulse.up.railway.app/api'
  : 'http://localhost:3004/api';

// Get available matatu routes
export const getRoutes = createServerFn({ method: "GET" })
  .inputValidator(z.object({
    area: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const params = new URLSearchParams();
    if (data.area) params.append('area', data.area);

    const response = await fetch(`${API_BASE}/commuter/routes?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch routes: ${response.statusText}`);
    }
    
    return response.json();
  });

// Get specific route information
export const getRoute = createServerFn({ method: "GET" })
  .inputValidator(z.object({ routeNumber: z.string() }))
  .handler(async ({ data }) => {
    const response = await fetch(`${API_BASE}/commuter/routes/${data.routeNumber}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch route: ${response.statusText}`);
    }
    
    return response.json();
  });

// Get traffic reports
export const getTrafficReports = createServerFn({ method: "GET" })
  .inputValidator(z.object({
    route_number: z.string().optional(),
    area: z.string().optional(),
    hours: z.string().optional().default("6"),
  }))
  .handler(async ({ data }) => {
    const params = new URLSearchParams({
      hours: data.hours,
      ...(data.route_number && { route_number: data.route_number }),
      ...(data.area && { area: data.area }),
    });

    const response = await fetch(`${API_BASE}/commuter/traffic?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch traffic reports: ${response.statusText}`);
    }
    
    return response.json();
  });

// Submit traffic report
export const submitTrafficReport = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    phone_number: z.string().min(1),
    report_type: z.string().min(1),
    route_number: z.string().optional(),
    description: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const response = await fetch(`${API_BASE}/commuter/traffic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || `Failed to submit traffic report: ${response.statusText}`);
    }
    
    return result;
  });

// Get incident reports
export const getIncidentReports = createServerFn({ method: "GET" })
  .inputValidator(z.object({
    incident_type: z.string().optional(),
    hours: z.string().optional().default("24"),
  }))
  .handler(async ({ data }) => {
    const params = new URLSearchParams({
      hours: data.hours,
      ...(data.incident_type && { incident_type: data.incident_type }),
    });

    const response = await fetch(`${API_BASE}/commuter/incidents?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch incident reports: ${response.statusText}`);
    }
    
    return response.json();
  });

// Submit incident report
export const submitIncidentReport = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    phone_number: z.string().min(1),
    incident_type: z.string().min(1),
    description: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }))
  .handler(async ({ data }) => {
    const response = await fetch(`${API_BASE}/commuter/incidents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || `Failed to submit incident report: ${response.statusText}`);
    }
    
    return result;
  });

// Trigger emergency SOS
export const triggerEmergencySOS = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    phone_number: z.string().min(1),
    description: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }))
  .handler(async ({ data }) => {
    const response = await fetch(`${API_BASE}/commuter/sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || `Failed to trigger SOS: ${response.statusText}`);
    }
    
    return result;
  });

// Get commuter profile
export const getCommuterProfile = createServerFn({ method: "GET" })
  .inputValidator(z.object({
    phone_number: z.string().min(1),
  }))
  .handler(async ({ data }) => {
    const params = new URLSearchParams({ phone_number: data.phone_number });
    const response = await fetch(`${API_BASE}/commuter/profile?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch commuter profile: ${response.statusText}`);
    }
    
    return response.json();
  });

// Register new commuter
export const registerCommuter = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    full_name: z.string().min(1),
    phone_number: z.string().min(1),
    email: z.string().email().optional(),
    preferred_routes: z.array(z.string()).optional(),
  }))
  .handler(async ({ data }) => {
    const response = await fetch(`${API_BASE}/commuter/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || `Failed to register commuter: ${response.statusText}`);
    }
    
    return result;
  });
