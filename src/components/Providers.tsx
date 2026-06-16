"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";

export function Providers({ children }: { children: React.ReactNode }) {
  // Provide a dummy client ID during Vercel build if the env var is not yet configured, 
  // otherwise it will crash the build because GoogleLogin requires the provider context.
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "missing_google_client_id";

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {children}
    </GoogleOAuthProvider>
  );
}
