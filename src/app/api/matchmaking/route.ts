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
    // V2 DYNAMIC MESSAGE ENGINE
    // Categorize each score: Low (<40), Mid (40–69), High (>=70)
    // ─────────────────────────────────────────────────────────────────────────
    const level = (s: number) => s >= 70 ? 'H' : s >= 40 ? 'M' : 'L';
    const cL = level(comicScore);
    const gL = level(genreScore);
    const hL = level(habitScore);
    const combo = `${cL}${gL}${hL}`;

    const messages: Record<string, string[]> = {
      // ── All High ──
      'HHH': [
        "Kecocokan Sempurna! Kalian membaca judul yang sama, genre yang sama, di jam yang sama. Seperti melihat pantulan di cermin! 🪞",
        "Soulmate Komik sejati! Selera, kebiasaan, dan pilihan komik kalian hampir identik. Yakin belum pernah ketemu di dunia nyata? 🤝",
        "99% kembar rasa! Dari judul, genre, sampai pola baca malam-malam — kalian dua yang sama banget. 🌟",
      ],
      // ── Comic & Genre High, Habit Low ──
      'HHL': [
        "Selera komik dan genre kalian cocok banget, tapi jam bacanya beda dunia. Satu baca dini hari, satunya lagi pas sarapan! 🌙☀️",
        "Kalian punya wishlist komik yang hampir sama persis, tapi kayak janjian nggak pernah online bareng. Beda timezone nih! ⏰",
        "Genre dan judul? Double match! Tapi kebiasaan baca kalian bertolak belakang. Coba sync jadwal, pasti nyambung banget! 📅",
      ],
      // ── Comic & Habit High, Genre Low ──
      'HLH': [
        "Kalian sering baca komik yang sama dan punya jam baca yang mirip, tapi genre favoritnya berbeda. Seru nih buat debat selera! ⚔️😄",
        "Judul yang kalian baca banyak yang sama, tapi alasan milihnya beda. Satu suka actionnya, satunya suka romancenya dari komik yang sama! 🤔",
        "Kebiasaan baca kalian klop, judulnya juga banyak yang overlap — tapi referensi genre kalian kayak kucing sama anjing. 🐱🐶",
      ],
      // ── Genre & Habit High, Comic Low ──
      'LHH': [
        "Waktu baca dan selera genre kalian nyambung banget! Sayangnya belum pernah baca komik yang sama. Kalian butuh rekomendasi satu sama lain! 📚💡",
        "Kalian adalah dua pembaca dengan kebiasaan dan genre yang mirip, tapi entah kenapa jalur komiknya belum bersilangan. Mulai dari mana? 🗺️",
        "Habit-mu klop, genre-mu match — sekarang tinggal temukan satu judul yang bisa kalian nikmati bersama! 🎯",
      ],
      // ── Comic High only ──
      'HLL': [
        "Banyak judul yang sama-sama dibaca, tapi di luar itu... berbeda banget! Kalian adalah pembaca yang sama-sama penasaran tapi arahnya berbeda. 🧭",
        "Kalian punya 'buku kenangan' yang sama, tapi setelah itu jalan sendiri-sendiri. Nostalgia banget! 📖",
        "Titik temu kalian ada di judul-judul lawas yang sama-sama pernah dibaca. Tapi genre dan jadwal bacanya beda total! ⏳",
      ],
      // ── Genre High only ──
      'LHL': [
        "Selera genre kalian sangat cocok, tapi lucunya tidak pernah membaca judul yang sama! Ini pertanda kalian harus saling rekomendasiin komik. 🎁",
        "Kalian seperti dua kolektor dengan hobi yang sama tapi koleksi yang berbeda. Genre cocok, judul belum ketemu! 🗃️",
        "Genre? Identik! Judul? Beda semua. Kalian pasti akan langsung jatuh cinta kalau dikasih rekomendasian dari masing-masing. 💬",
      ],
      // ── Habit High only ──
      'LLH': [
        "Teman begadang sejati! Pola dan intensitas baca kalian hampir identik, tapi selera komiknya beda 180 derajat. 🦇🌙",
        "Kalian pasti sering online di jam yang sama, tapi baca komik yang berseberangan total. Lucu banget! 😂",
        "Dari segi waktu dan stamina baca, kalian satu frekuensi. Tapi isi bacaannya? Kayak kamu baca sci-fi dan dia baca slice of life! 🚀🌸",
      ],
      // ── All Mid ──
      'MMM': [
        "Kecocokan yang lumayan! Kalian punya titik temu di beberapa judul, genre, dan pola baca. Ada potensi yang perlu digali lebih jauh! 🔍",
        "Skor tengah-tengah berarti kalian punya ruang untuk jadi lebih cocok. Coba rekomendasiin komik favorit masing-masing! 📖",
        "Tidak terlalu cocok, tidak terlalu beda. Kalian adalah dua pembaca yang bisa saling melengkapi kalau mau jajal selera baru! ✨",
      ],
      // ── All Low (Rival) ──
      'LLL': [
        "Rival Membaca Sejati! Tidak ada satu pun komik, genre, atau jam baca yang mirip. Kalian ibarat air dan minyak! ⚡",
        "Hmm, ini kecocokan yang unik — lebih tepatnya: tidak ada kecocokan sama sekali! Mungkin itulah yang membuat kalian menarik satu sama lain? 😏",
        "Kalian adalah definisi 'opposites attract' di dunia komik. Selera, waktu, dan pilihan judul kalian bertentangan di semua lini! 🌪️",
      ],
    };

    // Fallback for unmatched combos (e.g. 'HMH', 'LMH', etc.)
    const fallback = [
      `Kecocokan kalian cukup menarik! Judul: ${comicScore}%, Genre: ${genreScore}%, Habit: ${habitScore}%. Ada kesamaan yang perlu dijelajahi lebih lanjut. 🔎`,
      "Kalian punya campuran yang unik — sebagian cocok, sebagian berbeda. Itulah yang bikin persahabatan seru! 🎲",
      `Dengan skor total ${totalScore}%, kalian cukup kompatibel untuk saling bertukar rekomendasi komik! 📚`,
    ];

    const pool = messages[combo] || fallback;
    const message = pool[Math.floor(Math.random() * pool.length)];

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
