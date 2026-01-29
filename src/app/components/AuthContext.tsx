"use client";

import type { User } from "@/lib/types";
import type { ReactNode } from "react";
import { createContext, useContext } from "react";

const AuthUserContext = createContext<User | null>(null);

export function AuthUserProvider({ user, children }: { user: User; children: ReactNode }) {
  return <AuthUserContext.Provider value={user}>{children}</AuthUserContext.Provider>;
}

export function useAuthUser(): User {
  const user = useContext(AuthUserContext);
  if (!user) {
    throw new Error("useAuthUser must be used within <AuthUserProvider />");
  }
  return user;
}

export function useOptionalAuthUser(): User | null {
  return useContext(AuthUserContext);
}

