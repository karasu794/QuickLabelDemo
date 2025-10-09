export type PaymentStatus =
  | 'authorized'
  | 'captured'
  | 'settled'
  | 'voided'
  | 'refunded'
  | 'partially_refunded'
  | 'expired'
  | 'failed';

export interface PaymentRecord {
  id: string;
  status: PaymentStatus;
  amount: number; // in minor units (e.g., cents)
  currency: string; // ISO 4217
  capturedAt?: string | null;
  settledAt?: string | null;
  refundedAmount?: number; // minor units
  createdAt: string;
  updatedAt: string;
}

export type CancelAction = 'void' | 'refund';

export interface CancelJobPayload {
  paymentId: string;
  expectedAction: CancelAction;
  idempotencyKey?: string;
}

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface JobRecord {
  id: string;
  type: 'cancel_payment';
  status: JobStatus;
  attempts: number;
  nextRunAt: string | null;
  locked?: boolean;
  statusDetail?: string | null;
  lastErrorCode?: string | null;
  lastError?: string | null;
  payload: CancelJobPayload;
  createdAt: string;
  updatedAt: string;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export interface JobEventRecord {
  jobId: string;
  at: string;
  event: 'queued' | 'running' | 'rescheduled' | 'succeeded' | 'failed';
  note?: string;
  payload?: unknown;
}

