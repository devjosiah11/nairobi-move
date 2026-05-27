import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// API base URL for Registration backend
const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://registration.up.railway.app/api'
  : 'http://localhost:3003/api';

// Register new SACCO
export const registerSacco = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    name: z.string().min(1, "SACCO name is required"),
    owner_name: z.string().min(1, "Owner name is required"),
    phone_number: z.string().min(1, "Phone number is required"),
    county: z.string().min(1, "County is required"),
    physical_address: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const response = await fetch(`${API_BASE}/register/sacco`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || `Failed to register SACCO: ${response.statusText}`);
    }
    
    return result;
  });

// Validate SACCO registration data
export const validateSaccoRegistration = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    name: z.string().optional(),
    phone_number: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const response = await fetch(`${API_BASE}/register/sacco/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to validate SACCO registration: ${response.statusText}`);
    }
    
    return response.json();
  });
