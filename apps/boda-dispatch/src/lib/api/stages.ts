import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// API base URL for BodaDispatch backend
const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://boda-dispatch.up.railway.app/api'
  : 'http://localhost:3002/api';

// Get all stages with filtering
export const getStages = createServerFn({ method: "GET" })
  .inputValidator(z.object({
    area: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const params = new URLSearchParams();
    if (data.area) params.append('area', data.area);

    const response = await fetch(`${API_BASE}/stages?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stages: ${response.statusText}`);
    }
    
    return response.json();
  });

// Get single stage by ID with riders
export const getStage = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const response = await fetch(`${API_BASE}/stages/${data.id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stage: ${response.statusText}`);
    }
    
    return response.json();
  });

// Create new stage
export const createStage = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    name: z.string().min(1),
    area: z.string().min(1),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }))
  .handler(async ({ data }) => {
    const response = await fetch(`${API_BASE}/stages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create stage: ${response.statusText}`);
    }
    
    return response.json();
  });

// Update stage
export const updateStage = createServerFn({ method: "PUT" })
  .inputValidator(z.object({
    id: z.string(),
    name: z.string().optional(),
    area: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }))
  .handler(async ({ data }) => {
    const { id, ...updateData } = data;
    
    const response = await fetch(`${API_BASE}/stages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update stage: ${response.statusText}`);
    }
    
    return response.json();
  });

// Get stage statistics
export const getStageStats = createServerFn({ method: "GET" })
  .handler(async () => {
    const response = await fetch(`${API_BASE}/stages/stats`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stage stats: ${response.statusText}`);
    }
    
    return response.json();
  });
