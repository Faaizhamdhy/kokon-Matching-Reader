"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// ===== SVG Icons =====
const IconClock = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 6v6l4 2"/>
  </svg>
);
const IconBook = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
  </svg>
);
const IconLayers = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
  </svg>
);
const IconSearch = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
  </svg>
);
const IconWarning = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
  </svg>
);
const IconDna = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H7a2 2 0 00-2 2v1c0 2.21 1.34 4.12 3.27 4.77M15 3h2a2 2 0 012 2v1c0 2.21-1.34 4.12-3.27 4.77M9 21H7a2 2 0 01-2-2v-1c0-2.21 1.34-4.12 3.27-4.77M15 21h2a2 2 0 002-2v-1c0-2.21-1.34-4.12-3.27-4.77M9 3c1 2 1 6-1 9s-2 7-1 9M15 3c-1 2-1 6 1 9s2 7 1 9"/>
  </svg>
);

// ===== Stat Card =====
function StatCard({ label, value, unit, icon, accent }: { label: string; value: number | string; unit?: string; icon: React.ReactNode; accent: string }) {
  return (
    <div className="bg-konmik-dark border border-white/5 rounded-2xl p-4 flex flex-col gap-3 hover:border-white/10 transition-colors">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium mb-0.5">{label}</p>
        <p className="text-2xl font-black text-white leading-none">
          {value}
          {unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [targetUsername, setTargetUsername] = useState("");
  const [isMatching, setIsMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        fetch(`/api/user-stats?username=${parsedUser.username}`)
          .then(res => res.json())
          .then(data => { if (data.success) setUserStats(data.data); })
          .catch(e => console.error("Failed to fetch user stats", e));
      } catch (e) {
        console.error("Invalid user data");
      }
    } else {
      router.push("/");
    }
  }, [router]);

  const handleMatchmaking = async () => {
    if (!targetUsername.trim() || !user) return;
    setIsMatching(true);
    setErrorMsg("");
    setMatchResult(null);
    try {
      const token = localStorage.getItem("session_token");
      const res = await fetch("/api/matchmaking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ self_username: user.username, target_username: targetUsername.trim() }),
      });
      const data = await res.json();
      if (data.success) setMatchResult(data.data);
      else setErrorMsg(data.message);
    } catch {
      setErrorMsg("Koneksi gagal.");
    } finally {
      setIsMatching(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-konmik-darker">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Selamat datang, <span className="text-konmik-primary">{userStats?.display_name || user.username}</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Dashboard aktivitas membaca kamu</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ===== Left Column: Profile + Stats ===== */}
          <div className="flex flex-col gap-5">

            {/* Profile Card */}
            <div className="bg-konmik-card border border-white/5 rounded-2xl overflow-hidden">
              {/* Banner */}
              <div className="h-20 bg-gradient-to-br from-konmik-primary/20 to-purple-900/30 relative overflow-hidden">
                {userStats?.banner_url && (
                  <img src={userStats.banner_url} alt="Banner" className="w-full h-full object-cover opacity-60" />
                )}
              </div>
              {/* Avatar & Info */}
              <div className="px-5 pb-5 relative z-10">
                <div className="flex items-end gap-3 -mt-8 mb-3">
                  <div className="w-16 h-16 rounded-2xl border-2 border-konmik-card overflow-hidden bg-konmik-dark ring-2 ring-konmik-primary/30 flex-shrink-0 relative">
                    {userStats?.profile_url ? (
                      <img src={userStats.profile_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-konmik-primary text-xl font-black">
                        {(userStats?.display_name || user.username || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <h2 className="text-white font-bold text-base leading-tight">
                  {userStats?.display_name || user.username}
                </h2>
                <p className="text-xs text-konmik-primary/70 mt-0.5 capitalize">{userStats?.role || 'Member'}</p>
                {userStats?.selected_tags && (() => {
                  let tags: string[] = [];
                  try {
                    tags = Array.isArray(userStats.selected_tags)
                      ? userStats.selected_tags
                      : JSON.parse(userStats.selected_tags);
                  } catch { tags = userStats.selected_tags.split(',').map((t: string) => t.trim()); }
                  return tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {tags.slice(0, 3).map((tag: string, i: number) => (
                        <span key={i} className="text-[10px] bg-konmik-primary/10 border border-konmik-primary/20 text-konmik-primary px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  ) : null;
                })()}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Menit Baca"
                value={userStats?.minutes ?? 0}
                unit="mnt"
                icon={<IconClock />}
                accent="bg-konmik-primary/15 text-konmik-primary"
              />
              <StatCard
                label="Chapter"
                value={userStats?.chapters ?? 0}
                icon={<IconLayers />}
                accent="bg-green-500/15 text-green-400"
              />
              <div className="col-span-2">
                <StatCard
                  label="Komik Dibaca"
                  value={userStats?.comics ?? 0}
                  icon={<IconBook />}
                  accent="bg-blue-500/15 text-blue-400"
                />
              </div>
            </div>
          </div>

          {/* ===== Middle/Right: Matchmaking ===== */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            <div className="bg-konmik-card border border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col flex-1">
              {/* Subtle glow */}
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-konmik-primary/10 rounded-full blur-[60px] pointer-events-none" />

              {/* Header */}
              <div className="flex items-start gap-3 mb-2 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-konmik-primary/10 border border-konmik-primary/20 flex items-center justify-center text-konmik-primary flex-shrink-0">
                  <IconDna />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Reading Matchmaking</h2>
                  <p className="text-gray-500 text-sm">Cek kecocokan selera komik dengan teman</p>
                </div>
              </div>

              {/* Input */}
              <div className="flex gap-3 mt-5 relative z-10">
                <div className="flex-1 relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <IconSearch />
                  </div>
                  <input
                    type="text"
                    placeholder="Masukkan username teman..."
                    value={targetUsername}
                    onChange={e => setTargetUsername(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleMatchmaking()}
                    className="w-full bg-konmik-dark border border-white/8 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-konmik-primary/50 focus:ring-1 focus:ring-konmik-primary/20 transition-all"
                  />
                </div>
                <button
                  onClick={handleMatchmaking}
                  disabled={isMatching || !targetUsername.trim()}
                  className="bg-konmik-primary hover:bg-konmik-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
                >
                  {isMatching ? "Analisa..." : "Cari"}
                </button>
              </div>

              {errorMsg && (
                <div className="mt-3 flex items-center gap-2 text-red-400 text-sm bg-red-500/8 border border-red-500/20 rounded-xl px-3 py-2 relative z-10">
                  <IconWarning /> {errorMsg}
                </div>
              )}

              {/* Result or Idle */}
              <div className="mt-6 flex-1 flex flex-col relative z-10">
                {!matchResult ? (
                  <div className="flex flex-col items-center justify-center flex-1 py-16 text-center">
                    {isMatching ? (
                      <>
                        <div className="w-12 h-12 border-2 border-konmik-primary/30 border-t-konmik-primary rounded-full animate-spin mb-4" />
                        <p className="text-gray-500 text-sm">Menganalisa kecocokan membaca...</p>
                      </>
                    ) : (
                      <>
                        <div className="w-14 h-14 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center text-gray-600 mb-4">
                          <IconDna />
                        </div>
                        <p className="text-gray-500 text-sm max-w-xs">Masukkan username teman untuk melihat tingkat kecocokan selera komik kalian.</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-5 animate-fade-in">
                    {/* Score Section */}
                    <div className={`flex flex-col items-center p-6 rounded-2xl border ${matchResult.is_rival ? 'border-red-500/25 bg-red-500/5' : 'border-white/5 bg-konmik-dark/50'}`}>

                      <p className={`text-xs font-bold uppercase tracking-[0.2em] mb-2 ${matchResult.is_rival ? 'text-red-400' : 'text-gray-500'}`}>
                        {matchResult.is_rival ? 'RIVAL MEMBACA' : 'MATCH RESULT'}
                      </p>

                      {/* VS Section — responsive layout */}
                      <div className="w-full mb-4">
                        {/* Mobile: column layout | Desktop: row layout */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">

                          {/* Self User Card */}
                          <div className="flex flex-col items-start gap-2 bg-konmik-dark/90 p-3 rounded-2xl border border-white/8 w-full sm:w-auto sm:min-w-[150px] sm:max-w-[190px] overflow-hidden relative">
                            {userStats?.banner_url && (
                              <div className="absolute inset-0 z-0">
                                <img src={userStats.banner_url} alt="" className="w-full h-full object-cover opacity-20" />
                                <div className="absolute inset-0 bg-gradient-to-r from-konmik-dark/70 to-transparent" />
                              </div>
                            )}
                            <div className="flex items-center gap-2 z-10 w-full">
                              <div className="w-9 h-9 rounded-full border border-purple-500/50 overflow-hidden bg-konmik-dark flex-shrink-0">
                                {user?.profile_url ? (
                                  <img src={user.profile_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-purple-400 text-sm font-bold">{(user?.display_name || 'U').charAt(0).toUpperCase()}</div>
                                )}
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Kamu</p>
                                <p className="text-xs font-bold text-white truncate max-w-[110px]">{user?.display_name || user?.username}</p>
                              </div>
                            </div>
                            {(() => {
                              let tags: string[] = [];
                              try {
                                if (Array.isArray(userStats?.selected_tags)) tags = userStats.selected_tags;
                                else if (typeof userStats?.selected_tags === 'string') tags = JSON.parse(userStats.selected_tags);
                              } catch { tags = []; }
                              return tags.length > 0 ? (
                                <div className="flex flex-wrap gap-1 z-10 w-full">
                                  {tags.slice(0, 2).map((t: string, i: number) => (
                                    <span key={i} className="text-[9px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full border border-purple-500/30">{t}</span>
                                  ))}
                                </div>
                              ) : null;
                            })()}
                          </div>

                          {/* Donut Chart */}
                          <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex-shrink-0">
                            <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90 drop-shadow-2xl">
                              <circle cx="80" cy="80" r="60" fill="none" stroke="#ffffff06" strokeWidth="16"/>
                              <circle cx="80" cy="80" r="60" fill="none" stroke="#3b82f6" strokeWidth="16"
                                strokeDasharray={`${((matchResult.score_breakdown?.habit || 0) / 100) * 377} 377`}
                                strokeDashoffset={-((((matchResult.score_breakdown?.genre || 0) + (matchResult.score_breakdown?.comic || 0)) / 100) * 377)}
                                strokeLinecap="round" className="transition-all duration-[2000ms] ease-out"/>
                              <circle cx="80" cy="80" r="60" fill="none" stroke="#10b981" strokeWidth="16"
                                strokeDasharray={`${((matchResult.score_breakdown?.comic || 0) / 100) * 377} 377`}
                                strokeDashoffset={-(((matchResult.score_breakdown?.genre || 0) / 100) * 377)}
                                strokeLinecap="round" className="transition-all duration-[1500ms] ease-out"/>
                              <circle cx="80" cy="80" r="60" fill="none" stroke={matchResult.is_rival ? "#ef4444" : "#a855f7"} strokeWidth="16"
                                strokeDasharray={`${((matchResult.score_breakdown?.genre || 0) / 100) * 377} 377`}
                                strokeDashoffset="0"
                                strokeLinecap="round" className="transition-all duration-[1000ms] ease-out"/>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className={`text-4xl sm:text-5xl font-black ${matchResult.is_rival ? 'text-red-400' : 'text-white'}`}>
                                {matchResult.score || 0}%
                              </span>
                            </div>
                          </div>

                          {/* Target User Card */}
                          <div className="flex flex-col items-end gap-2 bg-konmik-dark/90 p-3 rounded-2xl border border-white/8 w-full sm:w-auto sm:min-w-[150px] sm:max-w-[190px] overflow-hidden relative">
                            {matchResult.target_user?.banner_url && (
                              <div className="absolute inset-0 z-0">
                                <img src={matchResult.target_user.banner_url} alt="" className="w-full h-full object-cover opacity-20" />
                                <div className="absolute inset-0 bg-gradient-to-l from-konmik-dark/70 to-transparent" />
                              </div>
                            )}
                            <div className="flex items-center gap-2 z-10 w-full justify-end">
                              <div className="text-right">
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Teman</p>
                                <p className="text-xs font-bold text-white truncate max-w-[110px]">{matchResult.target_user?.display_name || targetUsername}</p>
                              </div>
                              <div className="w-9 h-9 rounded-full border border-konmik-primary/50 overflow-hidden bg-konmik-dark flex-shrink-0">
                                {matchResult.target_user?.profile_url ? (
                                  <img src={matchResult.target_user.profile_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-konmik-primary text-sm font-bold">{targetUsername.charAt(0).toUpperCase()}</div>
                                )}
                              </div>
                            </div>
                            {(() => {
                              let tags: string[] = [];
                              try {
                                if (Array.isArray(matchResult.target_user?.selected_tags)) tags = matchResult.target_user.selected_tags;
                                else if (typeof matchResult.target_user?.selected_tags === 'string') tags = JSON.parse(matchResult.target_user.selected_tags);
                              } catch { tags = []; }
                              return tags.length > 0 ? (
                                <div className="flex flex-wrap justify-end gap-1 z-10 w-full">
                                  {tags.slice(0, 2).map((t: string, i: number) => (
                                    <span key={i} className="text-[9px] bg-konmik-primary/20 text-konmik-primary px-1.5 py-0.5 rounded-full border border-konmik-primary/30">{t}</span>
                                  ))}
                                </div>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="flex flex-wrap justify-center gap-4 text-[11px] text-gray-500 font-medium mb-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${matchResult.is_rival ? 'bg-red-500' : 'bg-purple-500'}`}/>
                          Genre ({matchResult.score_breakdown?.genre || 0}%)
                        </div>
                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500"/>Judul ({matchResult.score_breakdown?.comic || 0}%)</div>
                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"/>Habit ({matchResult.score_breakdown?.habit || 0}%)</div>
                      </div>

                      <p className="text-gray-400 text-sm text-center max-w-sm bg-white/3 border border-white/5 px-4 py-3 rounded-xl italic">
                        "{matchResult.message}"
                      </p>

                      {matchResult.is_private && (
                        <div className="mt-3 flex items-center gap-2 text-yellow-500/80 text-xs bg-yellow-500/8 border border-yellow-500/15 px-3 py-2 rounded-lg max-w-sm text-center">
                          <IconWarning /> Riwayat baca teman diprivate — skor dihitung dari kebiasaan dan profil saja.
                        </div>
                      )}
                    </div>

                    {/* Profiles Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { label: 'Waktu Aktif Teman', value: matchResult.profiles?.time, color: 'text-blue-400', tip: 'Jam paling sering teman membaca komik.' },
                        { label: 'Tipe Pembaca Teman', value: matchResult.profiles?.type, color: 'text-green-400', tip: 'Berdasarkan rata-rata chapter per komik.' },
                        { label: 'Obsesi 7 Hari Teman', value: matchResult.profiles?.obsession?.startsWith('🔒') ? matchResult.profiles.obsession : matchResult.profiles?.obsession, color: 'text-orange-400', tip: 'Genre yang paling banyak dibaca dalam 7 hari terakhir.' },
                      ].map((item, i) => (
                        <div key={i} className="bg-konmik-dark border border-white/5 rounded-xl p-4 text-center group relative cursor-help hover:border-white/10 transition-colors">
                          <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold mb-2">{item.label}</p>
                          <p className={`font-bold text-sm ${item.color}`}>{item.value || '—'}</p>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 border border-white/10 text-xs text-gray-300 p-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl text-center">
                            {item.tip}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Reading Time Comparison (Radar Chart) */}
                    <div className="bg-konmik-dark border border-white/5 rounded-xl p-4 my-4 flex flex-col items-center">
                      <h4 className="text-xs text-gray-600 uppercase tracking-widest font-semibold flex items-center gap-2 mb-2 w-full">
                        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"/> Distribusi Waktu Baca
                      </h4>
                      <p className="text-[10px] text-gray-500 mb-4 w-full">Radar kebiasaan membaca: <span className="text-blue-400 font-bold">Kamu</span> vs <span className="text-red-400 font-bold">{matchResult.target_user?.display_name || targetUsername}</span></p>
                      
                      <div className="relative w-64 h-64">
                        <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
                          {/* Pentagon background grid */}
                          {[1, 0.75, 0.5, 0.25].map((scale, i) => {
                            const r = 80 * scale;
                            const pts = [
                              {x: 0, y: -1}, {x: 0.951, y: -0.309}, {x: 0.588, y: 0.809}, {x: -0.588, y: 0.809}, {x: -0.951, y: -0.309}
                            ].map(p => `${100 + p.x * r},${100 + p.y * r}`).join(" ");
                            return <polygon key={i} points={pts} fill="none" stroke="#ffffff15" strokeWidth="1" />;
                          })}
                          
                          {/* Axis lines */}
                          {[
                            {x: 0, y: -1}, {x: 0.951, y: -0.309}, {x: 0.588, y: 0.809}, {x: -0.588, y: 0.809}, {x: -0.951, y: -0.309}
                          ].map((p, i) => (
                            <line key={i} x1="100" y1="100" x2={100 + p.x * 80} y2={100 + p.y * 80} stroke="#ffffff15" strokeWidth="1" />
                          ))}

                          {/* Labels */}
                          <text x="100" y="10" fill="#9ca3af" fontSize="10" textAnchor="middle" fontWeight="bold">Pagi</text>
                          <text x="195" y="75" fill="#9ca3af" fontSize="10" textAnchor="start" fontWeight="bold">Siang</text>
                          <text x="155" y="195" fill="#9ca3af" fontSize="10" textAnchor="middle" fontWeight="bold">Sore</text>
                          <text x="45" y="195" fill="#9ca3af" fontSize="10" textAnchor="middle" fontWeight="bold">Malam</text>
                          <text x="5" y="75" fill="#9ca3af" fontSize="10" textAnchor="end" fontWeight="bold">Dini Hari</text>

                          {/* Target User Polygon (Red) */}
                          {matchResult.habit?.target_time_dist && (
                            <polygon 
                              points={matchResult.habit.target_time_dist.map((p: number, i: number) => {
                                const r = Math.max((p / 100) * 80, 5);
                                const angles = [{x: 0, y: -1}, {x: 0.951, y: -0.309}, {x: 0.588, y: 0.809}, {x: -0.588, y: 0.809}, {x: -0.951, y: -0.309}];
                                return `${100 + angles[i].x * r},${100 + angles[i].y * r}`;
                              }).join(" ")}
                              fill="rgba(239, 68, 68, 0.2)" 
                              stroke="#ef4444" 
                              strokeWidth="2" 
                              className="transition-all duration-1000"
                            />
                          )}

                          {/* Self User Polygon (Blue) */}
                          {matchResult.habit?.self_time_dist && (
                            <polygon 
                              points={matchResult.habit.self_time_dist.map((p: number, i: number) => {
                                const r = Math.max((p / 100) * 80, 5);
                                const angles = [{x: 0, y: -1}, {x: 0.951, y: -0.309}, {x: 0.588, y: 0.809}, {x: -0.588, y: 0.809}, {x: -0.951, y: -0.309}];
                                return `${100 + angles[i].x * r},${100 + angles[i].y * r}`;
                              }).join(" ")}
                              fill="rgba(59, 130, 246, 0.4)" 
                              stroke="#3b82f6" 
                              strokeWidth="2" 
                              className="transition-all duration-1000"
                            />
                          )}
                        </svg>
                      </div>
                    </div>

                    {/* Common Genres & Comics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-konmik-dark border border-white/5 rounded-xl p-4">
                        <h4 className="text-xs text-gray-600 uppercase tracking-widest font-semibold flex items-center gap-2 mb-3">
                          <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0"/> Genre Favorit Sama
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {matchResult.common_genres?.length > 0 ? (
                            matchResult.common_genres.map((g: any, i: number) => (
                              <span key={i} className="bg-purple-500/15 border border-purple-500/25 text-purple-400 px-2.5 py-1 rounded-full text-xs capitalize">
                                {g.genre} <span className="opacity-60">({g.count})</span>
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-600 text-xs">Tidak ada genre yang sama.</span>
                          )}
                        </div>
                      </div>

                      <div className="bg-konmik-dark border border-white/5 rounded-xl p-4">
                        <h4 className="text-xs text-gray-600 uppercase tracking-widest font-semibold flex items-center gap-2 mb-3">
                          <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"/> Sama-sama Dibaca
                        </h4>
                        <div className="flex flex-col gap-2 max-h-36 overflow-y-auto pr-1">
                          {matchResult.common_comics?.length > 0 ? (
                            matchResult.common_comics.map((comic: any, i: number) => (
                              <div key={i} className="flex items-center gap-2.5 bg-white/3 hover:bg-white/6 transition-colors p-2 rounded-lg">
                                <div className="w-8 h-8 rounded-md bg-konmik-card overflow-hidden flex-shrink-0">
                                  {comic.cover_url && <img src={comic.cover_url} alt="" className="w-full h-full object-cover" />}
                                </div>
                                <p className="text-xs text-gray-300 line-clamp-1">{comic.title}</p>
                              </div>
                            ))
                          ) : (
                            <span className="text-gray-600 text-xs">Tidak ada komik yang sama.</span>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
