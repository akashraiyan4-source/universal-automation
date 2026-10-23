// src/types/index.ts

/** Universal lead payload. Alias fields (patientName, From, Niche, …) are normalised before handlers run. */
export interface LeadPayload {
  name?: string;
  fullName?: string;
  clientName?: string;
  patientName?: string;
  email?: string;
  phone?: string;
  callerPhone?: string;
  niche?: string;
  message?: string;
  serviceType?: string;
  treatment?: string;
  preferredDate?: string;
  metadata?: Record<string, unknown>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
  requestId?: string;
  timestamp?: string;
}

export interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
}

export interface TenantAware {
  tenantId?: string | null;
  niche?: string;
}
