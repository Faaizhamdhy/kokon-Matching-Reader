"use client";

import { useEffect, useState, useCallback, Suspense, useRef } from "react";
import Link from "next/link";

// === Types ===
type MangaItem = {
  mal_id: number;
  title: string;
  title_original: string;
  cover_url: string;
  cover_small: string;
  score: number | null;
  scored_by: number;
  rank: number | null;
  popularity: number | null;
  members: number;
  favorites: number;
  status: string;
  type: string;
  chapters: number | null;
  volumes: number | null;
  synopsis: string;
  genres: string;
  demographic: string;
  authors: string;
  mal_url: string;
  publishing: boolean;
};

type Pagination = {
  current_page: number;
  has_next_page: boolean;
  last_visible_page: number;
};

// === SVG Icons ===
const IconBook = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>;
const IconGlobe = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>;
const IconScroll = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>;
const IconZap = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>;
const IconStar = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
const IconTrendUp = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>;
const IconHeart = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>;
const IconRadio = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="2"/><path strokeLinecap="round" d="M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49m11.31-2.82a10 10 0 010 14.14m-14.14 0a10 10 0 010-14.14"/></svg>;
const IconTrophy = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 4h2a2 2 0 012 2v1c0 3.866-3.134 7-7 7S6 10.866 6 7V6a2 2 0 012-2h2m-2 0V3m8 1V3m-4 11v3m-3 3h6"/></svg>;

// === Filter Config ===
const TYPE_FILTERS = [
  { key: "manga", label: "Manga", icon: <IconBook /> },
  { key: "manhwa", label: "Manhwa", icon: <IconGlobe /> },
  { key: "manhua", label: "Manhua", icon: <IconScroll /> },
  { key: "novel", label: "Novel", icon: <IconScroll /> },
  { key: "oneshot", label: "One-Shot", icon: <IconZap /> },
];

const SORT_FILTERS = [
  { key: "", label: "Skor Tertinggi", icon: <IconStar /> },
  { key: "popularity", label: "Terpopuler", icon: <IconTrendUp /> },
  { key: "favorites", label: "Difavoritkan", icon: <IconHeart /> },
  { key: "publishing", label: "Sedang Terbit", icon: <IconRadio /> },
];

// === Rank Badge ===
function RankBadge({ rank }: { rank: number | null }) {
  if (!rank) return null;
  if (rank === 1) return <span className="text-[10px] font-black text-yellow-400 bg-yellow-400/15 border border-yellow-400/30 px-1.5 py-0.5 rounded-md">#{rank}</span>;
  if (rank === 2) return <span className="text-[10px] font-black text-gray-300 bg-gray-300/10 border border-gray-300/20 px-1.5 py-0.5 rounded-md">#{rank}</span>;
  if (rank === 3) return <span className="text-[10px] font-black text-amber-500 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-md">#{rank}</span>;
  if (rank <= 10) return <span className="text-[10px] font-bold text-konmik-primary bg-konmik-primary/10 border border-konmik-primary/20 px-1.5 py-0.5 rounded-md">#{rank}</span>;
  return <span className="text-[10px] text-gray-600 px-1">#{rank}</span>;
}

// === Score Ring ===
function ScoreRing({ score }: { score: number | null }) {
  if (!score) return null;
  const color = score >= 9 ? '#a855f7' : score >= 8 ? '#22c55e' : score >= 7 ? '#f59e0b' : '#94a3b8';
  return (
    <div className="flex items-center gap-1">
      <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0">
        <polygon points="7,1 8.5,5.5 13,5.5 9.5,8.5 11,13 7,10 3,13 4.5,8.5 1,5.5 5.5,5.5" fill={color} />
      </svg>
      <span className="text-xs font-bold" style={{ color }}>{score.toFixed(2)}</span>
    </div>
  );
}

// === Skeleton Card ===
function SkeletonCard() {
  return (
    <div className="bg-konmik-card rounded-2xl overflow-hidden animate-pulse flex flex-col">
      <div className="aspect-[3/4] bg-white/5 w-full" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-white/10 rounded-full w-3/4" />
        <div className="h-2.5 bg-white/5 rounded-full w-1/2" />
        <div className="h-2 bg-white/5 rounded-full w-2/3" />
      </div>
    </div>
  );
}

