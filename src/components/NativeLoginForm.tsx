"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NativeLoginForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const url = isLogin ? "/api/login" : "/api/register";
    const payload = isLogin 
      ? { identifier, password } 
      : { email, username, password };

    try {
      const res = await fetch(`${url}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        if (isLogin) {
          localStorage.setItem("session_token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          window.dispatchEvent(new Event("auth_changed"));
          router.push("/dashboard");
        } else {
          setSuccessMsg("Pendaftaran berhasil! Silakan login.");
          setIsLogin(true);
          setPassword("");
        }
      } else {
        setErrorMsg(data.message || "Terjadi kesalahan.");
      }
    } catch (error) {
      console.error("API error:", error);
      setErrorMsg("Koneksi ke server gagal. Pastikan API backend berjalan.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-konmik-card rounded-2xl p-6 shadow-xl border border-white/5">
      <h2 className="text-2xl font-display font-semibold mb-6 text-center text-white">
        {isLogin ? "Masuk ke KonMik" : "Daftar Akun Baru"}
      </h2>
      
      {errorMsg && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-4">{errorMsg}</div>}
      {successMsg && <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-3 rounded-lg text-sm mb-4">{successMsg}</div>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!isLogin && (
          <input 
            type="email" 
            placeholder="Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-konmik-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-konmik-primary transition-colors"
            required
          />
        )}
        
        <input 
          type="text" 
          placeholder={isLogin ? "Username atau Email" : "Username"} 
          value={isLogin ? identifier : username}
          onChange={(e) => isLogin ? setIdentifier(e.target.value) : setUsername(e.target.value)}
          className="bg-konmik-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-konmik-primary transition-colors"
          required
        />
        
        <input 
          type="password" 
          placeholder="Password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-konmik-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-konmik-primary transition-colors"
          required
        />

        <button 
          type="submit" 
          disabled={isLoading}
          className="bg-konmik-primary hover:bg-konmik-primary-hover text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 mt-2"
        >
          {isLoading ? "Memproses..." : (isLogin ? "Masuk" : "Daftar")}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button 
          onClick={() => { setIsLogin(!isLogin); setErrorMsg(""); setSuccessMsg(""); }}
          className="text-gray-400 hover:text-white text-sm transition-colors"
        >
          {isLogin ? "Belum punya akun? Daftar di sini" : "Sudah punya akun? Masuk"}
        </button>
      </div>
    </div>
  );
}
