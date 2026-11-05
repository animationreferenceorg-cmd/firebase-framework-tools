import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/sw.js/route';

afterEach(() => vi.unstubAllEnvs());

describe('service worker mode', () => {
  it('clears the old development shell and unregisters without intercepting navigations', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const response = GET();
    const script = await response.text();
    expect(script).toContain("caches.delete('aref-shell-v1')");
    expect(script).toContain('self.registration.unregister()');
    expect(script).not.toContain("addEventListener('fetch'");
    expect(response.headers.get('cache-control')).toContain('must-revalidate');
  });

  it('keeps the network-first offline fallback in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const script = await GET().text();
    expect(script).toContain("addEventListener('fetch'");
    expect(script).toContain('fetch(request)');
    expect(script).toContain('caches.match(SHELL_KEY)');
    expect(script).not.toContain('self.registration.unregister()');
  });
});
