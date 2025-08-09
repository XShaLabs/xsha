import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/usePageTitle";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";

import { OperationLogsPage } from "@/pages/logs/OperationLogsPage";
import { LoginLogsPage } from "@/pages/logs/LoginLogsPage";
import { AuditStatsPage } from "@/pages/logs/AuditStatsPage";

import ProjectListPage from "@/pages/projects/ProjectListPage";
import ProjectCreatePage from "@/pages/projects/ProjectCreatePage";
import ProjectEditPage from "@/pages/projects/ProjectEditPage";

import EnvironmentListPage from "@/pages/environments/EnvironmentListPage";
import EnvironmentCreatePage from "@/pages/environments/EnvironmentCreatePage";
import EnvironmentEditPage from "@/pages/environments/EnvironmentEditPage";

import CredentialListPage from "@/pages/credentials/CredentialListPage";
import CredentialCreatePage from "@/pages/credentials/CredentialCreatePage";
import CredentialEditPage from "@/pages/credentials/CredentialEditPage";

import TaskListPage from "@/pages/tasks/TaskListPage";
import TaskCreatePage from "@/pages/tasks/TaskCreatePage";
import TaskEditPage from "@/pages/tasks/TaskEditPage";
import TaskConversationPage from "@/pages/tasks/TaskConversationPage";
import TaskConversationGitDiffPage from "@/pages/tasks/TaskConversationGitDiffPage";

import SettingsPage from "@/pages/settings/Settings";
import TaskGitDiffPage from "@/pages/tasks/TaskGitDiffPage";

import "./App.css";

function NotFoundPage() {
  const { t } = useTranslation();

  usePageTitle("common.pageTitle.notFound");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground mb-4">404</h1>
        <p className="text-muted-foreground">{t("errors.pageNotFound")}</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="xsha-ui-theme">
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DashboardPage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ProjectListPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/create"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ProjectCreatePage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:id/edit"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ProjectEditPage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/environments"
              element={
                <ProtectedRoute>
                  <Layout>
                    <EnvironmentListPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/environments/create"
              element={
                <ProtectedRoute>
                  <Layout>
                    <EnvironmentCreatePage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/environments/:id/edit"
              element={
                <ProtectedRoute>
                  <Layout>
                    <EnvironmentEditPage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/credentials"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CredentialListPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/credentials/create"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CredentialCreatePage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/credentials/:id/edit"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CredentialEditPage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/projects/:projectId/tasks"
              element={
                <ProtectedRoute>
                  <Layout>
                    <TaskListPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:projectId/tasks/create"
              element={
                <ProtectedRoute>
                  <Layout>
                    <TaskCreatePage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:projectId/tasks/:taskId/edit"
              element={
                <ProtectedRoute>
                  <Layout>
                    <TaskEditPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:projectId/tasks/:taskId/conversation"
              element={
                <ProtectedRoute>
                  <Layout>
                    <TaskConversationPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:projectId/tasks/:taskId/conversation/git-diff/:conversationId"
              element={
                <ProtectedRoute>
                  <Layout>
                    <TaskConversationGitDiffPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:projectId/tasks/:taskId/git-diff"
              element={
                <ProtectedRoute>
                  <Layout>
                    <TaskGitDiffPage />
                  </Layout>
                </ProtectedRoute>
              }
            />



            <Route
              path="/logs/operation-logs"
              element={
                <ProtectedRoute>
                  <Layout>
                    <OperationLogsPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/logs/login-logs"
              element={
                <ProtectedRoute>
                  <Layout>
                    <LoginLogsPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/logs/stats"
              element={
                <ProtectedRoute>
                  <Layout>
                    <AuditStatsPage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Layout>
                    <SettingsPage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </Router>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
