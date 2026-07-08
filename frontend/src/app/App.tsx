import { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { AuthTokenRedirect } from '@/app/AuthTokenRedirect';
import { RequireAuth } from '@/app/RequireAuth';
import { RequireGuest } from '@/app/RequireGuest';
import { AppLayout } from '@/app/layouts/AppLayout';
import { TitleSync } from '@/app/TitleSync';

const ComponentsDemoPage = lazy(() =>
  import('@/pages/demo/ComponentsDemoPage').then((module) => ({ default: module.ComponentsDemoPage })),
);
const ConfirmEmailPage = lazy(() =>
  import('@/pages/auth/ConfirmEmailPage').then((module) => ({ default: module.ConfirmEmailPage })),
);
const DashboardPage = lazy(() =>
  import('@/pages/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })),
);
const ErrorPage = lazy(() =>
  import('@/pages/error/ErrorPage').then((module) => ({ default: module.ErrorPage })),
);
const FlowPage = lazy(() =>
  import('@/pages/flow/FlowPage').then((module) => ({ default: module.FlowPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('@/pages/auth/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })),
);
const HomePage = lazy(() =>
  import('@/pages/home/HomePage').then((module) => ({ default: module.HomePage })),
);
const LoadingPage = lazy(() =>
  import('@/pages/loading/LoadingPage').then((module) => ({ default: module.LoadingPage })),
);
const LoginPage = lazy(() =>
  import('@/pages/auth/LoginPage').then((module) => ({ default: module.LoginPage })),
);
const OAuthCallbackPage = lazy(() =>
  import('@/pages/auth/OAuthCallbackPage').then((module) => ({ default: module.OAuthCallbackPage })),
);
const NotFoundPage = lazy(() =>
  import('@/pages/not-found/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
);
const ProfilePage = lazy(() =>
  import('@/pages/profile/ProfilePage').then((module) => ({ default: module.ProfilePage })),
);
const ProjectPage = lazy(() =>
  import('@/pages/project/ProjectPage').then((module) => ({ default: module.ProjectPage })),
);
const ResetPasswordPage = lazy(() =>
  import('@/pages/auth/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })),
);
const ServicePagesDemoPage = lazy(() =>
  import('@/pages/service/ServicePagesDemoPage').then((module) => ({ default: module.ServicePagesDemoPage })),
);
const TaskPage = lazy(() =>
  import('@/pages/task/TaskPage').then((module) => ({ default: module.TaskPage })),
);
const WidgetsDemoPage = lazy(() =>
  import('@/pages/widgets/WidgetsDemoPage').then((module) => ({ default: module.WidgetsDemoPage })),
);

function RouteLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center text-body-md text-[color:var(--color-text-secondary)]">
      Загрузка...
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthTokenRedirect />
      <TitleSync />
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route element={<RequireGuest />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<LoginPage initialTab="register" />} />
            <Route path="/oauth/:provider/callback" element={<OAuthCallbackPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/confirm-email" element={<ConfirmEmailPage />} />
            <Route path="/confirm-email/:token" element={<ConfirmEmailPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          </Route>
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="/error" element={<ErrorPage />} />
          <Route path="/loading" element={<LoadingPage />} />
          <Route path="*" element={<NotFoundPage />} />

          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/demo" element={<ComponentsDemoPage />} />
            <Route path="/widgets" element={<WidgetsDemoPage />} />
            <Route path="/service-pages" element={<ServicePagesDemoPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/flow" element={<FlowPage />} />
              <Route path="/project/:projectId" element={<ProjectPage />} />
              <Route path="/task/:taskId" element={<TaskPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
