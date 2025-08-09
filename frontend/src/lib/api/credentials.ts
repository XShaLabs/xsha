import { request } from "./request";
import type {
  CreateGitCredentialRequest,
  CreateGitCredentialResponse,
  UpdateGitCredentialRequest,
  GitCredentialListResponse,
  GitCredentialDetailResponse,
  GitCredentialListParams,
} from "@/types/credentials";

export const gitCredentialsApi = {
  create: async (
    data: CreateGitCredentialRequest
  ): Promise<CreateGitCredentialResponse> => {
    return request<CreateGitCredentialResponse>("/credentials", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  list: async (
    params?: GitCredentialListParams
  ): Promise<GitCredentialListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.name) searchParams.set("name", params.name);
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size)
      searchParams.set("page_size", params.page_size.toString());

    const queryString = searchParams.toString();
    const url = queryString ? `/credentials?${queryString}` : "/credentials";

    return request<GitCredentialListResponse>(url);
  },

  get: async (id: number): Promise<GitCredentialDetailResponse> => {
    return request<GitCredentialDetailResponse>(`/credentials/${id}`);
  },

  update: async (
    id: number,
    data: UpdateGitCredentialRequest
  ): Promise<{ message: string }> => {
    return request<{ message: string }>(`/credentials/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number): Promise<{ message: string }> => {
    return request<{ message: string }>(`/credentials/${id}`, {
      method: "DELETE",
    });
  },
};
