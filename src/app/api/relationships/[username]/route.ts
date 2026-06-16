import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

const API_BASE = "https://api.konkon.id";

export async function GET(request: Request, { params }: { params: Promise<{ username: string }> }) {
  try {
    const resolvedParams = await params;
    const authHeader = request.headers.get("authorization") || "";

    const fetchOptions: RequestInit = {
      method: 'GET',
      headers: {},
      cache: "no-store"
    };

    if (authHeader) {
      (fetchOptions.headers as any)["Authorization"] = authHeader;
    }

    const res = await fetch(`${API_BASE}/api/relationships/${resolvedParams.username}`, fetchOptions);
    
    let data;
    try {
      data = await res.json();
    } catch (err) {
      return NextResponse.json({ success: false, message: "Server backend mengembalikan respon yang tidak valid. Pastikan backend sudah di-deploy." }, { status: 502 });
    }

    if (data.success && data.accepted && data.accepted.length > 0) {
      const getTimeDistribution = (historyData: any[]) => {
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

      // Fetch self data
      const [selfHistoryRes, selfStatsRes] = await Promise.all([
        fetch(`${API_BASE}/history/${encodeURIComponent(resolvedParams.username)}`, fetchOptions),
        fetch(`${API_BASE}/stats/${encodeURIComponent(resolvedParams.username)}`, fetchOptions)
      ]);
      const selfHistory = await selfHistoryRes.json();
      const selfStats = await selfStatsRes.json();
      const sComics = selfHistory.data || [];
      const sTopGenres = getTopGenres(sComics);
      const sMinutes = selfStats.minutes || 0;
      data.self_time_dist = getTimeDistribution(sComics);

      // Enhance accepted
      const enhancedAccepted = await Promise.all(data.accepted.map(async (rel: any) => {
        try {
          const [tHistRes, tStatRes] = await Promise.all([
            fetch(`${API_BASE}/history/${encodeURIComponent(rel.user)}`, fetchOptions),
            fetch(`${API_BASE}/stats/${encodeURIComponent(rel.user)}`, fetchOptions)
          ]);
          const tHist = await tHistRes.json();
          const tStat = await tStatRes.json();
          
          const tComics = tHist.data || [];
          rel.time_distribution = tHist.is_private ? [0, 0, 0, 0, 0] : getTimeDistribution(tComics);
          
          let exactComicScore = 0;
          let genreScore = 0;
          if (!tHist.is_private) {
            const sIds = sComics.map((c: any) => c.manga_id);
            const commonComics = tComics.filter((c: any) => sIds.includes(c.manga_id));
            exactComicScore = Math.min((commonComics.length / 5) * 35, 35); 

            const tTopGenres = getTopGenres(tComics);
            const commonGenreNames = sTopGenres.filter(g => tTopGenres.includes(g));
            const maxGenres = Math.max(sTopGenres.length, tTopGenres.length, 1);
            genreScore = (commonGenreNames.length / maxGenres) * 35;
          }
          
          const tMinutes = tStat.minutes || 0;
          let habitScore = 30;
          if (sMinutes > 0 || tMinutes > 0) {
            const diffRatio = Math.abs(sMinutes - tMinutes) / Math.max(sMinutes, tMinutes, 1);
            habitScore = 30 - (diffRatio * 30);
          }
          
          let totalScore = Math.round(exactComicScore + genreScore + habitScore);
          if (totalScore < 10) totalScore = 10 + Math.floor(Math.random() * 10);
          if (totalScore > 100) totalScore = 100;
          
          rel.similarity_score = totalScore;
        } catch (e) {
          rel.time_distribution = [0, 0, 0, 0, 0];
          rel.similarity_score = 0;
        }
        return { ...rel };
      }));
      data.accepted = enhancedAccepted;
      data.debug_enhanced = true;
    }

    return NextResponse.json({ ...data }, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
