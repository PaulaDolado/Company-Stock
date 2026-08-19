import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  findUserByCredentials,
  getSession,
  setSession,
  clearSession,
  type DbUser,
} from "@/lib/mock-db";

export const APP_NAME = "Company Stock";

export type SessionUser = {
  id: string;
  nombre: string;
  email: string;
  iniciales: string;
  departamento: string;
  role: "SOLICITANTE" | "GESTION" | "ADMIN";
};

/** Mapea el rol a un nombre de departamento legible en la UI. */
function departamentoFromRole(role: string): string {
  switch (role) {
    case "GESTION":
      return "Gestión";
    case "ADMIN":
      return "Administración";
    default:
      return "Solicitante";
  }
}

function iniciales(nombre: string): string {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function toSessionUser(user: DbUser): SessionUser {
  return {
    id: user.id,
    nombre: user.name,
    email: user.email,
    iniciales: iniciales(user.name),
    departamento: departamentoFromRole(user.role),
    role: user.role,
  };
}

type AuthContextValue = {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Sustituye a Supabase Auth: no hay backend ni JWT, la "sesión" es solo el
// id del usuario demo guardado en localStorage (ver lib/mock-db.ts). Se lee
// de forma síncrona al montar, así que no hay un estado de carga real, pero
// se mantiene isLoading en la firma para no tocar los componentes que ya
// esperan este contrato (AppShell, Login...).
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => {
    const existing = getSession();
    return existing ? toSessionUser(existing) : null;
  });

  const login = useCallback(async (email: string, password: string) => {
    const found = findUserByCredentials(email, password);
    if (!found) {
      return { ok: false, error: "Correo o contraseña incorrectos" };
    }
    setSession(found.id);
    setUser(toSessionUser(found));
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    clearSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, isLoading: false, login, logout }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
