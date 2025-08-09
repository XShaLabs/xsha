import { request } from "./request";
import type {
  SystemConfigListResponse,
  BatchUpdateConfigsRequest,
  BatchUpdateConfigsResponse,
} from "@/types/system-config";

export const systemConfigsApi = {
  listAll: async (): Promise<SystemConfigListResponse> => {
    return request<SystemConfigListResponse>("/settings");
  },

  batchUpdate: async (
    data: BatchUpdateConfigsRequest
  ): Promise<BatchUpdateConfigsResponse> => {
    return request<BatchUpdateConfigsResponse>("/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
};
