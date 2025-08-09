export const AdminOperationType = {
  CREATE: "create",
  READ: "read",
  UPDATE: "update",
  DELETE: "delete",
  LOGIN: "login",
  LOGOUT: "logout",
} as const;

export type AdminOperationType =
  (typeof AdminOperationType)[keyof typeof AdminOperationType];

export interface AdminOperationLog {
  id: number;
  created_at: string;
  updated_at: string;
  username: string;
  operation: AdminOperationType;
  resource: string;
  resource_id: string;
  description: string;
  details: string;
  success: boolean;
  error_msg: string;
  ip: string;
  user_agent: string;
  method: string;
  path: string;
  operation_time: string;
}

export interface LoginLog {
  id: number;
  created_at: string;
  updated_at: string;
  username: string;
  success: boolean;
  ip: string;
  user_agent: string;
  reason: string;
  login_time: string;
}

export interface AdminOperationLogListParams {
  username?: string;
  resource?: string;
  operation?: AdminOperationType;
  success?: boolean;
  start_time?: string;
  end_time?: string;
  page?: number;
  page_size?: number;
}

export interface LoginLogListParams {
  username?: string;
  ip?: string;
  success?: boolean;
  start_time?: string;
  end_time?: string;
  page?: number;
  page_size?: number;
}

export interface AdminOperationLogListResponse {
  message: string;
  logs: AdminOperationLog[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface LoginLogListResponse {
  message: string;
  logs: LoginLog[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AdminOperationLogDetailResponse {
  message: string;
  log: AdminOperationLog;
}

export interface AdminOperationStatsResponse {
  message: string;
  operation_stats: Record<string, number>;
  resource_stats: Record<string, number>;
  start_time: string;
  end_time: string;
}

export interface AdminOperationStatsParams {
  username?: string;
  start_time?: string;
  end_time?: string;
}
