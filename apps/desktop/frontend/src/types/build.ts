export interface BuildStatus {
  id: string;
  state: string;
  message: string;
  startedAt?: string;
  endedAt?: string;
}

export interface CompilationMetrics {
  totalAttempts: number;
  successfulCompiles: number;
  failedCompiles: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  successRate: number;
  lastAttempt: string;
  lastSuccess: string;
  lastFailure: string;
}