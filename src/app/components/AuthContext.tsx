"use client";

import type { User } from "@/lib/types";
import type { ReactNode } from "react";
import { createContext, useContext } from "react";

const AuthUserContext = createContext<User | null>(null);

// Safe default user to prevent crashes
const DEFAULT_USER: User = {
  username: "Guest",
  role: "Staff",
};

export function AuthUserProvider({ user, children }: { user: User; children: ReactNode }) {
  return <AuthUserContext.Provider value={user}>{children}</AuthUserContext.Provider>;
}

export function useAuthUser(): User {
  const user = useContext(AuthUserContext);
  // Return safe default instead of throwing to prevent app crashes
  if (!user) {
    console.warn("[AuthContext] useAuthUser called without provider, returning default user");
    return DEFAULT_USER;
  }
  return user;
}

export function useOptionalAuthUser(): User | null {
  return useContext(AuthUserContext);
}

export function useAuthStatus(): { isAuthenticated: boolean; user: User } {
  const user = useContext(AuthUserContext);
  return {
    isAuthenticated: !!user,
    user: user || DEFAULT_USER,
  };
}
