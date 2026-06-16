"use client";

import { GoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function GoogleLoginButton() {
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleSuccess = async (credentialResponse: any) => {
    try {
      setErrorMsg("");
      const res = await fetch(`/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: credentialResponse.credential }),
      });

      const data = await res.json();
      if (data.success) {
        // Save token (e.g., in localStorage or cookies)
        localStorage.setItem("session_token", data.token);
        localStorage.setItem("user", JSON.stringify(data.data));
        window.dispatchEvent(new Event("auth_changed"));
        // Redirect to dashboard
        router.push("/dashboard");
      } else {
        setErrorMsg(data.message || "Gagal login ke server");
      }
    } catch (error) {
      console.error("API error:", error);
      setErrorMsg("Terjadi kesalahan jaringan.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="w-full bg-white rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] transition-all overflow-hidden flex justify-center py-1">
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => setErrorMsg("Google Login gagal.")}
          theme="filled_black"
          shape="circle"
          text="continue_with"
          size="large"
        />
      </div>
      {errorMsg && <p className="text-red-400 mt-2 text-sm">{errorMsg}</p>}
    </div>
  );
}
