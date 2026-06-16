"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ProfileContent() {
  const [user, setUser] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [relationships, setRelationships] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [relActionLoading, setRelActionLoading] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [selectedRelId, setSelectedRelId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  
  const [radarMatchData, setRadarMatchData] = useState<{self: number[], target: number[]}|null>(null);
  const [loversMatchData, setLoversMatchData] = useState<{score: number}|null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUsername = searchParams.get("u") || user?.username || "";

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/");
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    const currentUserToFetch = searchParams.get("u") || parsedUser.username;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("session_token");
        const headers: Record<string, string> = token ? { "Authorization": `Bearer ${token}` } : {};
        
        // Fetch profile
        const res = await fetch(`/api/profile?username=${encodeURIComponent(currentUserToFetch)}`, { headers });
        const json = await res.json();
        if (json.success) {
          setProfileData(json.data);
        } else {
          setProfileData(null);
        }

        // Fetch relationships (Bypass cache)
        const relRes = await fetch(`/api/relationships/${encodeURIComponent(currentUserToFetch)}?t=${Date.now()}`, { headers, cache: 'no-store' });
        const relJson = await relRes.json();
        if (relJson.success) {
          setRelationships(relJson);
          if (relJson.accepted?.length > 0) {
            setSelectedRelId(relJson.accepted[0].id);
          }
        } else {
          setRelationships({ accepted: [], pending_incoming: [], pending_outgoing: [] });
        }
      } catch (err) {
        console.error("Failed to fetch profile/relationships", err);
        setProfileData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router, searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/profile?u=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const handleRelAction = async (requestId: number, action: 'accept' | 'reject' | 'remove') => {
    setRelActionLoading(true);
    try {
      const token = localStorage.getItem("session_token");
      const res = await fetch("/api/relationships/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ request_id: requestId, action })
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message, "success");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showToast(json.message, "error");
      }
    } catch (e) {
      showToast("Terjadi kesalahan jaringan.", "error");
    } finally {
      setRelActionLoading(false);
    }
  };

  const handleSendRequest = async (relationType: string) => {
    if (!user) {
      showToast("Harap login terlebih dahulu.", "error");
      return;
    }
    setRelActionLoading(true);
    try {
      const token = localStorage.getItem("session_token");
      const res = await fetch("/api/relationships/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ target_username: targetUsername, relation_type: relationType })
      });
      const json = await res.json();
      if (json.success) {
        showToast("Request berhasil dikirim!", "success");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showToast(json.message, "error");
      }
    } catch (e) {
      showToast("Terjadi kesalahan jaringan.", "error");
    } finally {
      setRelActionLoading(false);
    }
  };

  const handleRemoveRelationship = async (relId: number) => {
    setConfirmDeleteId(null);
    setRelActionLoading(true);
    try {
      const token = localStorage.getItem("session_token");
      const res = await fetch("/api/relationships/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ request_id: relId, action: 'remove' })
      });
      const json = await res.json();
      if (json.success) {
        showToast("Hubungan berhasil diputuskan.", "success");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showToast(json.message, "error");
      }
    } catch (e) {
      showToast("Terjadi kesalahan jaringan.", "error");
    } finally {
      setRelActionLoading(false);
    }
  };

  // Fetch Matchmaking for Radar Chart
  useEffect(() => {
    if (!selectedRelId || !relationships?.accepted) return;
    const rel = relationships.accepted.find((r: any) => r.id === selectedRelId);
    if (!rel) return;
    
    const fetchRadar = async () => {
      setRadarMatchData(null); // Show loading when switching
      try {
        const token = localStorage.getItem("session_token");
        const res = await fetch("/api/matchmaking", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ self_username: targetUsername, target_username: rel.user })
        });
        const json = await res.json();
        if (json.success) {
          setRadarMatchData({ self: json.data.habit?.self_time_dist || [0,0,0,0,0], target: json.data.habit?.target_time_dist || [0,0,0,0,0] });
        } else {
          showToast(json.message || "Gagal memuat data matchmaking.", "error");
          setRadarMatchData({ self: [0,0,0,0,0], target: [0,0,0,0,0] });
        }
      } catch (e) {
        console.error(e);
        showToast("Terjadi kesalahan koneksi.", "error");
        setRadarMatchData({ self: [0,0,0,0,0], target: [0,0,0,0,0] });
      }
    };
    if (targetUsername) fetchRadar();
  }, [selectedRelId, relationships, targetUsername]);

  // Fetch Matchmaking for Lovers Box
  useEffect(() => {
    if (!relationships?.accepted) return;
    const lover = relationships.accepted.find((r: any) => r.relation_type === 'lovers');
    if (!lover) return;
    
    const fetchLover = async () => {
      try {
        const token = localStorage.getItem("session_token");
        const res = await fetch("/api/matchmaking", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ self_username: targetUsername, target_username: lover.user })
        });
        const json = await res.json();
        if (json.success) {
          setLoversMatchData({ score: json.data.score });
        } else {
          setLoversMatchData({ score: 0 });
        }
      } catch (e) {
        console.error(e);
        setLoversMatchData({ score: 0 });
      }
    };
    if (targetUsername) fetchLover();
  }, [relationships, targetUsername]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-konmik-dark">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-konmik-primary/30 border-t-konmik-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Memuat profil...</p>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-konmik-dark text-white">
        <div className="text-xl text-red-500">Gagal memuat profil.</div>
      </div>
    );
  }

  const maxTime = Math.max(...profileData.metrics.time_distribution, 1);
  const { stats, metrics, profiles, recent_history, advanced_metrics } = profileData;

  // Process selected tags
  let tags: string[] = [];
  if (stats.selected_tags) {
    if (Array.isArray(stats.selected_tags)) {
      tags = stats.selected_tags;
    } else if (typeof stats.selected_tags === 'string') {
      try { tags = JSON.parse(stats.selected_tags); } 
      catch(e) { tags = stats.selected_tags.split(',').map((t: string) => t.trim()); }
    }
  }

  // Format Join Date
  const joinDateStr = advanced_metrics?.created_at ? new Date(advanced_metrics.created_at).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : '';

  return (
    <>
      {/* Custom Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)}></div>
          <div className="bg-konmik-card border border-white/10 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10 flex flex-col items-center text-center transform scale-100 transition-all">
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-white mb-2">Putuskan Hubungan?</h3>
            <p className="text-sm text-gray-400 mb-8">Apakah kamu yakin ingin menghapus ikatan ini? Semua data matchmaking kalian akan direset dan tindakan ini tidak bisa dibatalkan.</p>
            <div className="flex w-full gap-3">
              <button 
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 transition-all"
              >
                Batal
              </button>
              <button 
                onClick={() => handleRemoveRelationship(confirmDeleteId)}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all"
              >
                Ya, Putuskan
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-konmik-darker text-white pb-20 animate-fade-in relative">
      {/* Global Toast Notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-fade-in">
          <div className={`flex items-center gap-3 px-6 py-3 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-md border ${
            toast.type === 'success' 
              ? 'bg-green-500/20 border-green-500/50 text-green-300' 
              : 'bg-red-500/20 border-red-500/50 text-red-300'
          }`}>
            {toast.type === 'success' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
            <span className="font-bold text-sm tracking-wide">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header / Banner */}
      <div className="relative h-64 md:h-80 w-full overflow-hidden">
        {stats.banner_url ? (
          <img src={stats.banner_url} alt="Banner" className="w-full h-full object-cover opacity-60" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-konmik-primary/40 to-purple-900/40"></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-konmik-darker via-konmik-darker/50 to-transparent"></div>
        
        {/* Share Button */}
        <button 
          onClick={() => {
            const shareUrl = `${window.location.origin}/profile?u=${encodeURIComponent(targetUsername)}`;
            navigator.clipboard.writeText(shareUrl);
            showToast("Tautan profil disalin!", "success");
          }}
          className="absolute top-6 right-6 sm:top-8 sm:right-8 z-10 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-[0_4px_15px_rgba(0,0,0,0.5)] hover:scale-105"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Bagikan
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative -mt-24 sm:-mt-32">
        
        {/* Special Lovers Section */}
        {relationships?.accepted?.find((r: any) => r.relation_type === 'lovers') && (
          <div className="mb-10 w-full animate-fade-in z-30 relative">
            {(() => {
              const lover = relationships.accepted.find((r: any) => r.relation_type === 'lovers');
              return (
                <div className="bg-gradient-to-r from-pink-900/40 via-rose-900/40 to-pink-900/40 border border-pink-500/40 rounded-3xl p-6 shadow-[0_0_40px_rgba(236,72,153,0.2)] flex flex-col items-center justify-center relative overflow-hidden backdrop-blur-xl">
                  {/* Decorative background overlay */}
                  <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-pink-500/10 to-transparent mix-blend-screen pointer-events-none"></div>
                  
                  <h3 className="text-pink-300 font-black tracking-widest uppercase text-xs mb-6 flex items-center gap-2 drop-shadow-md z-10">
                    <span className="animate-pulse">💕</span> Ikatan Spesial <span className="animate-pulse">💕</span>
                  </h3>
                  
                  <div className="flex items-center justify-center gap-6 sm:gap-16 relative z-10 w-full max-w-2xl">
                    {/* User */}
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-pink-400 shadow-[0_0_25px_rgba(236,72,153,0.5)] cursor-pointer hover:scale-105 transition-transform bg-konmik-dark flex items-center justify-center text-3xl font-black text-konmik-primary" onClick={() => router.push(`/profile?u=${targetUsername}`)}>
                        {stats.profile_url ? (
                          <img src={stats.profile_url} alt="Self" className="w-full h-full object-cover" />
                        ) : (
                          (stats.display_name?.charAt(0).toUpperCase() || targetUsername.charAt(0).toUpperCase() || 'U')
                        )}
                      </div>
                      <span className="mt-3 text-sm sm:text-base font-bold text-white max-w-[120px] truncate text-center drop-shadow-md">{stats.display_name || targetUsername}</span>
                    </div>

                    {/* Glowing Heart & Percentage */}
                    <div className="relative flex items-center justify-center group hover:scale-110 transition-transform cursor-pointer">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-24 h-24 sm:w-32 sm:h-32 text-pink-500 drop-shadow-[0_0_20px_rgba(236,72,153,0.8)] animate-[pulse_2s_ease-in-out_infinite]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center flex-col pt-1">
                        <span className="text-white font-black text-xl sm:text-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                          {loversMatchData ? `${loversMatchData.score}%` : '...'}
                        </span>
                        <span className="text-[9px] sm:text-[11px] text-pink-100 uppercase tracking-wider font-bold drop-shadow-md">Kecocokan</span>
                      </div>
                    </div>

                    {/* Lover */}
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-pink-400 shadow-[0_0_25px_rgba(236,72,153,0.5)] cursor-pointer hover:scale-105 transition-transform bg-konmik-dark flex items-center justify-center text-3xl font-black text-pink-300" onClick={() => router.push(`/profile?u=${lover.user}`)}>
                        {lover.profile_url ? (
                          <img src={lover.profile_url} alt="Lover" className="w-full h-full object-cover" />
                        ) : (
                          lover.display_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="mt-3 text-sm sm:text-base font-bold text-white max-w-[120px] truncate text-center drop-shadow-md">{lover.display_name}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Search Bar */}
        <div className="flex justify-end mb-4 z-20 relative">
          <form onSubmit={handleSearch} className="relative w-full sm:w-auto sm:min-w-[300px]">
            <input 
              type="text" 
              placeholder="Cari Username Lain..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-konmik-darker/80 backdrop-blur-md border border-white/20 rounded-full py-2.5 px-5 pl-12 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-konmik-primary shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
            />
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-konmik-primary hover:bg-purple-600 text-white rounded-full px-4 py-1.5 text-xs font-bold transition-colors shadow-lg">
              Cari
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: User Info & Base Stats */}
          <div className="flex flex-col gap-6">
            {/* Avatar & Name Card */}
            <div className="bg-konmik-card rounded-3xl p-6 pt-16 border border-white/5 shadow-2xl backdrop-blur-sm relative group mt-16 sm:mt-20">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-konmik-primary to-purple-500 rounded-t-3xl"></div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-konmik-darker overflow-hidden bg-konmik-dark shadow-[0_0_30px_rgba(168,85,247,0.3)] -translate-y-1/2 z-10">
                {stats.profile_url ? (
                  <img src={stats.profile_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-black text-konmik-primary">
                    {stats.display_name?.charAt(0).toUpperCase() || targetUsername.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              
              <div className="text-center z-10 relative">
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 drop-shadow-md">{stats.display_name || targetUsername}</h1>
                <p className="text-gray-400 text-sm mb-2">@{targetUsername}</p>
                {joinDateStr && <p className="text-xs text-konmik-primary/80 mb-4 bg-konmik-primary/10 inline-block px-3 py-1 rounded-full">Bergabung sejak {joinDateStr}</p>}
                
                {tags.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    {tags.map((tag: string, i: number) => (
                      <span key={i} className="text-xs font-semibold bg-konmik-primary/20 border border-konmik-primary/50 text-konmik-primary px-3 py-1 rounded-full shadow-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Accepted Relationships Badges */}
                {relationships?.accepted?.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 mb-6 border-t border-white/5 pt-4">
                    {relationships.accepted.map((rel: any) => {
                      const icons: any = { lovers: "💕", partners: "🤝", bestie: "👯", rival: "⚔️" };
                      const bgColors: any = { lovers: "bg-pink-500/20 text-pink-400 border-pink-500/30", partners: "bg-blue-500/20 text-blue-400 border-blue-500/30", bestie: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", rival: "bg-red-500/20 text-red-400 border-red-500/30" };
                      return (
                        <div key={rel.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${bgColors[rel.relation_type] || "bg-gray-500/20 text-gray-400 border-gray-500/30"}`}>
                          <span>{icons[rel.relation_type] || "📌"}</span>
                          <span className="uppercase tracking-wider">{rel.relation_type}</span>
                          <span className="w-1 h-1 rounded-full bg-current opacity-50 mx-1"></span>
                          <span className="text-white cursor-pointer hover:underline" onClick={() => router.push(`/profile?u=${rel.user}`)}>{rel.display_name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Request Relationship Button (If visiting someone else) */}
                {user && user.username !== targetUsername && (() => {
                  const existingRel = relationships?.accepted?.find((r: any) => r.user.toLowerCase() === user.username.toLowerCase());
                  
                  if (existingRel) {
                    return (
                      <div className="flex flex-col items-center gap-3 mb-6 border-t border-white/5 pt-5 mt-2">
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Kelola Hubungan</span>
                        <button onClick={() => setConfirmDeleteId(existingRel.id)} disabled={relActionLoading} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:scale-105 transition-all">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" /></svg>
                          Putuskan Hubungan ({existingRel.relation_type})
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col items-center gap-3 mb-6 border-t border-white/5 pt-5 mt-2">
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Kirim Request Hubungan</span>
                      <div className="flex flex-wrap justify-center gap-2">
                        <button onClick={() => handleSendRequest('lovers')} disabled={relActionLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20 hover:bg-pink-500/20 hover:scale-105 transition-all">
                          <span>💕</span> Lovers
                        </button>
                        <button onClick={() => handleSendRequest('partners')} disabled={relActionLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 hover:scale-105 transition-all">
                          <span>🤝</span> Partners
                        </button>
                        <button onClick={() => handleSendRequest('bestie')} disabled={relActionLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 hover:scale-105 transition-all">
                          <span>👯</span> Bestie
                        </button>
                        <button onClick={() => handleSendRequest('rival')} disabled={relActionLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:scale-105 transition-all">
                          <span>⚔️</span> Rival
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-white/5 pt-6">
                <div className="text-center">
                  <p className="text-2xl sm:text-3xl font-black text-white">{metrics.total_comics}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-semibold">Komik Dibaca</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl sm:text-3xl font-black text-white">{metrics.total_chapters}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-semibold">Chapter</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl sm:text-3xl font-black text-white">
                    {advanced_metrics?.total_minutes > 60 ? `${Math.floor(advanced_metrics.total_minutes / 60)}j` : `${advanced_metrics?.total_minutes || 0}m`}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-semibold">Waktu Baca</p>
                </div>
                <div className="text-center">
                  {targetUsername === user?.username ? (
                    <p className="text-2xl sm:text-3xl font-black text-white">{advanced_metrics?.total_bookmarks || 0}</p>
                  ) : (
                    <div className="flex justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path strokeLinecap="round" d="M7 11V7a5 5 0 0110 0v4"/>
                      </svg>
                    </div>
                  )}
                  <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-semibold">Koleksi</p>
                </div>
              </div>
            </div>

            {/* Profile Titles */}
            <div className="bg-konmik-card rounded-3xl p-6 border border-white/5 shadow-xl hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-shadow">
              <h3 className="text-sm text-gray-400 uppercase tracking-widest font-bold mb-4">Gelar & Kebiasaan</h3>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-300 font-medium text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 6v6l4 2"/></svg>
                    Waktu Aktif
                  </div>
                  <span className="font-semibold text-blue-400 text-sm">{profiles.time}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-300 font-medium text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4l3 3"/></svg>
                    Obsesi 7 Hari
                  </div>
                  <span className="font-semibold text-purple-400 text-sm">{profiles.obsession ? `#${profiles.obsession}` : '—'}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-300 font-medium text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                    Tipe Pembaca
                  </div>
                  <span className="font-semibold text-green-400 text-sm">{profiles.type}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-300 font-medium text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"/><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"/></svg>
                    Reading Streak
                  </div>
                  <span className="font-bold text-orange-400 text-sm">{advanced_metrics?.true_streak || 0} Hari</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-300 font-medium text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                    Komentar
                  </div>
                  <span className="font-semibold text-pink-400 text-sm">{advanced_metrics?.total_comments || 0}</span>
                </div>
              </div>
            </div>

            {/* Relationships Inbox (Only if viewing own profile) */}
            {user && user.username === targetUsername && relationships && (relationships.pending_incoming?.length > 0 || relationships.pending_outgoing?.length > 0) && (
              <div className="bg-konmik-card rounded-3xl p-6 border border-white/5 shadow-xl hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-shadow">
                <h3 className="text-sm text-gray-400 uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-pink-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                  Request Hubungan
                </h3>
                <div className="space-y-3">
                  {relationships.pending_incoming?.map((rel: any) => (
                    <div key={rel.id} className="p-3 bg-white/5 rounded-xl border border-white/10 flex flex-col gap-2 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-pink-500/10 to-transparent rounded-bl-full pointer-events-none"></div>
                      <div className="flex justify-between items-center z-10">
                        <span className="text-sm font-bold text-white cursor-pointer hover:underline" onClick={() => router.push(`/profile?u=${rel.user}`)}>{rel.display_name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-konmik-primary/20 text-konmik-primary uppercase font-bold tracking-wider border border-konmik-primary/30">{rel.relation_type}</span>
                      </div>
                      <p className="text-xs text-gray-400 z-10">Ingin menjalin hubungan sebagai <span className="text-white font-semibold">{rel.relation_type}</span>.</p>
                      <div className="flex gap-2 mt-1 z-10">
                        <button onClick={() => handleRelAction(rel.id, 'accept')} disabled={relActionLoading} className="flex-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/40 hover:to-emerald-500/40 border border-green-500/30 text-green-400 text-xs py-1.5 rounded-lg font-bold transition-all">Terima</button>
                        <button onClick={() => handleRelAction(rel.id, 'reject')} disabled={relActionLoading} className="flex-1 bg-gradient-to-r from-red-500/20 to-rose-500/20 hover:from-red-500/40 hover:to-rose-500/40 border border-red-500/30 text-red-400 text-xs py-1.5 rounded-lg font-bold transition-all">Tolak</button>
                      </div>
                    </div>
                  ))}
                  {relationships.pending_outgoing?.map((rel: any) => (
                    <div key={rel.id} className="p-3 bg-white/5 rounded-xl border border-white/10 flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-300">Menunggu respon:</span>
                        <span className="text-sm font-bold text-white cursor-pointer hover:underline" onClick={() => router.push(`/profile?u=${rel.user}`)}>{rel.display_name}</span>
                        <span className="text-[10px] text-konmik-primary mt-0.5 uppercase tracking-wider font-semibold">({rel.relation_type})</span>
                      </div>
                      <button onClick={() => handleRelAction(rel.id, 'remove')} disabled={relActionLoading} className="text-red-400 hover:bg-red-500/20 text-xs font-bold px-3 py-1.5 bg-red-500/10 rounded-lg border border-red-500/20 transition-colors w-full sm:w-auto text-center">Batal</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Graphs & History */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Genres Chart */}
              <div className="bg-konmik-card rounded-3xl p-6 border border-white/5 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-6">Genre Terfavorit</h3>
                {metrics.top_genres.length > 0 ? (
                  <div className="space-y-4">
                    {metrics.top_genres.map((g: any, i: number) => (
                      <div key={i} className="relative group">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-200 group-hover:text-konmik-primary transition-colors">{g.name}</span>
                          <span className="text-gray-400 text-xs bg-white/5 px-2 py-0.5 rounded-full">{g.percentage}%</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden shadow-inner">
                          <div 
                            className="bg-gradient-to-r from-purple-600 to-konmik-primary h-3 rounded-full relative overflow-hidden" 
                            style={{ width: `${g.percentage}%` }}
                          >
                            <div className="absolute inset-0 bg-white/20 w-1/2 -skew-x-12 translate-x-[-150%] group-hover:animate-[shimmer_1.5s_infinite]"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-10">Belum ada data genre.</div>
                )}
              </div>

              {/* Reading Time Heatmap */}
              <div className="bg-konmik-card rounded-3xl p-6 border border-white/5 shadow-xl flex flex-col relative">
                {(() => {
                  let dayCount = 0; let nightCount = 0;
                  metrics.time_distribution.forEach((c: number, h: number) => {
                    if (h >= 6 && h < 18) dayCount += c;
                    else nightCount += c;
                  });
                  const total = dayCount + nightCount;
                  const dayPct = total > 0 ? Math.round((dayCount / total) * 100) : 0;
                  const nightPct = total > 0 ? 100 - dayPct : 0;
                  
                  return (
                    <div className="flex items-center justify-between mb-auto">
                      <h3 className="text-lg font-bold text-white">Jam Membaca (24H)</h3>
                      {total > 0 && (
                      <div className="flex items-center gap-2 text-xs font-semibold bg-white/5 px-3 py-1.5 rounded-full">
                        <span className="text-yellow-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 inline" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path fill="none" stroke="currentColor" strokeWidth="2" d="M12 6v6l4 2"/></svg>
                          {' '}{dayPct}%
                        </span>
                        <span className="text-gray-500">|</span>
                        <span className="text-blue-300">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
                          {' '}{nightPct}%
                        </span>
                      </div>
                    )}
                    </div>
                  );
                })()}

                <div className="flex items-end h-40 gap-1 mt-6">
                  {metrics.time_distribution.map((count: number, hour: number) => {
                    const heightPercent = maxTime > 0 ? (count / maxTime) * 100 : 0;
                    return (
                      <div key={hour} className="flex-1 flex flex-col items-center group relative cursor-pointer h-full justify-end">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 bg-gray-800 border border-white/10 text-xs text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-xl">
                          <span className="font-bold text-konmik-primary">{hour.toString().padStart(2, '0')}:00</span> - {count} komik
                        </div>
                        <div 
                          className="w-full rounded-t-md transition-all duration-300 group-hover:bg-blue-400"
                          style={{ 
                            height: `${heightPercent}%`, 
                            minHeight: count > 0 ? '4px' : '0',
                            backgroundColor: count > 0 ? `rgba(59, 130, 246, ${0.4 + (count/maxTime)*0.6})` : 'transparent' 
                          }}
                        ></div>
                        {/* Label every 6 hours */}
                        <span className="text-[9px] text-gray-500 mt-2 h-4">
                          {hour % 6 === 0 ? `${hour}h` : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Jaring Waktu Hubungan (Radar Chart) */}
            {relationships?.accepted && relationships.accepted.length > 0 && (
              <div className="bg-konmik-card rounded-3xl p-6 border border-white/5 shadow-xl mt-6 flex flex-col items-center">
                <h3 className="text-lg font-bold text-white mb-4 w-full flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-konmik-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>
                  Perbandingan Kebiasaan Membaca
                </h3>
                
                {/* Relationship Selector Tabs */}
                <div className="flex flex-wrap gap-2 w-full mb-6">
                  {relationships.accepted.map((rel: any) => (
                    <button 
                      key={rel.id} 
                      onClick={() => setSelectedRelId(rel.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                        selectedRelId === rel.id 
                          ? 'bg-konmik-primary/20 border-konmik-primary text-white shadow-[0_0_15px_rgba(179,136,255,0.3)] scale-105' 
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {rel.display_name} <span className="opacity-60 font-normal">({rel.relation_type})</span>
                    </button>
                  ))}
                </div>

                {/* Radar Chart SVG */}
                {radarMatchData ? (() => {
                  const selectedRel = relationships.accepted.find((r: any) => r.id === selectedRelId) || relationships.accepted[0];
                  const selfDist = radarMatchData.self || [0, 0, 0, 0, 0];
                  const targetDist = radarMatchData.target || [0, 0, 0, 0, 0];
                  
                  return (
                    <div className="relative w-64 h-64 sm:w-80 sm:h-80 mb-8 mt-2">
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

                        {/* Target User Polygon (Red/Pink based on type) */}
                        <polygon 
                          points={targetDist.map((p: number, i: number) => {
                            const r = Math.max((p / 100) * 80, 5);
                            const angles = [{x: 0, y: -1}, {x: 0.951, y: -0.309}, {x: 0.588, y: 0.809}, {x: -0.588, y: 0.809}, {x: -0.951, y: -0.309}];
                            return `${100 + angles[i].x * r},${100 + angles[i].y * r}`;
                          }).join(" ")}
                          fill="rgba(236, 72, 153, 0.2)" 
                          stroke="#ec4899" 
                          strokeWidth="2" 
                          className="transition-all duration-1000"
                        />

                        {/* Self User Polygon (Primary/Blue) */}
                        <polygon 
                          points={selfDist.map((p: number, i: number) => {
                            const r = Math.max((p / 100) * 80, 5);
                            const angles = [{x: 0, y: -1}, {x: 0.951, y: -0.309}, {x: 0.588, y: 0.809}, {x: -0.588, y: 0.809}, {x: -0.951, y: -0.309}];
                            return `${100 + angles[i].x * r},${100 + angles[i].y * r}`;
                          }).join(" ")}
                          fill="rgba(179, 136, 255, 0.4)" 
                          stroke="#B388FF" 
                          strokeWidth="2" 
                          className="transition-all duration-1000"
                        />
                      </svg>
                      
                      {/* Legend */}
                      <div className="absolute -bottom-8 left-0 right-0 flex justify-center gap-6">
                        <div className="flex items-center gap-2 text-xs text-gray-400 font-bold">
                          <span className="w-3 h-3 rounded bg-[#B388FF] opacity-60"></span> Kamu
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400 font-bold">
                          <span className="w-3 h-3 rounded bg-pink-500 opacity-60"></span> {selectedRel.display_name}
                        </div>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="relative w-64 h-64 sm:w-80 sm:h-80 mb-8 mt-2 flex items-center justify-center">
                    <div className="w-10 h-10 border-2 border-konmik-primary/30 border-t-konmik-primary rounded-full animate-spin" />
                  </div>
                )}
              </div>
            )}

            {/* Chapter Terbanyak Dibaca */}
            <div className="bg-konmik-card rounded-3xl p-6 border border-white/5 shadow-xl relative overflow-hidden mt-6">
              <div className="absolute top-0 right-0 w-64 h-64 bg-konmik-primary/5 rounded-full blur-3xl pointer-events-none"></div>
              <h3 className="text-lg font-bold text-white mb-6 relative z-10 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 4h2a2 2 0 012 2v1c0 3.866-3.134 7-7 7S6 10.866 6 7V6a2 2 0 012-2h2m-2 0V3m8 1V3m-4 11v3m-3 3h6"/></svg>
                Chapter Terbanyak Dibaca
              </h3>
              
              {advanced_metrics?.top_mangas && advanced_metrics.top_mangas.length > 0 ? (
                <div className="flex items-end justify-center gap-2 sm:gap-6 h-64 mt-8">
                  {/* Rank 2 */}
                  {advanced_metrics.top_mangas[1] && (
                    <div className="flex flex-col items-center group w-1/3 max-w-[120px]">
                      <div className="w-16 h-20 sm:w-20 sm:h-28 rounded-lg overflow-hidden shadow-lg mb-3 border-2 border-gray-400 group-hover:-translate-y-2 transition-transform bg-konmik-dark">
                        {advanced_metrics.top_mangas[1].cover_url ? (
                          <img src={advanced_metrics.top_mangas[1].cover_url} className="w-full h-full object-cover" alt="Rank 2" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                          </div>
                        )}
                      </div>
                      <div className="text-center w-full">
                        <p className="text-xs font-bold text-white truncate px-1">{advanced_metrics.top_mangas[1].title}</p>
                        <p className="text-[10px] text-gray-400">Bab {advanced_metrics.top_mangas[1].chapter_num}</p>
                      </div>
                      <div className="w-full bg-gradient-to-t from-gray-600 to-gray-400 h-20 mt-3 rounded-t-lg flex items-start justify-center pt-2 shadow-[0_-5px_15px_rgba(156,163,175,0.2)]">
                        <span className="text-xl font-black text-white drop-shadow-md">2</span>
                      </div>
                    </div>
                  )}

                  {/* Rank 1 */}
                  {advanced_metrics.top_mangas[0] && (
                    <div className="flex flex-col items-center group w-1/3 max-w-[140px] z-10">
                      <div className="absolute top-8">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-yellow-400 animate-bounce" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l1.5 4.5H18l-3.75 2.73 1.43 4.39L12 11.1l-3.68 2.52 1.43-4.39L6 6.5h4.5L12 2z"/></svg>
                      </div>
                      <div className="w-20 h-28 sm:w-24 sm:h-36 rounded-lg overflow-hidden shadow-2xl mb-3 border-2 border-yellow-400 group-hover:-translate-y-2 transition-transform bg-konmik-dark">
                        {advanced_metrics.top_mangas[0].cover_url ? (
                          <img src={advanced_metrics.top_mangas[0].cover_url} className="w-full h-full object-cover" alt="Rank 1" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                          </div>
                        )}
                      </div>
                      <div className="text-center w-full">
                        <p className="text-sm font-black text-yellow-400 truncate px-1">{advanced_metrics.top_mangas[0].title}</p>
                        <p className="text-[10px] text-gray-300">Bab {advanced_metrics.top_mangas[0].chapter_num}</p>
                      </div>
                      <div className="w-full bg-gradient-to-t from-yellow-700 to-yellow-500 h-28 mt-3 rounded-t-lg flex items-start justify-center pt-2 shadow-[0_-5px_20px_rgba(234,179,8,0.3)]">
                        <span className="text-2xl font-black text-white drop-shadow-md">1</span>
                      </div>
                    </div>
                  )}

                  {/* Rank 3 */}
                  {advanced_metrics.top_mangas[2] && (
                    <div className="flex flex-col items-center group w-1/3 max-w-[120px]">
                      <div className="w-16 h-20 sm:w-20 sm:h-28 rounded-lg overflow-hidden shadow-lg mb-3 border-2 border-orange-700 group-hover:-translate-y-2 transition-transform bg-konmik-dark">
                        {advanced_metrics.top_mangas[2].cover_url ? (
                          <img src={advanced_metrics.top_mangas[2].cover_url} className="w-full h-full object-cover" alt="Rank 3" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                          </div>
                        )}
                      </div>
                      <div className="text-center w-full">
                        <p className="text-xs font-bold text-white truncate px-1">{advanced_metrics.top_mangas[2].title}</p>
                        <p className="text-[10px] text-gray-400">Bab {advanced_metrics.top_mangas[2].chapter_num}</p>
                      </div>
                      <div className="w-full bg-gradient-to-t from-orange-900 to-orange-700 h-14 mt-3 rounded-t-lg flex items-start justify-center pt-2 shadow-[0_-5px_15px_rgba(194,65,12,0.2)]">
                        <span className="text-lg font-black text-white drop-shadow-md">3</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-10">Belum cukup riwayat untuk membuat podium.</div>
              )}
            </div>

            {/* Recent History */}
            <div className="bg-konmik-card rounded-3xl p-6 border border-white/5 shadow-xl mt-2">
              <h3 className="text-lg font-bold text-white mb-6">Baru Saja Dibaca</h3>
              {recent_history.length > 0 ? (
                <div className="space-y-3">
                  {recent_history.map((comic: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all hover:scale-[1.01] hover:shadow-lg border border-transparent hover:border-white/5 cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-konmik-dark rounded-xl overflow-hidden shadow-inner border border-white/5 flex-shrink-0 flex items-center justify-center text-gray-700">
                          {comic.cover_url ? (
                            <img src={comic.cover_url} alt="Cover" className="w-full h-full object-cover" />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white truncate max-w-[150px] sm:max-w-xs md:max-w-md">{comic.title || comic.manga_title || comic.manga_id}</p>
                          <p className="text-xs text-konmik-primary mt-1 font-medium">{comic.last_chapter || comic.chapter_name || 'Mulai Membaca'}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-[10px] sm:text-xs font-semibold text-gray-400 bg-black/30 border border-white/5 px-2.5 py-1.5 rounded-lg shadow-inner">
                          {comic.updated_at ? comic.updated_at.split(' ')[0] : '-'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-10 bg-white/5 rounded-2xl border border-dashed border-white/10 flex flex-col items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                  <p className="text-sm">Belum ada riwayat bacaan yang tercatat.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
    </>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-konmik-dark">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-konmik-primary/30 border-t-konmik-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Memuat Profil...</p>
        </div>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
