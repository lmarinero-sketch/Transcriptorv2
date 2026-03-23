
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

import { Mail, Lock, Loader2, AlertCircle, LayoutDashboard, HelpCircle, LogIn, UserPlus, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative font-sans overflow-hidden">
      {/* Top Navbar matched from Calidad */}
      <header className="absolute top-0 z-[9999] w-full px-2 sm:px-4 py-4 sm:py-6">
        <div className="max-w-6xl mx-auto bg-white rounded-2xl md:rounded-[24px] px-4 sm:px-6 md:px-8 py-3 flex justify-between items-center shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00548B] rounded-xl flex items-center justify-center">
              <img src="/logosanatorio.png" alt="Sanatorio Argentino" className="h-6 w-auto object-contain brightness-0 invert" style={{ WebkitFilter: "drop-shadow(0 0 0 white) brightness(200%)" }} />
            </div>
            <span className="font-display font-bold text-[#1e293b] text-[17px]">Inicio</span>
          </div>

          <nav className="hidden sm:flex items-center gap-1">
            <button className="flex items-center gap-2 px-4 py-2 text-[#64748b] font-bold text-[14px] hover:text-[#00548B] hover:bg-[#f8fafc] rounded-xl transition-all">
              <LayoutDashboard className="w-4 h-4" /> Seguimiento
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-[#64748b] font-bold text-[14px] hover:text-[#00548B] hover:bg-[#f8fafc] rounded-xl transition-all">
              <HelpCircle className="w-4 h-4" /> Guía
            </button>

            <div className="w-px h-6 bg-gray-200 mx-2"></div>

            <button className="flex items-center gap-2 px-5 py-2.5 bg-[#f8fafc] text-[#00548B] hover:bg-[#f1f5f9] rounded-xl font-bold text-[14px] transition-all border border-gray-200 shadow-sm ml-2">
              <LogIn className="w-4 h-4" /> Ingresar
            </button>
          </nav>
        </div>
      </header>
      
      {/* Background with explicit style to match Sanarg2021 reference exactly */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-[0.12]"
        style={{ backgroundImage: "url('/SANARG2021_fondo de pantalla.jpg')" }}
      />
      <div className="fixed inset-0 z-0 bg-[#f8fafc]/90 backdrop-blur-[1px]" />

      {/* Login Card */}
      <div className="relative z-10 mx-4 w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-10 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Cabecera / Logo */}
        <div className="text-center mb-8">
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
                <img src="/logosanatorio.png" alt="Sanatorio Argentino" className="w-14 h-14 object-contain" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Acceso Administrativo</h2>
            <p className="text-sm text-gray-500 mt-2">Transcriptor de Reuniones IA</p>
        </div>

        {/* Banner de error (Condicional) */}
        {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700 text-sm animate-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
            </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
                <label className="label-text">Correo Electrónico</label>
                <div className="relative">
                    <input
                        type="email"
                        required
                        className="input-field"
                        style={{ paddingLeft: '3.5rem' }}
                        placeholder="ejemplo@sanatorio.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5 pointer-events-none" />
                </div>
            </div>

            <div className="space-y-2">
                <label className="label-text">Contraseña</label>
                <div className="relative">
                    <input
                        type="password"
                        required
                        className="input-field"
                        style={{ paddingLeft: '3.5rem' }}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5 pointer-events-none" />
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#00548B] text-white rounded-xl font-bold text-lg hover:bg-[#004270] transition-all flex items-center justify-center shadow-lg shadow-[#00548B]/20 disabled:opacity-70"
            >
                {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                    "Iniciar Sesión"
                )}
            </button>
        </form>

        {/* Enlaces y utilidades en el pie */}
        <div className="mt-6 text-center space-y-3">
            <p className="text-sm text-gray-500">
                ¿No tenés cuenta?{' '}
                <button type="button" className="text-[#00548B] font-bold hover:underline inline-flex items-center gap-1">
                    <UserPlus className="w-3.5 h-3.5" /> Registrate
                </button>
            </p>
            <button
                type="button"
                className="text-sm text-gray-400 hover:text-[#00548B] flex items-center gap-2 mx-auto transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Volver al Formulario Público
            </button>
        </div>
      </div>
    </div>
  );
}
