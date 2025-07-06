import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router";
import Sidebar from "./Pages/Sidebar";
import "./App.css";
import ProtectedRoute from "./Pages/ProtectedRoute";
import Login from "./Pages/Login";
import Inventory from "./Pages/Inventory";
import Dashboard from "./Pages/Dashboard";

function Sales() {
  return <h1 className="text-3xl font-bold">Sales</h1>;
}
function Report() {
  return <h1 className="text-3xl font-bold">Report</h1>;
}
function Logout() {
  return <h1 className="text-3xl font-bold">Logout</h1>;
}

function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 bg-white p-10">{children}</div>
    </div>
  );
}

function App() {
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";
  return isLoginPage ? (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  ) : (
    <AppLayout>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <ProtectedRoute>
              <Inventory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales"
          element={
            <ProtectedRoute>
              <Sales />
            </ProtectedRoute>
          }
        />
        <Route
          path="/report"
          element={
            <ProtectedRoute>
              <Report />
            </ProtectedRoute>
          }
        />
        <Route path="/logout" element={<Logout />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AppLayout>
  );
}

function RootApp() {
  return (
    <Router>
      <App />
    </Router>
  );
}

export default RootApp;
