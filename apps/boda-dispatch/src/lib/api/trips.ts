import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// API base URL for BodaDispatch backend
const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://boda-dispatch.up.railway.app/api'
  : 'http://localhost:3002/api';

// Get all trips with filtering and pagination
export const getTrips = createServerFn({ method: "GET" })
  .inputValidator(z.object({
    page: z.string().optional().default("1"),
    limit: z.string().optional().default("20"),
    status: z.string().optional(),
    rider_id: z.string().optional(),
    stage_id: z.string().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const params = new URLSearchParams({
      page: data.page,
      limit: data.limit,
      ...(data.status && { status: data.status }),
      ...(data.rider_id && { rider_id: data.rider_id }),
      ...(data.stage_id && { stage_id: data.stage_id }),
      ...(data.date_from && { date_from: data.date_from }),
      ...(data.date_to && { date_to: data.date_to }),
    });

    const response = await fetch(`${API_BASE}/trips?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch trips: ${response.statusText}`);
    }
    
    return response.json();
  });

// Get single trip by ID
export const getTrip = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const response = await fetch(`${API_BASE}/trips/${data.id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch trip: ${response.statusText}`);
    }
    
    return response.json();
  });

// Create new trip (booking)
export const createTrip = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    rider_id: z.string().min(1),
    customer_name: z.string().min(1),
    customer_phone: z.string().min(1),
    pickup_location: z.string().min(1),
    dropoff_location: z.string().min(1),
    fare_amount: z.number().min(0),
    payment_method: z.string().optional().default("cash"),
  }))
  .handler(async ({ data }) => {
    const response = await fetch(`${API_BASE}/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create trip: ${response.statusText}`);
    }
    
    return response.json();
  });

// Complete trip
export const completeTrip = createServerFn({ method: "PUT" })
  .inputValidator(z.object({
    id: z.string(),
    actual_fare: z.number().min(0),
    payment_method: z.string().optional(),
    notes: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const response = await fetch(`${API_BASE}/trips/${data.id}/complete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actual_fare: data.actual_fare,
        payment_method: data.payment_method,
        notes: data.notes,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to complete trip: ${response.statusText}`);
    }
    
    return response.json();
  });

// Cancel trip
export const cancelTrip = createServerFn({ method: "PUT" })
  .inputValidator(z.object({
    id: z.string(),
    reason: z.string().min(1),
    refund_amount: z.number().min(0).optional(),
  }))
  .handler(async ({ data }) => {
    const response = await fetch(`${API_BASE}/trips/${data.id}/cancel`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: data.reason,
        refund_amount: data.refund_amount,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to cancel trip: ${response.statusText}`);
    }
    
    return response.json();
  });

// Get trip statistics
export const getTripStats = createServerFn({ method: "GET" })
  .inputValidator(z.object({
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    rider_id: z.string().optional(),
    stage_id: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const params = new URLSearchParams();
    if (data.date_from) params.append('date_from', data.date_from);
    if (data.date_to) params.append('date_to', data.date_to);
    if (data.rider_id) params.append('rider_id', data.rider_id);
    if (data.stage_id) params.append('stage_id', data.stage_id);

    const response = await fetch(`${API_BASE}/trips/stats?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch trip stats: ${response.statusText}`);
    }
    
    return response.json();
  });
