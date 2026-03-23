
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { trackLogin, trackLogout } from "@/lib/hubTracker";
import { supabase } from "@/lib/supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface User {
  id: string;
  email: string;
  name: string;
}

interface Usage {
  org_id: string;
  org_name: string;
  plan: string;
  audio_minutes_used: number;
  audio_minutes_limit: number;
  audio_minutes_remaining: number;
  usage_percentage: number;
}

interface AuthContextType {
  user: User | null;
  usage: Usage | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUsage: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  usage: null,
  token: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  refreshUsage: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const PUBLIC_PATHS = ["/login"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const [user, setUser] = useState<User | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsage = useCallback(async (accessToken: string) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/usage`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsage(data);
      }
    } catch {
      // Usage fetch failed — non-critical
    }
  }, []);

  const refreshUsage = useCallback(async () => {
    const t = localStorage.getItem("gl_token");
    if (t) await fetchUsage(t);
  }, [fetchUsage]);

  // Initialize auth from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem("gl_token");
    const savedUser = localStorage.getItem("gl_user");

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        fetchUsage(savedToken);
      } catch {
        localStorage.removeItem("gl_token");
        localStorage.removeItem("gl_user");
      }
    }
    setLoading(false);
  }, [fetchUsage]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !token && !PUBLIC_PATHS.includes(pathname)) {
      navigate("/login");
    }
  }, [loading, token, pathname, navigate]);

  const login = async (email: string, password: string) => {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !authData.session) {
      throw new Error(error?.message || "Credenciales incorrectas");
    }

    const { session, user: supaUser } = authData;

    // Transform user to expected format
    const formattedUser: User = {
      id: supaUser.id,
      email: supaUser.email || "",
      name: supaUser.user_metadata?.name || supaUser.email || "Usuario",
    };

    localStorage.setItem("gl_token", session.access_token);
    localStorage.setItem("gl_user", JSON.stringify(formattedUser));
    
    setToken(session.access_token);
    setUser(formattedUser);
    
    await fetchUsage(session.access_token);
    
    // Register login in the Hub Tracker
    trackLogin(formattedUser.id);
    
    navigate("/");
  };

  const logout = () => {
    if (user) {
      // Register logout in the Hub Tracker before clearing state
      trackLogout(user.id);
    }
    
    localStorage.removeItem("gl_token");
    localStorage.removeItem("gl_user");
    setToken(null);
    setUser(null);
    setUsage(null);
    navigate("/login");
  };

  // Don't render protected pages until auth is checked
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#F8FAFC",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#00548B",
        fontSize: 18,
        fontFamily: "'Inter', sans-serif",
        fontWeight: "bold",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏥</div>
          <div style={{ animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}>Cargando sistema...</div>
        </div>
      </div>
    );
  }

  // If on login page, render without auth check
  if (PUBLIC_PATHS.includes(pathname)) {
    return (
      <AuthContext.Provider value={{ user, usage, token, loading, login, logout, refreshUsage }}>
        {children}
      </AuthContext.Provider>
    );
  }

  // If no token and not on public path, don't render
  if (!token) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, usage, token, loading, login, logout, refreshUsage }}>
      {children}
    </AuthContext.Provider>
  );
}