// === Detail Modal ===
function DetailModal({ item, onClose }: { item: MangaItem; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const statusColor = item.publishing
    ? 'text-green-400 bg-green-400/10 border-green-400/30'
    : 'text-blue-400 bg-blue-400/10 border-blue-400/30';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-konmik-card border border-white/10 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Cover header with gradient */}
        <div className="relative h-48 sm:h-64 overflow-hidden rounded-t-3xl">
          <img
            src={item.cover_url || item.cover_small}
            alt={item.title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-konmik-card via-konmik-card/50 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors border border-white/20"
          >
            ✕
          </button>
          <div className="absolute bottom-4 left-4 flex gap-2 flex-wrap">
            <RankBadge rank={item.rank} />
            {item.demographic && (
              <span className="text-xs bg-konmik-primary/20 text-konmik-primary border border-konmik-primary/30 px-2 py-0.5 rounded-full font-semibold">
                {item.demographic}
              </span>
            )}
            <span className={`text-xs border px-2 py-0.5 rounded-full font-semibold ${statusColor}`}>
              {item.status}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h2 className="text-xl font-black text-white mb-1 leading-tight">{item.title}</h2>
          {item.title_original !== item.title && (
            <p className="text-gray-500 text-sm mb-3">{item.title_original}</p>
          )}

          {/* Stats Row */}
          <div className="flex flex-wrap gap-4 mb-4 py-3 border-y border-white/5">
            {item.score && (
              <div className="text-center">
                <div className="text-yellow-400 font-black text-lg flex items-center justify-center gap-1"><IconStar /> {item.score}</div>
                <div className="text-gray-600 text-xs">{(item.scored_by / 1000).toFixed(0)}k suara</div>
              </div>
            )}
            {item.rank && (
              <div className="text-center">
                <div className="text-konmik-primary font-black text-lg">#{item.rank}</div>
                <div className="text-gray-600 text-xs">Ranking</div>
              </div>
            )}
            {item.popularity && (
              <div className="text-center">
                <div className="text-orange-400 font-black text-lg">#{item.popularity}</div>
                <div className="text-gray-600 text-xs">Popularitas</div>
              </div>
            )}
            {item.members > 0 && (
              <div className="text-center">
                <div className="text-blue-400 font-black text-lg">{(item.members / 1000).toFixed(0)}k</div>
                <div className="text-gray-600 text-xs">Member</div>
              </div>
            )}
            {item.chapters && (
              <div className="text-center">
                <div className="text-green-400 font-black text-lg">{item.chapters}</div>
                <div className="text-gray-600 text-xs">Chapter</div>
              </div>
            )}
          </div>

          {/* Meta */}
          {item.authors && (
            <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
              <IconScroll /> <span className="text-white">{item.authors}</span>
            </p>
          )}
          {item.genres && (
            <div className="flex flex-wrap gap-1 mb-4">
              {item.genres.split(', ').map(g => (
                <span key={g} className="text-[11px] bg-white/5 text-gray-300 border border-white/10 px-2 py-0.5 rounded-full">{g}</span>
              ))}
            </div>
          )}

          {/* Synopsis */}
          {item.synopsis && (
            <p className="text-gray-400 text-sm leading-relaxed line-clamp-5 mb-5">{item.synopsis}</p>
          )}

          <a
            href={item.mal_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-konmik-primary to-purple-600 hover:opacity-90 text-white font-bold py-3 rounded-2xl transition-all shadow-lg shadow-purple-900/30"
          >
            <span>Lihat di MyAnimeList</span>
            <span>↗</span>
          </a>
        </div>
      </div>
    </div>
  );
}

// === Comic Card ===
function ComicCard({ item, onClick }: { item: MangaItem; onClick: () => void }) {
  const [imgError, setImgError] = useState(false);
  const isTop3 = item.rank && item.rank <= 3;

  return (
    <div
      onClick={onClick}
      className={`group relative bg-konmik-card rounded-2xl overflow-hidden border cursor-pointer transition-all duration-300 hover:-translate-y-1.5 ${
        isTop3
          ? 'border-yellow-400/30 shadow-[0_0_20px_rgba(250,204,21,0.1)]'
          : 'border-white/5 hover:border-konmik-primary/30 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]'
      }`}
    >
      {/* Cover */}
      <div className="aspect-[3/4] overflow-hidden bg-konmik-dark relative">
        {!imgError && (item.cover_small || item.cover_url) ? (
          <img
            src={item.cover_small || item.cover_url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-konmik-dark/80">
            <IconBook />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Rank badge top-left */}
        <div className="absolute top-2 left-2">
          <RankBadge rank={item.rank} />
        </div>

        {/* Score top-right */}
        {item.score && (
          <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-lg px-1.5 py-0.5 border border-white/10">
            <ScoreRing score={item.score} />
          </div>
        )}

        {/* Hover CTA */}
        <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button className="w-full bg-konmik-primary/90 hover:bg-konmik-primary text-white text-xs font-bold py-2 rounded-xl transition-colors backdrop-blur-sm">
            Lihat Detail
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-white text-xs font-semibold leading-tight line-clamp-2 mb-1 group-hover:text-konmik-primary transition-colors">
          {item.title}
        </h3>
        {item.genres && (
          <p className="text-gray-600 text-[10px] truncate">{item.genres.split(', ').slice(0, 2).join(' · ')}</p>
        )}
        {item.type && (
          <span className="text-[10px] text-konmik-primary/60 mt-1 block">{item.type}{item.chapters ? ` · ${item.chapters} ch` : ''}</span>
        )}
      </div>
    </div>
  );
}

// === Main Content ===
function TopComicsContent() {
  const [type, setType] = useState('manga');
  const [sort, setSort] = useState('');
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<MangaItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ current_page: 1, has_next_page: false, last_visible_page: 1 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MangaItem | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async (t: string, s: string, q: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: t, filter: s, page: String(p), ...(q && { q }) });
      const res = await fetch(`/api/explore?${params}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.data || []);
        setPagination(data.pagination || { current_page: p, has_next_page: false, last_visible_page: 1 });
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(type, sort, query, page);
  }, [type, sort, query, page, fetchData]);

  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery(val);
      setPage(1);
    }, 700);
  };

  const handleTypeChange = (t: string) => { setType(t); setPage(1); };
  const handleSortChange = (s: string) => { setSort(s); setPage(1); };

  const currentSort = SORT_FILTERS.find(f => f.key === sort);
  const currentType = TYPE_FILTERS.find(f => f.key === type);

  return (
    <div className="min-h-screen bg-konmik-darker text-white">
      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} />}

      {/* ===== Hero Banner ===== */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-konmik-darker via-[#1a0a2e] to-konmik-darker" />
        <div className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-konmik-primary/8 rounded-full blur-[100px]" />
        <div className="absolute -bottom-10 right-0 w-[400px] h-[400px] bg-purple-800/8 rounded-full blur-[80px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
          {/* Heading */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/25 rounded-full px-4 py-1.5 text-sm text-yellow-400 font-bold mb-4 tracking-wide">
              <IconTrophy /> MyAnimeList Rankings
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-white mb-3 leading-tight tracking-tight">
              Top <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-konmik-primary bg-clip-text text-transparent">Komik</span>
            </h1>
            <p className="text-gray-400 text-base sm:text-lg max-w-lg mx-auto">
              Daftar manga, manhwa, dan manhua terbaik di dunia berdasarkan skor komunitas MyAnimeList.
            </p>
          </div>

          {/* Search */}
          <div className="max-w-xl mx-auto mb-7">
            <div className="relative">
              <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={searchInput}
                onChange={e => handleSearchInput(e.target.value)}
                placeholder={`Cari ${currentType?.label || 'komik'}...`}
                className="w-full bg-konmik-card/80 backdrop-blur-md border border-white/10 rounded-2xl py-3.5 px-6 pl-14 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-konmik-primary/40 focus:border-konmik-primary/40 text-sm shadow-xl transition-all"
              />
              {searchInput && (
                <button onClick={() => { setSearchInput(''); setQuery(''); setPage(1); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">✕</button>
              )}
            </div>
          </div>

          {/* Type Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {TYPE_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => handleTypeChange(f.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                  type === f.key
                    ? 'bg-konmik-primary text-white border-konmik-primary shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                    : 'bg-konmik-card text-gray-400 border-white/10 hover:text-white hover:border-white/20'
                }`}
              >
                <span>{f.icon}</span> {f.label}
              </button>
            ))}
          </div>

          {/* Sort Tabs */}
          <div className="flex flex-wrap justify-center gap-2">
            {SORT_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => handleSortChange(f.key)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  sort === f.key
                    ? 'bg-yellow-400/15 text-yellow-400 border-yellow-400/30'
                    : 'bg-konmik-card text-gray-500 border-white/5 hover:text-gray-300 hover:border-white/15'
                }`}
              >
                <span>{f.icon}</span> {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Grid ===== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* Stats row */}
        <div className="flex items-center mb-5">
          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
            <p className="text-gray-400 text-sm">
              {loading ? 'Mengambil data MAL...' : `${items.length} komik`}
              {query && <span className="text-konmik-primary"> · "{query}"</span>}
              {!query && currentSort && <span className="text-yellow-400/60"> · {currentSort.label}</span>}
            </p>
          </div>
        </div>

        {/* Comic Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {loading
            ? Array.from({ length: 24 }).map((_, i) => <SkeletonCard key={i} />)
            : items.length > 0
              ? items.map((item, idx) => (
                  <ComicCard key={`${item.mal_id}-${idx}-${page}`} item={item} onClick={() => setSelected(item)} />
                ))
              : (
                <div className="col-span-full py-24 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center text-gray-600 mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/></svg>
                  </div>
                  <p className="text-gray-400 text-base font-semibold">Tidak ada hasil ditemukan</p>
                  <p className="text-gray-600 text-sm mt-2">Coba ganti kata kunci atau filter lain</p>
                </div>
              )
          }
        </div>

        {/* Pagination Bottom */}
        {!loading && items.length > 0 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-2xl bg-konmik-card border border-white/10 text-gray-400 hover:text-white hover:border-konmik-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              ← Sebelumnya
            </button>
            <span className="text-sm text-gray-500 bg-konmik-card border border-white/5 px-4 py-2 rounded-2xl">
              Hal. <span className="text-white font-bold">{pagination.current_page}</span>
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!pagination.has_next_page}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-2xl bg-konmik-card border border-white/10 text-gray-400 hover:text-white hover:border-konmik-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Berikutnya →
            </button>
          </div>
        )}

        {/* MAL credit */}
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-xs">
            Data dari{' '}
            <a href="https://myanimelist.net" target="_blank" rel="noopener noreferrer" className="text-konmik-primary hover:underline">
              MyAnimeList
            </a>{' '}
            via Jikan API
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TopComicsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-konmik-darker">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-konmik-primary/30 border-t-konmik-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Memuat Top Komik...</p>
        </div>
      </div>
    }>
      <TopComicsContent />
    </Suspense>
  );
}
