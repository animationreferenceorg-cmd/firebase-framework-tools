import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PLUGIN_DIRS: Record<string, string> = {
  maya: path.join('integrations', 'animo-maya', 'Animo_Data', 'Animo_AnimRef'),
  blender: path.join('integrations', 'animref-blender', 'animref_blender_addon'),
};

const SAFE_FILENAME_RE = /^[a-zA-Z0-9_]+\.(py|toml)$/;

function sha256(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function resolvePluginDir(plugin: string): string | null {
  const rel = PLUGIN_DIRS[plugin];
  if (!rel) return null;
  const full = path.join(process.cwd(), rel);
  if (!fs.existsSync(full)) return null;
  return full;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const plugin = (searchParams.get('plugin') || '').trim().toLowerCase();
  const file = (searchParams.get('file') || '').trim();

  const dir = resolvePluginDir(plugin);
  if (!dir) {
    return NextResponse.json(
      { error: 'Unknown or unavailable plugin. Use ?plugin=maya or ?plugin=blender.' },
      { status: 404 }
    );
  }

  // Single-file download mode
  if (file) {
    if (!SAFE_FILENAME_RE.test(file)) {
      return NextResponse.json({ error: 'Invalid filename.' }, { status: 400 });
    }
    const targetPath = path.join(dir, file);
    if (!targetPath.startsWith(dir) || !fs.existsSync(targetPath)) {
      return NextResponse.json({ error: 'File not found.' }, { status: 404 });
    }
    const content = fs.readFileSync(targetPath);
    const hash = sha256(content);
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-SHA256': hash,
        'Cache-Control': 'no-store',
      },
    });
  }

  // Manifest mode: list all .py / .toml files with SHA-256 hashes
  const entries = fs
    .readdirSync(dir)
    .filter((name) => SAFE_FILENAME_RE.test(name))
    .sort();

  const origin = 'https://animationreference.org';
  const combinedHash = crypto.createHash('sha256');
  const files = entries.map((name) => {
    const content = fs.readFileSync(path.join(dir, name));
    const hash = sha256(content);
    combinedHash.update(`${name}:${hash}\n`);
    return {
      name,
      sha256: hash,
      size: content.length,
      url: `${origin}/api/plugins/updates?plugin=${encodeURIComponent(plugin)}&file=${encodeURIComponent(name)}`,
    };
  });

  const version = combinedHash.digest('hex').slice(0, 12);

  return NextResponse.json(
    {
      plugin,
      version,
      fileCount: files.length,
      files,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
