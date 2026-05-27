import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// API base URL for Registration backend
const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://registration.up.railway.app/api'
  : 'http://localhost:3003/api';

// Register new rider
export const registerRider = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    full_name: z.string().min(1, "Full name is required"),
    phone_number: z.string().min(1, "Phone number is required"),
    id_number: z.string().optional(),
    stage_id: z.string().min(1, "Stage is required"),
    plate_number: z.string().min(1, "Plate number is required"),
    motorcycle_make: z.string().optional(),
    psb_licence: z.string().optional(),
    next_of_kin_name: z.string().optional(),
    next_of_kin_phone: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const response = await fetch(`${API_BASE}/register/rider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || `Failed to register rider: ${response.statusText}`);
    }
    
    return result;
  });

// Validate rider registration data
export const validateRiderRegistration = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    phone_number: z.string().optional(),
    plate_number: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const response = await fetch(`${API_BASE}/register/rider/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to validate registration: ${response.statusText}`);
    }
    
    return response.json();
  });
