export type SyncAction = "skipped" | "batch" | "promoted" | "error";

export interface SyncResult {
  action: SyncAction;
  syncId?: string;
  status: string;
  cursor: number;
  expectedCount?: number;
  importedCount: number;
  failedCount: number;
  promoted?: boolean;
  message?: string;
  error?: string;
}

export interface SyncOptions {
  batchSize?: number;
  maxConcurrency?: number;
  ignoreLease?: boolean;
  allowLargeShrink?: boolean;
  catalogId?: string;
  forceBootstrap?: boolean;
}

export interface StagingValidationResult {
  valid: boolean;
  programCount: number;
  liveProgramCount: number;
  courseCount: number;
  edgeCount: number;
  errors: string[];
  warnings: string[];
}

export interface ProgramSyncState {
  id: string;
  status: string;
  sync_id: string | null;
  cursor: number;
  expected_count: number | null;
  imported_count: number;
  failed_count: number;
  started_at: Date | null;
  completed_at: Date | null;
  next_due_at: Date | null;
  lease_expires_at: Date | null;
  last_error: string | null;
}
