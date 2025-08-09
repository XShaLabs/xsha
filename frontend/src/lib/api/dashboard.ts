import { request } from "./request";

export interface DashboardStats {
  total_projects: number;
  active_environments: number;
  git_credentials: number;
  total_tasks: number;
  recent_tasks: number;
  task_status_counts: {
    [key: string]: number;
  };
}

export interface RecentTask {
  id: number;
  title: string;
  start_branch: string;
  work_branch: string;
  status: string;
  has_pull_request: boolean;
  workspace_path: string;
  session_id: string;
  project_id: number;
  dev_environment_id?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  project?: {
    id: number;
    name: string;
    description: string;
    repo_url: string;
    protocol: string;
    credential_id?: number;
    created_by: string;
    created_at: string;
    updated_at: string;
  };
  dev_environment?: {
    id: number;
    name: string;
    description: string;
    type: string;
    docker_image: string;
    cpu_limit: number;
    memory_limit: number;
    env_vars: string;
    session_dir: string;
    created_by: string;
    created_at: string;
    updated_at: string;
  };
}

export const dashboardApi = {
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await request<{ stats: DashboardStats }>("/dashboard/stats");
    return response.stats;
  },

  async getRecentTasks(limit?: number): Promise<RecentTask[]> {
    const searchParams = new URLSearchParams();
    if (limit) searchParams.set("limit", limit.toString());
    
    const queryString = searchParams.toString();
    const url = queryString ? `/dashboard/recent-tasks?${queryString}` : "/dashboard/recent-tasks";
    
    const response = await request<{ tasks: RecentTask[] }>(url);
    return response.tasks;
  },
};
