import { NextResponse } from 'next/server';

const API_BASE = "https://api.konkon.id";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { self_username, target_username } = body;
    const authHeader = request.headers.get("authorization") || "";

    if (!self_username || !target_username) {
      return NextResponse.json({ success: false, message: "Username tidak boleh kosong" }, { status: 400 });
    }

    if (self_username.toLowerCase() === target_username.toLowerCase()) {
      return NextResponse.json({ success: false, message: "Kamu tidak bisa matchmaking dengan dirimu sendiri" }, { status: 400 });
    }

    const headers: Record<string, string> = {};
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const fetchOptions = {
      cache: "no-store" as RequestCache,
      headers
    };

    // Fetch Stats & History for Self
    const [selfStatsRes, selfHistoryRes, targetStatsRes, targetHistoryRes] = await Promise.all([
      fetch(`${API_BASE}/stats/${encodeURIComponent(self_username)}`, fetchOptions),
      fetch(`${API_BASE}/history/${encodeURIComponent(self_username)}`, fetchOptions),
      fetch(`${API_BASE}/stats/${encodeURIComponent(target_username)}`, fetchOptions),
      fetch(`${API_BASE}/history/${encodeURIComponent(target_username)}`, fetchOptions)
    ]);

    const selfStats = await selfStatsRes.json();
    const selfHistory = await selfHistoryRes.json();
    const targetStats = await targetStatsRes.json();
    const targetHistory = await targetHistoryRes.json();

    // Stats endpoint returns the object directly, not wrapped in 'data'. If user doesn't exist, created_at is empty string.
    if (!selfStats.created_at) {
      return NextResponse.json({ success: false, message: `Data akun kamu sendiri (${self_username}) tidak ditemukan di server. Coba login ulang.` }, { status: 404 });
    }

    if (!targetStats.created_at) {
      return NextResponse.json({ success: false, message: `User '${target_username}' tidak ditemukan. Pastikan kamu mengetik USERNAME uniknya tanpa spasi, bukan Display Name!` }, { status: 404 });
    }

    const sData = selfStats;
    const tData = targetStats;
    
    // Helper for Genre Frequency
    const getTopGenres = (historyData: any[]) => {
      const tally: Record<string, number> = {};
      historyData.forEach(item => {
        if (item.genres) {
          const genres = item.genres.split(',').map((g: string) => g.trim().toLowerCase());
          genres.forEach((g: string) => {
            if (g && g !== '-' && g !== 'none') {
              tally[g] = (tally[g] || 0) + 1;
            }
          });
        }
      });
      return Object.entries(tally)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(entry => entry[0]);
    };

    // Helper for Time Profile
    const getTimeProfile = (historyData: any[]) => {
      const hours = historyData.map(c => {
        if (!c.updated_at) return -1;
        // Parse "YYYY-MM-DD HH:MM:SS" as UTC by appending Z
        const dateStr = c.updated_at.replace(" ", "T") + "Z";
        const date = new Date(dateStr);
        return date.getHours();
      }).filter(h => !isNaN(h) && h >= 0);

      if (hours.length === 0) return "Belum diketahui";

      const tally: Record<number, number> = {};
      hours.forEach(h => tally[h] = (tally[h] || 0) + 1);
      
      let maxHour = -1;
      let maxCount = -1;
      for (const [hour, count] of Object.entries(tally)) {
        if (count > maxCount) {
          maxCount = count;
          maxHour = parseInt(hour);
        }
      }

      if (maxHour >= 0 && maxHour < 5) return "🦇 Kalong Begadang";
      if (maxHour >= 5 && maxHour < 11) return "🌅 Pembaca Pagi";
      if (maxHour >= 11 && maxHour < 16) return "☀️ Pengisi Waktu Luang";
      if (maxHour >= 16 && maxHour < 20) return "🌆 Pembaca Senja";
      return "🌙 Prime Time Reader";
    };

    // Helper for Reader Type
    const getReaderType = (stats: any) => {
      const ch = parseInt(stats.chapters_read || stats.chapters || 0);
      const co = parseInt(stats.comics_read || stats.comics || 0);
      if (co === 0) return "🚶 Casual Reader";
      return (ch / co) > 10 ? "🏎️ Suka Maraton" : "🚶 Casual Reader";
    };

    // Helper for Weekly Obsession
    const getWeeklyObsession = (historyData: any[]) => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentComics = historyData.filter(c => {
        if (!c.updated_at) return false;
        const dateStr = c.updated_at.replace(" ", "T") + "Z";
        return new Date(dateStr) >= sevenDaysAgo;
      });

      const top = getTopGenres(recentComics);
      return top.length > 0 ? top[0] : null;
    };

    // Helper for Time Distribution Radar Chart
    const getTimeDistribution = (historyData: any[]) => {
      // 0: Pagi (5-10), 1: Siang (11-15), 2: Sore (16-19), 3: Malam (20-23), 4: Dini Hari (0-4)
      const dist = [0, 0, 0, 0, 0]; 
      let total = 0;
      historyData.forEach(c => {
        if (!c.updated_at) return;
        const dateStr = c.updated_at.replace(" ", "T") + "Z";
        const h = new Date(dateStr).getHours();
        if (isNaN(h)) return;
        total++;
        if (h >= 5 && h < 11) dist[0]++;
        else if (h >= 11 && h < 16) dist[1]++;
        else if (h >= 16 && h < 20) dist[2]++;
        else if (h >= 20 && h < 24) dist[3]++;
        else dist[4]++;
      });
      if (total === 0) return [0, 0, 0, 0, 0];
      return dist.map(v => Math.round((v / total) * 100));
    };

    // 1. Comic History & Genre Matching (70% Weight)
    let historyScore = 0;
    let exactComicScore = 0;
    let commonComics: any[] = [];
    let commonGenresData: any[] = [];
    let genreScore = 0;
    
    const sComics = selfHistory.data || [];
    const tComics = targetHistory.data || [];

    if (targetHistory.is_private) {
      // Cannot match history
      historyScore = 0;
    } else {
      // Exact Comic Match (35 points)
      const sIds = sComics.map((c: any) => c.manga_id);
      commonComics = tComics.filter((c: any) => sIds.includes(c.manga_id));
      exactComicScore = Math.min((commonComics.length / 5) * 35, 35); 

      // Genre Frequency Match (35 points)
      const sTopGenres = getTopGenres(sComics);
      const tTopGenres = getTopGenres(tComics);
      const commonGenreNames = sTopGenres.filter(g => tTopGenres.includes(g));
      
      commonGenresData = commonGenreNames.map(genre => {
        const countInCommon = commonComics.filter((c: any) => c.genres && c.genres.toLowerCase().includes(genre)).length;
        return { genre, count: countInCommon };
      });

      const maxGenres = Math.max(sTopGenres.length, tTopGenres.length, 1);
      genreScore = (commonGenreNames.length / maxGenres) * 35;

      historyScore = exactComicScore + genreScore;
    }

    // 2. Reading Habit / Intensity Matching (30% Weight)
    const sMinutes = sData.minutes || 0;
    const tMinutes = tData.minutes || 0;
    
    let habitScore = 30;
    if (sMinutes > 0 || tMinutes > 0) {
      const diffRatio = Math.abs(sMinutes - tMinutes) / Math.max(sMinutes, tMinutes, 1);
      habitScore = 30 - (diffRatio * 30);
    }

    let totalScore = Math.round(historyScore + habitScore);
    if (totalScore < 10) totalScore = 10 + Math.floor(Math.random() * 10); // Minimum 10-20% for fun
    if (totalScore > 100) totalScore = 100;

    const isRival = totalScore < 30;

    // Determine message
    let message = isRival ? "Kalian adalah Rival Membaca! Selera bagaikan langit dan bumi." : "Kalian berdua punya selera yang sangat berbeda, cobalah saling merekomendasikan komik.";
    if (totalScore >= 80) message = "Kecocokan Sempurna! Kalian berdua adalah Soulmate Komik!";
    else if (totalScore >= 50) message = "Lumayan cocok! Kalian memiliki selera atau kebiasaan yang cukup mirip.";

    return NextResponse.json({
      success: true,
      data: {
        score: totalScore,
        score_breakdown: {
          genre: Math.round(genreScore),
          comic: Math.round(exactComicScore),
          habit: Math.round(habitScore)
        },
        target_user: tData,
        common_genres: commonGenresData,
        common_comics: commonComics,
        habit: {
          self_minutes: sMinutes,
          target_minutes: tMinutes,
          self_time_dist: getTimeDistribution(sComics),
          target_time_dist: targetHistory.is_private ? [0, 0, 0, 0, 0] : getTimeDistribution(tComics)
        },
        profiles: {
          time: targetHistory.is_private ? "🔒 Rahasia" : getTimeProfile(tComics),
          type: getReaderType(tData),
          obsession: targetHistory.is_private ? "🔒 Rahasia" : getWeeklyObsession(tComics)
        },
        message,
        is_private: targetHistory.is_private || false,
        is_rival: isRival
      }
    });
    
  } catch (error: any) {
    console.error("Matchmaking API Error:", error);
    return NextResponse.json({ success: false, message: "Terjadi kesalahan sistem internal" }, { status: 500 });
  }
}
