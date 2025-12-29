import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

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
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
      <div className="flex flex-col items-center gap-4">
        {/* Animated logo/spinner */}
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-rose-400 animate-spin" />
          <div
            className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-r-purple-400 animate-spin"
            style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
          />
        </div>
        <p className="text-white/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Loading...
        </p>
      </div>
    </div>
  );
}

export default ProtectedRoute;
