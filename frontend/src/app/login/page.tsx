"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import { Mail, Lock, Loader2, AlertCircle } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center relative font-sans">
      
      {/* Background with explicit style to match Sanarg2021 reference exactly */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-[0.12]"
        style={{ backgroundImage: "url('/SANARG2021_fondo de pantalla.jpg')" }}
      />
      <div className="fixed inset-0 z-0 bg-[#f8fafc]/90 backdrop-blur-[1px]" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-[0_8px_32px_0_rgba(0,84,139,0.08)] border border-gray-100 p-8 md:p-10 mx-4">
        
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] border border-gray-100">
            <Image 
              src="/logosanatorio.png" 
              alt="Sanatorio Argentino" 
              width={56} 
              height={56} 
              className="object-contain"
            />
          </div>
          <h2 className="!text-[24px] !font-bold !text-[#002B4A] font-display !leading-tight !mb-0 tracking-tight">Acceso Administrativo</h2>
          <p className="!text-[14px] !text-[#64748b] !mt-2 !mb-0 font-medium">Transcriptor de Reuniones IA</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[13px] font-bold text-[#64748b] uppercase tracking-wider mb-2 ml-1">Correo Electrónico</label>
            <div className="relative">
              <input
                type="email"
                required
                className="w-full border border-gray-200 rounded-2xl text-[#1e293b] placeholder-gray-400 focus:outline-none focus:border-[#00548B] focus:ring-4 focus:ring-[#00548B]/10 transition-all text-[15px] font-medium bg-white"
                style={{ height: '56px', padding: '0 16px 0 56px' }}
                placeholder="ejemplo@sanatorio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-[#94a3b8] w-5 h-5 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[13px] font-bold text-[#64748b] uppercase tracking-wider mb-2 ml-1">Contraseña</label>
            <div className="relative">
              <input
                type="password"
                required
                className="w-full border border-gray-200 rounded-2xl text-[#1e293b] placeholder-gray-400 focus:outline-none focus:border-[#00548B] focus:ring-4 focus:ring-[#00548B]/10 transition-all text-[15px] bg-white tracking-[0.2em] font-medium"
                style={{ height: '56px', padding: '0 16px 0 56px' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-[#94a3b8] w-5 h-5 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00548B] text-white rounded-xl font-bold text-[17px] hover:bg-[#004270] transition-all flex items-center justify-center shadow-[0_8px_20px_-8px_rgba(0,84,139,0.5)] disabled:opacity-70 !mt-8"
            style={{ height: '56px' }}
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              "Iniciar Sesión"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
