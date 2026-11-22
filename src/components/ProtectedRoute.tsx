import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-56 bg-slate-200 rounded-lg" />
          <div className="h-4 w-80 bg-slate-200 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="h-40 bg-slate-200 rounded-xl" />
            <div className="h-40 bg-slate-200 rounded-xl" />
            <div className="h-40 bg-slate-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
