import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type UserRole = "admin" | "moderator" | "earner" | "seeker";

type AuthContextShape = {
  user: { id: string } | null;
  loading: boolean;
  profile?: { user_type?: "seeker" | "earner" } | null;
  roles?: string[] | null;
  hasRole?: (role: string) => boolean;
};

interface BaseRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

interface RoleRouteProps extends BaseRouteProps {
  allowedRoles?: UserRole[];
  requireAll?: boolean;
}

export function ProtectedRoute({ children, redirectTo = "/auth" }: BaseRouteProps) {
  const { user, loading } = useAuth() as AuthContextShape;
  const location = useLocation();

  if (loading) return <LoadingScreen />;

  if (!user) {
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <>{children}</>;
}

export function RoleProtectedRoute({
  children,
  allowedRoles = [],
  requireAll = false,
  redirectTo = "/unauthorized",
}: RoleRouteProps) {
  const { user, loading, profile, roles, hasRole } = useAuth() as AuthContextShape;
  const location = useLocation();

  if (loading) return <LoadingScreen />;

  if (!user) {
    return (
      <Navigate
        to="/auth"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (!allowedRoles.length) return <>{children}</>;

  const can = (role: UserRole) => {
    // Earner/Seeker are driven by profile.user_type
    if (role === "earner" || role === "seeker") {
      return profile?.user_type === role;
    }

    // Admin/Moderator can come from hasRole() or roles[]
    if (typeof hasRole === "function") return hasRole(role);

    if (Array.isArray(roles)) return roles.includes(role);

    return false;
  };

  const hasAccess = requireAll ? allowedRoles.every(can) : allowedRoles.some(can);

  if (!hasAccess) {
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{
          from: location.pathname + location.search,
          reason: "role",
          required: allowedRoles,
        }}
      />
    );
  }

  return <>{children}</>;
}

// Convenience wrappers
export function AdminRoute({ children, redirectTo = "/unauthorized" }: BaseRouteProps) {
  return (
    <RoleProtectedRoute allowedRoles={["admin"]} redirectTo={redirectTo}>
      {children}
    </RoleProtectedRoute>
  );
}

export function AdminOrModeratorRoute({
  children,
  redirectTo = "/unauthorized",
}: BaseRouteProps) {
  return (
    <RoleProtectedRoute allowedRoles={["admin", "moderator"]} redirectTo={redirectTo}>
      {children}
    </RoleProtectedRoute>
  );
}

export function EarnerRoute({ children, redirectTo = "/dashboard" }: BaseRouteProps) {
  return (
    <RoleProtectedRoute allowedRoles={["earner"]} redirectTo={redirectTo}>
      {children}
    </RoleProtectedRoute>
  );
}

export function SeekerRoute({ children, redirectTo = "/dashboard" }: BaseRouteProps) {
  return (
    <RoleProtectedRoute allowedRoles={["seeker"]} redirectTo={redirectTo}>
      {children}
    </RoleProtectedRoute>
  );
}

/**
 * Redirect authenticated users away from public pages (like /auth)
 */
export function PublicOnlyRoute({ children, redirectTo = "/dashboard" }: BaseRouteProps) {
  const { user, loading } = useAuth() as AuthContextShape;

  if (loading) return <LoadingScreen />;

  if (user) return <Navigate to={redirectTo} replace />;

  return <>{children}</>;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
      <div className="flex flex-col items-center gap-4">
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