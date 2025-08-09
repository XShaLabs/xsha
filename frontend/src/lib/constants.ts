export const APP_CONFIG = {
  name: import.meta.env.VITE_APP_NAME || "XSHA",
  version: import.meta.env.VITE_APP_VERSION || "1.0.0",
} as const;

export const STORAGE_KEYS = {
  authToken: "xsha_auth_token",
  language: "xsha_language",
} as const;

export const API_CONFIG = {
  baseUrl:
    import.meta.env.VITE_API_BASE_URL || "/api/v1",
  timeout: 10000,
} as const;

export const UI_CONFIG = {
  pageSize: 20,
  maxRetries: 3,
} as const;

export const ROUTES = {
  home: "/",
  login: "/login",
  dashboard: "/dashboard",

  projects: "/projects",
  projectCreate: "/projects/create",
  projectEdit: (id: number) => `/projects/${id}/edit`,

  devEnvironments: "/environments",
  devEnvironmentCreate: "/environments/create",
  devEnvironmentEdit: (id: number) => `/environments/${id}/edit`,

  gitCredentials: "/credentials",
  gitCredentialCreate: "/credentials/create",
  gitCredentialEdit: (id: number) => `/credentials/${id}/edit`,

  projectTasks: (projectId: number) => `/projects/${projectId}/tasks`,
  taskCreate: (projectId: number) => `/projects/${projectId}/tasks/create`,
  taskEdit: (projectId: number, taskId: number) =>
    `/projects/${projectId}/tasks/${taskId}/edit`,
  taskConversation: (projectId: number, taskId: number) =>
    `/projects/${projectId}/tasks/${taskId}/conversation`,
  taskConversationGitDiff: (projectId: number, taskId: number, conversationId: number) =>
    `/projects/${projectId}/tasks/${taskId}/conversation/git-diff/${conversationId}`,
  taskGitDiff: (projectId: number, taskId: number) =>
    `/projects/${projectId}/tasks/${taskId}/git-diff`,



  systemConfigs: "/settings",

  settings: "/settings",
  profile: "/profile",
} as const;

export const SUPPORTED_LANGUAGES = [
  { code: "zh-CN", name: "Chinese", flag: "🇨🇳" },
  { code: "en-US", name: "English", flag: "🇺🇸" },
] as const;
