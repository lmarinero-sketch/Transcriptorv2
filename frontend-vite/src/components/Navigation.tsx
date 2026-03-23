
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Home, Mic, Upload, Clock, Gem, LogOut } from "lucide-react";

export default function Navigation() {
  const location = useLocation();
  const pathname = location.pathname;
  const { user, logout } = useAuth();

  const links = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/record", label: "Grabar", icon: Mic },
    { href: "/upload", label: "Subir Audio", icon: Upload },
    { href: "/history", label: "Historial", icon: Clock },
    { href: "/planes", label: "Planes", icon: Gem },
  ];

  return (
    <>
      {/* ═══ FLOATING GLASS NAVBAR (Desktop + Mobile) ═══ */}
      <header className="sticky top-0 z-[9999] w-full px-2 sm:px-4 py-2 sm:py-3">
        <div className="max-w-7xl mx-auto bg-white/85 backdrop-blur-xl rounded-2xl md:rounded-3xl px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 flex items-center justify-between shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-white/60 transition-all duration-300">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 sm:gap-3 group shrink-0">
            <img
              src="/logosanatorio.png"
              alt="Sanatorio Argentino"
              className="h-8 sm:h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            />
            <span className="font-display font-bold text-slate-700 text-[15px] sm:text-lg group-hover:text-sanatorio-primary transition-colors hidden sm:block">
              Inicio
            </span>
          </Link>

          {/* Links — scrollable en mobile */}
          <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto scrollbar-hide mx-2 sm:mx-4 flex-1 justify-center">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-xl text-[12px] sm:text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? "text-sanatorio-primary bg-[#00548B]/5"
                      : "text-slate-500 hover:text-sanatorio-primary hover:bg-[#00548B]/5"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden md:inline">{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right side — Logout */}
          <div className="flex items-center gap-2 shrink-0">
            {user && (
              <button
                onClick={logout}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-xl font-bold text-[12px] sm:text-sm transition-all"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
