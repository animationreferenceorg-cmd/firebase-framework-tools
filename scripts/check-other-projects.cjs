const { Storage } = require('@google-cloud/storage');

async function checkOtherProjects() {
  const projects = ['michaelfred-d9d7d', 'lisa-hall'];
  for (const pid of projects) {
    console.log('\nChecking project:', pid);
    try {
      const storage = new Storage({ projectId: pid });
      const [buckets] = await storage.getBuckets();
      console.log(`  Buckets in ${pid} (${buckets.length}):`, buckets.map(b => b.name));
      for (const b of buckets) {
        try {
          const [files] = await b.getFiles({ maxResults: 5 });
          console.log(`    Bucket ${b.name} sample files:`, files.map(f => f.name));
        } catch(e) {
          console.log(`    Cannot list files in ${b.name}:`, e.message);
        }
      }
    } catch(err) {
      console.log(`  Error querying ${pid}:`, err.message);
    }
  }
}

checkOtherProjects().then(() => process.exit(0)).catch(console.error);
