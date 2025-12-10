// src/app/shorts/[id]/page.tsx

import { ShortFilmDetailClient } from '@/components/ShortFilmDetailClient';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * This is the main page component, which is a Server Component.
 * It's responsible for getting the ID from the URL params and passing
 * it to the client component that handles rendering.
 */
export default async function ShortFilmDetailPage(props: PageProps) {
  const params = await props.params;
  return <ShortFilmDetailClient id={params.id} />;
}
