// src/types/index.ts

// ১. ইউনিভার্সাল লিড (Lead) পেমেন্ট বা সাবমিশন টাইপ
export interface LeadPayload {
  name: string;
  email: string;
  phone: string;
  niche?: string; // যেমন: 'dental', 'cosmetic', 'roofing', 'solar' ইত্যাদি
  message?: string;
  serviceType?: string;
  preferredDate?: string;
  metadata?: Record<string, unknown>;
}

// ২. ইউনিভার্সাল API রেসপন্স টাইপ
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
  timestamp: string;
}

// ৩. ডাটাবেস বা অন্যান্য কমন ইন্টারফেস
export interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
}