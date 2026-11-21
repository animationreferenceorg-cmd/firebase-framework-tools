import { track } from '@/lib/analytics';

export type PluginKind = 'maya' | 'blender' | 'extension';

export function trackPluginDownload(plugin: PluginKind, source: string) {
  track('plugin_download_clicked', { plugin, source });
  try {
    fetch('/api/plugins/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'download', plugin, source }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Never block downloads
  }
}

export function trackPluginAccountLinked(plugin: PluginKind, idToken: string, source = 'extension_connect') {
  track('plugin_account_linked', { plugin, source });
  try {
    fetch('/api/plugins/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ event: 'account_linked', plugin, source }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Never block auth connect
  }
}
