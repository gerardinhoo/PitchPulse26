import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AppErrorBoundary from "./components/AppErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Spinner from "./components/Spinner";

const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Matches = lazy(() => import("./pages/Matches"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const AdminResults = lazy(() => import("./pages/AdminResults"));
const NotFound = lazy(() => import("./pages/NotFound"));
const GroupsPage = lazy(() => import("./pages/GroupsPage"));
const Rules = lazy(() => import("./pages/Rules"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const UnsubscribeReminders = lazy(() => import("./pages/UnsubscribeReminders"));

export default function App() {
  return (
    <BrowserRouter>
      <AppErrorBoundary>
        <AuthProvider>
          <Layout>
            <Suspense fallback={<Spinner className="min-h-[50vh]" />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/unsubscribe-reminders" element={<UnsubscribeReminders />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/rules" element={<Rules />} />
                <Route path="/groups" element={<GroupsPage />} />
                <Route path="/groups/:groupId" element={<GroupsPage />} />
                <Route
                  path="/matches"
                  element={
                    <ProtectedRoute>
                      <Matches />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/results"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminResults />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </Layout>
        </AuthProvider>
      </AppErrorBoundary>
    </BrowserRouter>
  );
}
