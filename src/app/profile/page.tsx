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
      let description = `Lihat statistik membaca dari ${displayName} di KonMik! `;
      if (stats.total_comics) {
        description += `Membaca ${stats.total_comics} komik dengan total ${stats.total_chapters} chapter.`;
      }
      
      return {
        title,
        description,
        openGraph: {
          title,
          description,
          images: [stats.profile_url || '/icon.png'],
          type: 'profile',
          siteName: 'KonMik',
        },
        twitter: {
          card: 'summary_large_image',
          title,
          description,
          images: [stats.profile_url || '/icon.png'],
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
