import { Metadata, ResolvingMetadata } from 'next';
import ProfileClient from './ProfileClient';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
};

export async function generateMetadata(
  { searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const username = resolvedParams.u as string;

  if (!username) {
    return {
      title: 'Profile | KonMik',
      description: 'Lihat profil pembaca komik di KonMik.'
    }
  }

  try {
    const res = await fetch(`https://api.konkon.id/stats/${encodeURIComponent(username)}`, { cache: 'no-store' });
    const stats = await res.json();
    
    if (stats && stats.created_at) {
      const displayName = stats.display_name || username;
      const title = `${displayName} | KonMik Profile`;
      
      const totalComics = stats.comics || stats.comics_read || 0;
      const totalChapters = stats.chapters || stats.chapters_read || 0;
      
      let description = `Lihat statistik membaca dari ${displayName} di KonMik! `;
      if (totalComics > 0) {
        description += `Membaca ${totalComics} komik dengan total ${totalChapters} chapter.`;
      }
      
      const ogImage = stats.banner_url || stats.profile_url || '/icon.png';
      
      return {
        title,
        description,
        openGraph: {
          title,
          description,
          images: [ogImage],
          type: 'profile',
          siteName: 'KonMik',
        },
        twitter: {
          card: 'summary_large_image',
          title,
          description,
          images: [ogImage],
        }
      }
    }
  } catch (e) {
    console.error("Failed to generate metadata for profile", e);
  }

  return {
    title: `${username} | KonMik Profile`,
    description: `Lihat profil membaca dari ${username} di KonMik!`,
  }
}

export default function Page() {
  return <ProfileClient />;
}
