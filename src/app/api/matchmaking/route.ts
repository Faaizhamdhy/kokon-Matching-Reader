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
    if (authHeader) headers["Authorization"] = authHeader;
    const fetchOptions = { cache: "no-store" as RequestCache, headers };

    const [selfStatsRes, selfHistoryRes, targetStatsRes, targetHistoryRes] = await Promise.all([
      fetch(`${API_BASE}/stats/${encodeURIComponent(self_username)}`, fetchOptions),
      fetch(`${API_BASE}/history/${encodeURIComponent(self_username)}`, fetchOptions),
      fetch(`${API_BASE}/stats/${encodeURIComponent(target_username)}`, fetchOptions),
      fetch(`${API_BASE}/history/${encodeURIComponent(target_username)}`, fetchOptions)
    ]);

    const selfStats   = await selfStatsRes.json();
    const selfHistory = await selfHistoryRes.json();
    const targetStats = await targetStatsRes.json();
    const targetHistory = await targetHistoryRes.json();

    if (!selfStats.created_at) {
      return NextResponse.json({ success: false, message: `Data akun kamu sendiri (${self_username}) tidak ditemukan di server. Coba login ulang.` }, { status: 404 });
    }
    if (!targetStats.created_at) {
      return NextResponse.json({ success: false, message: `User '${target_username}' tidak ditemukan. Pastikan kamu mengetik USERNAME uniknya tanpa spasi, bukan Display Name!` }, { status: 404 });
    }

    const sData = selfStats;
    const tData = targetStats;
    const sComics = selfHistory.data || [];
    const tComics = targetHistory.data || [];

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /** Build a full genre frequency map {genre: count} from history */
    const buildGenreMap = (historyData: any[]): Record<string, number> => {
      const tally: Record<string, number> = {};
      historyData.forEach(item => {
        if (!item.genres) return;
        item.genres.split(',').forEach((g: string) => {
          const clean = g.trim().toLowerCase();
          if (clean && clean !== '-' && clean !== 'none') {
            tally[clean] = (tally[clean] || 0) + 1;
          }
        });
      });
      return tally;
    };

    /** Top N genre names sorted by frequency */
    const getTopGenres = (historyData: any[], n = 10): string[] =>
      Object.entries(buildGenreMap(historyData))
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(e => e[0]);

    /** WIB-corrected hour from updated_at string */
    const getWIBHour = (updated_at: string): number => {
      const dateStr = updated_at.replace(" ", "T") + "Z";
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? -1 : (d.getUTCHours() + 7) % 24;
    };

    /** 5-bucket time distribution [Pagi, Siang, Sore, Malam, DiniHari] as percentages */
    const getTimeDistribution = (historyData: any[]): number[] => {
      const dist = [0, 0, 0, 0, 0];
      let total = 0;
      historyData.forEach(c => {
        if (!c.updated_at) return;
        const h = getWIBHour(c.updated_at);
        if (h < 0) return;
        total++;
        if      (h >= 5 && h < 11) dist[0]++;
        else if (h >= 11 && h < 16) dist[1]++;
        else if (h >= 16 && h < 20) dist[2]++;
        else if (h >= 20 && h < 24) dist[3]++;
        else                         dist[4]++;
      });
      if (total === 0) return [0, 0, 0, 0, 0];
      return dist.map(v => Math.round((v / total) * 100));
    };

    /** Time profile label from WIB hours */
    const getTimeProfile = (historyData: any[]): string => {
      if (historyData.length === 0) return "Belum diketahui";
      const tally: Record<number, number> = {};
      historyData.forEach(c => {
        if (!c.updated_at) return;
        const h = getWIBHour(c.updated_at);
        if (h >= 0) tally[h] = (tally[h] || 0) + 1;
      });
      let maxHour = -1, maxCount = -1;
      for (const [hour, count] of Object.entries(tally)) {
        if (count > maxCount) { maxCount = count; maxHour = parseInt(hour); }
      }
      if (maxHour >= 0 && maxHour < 5)   return "🦇 Kalong Begadang";
      if (maxHour >= 5 && maxHour < 11)  return "🌅 Pembaca Pagi";
      if (maxHour >= 11 && maxHour < 16) return "☀️ Pengisi Waktu Luang";
      if (maxHour >= 16 && maxHour < 20) return "🌆 Pembaca Senja";
      return "🌙 Prime Time Reader";
    };

    const getReaderType = (stats: any): string => {
      const ch = parseInt(stats.chapters_read || stats.chapters || 0);
      const co = parseInt(stats.comics_read || stats.comics || 0);
      if (co === 0) return "🚶 Casual Reader";
      return (ch / co) > 10 ? "🏎️ Suka Maraton" : "🚶 Casual Reader";
    };

    const getWeeklyObsession = (historyData: any[]): string | null => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recent = historyData.filter(c => {
        if (!c.updated_at) return false;
        return new Date(c.updated_at.replace(" ", "T") + "Z") >= sevenDaysAgo;
      });
      const top = getTopGenres(recent, 1);
      return top.length > 0 ? top[0] : null;
    };

    // ─────────────────────────────────────────────────────────────────────────
    // V2 SCORING ENGINE
    // ─────────────────────────────────────────────────────────────────────────

    // ── 1. COMIC SCORE (0–100) using Jaccard Similarity ──────────────────────
    // Score = (shared titles / max(s, t, MIN_DENOMINATOR)) * 100
    // Cap denominator at 40 so readers sharing 40+ titles always get 100.
    let comicScore = 0;
    let commonComics: any[] = [];
    if (!targetHistory.is_private) {
      const sIds = new Set(sComics.map((c: any) => c.manga_id));
      commonComics = tComics.filter((c: any) => sIds.has(c.manga_id));
      const sharedCount = commonComics.length;
      const denominator = Math.min(Math.max(sComics.length, tComics.length, 1), 40);
      comicScore = Math.min(Math.round((sharedCount / denominator) * 100), 100);
    }

    // ── 2. GENRE SCORE (0–100) using Percentage-Intersection Similarity ──────
    // Build percentage vectors for each user, then sum min(sVec[g], tVec[g]) for all genres.
    let genreScore = 0;
    let commonGenresData: any[] = [];
    if (!targetHistory.is_private) {
      const sMap = buildGenreMap(sComics);
      const tMap = buildGenreMap(tComics);
      const sTotal = Object.values(sMap).reduce((a, b) => a + b, 0) || 1;
      const tTotal = Object.values(tMap).reduce((a, b) => a + b, 0) || 1;

      // Percentage vectors
      const sVec: Record<string, number> = {};
      const tVec: Record<string, number> = {};
      Object.entries(sMap).forEach(([g, c]) => { sVec[g] = (c / sTotal) * 100; });
      Object.entries(tMap).forEach(([g, c]) => { tVec[g] = (c / tTotal) * 100; });

      // Intersection score: sum of minimum overlapping percentages
      const allGenres = new Set([...Object.keys(sVec), ...Object.keys(tVec)]);
      let intersectionSum = 0;
      allGenres.forEach(g => {
        const sv = sVec[g] || 0;
        const tv = tVec[g] || 0;
        intersectionSum += Math.min(sv, tv);
      });
      genreScore = Math.min(Math.round(intersectionSum), 100);

      // Common genres for display (genres that both users have read)
      commonGenresData = Array.from(allGenres)
        .filter(g => (sMap[g] || 0) > 0 && (tMap[g] || 0) > 0)
        .sort((a, b) => (Math.min(sVec[b] || 0, tVec[b] || 0)) - (Math.min(sVec[a] || 0, tVec[a] || 0)))
        .slice(0, 10)
        .map(genre => ({
          genre,
          count: commonComics.filter((c: any) => c.genres?.toLowerCase().includes(genre)).length
        }));
    }

    // ── 3. HABIT SCORE (0–100) ────────────────────────────────────────────────
    // 3a. Time Distribution Similarity (60 pts): compare the 5-bucket radar
    const selfTimeDist   = getTimeDistribution(sComics);
    const targetTimeDist = targetHistory.is_private
      ? [0, 0, 0, 0, 0]
      : getTimeDistribution(tComics);

    let timeSimilarity = 0;
    if (!targetHistory.is_private) {
      // Intersection of percentage distributions (same as genre method)
      timeSimilarity = selfTimeDist.reduce((acc, sv, i) => acc + Math.min(sv, targetTimeDist[i]), 0);
      // timeSimilarity is already out of 100 since the vectors sum to 100
    }
    const timeScore = Math.round(timeSimilarity * 0.6); // max 60

    // 3b. Reading Intensity Similarity (40 pts): ratio-based minute comparison
    const sMinutes = sData.minutes || 0;
    const tMinutes = tData.minutes || 0;
    let intensityScore = 40;
    if (sMinutes > 0 || tMinutes > 0) {
      const diffRatio = Math.abs(sMinutes - tMinutes) / Math.max(sMinutes, tMinutes, 1);
      intensityScore = Math.round((1 - diffRatio) * 40);
    }

    const habitScore = Math.min(timeScore + intensityScore, 100);

    // ── 4. FINAL SCORE (average of three) ────────────────────────────────────
    let totalScore = Math.round((comicScore + genreScore + habitScore) / 3);
    if (totalScore < 5) totalScore = 5 + Math.floor(Math.random() * 8); // min 5–12 for fun
    if (totalScore > 100) totalScore = 100;

    const isRival = totalScore < 25;

    // ─────────────────────────────────────────────────────────────────────────
    // V2.1 DETERMINISTIC GENERATIVE MESSAGE ENGINE
    // Combines 5 parts based on a username hash so results are consistent but highly varied.
    // ─────────────────────────────────────────────────────────────────────────
    const hashString = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash);
    };

    const seed = hashString(self_username.toLowerCase() + target_username.toLowerCase());
    const pick = (arr: string[], offset: number) => arr[(seed + offset) % arr.length];

    let msgParts: string[] = [];

    // 1. Overall Intro based on Total Score
    if (totalScore >= 90) {
      msgParts.push(pick([
        "Wow, sebuah keajaiban! Kalian bagaikan belahan jiwa di dunia komik.",
        "Luar biasa! Kecocokan kalian nyaris sempurna secara statistik.",
        "Sangat langka! Sistem kami mendeteksi resonansi yang luar biasa di antara kalian."
      ], 1));
    } else if (totalScore >= 70) {
      msgParts.push(pick([
        "Kecocokan yang sangat solid!",
        "Kalian berdua punya banyak banget kesamaan yang menarik.",
        "Chemistry membaca kalian sangat kuat."
      ], 2));
    } else if (totalScore >= 40) {
      msgParts.push(pick([
        "Kecocokan kalian ada di tingkat menengah.",
        "Ada beberapa titik temu yang pas, meski tidak semuanya identik.",
        "Kalian adalah kombinasi unik dari persamaan dan perbedaan."
      ], 3));
    } else {
      msgParts.push(pick([
        "Perbedaan kalian sangat kontras!",
        "Kalian berada di dua kutub komik yang saling berseberangan.",
        "Wah, sistem mendeteksi kalian sebagai Rival sejati."
      ], 4));
    }

    // 2. Comic Part
    if (comicScore >= 70) {
      msgParts.push(pick([
        "Koleksi bacaan kalian sangat tumpang tindih.",
        "Banyak banget judul spesifik yang sama-sama kalian tamatkan.",
        "Sepertinya kalian sering nongkrong di rak komik yang sama."
      ], 5));
    } else if (comicScore >= 40) {
      msgParts.push(pick([
        "Kalian berbagi beberapa judul komik yang sama.",
        "Ada beberapa komik hits yang sama-sama kalian ikuti.",
        "Meski jalur bacaannya mulai berbeda, akar judul yang kalian baca cukup mirip."
      ], 6));
    } else {
      msgParts.push(pick([
        "Uniknya, kalian nyaris tidak pernah menyentuh judul komik yang sama.",
        "Koleksi komik kalian ibarat dua perpustakaan yang berbeda total.",
        "Sulit mencari irisan komik di riwayat kalian."
      ], 7));
    }

    // 3. Genre Part
    if (genreScore >= 70) {
      msgParts.push(pick([
        "Terlebih lagi, selera genre kalian bagaikan pinang dibelah dua.",
        "Kalian juga berbagi kecintaan pada genre yang sama persis.",
        "DNA genre kalian saling bertaut dengan sangat erat."
      ], 8));
    } else if (genreScore >= 40) {
      msgParts.push(pick([
        "Di sisi genre, ada beberapa irisan selera yang masih nyambung.",
        "Meski fokusnya beda, ada beberapa genre favorit yang kalian bagi bersama.",
        "Selera genre kalian setengah mirip, setengahnya lagi sangat personal."
      ], 9));
    } else {
      msgParts.push(pick([
        "Namun untuk urusan genre, kalian benar-benar punya selera yang bertolak belakang.",
        "Menariknya, referensi genre kalian tidak pernah bersilangan sama sekali.",
        "Soal tema cerita, kalian seperti hidup di alam semesta yang berbeda."
      ], 10));
    }

    // 4. Habit Part
    if (habitScore >= 70) {
      msgParts.push(pick([
        "Ditambah lagi, pola dan waktu jam baca kalian sungguh seirama.",
        "Dan yang bikin makin klop, kalian berdua punya jam aktif membaca yang identik.",
        "Bahkan ritme kalian saat mengonsumsi komik pun sama persis."
      ], 11));
    } else if (habitScore >= 40) {
      msgParts.push(pick([
        "Gaya membaca kalian cukup mirip, meski intensitas waktunya agak berbeda.",
        "Pola harian kalian masih ada kemiripan di jam-jam tertentu.",
        "Secara habit, kalian tidak terlalu jauh berbeda."
      ], 12));
    } else {
      msgParts.push(pick([
        "Tapi kalau bicara soal habit, satu dari kalian mungkin kalong dan satunya lagi pembaca pagi.",
        "Hanya saja, kebiasaan dan jam baca kalian sungguh tidak sinkron.",
        "Sayangnya, ritme waktu kalian membaca sangat jauh berbeda."
      ], 13));
    }

    // 5. Conclusion
    if (totalScore >= 75) {
      msgParts.push(pick([
        "Sangat direkomendasikan untuk saling bertukar daftar rekomendasi komik!",
        "Kalian pasti nyambung banget kalau ngobrol panjang lebar soal komik.",
        "Sistem menobatkan kalian sebagai teman mabar komik yang sempurna."
      ], 14));
    } else if (totalScore >= 40) {
      msgParts.push(pick([
        "Coba sapa dan tukar judul, siapa tahu bisa memperluas wawasan!",
        "Kalian bisa saling melengkapi kekurangan referensi masing-masing.",
        "Pertemanan yang bagus untuk keluar dari zona nyaman."
      ], 15));
    } else {
      msgParts.push(pick([
        "Mungkin lebih seru kalau kalian saling debat komik mana yang terbaik!",
        "Rivalitas ini justru bisa jadi cara asyik buat nambah perspektif baru.",
        "Ibarat air dan minyak, tapi terkadang perbedaan itu indah."
      ], 16));
    }

    const message = msgParts.join(" ");

    return NextResponse.json({
      success: true,
      data: {
        score: totalScore,
        score_breakdown: {
          genre: genreScore,
          comic: comicScore,
          habit: habitScore,
        },
        target_user: tData,
        common_genres: commonGenresData,
        common_comics: commonComics,
        habit: {
          self_minutes: sMinutes,
          target_minutes: tMinutes,
          self_time_dist:   selfTimeDist,
          target_time_dist: targetTimeDist,
        },
        profiles: {
          time:      targetHistory.is_private ? "🔒 Rahasia" : getTimeProfile(tComics),
          type:      getReaderType(tData),
          obsession: targetHistory.is_private ? "🔒 Rahasia" : getWeeklyObsession(tComics),
        },
        message,
        is_private: targetHistory.is_private || false,
        is_rival:   isRival,
      }
    });

  } catch (error: any) {
    console.error("Matchmaking API Error:", error);
    return NextResponse.json({ success: false, message: "Terjadi kesalahan sistem internal" }, { status: 500 });
  }
}
