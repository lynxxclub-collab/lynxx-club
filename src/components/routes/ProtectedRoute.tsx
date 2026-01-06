import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type UserRole = "admin" | "moderator" | "earner" | "seeker";

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

interface RoleProtectedRouteProps extends ProtectedRouteProps {
  allowedRoles?: UserRole[];
  requireAll?: boolean;
}

/**
 * Protects routes that require authentication
 * Redirects to /auth if not logged in
 */
export function ProtectedRoute({ children, redirectTo = "/auth" }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

/**
 * Protects routes that require specific roles
 * Redirects to /unauthorized or custom path if user doesn't have required role
 */
export function RoleProtectedRoute({
  children,
  allowedRoles = [],
  requireAll = false,
  redirectTo = "/unauthorized",
}: RoleProtectedRouteProps) {
  const { user, loading, profile, roles = [], hasRole } = useAuth() as any;
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check role access
  if (allowedRoles.length > 0) {
    const checkRole = (role: UserRole) => {
      // Check user_type for earner/seeker
      if (role === "earner" || role === "seeker") {
        return profile?.user_type === role;
      }
      // Check roles array for admin/moderator (if available)
      if (hasRole) {
        return hasRole(role);
      }
      if (roles && Array.isArray(roles)) {
        return roles.includes(role);
      }
      return false;
    };

    const hasAccess = requireAll ? allowedRoles.every(checkRole) : allowedRoles.some(checkRole);

    if (!hasAccess) {
      return <Navigate to={redirectTo} replace />;
    }
  }

  return <>{children}</>;
}

/**
 * Admin-only route protection
 */
export function AdminRoute({ children, redirectTo = "/unauthorized" }: ProtectedRouteProps) {
  return (
    <RoleProtectedRoute allowedRoles={["admin"]} redirectTo={redirectTo}>
      {children}
    </RoleProtectedRoute>
  );
}

/**
 * Admin or Moderator route protection
 */
export function AdminOrModeratorRoute({ children, redirectTo = "/unauthorized" }: ProtectedRouteProps) {
  return (
    <RoleProtectedRoute allowedRoles={["admin", "moderator"]} redirectTo={redirectTo}>
      {children}
    </RoleProtectedRoute>
  );
}

/**
 * Earner-only route protection
 */
export function EarnerRoute({ children, redirectTo = "/dashboard" }: ProtectedRouteProps) {
  return (
    <RoleProtectedRoute allowedRoles={["earner"]} redirectTo={redirectTo}>
      {children}
    </RoleProtectedRoute>
  );
}

/**
 * Seeker-only route protection
 */
export function SeekerRoute({ children, redirectTo = "/dashboard" }: ProtectedRouteProps) {
  return (
    <RoleProtectedRoute allowedRoles={["seeker"]} redirectTo={redirectTo}>
      {children}
    </RoleProtectedRoute>
  );
}

/**
 * Redirect authenticated users away from public pages (like /auth)
 */
export function PublicOnlyRoute({ children, redirectTo = "/dashboard" }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (user) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

/**
 * Loading screen component - matches your premium dark theme
 */
function LoadingScreen() {
  return (
    <div 
      className="min-h-[100dvh] flex items-center justify-center bg-[#0a0a0f] relative overflow-hidden"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Ambient Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Custom Dual-Ring Spinner */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          {/* Outer Ring */}
          <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-white/5 border-t-rose-500/80 animate-spin" />
          
          {/* Inner Ring (Reverse) */}
          <div className="absolute inset-2 w-12 h-12 rounded-full border-2 border-white/5 border-b-purple-500/80 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          
          {/* Core Glow */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)] animate-pulse" />
          </div>
        </div>

        {/* Loading Text */}
        <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] animate-pulse">
          Loading Experience...
        </p>
      </div>
    </div>
  );
}

export default ProtectedRoute;