import { Routes, Route, Navigate } from "react-router"
import { useAuth } from "./context/AuthContext"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Claims from "./pages/Claims"
import Layout from "./components/Layout"
import NewClaim from "./pages/NewClaim"
import ViewClaim from "./pages/ViewClaim"
import AdminLayout from "./components/AdminLayout"
import AuditorDashboard from "./pages/admin/AuditorDashboard"
import AuditDetail from "./pages/admin/AuditDetail"
import PolicyManagement from "./pages/admin/PolicyManagement"

function ProtectedRoute({ children, allowedRole }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user?.role !== allowedRole) {
    return <Navigate to={user?.role === "auditor" ? "/admin" : "/"} replace />;
  }

  return children;
}

function App() {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      {/* Auth routes */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to={user?.role === "auditor" ? "/admin" : "/"} replace />
          ) : (
            <Login />
          )
        }
      />
      <Route
        path="/register"
        element={
          isAuthenticated ? (
            <Navigate to={user?.role === "auditor" ? "/admin" : "/"} replace />
          ) : (
            <Register />
          )
        }
      />

      {/* Employee routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute allowedRole="employee">
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Claims />} />
        <Route path="createclaim" element={<NewClaim />} />
        <Route path="view/:id" element={<ViewClaim />} />
      </Route>

      {/* Admin/Auditor routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="auditor">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AuditorDashboard />} />
        <Route path="claim/:id" element={<AuditDetail />} />
        <Route path="policies" element={<PolicyManagement />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App
