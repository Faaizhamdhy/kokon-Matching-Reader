import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ success: false, message: "Username required" }, { status: 400 });
    }

    const authHeader = request.headers.get('Authorization');
    const fetchOptions: RequestInit = {
      cache: "no-store",
      headers: authHeader ? { "Authorization": authHeader } as Record<string, string> : {} as Record<string, string>
    };

    const [statsRes, historyRes, metricsRes, bookmarksRes] = await Promise.all([
      fetch(`${API_BASE}/stats/${encodeURIComponent(username)}`, fetchOptions),
      fetch(`${API_BASE}/history/${encodeURIComponent(username)}`, fetchOptions),
      fetch(`${API_BASE}/profile_metrics/${encodeURIComponent(username)}`, fetchOptions),
      fetch(`${API_BASE}/bookmarks/${encodeURIComponent(username)}`, fetchOptions)
    ]);

    const statsData = await statsRes.json();
    const historyData = await historyRes.json();
    let metricsData: any = {};
    if (metricsRes.ok) {
      try {
        metricsData = await metricsRes.json();
      } catch (e) {
        console.error("Failed to parse metrics", e);
      }
    }

    if (!statsRes.ok || !historyRes.ok) {
      return NextResponse.json({ success: false, message: "Failed to fetch profile data" }, { status: 500 });
    }

    const comics = historyData.data || [];

    // Fallback logic for Podium if backend doesn't provide it
    if (!metricsData.top_mangas && comics.length > 0) {
      const sortedComics = [...comics].sort((a: any, b: any) => {
        const numA = parseInt(String(a.last_chapter).replace(/[^0-9]/g, '') || '0', 10);
        const numB = parseInt(String(b.last_chapter).replace(/[^0-9]/g, '') || '0', 10);
        return numB - numA;
      });
      metricsData.top_mangas = sortedComics.slice(0, 3).map((c: any) => ({
        title: c.title,
        cover_url: c.cover_url,
        chapter_num: parseInt(String(c.last_chapter).replace(/[^0-9]/g, '') || '0', 10),
        chapter_str: c.last_chapter
      }));
    }

    // Fallback for Minutes and created_at from statsData
    if (metricsData.total_minutes === undefined) {
      metricsData.total_minutes = statsData.minutes || 0;
    }
    if (!metricsData.created_at) {
      metricsData.created_at = statsData.created_at || '';
    }

    // Fallback for Bookmarks
    if (metricsData.total_bookmarks === undefined) {
      let total_bm = 0;
      if (bookmarksRes.ok) {
        try {
          const bmData = await bookmarksRes.json();
          total_bm = bmData.data?.length || 0;
        } catch (e) {}
      }
      metricsData.total_bookmarks = total_bm;
    }

    // Fix Cover URLs (prepend API_BASE if it's a relative proxy path)
    const fixCoverUrl = (url: string) => {
      if (url && url.startsWith('/')) return `${API_BASE}${url}`;
      return url;
    };

    if (metricsData.top_mangas) {
      metricsData.top_mangas = metricsData.top_mangas.map((c: any) => ({
        ...c,
        cover_url: fixCoverUrl(c.cover_url)
      }));
    }

    const fixedComics = comics.map((c: any) => ({
      ...c,
      cover_url: fixCoverUrl(c.cover_url)
    }));

    // Compute Waktu Aktif (0-23 hours distribution)
    const timeDistribution: Record<number, number> = {};
    for (let i = 0; i < 24; i++) timeDistribution[i] = 0;

    let totalReadEvents = 0;
    comics.forEach((c: any) => {
      if (c.updated_at) {
        const dateStr = c.updated_at.replace(" ", "T") + "Z";
        const date = new Date(dateStr);
        if (!isNaN(date.getHours())) {
          timeDistribution[date.getHours()]++;
          totalReadEvents++;
        }
      }
    });

    // Compute Top Genres
    const genreTally: Record<string, number> = {};
    let totalGenres = 0;
    comics.forEach((c: any) => {
      if (c.genres && c.genres !== '-') {
        const gList = c.genres.split(',').map((g: string) => g.trim().toLowerCase());
        gList.forEach((g: string) => {
          if (g) {
            genreTally[g] = (genreTally[g] || 0) + 1;
            totalGenres++;
          }
        });
      }
    });

    const topGenres = Object.entries(genreTally)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        count,
        percentage: Math.round((count / Math.max(totalGenres, 1)) * 100)
      }));

    // Helpers
    const getReaderType = (stats: any) => {
      const ch = parseInt(stats.chapters_read || stats.chapters || 0);
      const co = parseInt(stats.comics_read || stats.comics || 0);
      if (co === 0) return "🚶 Casual Reader";
      return (ch / co) > 10 ? "🏎️ Suka Maraton" : "🚶 Casual Reader";
    };

    const getTimeProfile = () => {
      if (totalReadEvents === 0) return "Belum diketahui";
      let maxHour = -1;
      let maxCount = -1;
      for (const [hour, count] of Object.entries(timeDistribution)) {
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

    const getWeeklyObsession = () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentComics = comics.filter((c:any) => {
        if (!c.updated_at) return false;
        const dateStr = c.updated_at.replace(" ", "T") + "Z";
        return new Date(dateStr) >= sevenDaysAgo;
      });

      const recentGenreTally: Record<string, number> = {};
      recentComics.forEach((c: any) => {
        if (c.genres && c.genres !== '-') {
          const gList = c.genres.split(',').map((g: string) => g.trim());
          gList.forEach((g: string) => {
            if (g) recentGenreTally[g] = (recentGenreTally[g] || 0) + 1;
          });
        }
      });
      const top = Object.entries(recentGenreTally).sort((a, b) => b[1] - a[1]);
      return top.length > 0 ? top[0][0] : null;
    };

    return NextResponse.json({
      success: true,
      data: {
        stats: statsData,
        recent_history: fixedComics.slice(0, 10), // Send last 10 with fixed covers
        metrics: {
          total_chapters: parseInt(statsData.chapters_read || statsData.chapters || 0),
          total_comics: parseInt(statsData.comics_read || statsData.comics || 0),
          time_distribution: Object.values(timeDistribution), // array of 24 ints
          top_genres: topGenres,
        },
        profiles: {
          time: getTimeProfile(),
          type: getReaderType(statsData),
          obsession: getWeeklyObsession()
        },
        advanced_metrics: metricsData
      }
    });

  } catch (error: any) {
    console.error("Profile API error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
