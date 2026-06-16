import Image from "next/image";
import Link from "next/link";
import { GoogleLoginButton } from "@/components/GoogleLoginButton";
import { NativeLoginForm } from "@/components/NativeLoginForm";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col lg:flex-row">

      {/* ── LEFT HERO PANEL ───────────────────────────────────────────── */}
      <div className="relative lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 py-20 overflow-hidden">

        {/* Background gradient blobs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(179,136,255,0.12) 0%, transparent 70%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -right-8 w-[360px] h-[360px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(0,229,255,0.08) 0%, transparent 70%)",
          }}
        />

        {/* Pill badge */}
        <div className="relative z-10 inline-flex w-fit items-center gap-2 bg-konmik-primary/10 border border-konmik-primary/20 text-konmik-primary text-xs px-3 py-1 rounded-full mb-6 font-medium">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 3l14 9-14 9V3z"
            />
          </svg>
          Platform Baca Komik #1
        </div>

        {/* Main heading */}
        <h1 className="relative z-10 font-display font-black text-4xl sm:text-6xl tracking-tight leading-tight text-white mb-4">
          Baca lebih,{" "}
          <br />
          <span
            className="text-transparent bg-clip-text"
            style={{
              backgroundImage:
                "linear-gradient(90deg, #B388FF 0%, #00E5FF 100%)",
            }}
          >
            rasakan lebih.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="relative z-10 text-gray-400 text-base sm:text-lg max-w-sm mt-4 mb-8 font-sans leading-relaxed">
          Temukan komik favoritmu, lacak statistik bacamu, dan cari tahu
          kecocokan selera dengan teman-teman.
        </p>

        {/* Feature chips */}
        <div className="relative z-10 flex flex-wrap gap-2 mb-8">
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-konmik-primary inline-block" />
            Statistik Baca
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            Reading Matchmaking
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
            Leaderboard
          </span>
        </div>

        {/* CTA ghost button */}
        <div className="relative z-10">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 border border-white/15 hover:border-white/30 text-gray-300 hover:text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Jelajahi Tanpa Login
          </Link>
        </div>
      </div>

      {/* ── RIGHT LOGIN PANEL ─────────────────────────────────────────── */}
      <div className="lg:w-1/2 flex flex-col justify-center items-center px-6 sm:px-12 py-16 bg-konmik-card/50 border-l border-white/5">

        {/* Wordmark */}
        <p className="font-display font-black text-sm tracking-widest text-gray-500 uppercase mb-8 letter-spacing-widest">
          KonMik
        </p>

        {/* Heading */}
        <h2 className="font-display font-bold text-xl text-white mb-8 text-center">
          Selamat datang kembali
        </h2>

        {/* Login form */}
        <div className="w-full max-w-sm">
          <NativeLoginForm />

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-600 font-medium">ATAU</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Google login */}
          <GoogleLoginButton />

          {/* Footer note */}
          <p className="text-xs text-gray-600 text-center mt-6 leading-relaxed">
            Dengan mendaftar, kamu menyetujui syarat penggunaan.
          </p>
        </div>
      </div>

    </main>
  );
}
