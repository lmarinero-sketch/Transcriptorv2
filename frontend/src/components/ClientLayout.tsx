"use client";

import { usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Navigation from "@/components/Navigation";
import UsageBanner from "@/components/UsageBanner";
import Footer from "@/components/Footer";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <>
      {token && <Navigation />}
      {token && <UsageBanner />}
      {children}
      {token && <Footer />}
    </>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LayoutContent>{children}</LayoutContent>
    </AuthProvider>
  );
}
