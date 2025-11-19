import React from "react";
import { Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

export default ProtectedRoute;
