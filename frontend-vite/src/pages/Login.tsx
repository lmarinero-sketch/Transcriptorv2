
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Mail, Lock, Loader2, AlertCircle, LogIn, UserPlus, ArrowLeft } from "lucide-react";

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
    <div className="min-h-screen flex flex-col relative font-sans overflow-hidden">
      
      {/* ═══ FLOATING GLASS NAVBAR ═══ */}
      <header className="sticky top-0 z-[9999] w-full px-2 sm:px-4 py-2 sm:py-3">
        <div className="max-w-7xl mx-auto bg-white/85 backdrop-blur-xl rounded-2xl md:rounded-3xl px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 flex items-center justify-between shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-white/60 transition-all duration-300">
          <div className="flex items-center gap-2 sm:gap-3">
            <img
              src="/logosanatorio.png"
              alt="Sanatorio Argentino"
              className="h-8 sm:h-10 w-auto object-contain"
            />
            <span className="font-display font-bold text-slate-700 text-[15px] sm:text-lg">Inicio</span>
          </div>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-slate-50 text-sanatorio-primary hover:bg-slate-100 rounded-xl font-bold text-[13px] sm:text-sm transition-all border border-slate-200 shadow-sm">
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Ingresar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-[0.08]"
        style={{ backgroundImage: "url('/SANARG2021_fondo de pantalla.jpg')" }}
      />
      <div className="fixed inset-0 z-0 bg-[#f8fafc]/90 backdrop-blur-[1px]" />

      {/* Login Card — centered */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-10 animate-in fade-in zoom-in-95 duration-500">
          
          {/* Cabecera / Logo */}
          <div className="text-center mb-8">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
                  <img src="/logosanatorio.png" alt="Sanatorio Argentino" className="w-14 h-14 object-contain" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Acceso Administrativo</h2>
              <p className="text-sm text-gray-500 mt-2">Transcriptor de Reuniones IA</p>
          </div>

          {/* Banner de error */}
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
                  className="w-full py-4 bg-sanatorio-primary text-white rounded-xl font-bold text-lg hover:bg-[#004270] transition-all flex items-center justify-center shadow-lg shadow-sanatorio-primary/20 disabled:opacity-70"
              >
                  {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                      "Iniciar Sesión"
                  )}
              </button>
          </form>

          {/* Enlaces pie */}
          <div className="mt-6 text-center space-y-3">
              <p className="text-sm text-gray-500">
                  ¿No tenés cuenta?{' '}
                  <button type="button" className="text-sanatorio-primary font-bold hover:underline inline-flex items-center gap-1">
                      <UserPlus className="w-3.5 h-3.5" /> Registrate
                  </button>
              </p>
              <button
                  type="button"
                  className="text-sm text-gray-400 hover:text-sanatorio-primary flex items-center gap-2 mx-auto transition-colors"
              >
                  <ArrowLeft className="w-4 h-4" />
                  Volver al Formulario Público
              </button>
          </div>
        </div>
      </div>
    </div>
  );
}
