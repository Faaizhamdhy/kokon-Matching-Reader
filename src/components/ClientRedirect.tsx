"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClientRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Jika user sudah login (ada data di localStorage), arahkan langsung ke dashboard
    const userData = localStorage.getItem("user");
    const sessionToken = localStorage.getItem("session_token");
    
    if (userData && sessionToken) {
      router.replace("/dashboard");
    }
  }, [router]);

  return null;
}
