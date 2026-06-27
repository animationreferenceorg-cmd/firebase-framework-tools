import path from 'path';

async function main() {
  const dotenv = await import('dotenv');
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

  const { getAdminApp } = await import('../src/lib/firebase-admin');
  const { downloadSocialVideo } = await import('../src/app/actions/downloader');
  getAdminApp();

  const url = "https://www.instagram.com/p/DaAzynAspgz/";
  console.log(`Testing download of URL: ${url}`);
  const result = await downloadSocialVideo(url, false);
  console.log("Result:", result);
}

main().catch(console.error);
