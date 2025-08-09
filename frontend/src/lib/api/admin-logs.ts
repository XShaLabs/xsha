import { request } from "./request";
import type {
  AdminOperationLogListParams,
  AdminOperationLogListResponse,
  AdminOperationLogDetailResponse,
  AdminOperationStatsParams,
  AdminOperationStatsResponse,
  LoginLogListParams,
  LoginLogListResponse,
} from "@/types/admin-logs";

export const adminLogsApi = {
  getOperationLogs: async (
    params?: AdminOperationLogListParams
  ): Promise<AdminOperationLogListResponse> => {
    const searchParams = new URLSearchParams();

    if (params?.username) searchParams.append("username", params.username);
    if (params?.resource) searchParams.append("resource", params.resource);
    if (params?.operation) searchParams.append("operation", params.operation);
    if (params?.success !== undefined)
      searchParams.append("success", params.success.toString());
    if (params?.start_time)
      searchParams.append("start_time", params.start_time);
    if (params?.end_time) searchParams.append("end_time", params.end_time);
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.page_size)
      searchParams.append("page_size", params.page_size.toString());

    const queryString = searchParams.toString();
    const url = queryString
      ? `/admin/operation-logs?${queryString}`
      : "/admin/operation-logs";

    return request<AdminOperationLogListResponse>(url);
  },

  getOperationLog: async (
    id: number
  ): Promise<AdminOperationLogDetailResponse> => {
    return request<AdminOperationLogDetailResponse>(
      `/admin/operation-logs/${id}`
    );
  },

  getOperationStats: async (
    params?: AdminOperationStatsParams
  ): Promise<AdminOperationStatsResponse> => {
    const searchParams = new URLSearchParams();

    if (params?.username) searchParams.append("username", params.username);
    if (params?.start_time)
      searchParams.append("start_time", params.start_time);
    if (params?.end_time) searchParams.append("end_time", params.end_time);

    const queryString = searchParams.toString();
    const url = queryString
      ? `/admin/operation-stats?${queryString}`
      : "/admin/operation-stats";

    return request<AdminOperationStatsResponse>(url);
  },

  getLoginLogs: async (
    params?: LoginLogListParams
  ): Promise<LoginLogListResponse> => {
    const searchParams = new URLSearchParams();

    if (params?.username) searchParams.append("username", params.username);
    if (params?.ip) searchParams.append("ip", params.ip);
    if (params?.success !== undefined)
      searchParams.append("success", params.success.toString());
    if (params?.start_time)
      searchParams.append("start_time", params.start_time);
    if (params?.end_time) searchParams.append("end_time", params.end_time);
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.page_size)
      searchParams.append("page_size", params.page_size.toString());

    const queryString = searchParams.toString();
    const url = queryString
      ? `/admin/login-logs?${queryString}`
      : "/admin/login-logs";

    return request<LoginLogListResponse>(url);
  },
};
