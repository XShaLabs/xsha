import { request } from "./request";
import type {
  CreateProjectRequest,
  CreateProjectResponse,
  UpdateProjectRequest,
  ProjectListResponse,
  ProjectDetailResponse,
  CompatibleCredentialsResponse,
  ProjectListParams,
  ParseRepositoryURLResponse,
  FetchRepositoryBranchesRequest,
  FetchRepositoryBranchesResponse,
  ValidateRepositoryAccessRequest,
  ValidateRepositoryAccessResponse,
} from "@/types/project";

export const projectsApi = {
  create: async (
    data: CreateProjectRequest
  ): Promise<CreateProjectResponse> => {
    return request<CreateProjectResponse>("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  list: async (params?: ProjectListParams): Promise<ProjectListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.name) searchParams.set("name", params.name);
    if (params?.protocol) searchParams.set("protocol", params.protocol);
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size)
      searchParams.set("page_size", params.page_size.toString());

    const queryString = searchParams.toString();
    const url = queryString ? `/projects?${queryString}` : "/projects";

    return request<ProjectListResponse>(url);
  },

  get: async (id: number): Promise<ProjectDetailResponse> => {
    return request<ProjectDetailResponse>(`/projects/${id}`);
  },

  update: async (
    id: number,
    data: UpdateProjectRequest
  ): Promise<{ message: string }> => {
    return request<{ message: string }>(`/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number): Promise<{ message: string }> => {
    return request<{ message: string }>(`/projects/${id}`, {
      method: "DELETE",
    });
  },

  getCompatibleCredentials: async (
    protocol: string
  ): Promise<CompatibleCredentialsResponse> => {
    return request<CompatibleCredentialsResponse>(
      `/projects/credentials?protocol=${protocol}`
    );
  },

  parseUrl: async (repoUrl: string): Promise<ParseRepositoryURLResponse> => {
    return request<ParseRepositoryURLResponse>("/projects/parse-url", {
      method: "POST",
      body: JSON.stringify({ repo_url: repoUrl }),
    });
  },

  fetchBranches: async (
    data: FetchRepositoryBranchesRequest
  ): Promise<FetchRepositoryBranchesResponse> => {
    return request<FetchRepositoryBranchesResponse>("/projects/branches", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  validateAccess: async (
    data: ValidateRepositoryAccessRequest
  ): Promise<ValidateRepositoryAccessResponse> => {
    return request<ValidateRepositoryAccessResponse>(
      "/projects/validate-access",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },
};
