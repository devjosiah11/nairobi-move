import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// API base URL for Registration backend
const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://registration.up.railway.app/api'
  : 'http://localhost:3003/api';

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

// Get stage areas
export const getStageAreas = createServerFn({ method: "GET" })
  .handler(async () => {
    const response = await fetch(`${API_BASE}/stages/areas`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stage areas: ${response.statusText}`);
    }
    
    return response.json();
  });
