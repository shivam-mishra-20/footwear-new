import React, { useState } from "react";
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
import Sales from "./Pages/Sales";
import Report from "./Pages/Report";
import { AuthProvider } from "./context/AuthContext";

function Logout() {
  return <h1 className="text-3xl font-bold">Logout</h1>;
}

function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex min-h-screen relative">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* Content */}
      <div className="flex-1 bg-white lg:ml-[240px]">
        {/* Topbar for mobile */}
        <div className="lg:hidden sticky top-0 z-10 bg-white border-b border-gray-200 flex items-center px-2 h-16">
          <button
            type="button"
            className="p-2"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <div className="p-2">
              <img
                src="/noble_footwear_logo.png"
                alt="Logo"
                className="w-22 h-22 object-contain"
              />
            </div>
          </button>
        </div>
        <div className="p-4 lg:p-10">{children}</div>
      </div>
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
    <AuthProvider>
      <Router>
        <App />
      </Router>
    </AuthProvider>
  );
}

export default RootApp;
