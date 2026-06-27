import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '.env.local') });

// Load system env vars as well
config();

async function testKey(keyName: string, keyValue: string) {
  if (!keyValue || !keyValue.startsWith('AIza')) return;
  const apiKey = keyValue.trim();
  console.log(`Testing key ${keyName} (${apiKey.substring(0, 10)}...):`);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Hello" }] }]
        })
      }
    );

    if (response.ok) {
      console.log(`✅ KEY WORKED: ${keyName}`);
      return true;
    } else {
      console.log(`❌ Key failed: ${keyName} - HTTP ${response.status}`);
    }
  } catch (e: any) {
    console.log(`❌ Error for ${keyName}: ${e.message}`);
  }
  return false;
}

async function findKeys() {
  const keysToTest = Object.entries(process.env);
  for (const [name, val] of keysToTest) {
    if (name.includes('KEY') || name.includes('API') || (val && val.startsWith('AIza'))) {
      if (val) {
        await testKey(name, val);
      }
    }
  }
}

findKeys().catch(console.error);
