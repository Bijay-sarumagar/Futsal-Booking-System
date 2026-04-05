import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getMe, login as loginRequest, logoutSession, register as registerRequest, UserProfile } from "../lib/api";

interface AuthContextValue {
  user: UserProfile | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<UserProfile>;
  register: (payload: {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    password: string;
    password2: string;
    role: "player" | "owner";
  }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUserProfile: (profile: UserProfile) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const me = await getMe();
        if (!active) return;
        setUser(me);
        setAccessToken("cookie-session");
      } catch {
        if (!active) return;
        setUser(null);
        setAccessToken(null);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void restoreSession();

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    accessToken,
    isAuthenticated: !!user,
    isLoading,
    async login(username, password) {
      const session = await loginRequest(username, password);
      setAccessToken("cookie-session");
      setUser(session.user);
      return session.user;
    },
    async register(payload) {
      await registerRequest(payload);
    },
    logout() {
      void logoutSession();
      setAccessToken(null);
      setUser(null);
    },
    async refreshUser() {
      const me = await getMe();
      setUser(me);
    },
    setUserProfile(profile) {
      setUser(profile);
    },
  }), [user, accessToken, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
