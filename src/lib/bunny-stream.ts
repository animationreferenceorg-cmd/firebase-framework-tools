type BunnyVideoStatus = {
  status?: number;
  encodeProgress?: number;
  availableResolutions?: string;
};

export function bunnyStreamConfig() {
  return {
    apiKey: process.env.BUNNY_API_KEY || '',
    libraryId: process.env.BUNNY_LIBRARY_ID || process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID || '',
    host: process.env.NEXT_PUBLIC_BUNNY_STREAM_HOST || 'vz-cdfeb679-25c.b-cdn.net',
  };
}

export async function getBunnyVideoStatus(guid: string): Promise<BunnyVideoStatus | null> {
  const { apiKey, libraryId } = bunnyStreamConfig();
  if (!apiKey || !libraryId || !guid) return null;
  const response = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${guid}`, {
    headers: { AccessKey: apiKey },
    cache: 'no-store',
  });
  if (!response.ok) return null;
  return response.json();
}

export function bunnyMp4Url(guid: string, availableResolutions = ''): string {
  const { host } = bunnyStreamConfig();
  const values = availableResolutions.match(/\d+/g)?.map(Number) || [];
  const resolution = values.filter((value) => value <= 1080).sort((a, b) => b - a)[0] || 720;
  return `https://${host}/${guid}/play_${resolution}p.mp4`;
}

export async function waitForBunnyVideo(guid: string, timeoutMs = 120_000): Promise<BunnyVideoStatus> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const video = await getBunnyVideoStatus(guid);
    if (video?.status === 4) return video;
    if (video?.status === 5 || video?.status === 6) throw new Error('Bunny Stream could not process this video.');
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error('Video processing took too long. Please try again.');
}
