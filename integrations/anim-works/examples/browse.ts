/**
 * Feature A: browsing the Animation Reference library from your backend.
 *
 * Run with:  AREF_API_KEY=… npx tsx examples/browse.ts
 */

import { ArefClient, ArefApiError } from '../src';

const client = new ArefClient({ apiKey: process.env.AREF_API_KEY! });

async function main() {
  // 1. Confirm the key and see what it can do.
  const status = await client.status();
  console.log(`Connected as ${status.partner} (${status.keyId})`);
  console.log(`Scopes: ${status.scopes.join(', ')}`);
  console.log(`Library: ${status.library.videoCount} clips`);
  console.log(`Rate limit: ${status.rateLimit.remaining}/${status.rateLimit.limit} left this minute\n`);

  // 2. The taxonomy, for filter UI. Cache these - they change rarely.
  const categories = await client.listCategories();
  console.log(`${categories.length} categories, e.g.`);
  categories.slice(0, 5).forEach((c) => console.log(`  ${c.slug.padEnd(24)} ${c.videoCount} clips`));

  const { data: tags } = await client.listTags({ limit: 5 });
  console.log(`\nTop tags:`);
  tags.forEach((t) => console.log(`  ${t.slug.padEnd(24)} ${t.videoCount} clips`));

  // 3. Search. `relevance` only sorts meaningfully when `q` is set.
  const results = await client.listVideos({ q: 'run cycle', sort: 'relevance', limit: 5 });
  console.log(`\n"run cycle" -> ${results.pagination.total} matches:`);
  for (const video of results.data) {
    const seconds = video.durationSeconds ? `${video.durationSeconds}s` : '—';
    console.log(`  ${video.title} (${seconds})`);
    console.log(`    ${video.url}`);
    if (video.credit.name) console.log(`    by ${video.credit.name}`);
  }

  // 4. Paginate properly: hand nextCursor back, never build one yourself.
  let cursor = results.pagination.nextCursor;
  if (cursor) {
    const nextPage = await client.listVideos({ q: 'run cycle', sort: 'relevance', limit: 5, cursor });
    console.log(`\nNext page: ${nextPage.data.length} more`);
  }

  // 5. Or let the client walk every page for you.
  let count = 0;
  for await (const video of client.listAllVideos({ tag: 'combat' })) {
    count++;
    if (count >= 120) break; // stop early; the generator is lazy
  }
  console.log(`\nWalked ${count} combat clips`);

  // 6. One clip plus similar ones - good for a "more like this" rail.
  const first = results.data[0];
  if (first) {
    const { data: video, related } = await client.getVideo(first.id, { related: 4 });
    console.log(`\n${video.title} - ${related.length} similar clips`);
    related.forEach((r) => console.log(`  ${r.title}`));
  }
}

main().catch((error) => {
  if (error instanceof ArefApiError) {
    console.error(`API error ${error.status} ${error.code}: ${error.message}`);
    if (error.code === 'INVALID_API_KEY') console.error('Check AREF_API_KEY.');
    process.exit(1);
  }
  throw error;
});
