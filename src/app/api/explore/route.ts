import { NextResponse } from 'next/server';

const JIKAN_BASE = 'https://api.jikan.moe/v4';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'manga'; // manga, manhwa, manhua, novel, oneshot
    const filter = searchParams.get('filter') || ''; // publishing, complete, upcoming, popularity
    const page = parseInt(searchParams.get('page') || '1', 10);
    const query = searchParams.get('q') || '';

    let url: string;

    if (query) {
      // Search mode
      url = `${JIKAN_BASE}/manga?q=${encodeURIComponent(query)}&type=${type}&page=${page}&limit=24&order_by=score&sort=desc`;
    } else if (filter === 'popularity') {
      // Top by popularity
      url = `${JIKAN_BASE}/top/manga?type=${type}&filter=bypopularity&page=${page}&limit=24`;
    } else if (filter === 'favorites') {
      url = `${JIKAN_BASE}/top/manga?type=${type}&filter=favorite&page=${page}&limit=24`;
    } else {
      // Default: top by score, optionally filtered by status
      const filterParam = filter ? `&filter=${filter}` : '';
      url = `${JIKAN_BASE}/top/manga?type=${type}${filterParam}&page=${page}&limit=24`;
    }

    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'KonMikWebApp/1.0'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ success: false, message: `Jikan API error: ${res.status} ${errText}` }, { status: 502 });
    }

    const data = await res.json();
    const items = data.data || [];
    const pagination = data.pagination || {};

    const normalized = items.map((item: any) => ({
      mal_id: item.mal_id,
      title: item.title_english || item.title || 'Tanpa Judul',
      title_original: item.title || '',
      cover_url: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url || '',
      cover_small: item.images?.webp?.image_url || item.images?.jpg?.image_url || '',
      score: item.score || null,
      scored_by: item.scored_by || 0,
      rank: item.rank || null,
      popularity: item.popularity || null,
      members: item.members || 0,
      favorites: item.favorites || 0,
      status: item.status || '',
      type: item.type || '',
      chapters: item.chapters || null,
      volumes: item.volumes || null,
      synopsis: item.synopsis || '',
      genres: (item.genres || []).concat(item.themes || []).map((g: any) => g.name).join(', '),
      demographic: (item.demographics || []).map((d: any) => d.name).join(', '),
      authors: (item.authors || []).map((a: any) => a.name).join(', '),
      mal_url: item.url || `https://myanimelist.net/manga/${item.mal_id}`,
      publishing: item.publishing || false,
    }));

    return NextResponse.json({
      success: true,
      data: normalized,
      pagination: {
        current_page: pagination.current_page || page,
        has_next_page: pagination.has_next_page || false,
        last_visible_page: pagination.last_visible_page || 1,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
