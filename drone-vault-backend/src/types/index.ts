export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export interface JobStatusResponse {
  jobId: string;
  status: "waiting" | "active" | "completed" | "failed";
  downloadUrl?: string;
  progress?: number;
}
