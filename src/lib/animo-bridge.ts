/**
 * Animo & Autodesk Maya Bridge for Animation Reference
 *
 * Connects the web app to the local Animo Maya plugin via a lightweight local HTTP server (port 44998).
 * Enables one-click reference import and drag-and-drop straight into Maya viewport.
 */

export const ANIMO_BRIDGE_PORT = 44998;
export const ANIMO_BRIDGE_URL = `http://127.0.0.1:${ANIMO_BRIDGE_PORT}`;

export interface MayaStatusResponse {
  status: string;
  app: string;
  plugin: string;
  version?: string;
  maya?: string;
}

export interface SendToMayaPayload {
  videoUrl: string;
  title: string;
  fps?: number;
}

export interface SendToMayaResult {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Check if Autodesk Maya is currently running with the Animo plugin active.
 */
export async function checkMayaConnection(timeoutMs = 1500): Promise<{ connected: boolean; info?: MayaStatusResponse }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(`${ANIMO_BRIDGE_URL}/status`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return { connected: false };
    }

    const data = (await res.json()) as MayaStatusResponse;
    if (data && data.status === 'ok') {
      return { connected: true, info: data };
    }

    return { connected: false };
  } catch (error) {
    return { connected: false };
  }
}

/**
 * Send a video reference to Autodesk Maya. Animo will download it,
 * extract frames with ffmpeg, and create an Image Plane on the current or reference camera.
 */
export async function sendVideoToMaya(payload: SendToMayaPayload): Promise<SendToMayaResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${ANIMO_BRIDGE_URL}/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Failed to import reference into Maya.');
      return {
        success: false,
        message: errorText || `Maya returned status ${res.status}`,
      };
    }

    const data = await res.json().catch(() => ({}));
    return {
      success: true,
      message: data.message || `Sent "${payload.title}" to Maya!`,
      data,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        success: false,
        message: 'Maya took too long to respond. Please ensure Maya is responsive.',
      };
    }
    return {
      success: false,
      message: 'Could not reach Maya. Make sure Maya is open with the Animo plugin active.',
    };
  }
}

/**
 * Helper to prepare drag data so users can drag a video from the browser
 * straight into Maya's 3D viewport. Maya's MExternalDropCallback detects URLs.
 */
export function setupMayaDragData(
  event: React.DragEvent<HTMLElement>,
  video: { videoUrl: string; title?: string }
) {
  if (!video.videoUrl) return;

  event.dataTransfer.setData('text/uri-list', video.videoUrl);
  event.dataTransfer.setData('text/plain', video.videoUrl);
  event.dataTransfer.setData(
    'application/json',
    JSON.stringify({
      videoUrl: video.videoUrl,
      title: video.title || 'Animation Reference',
    })
  );
  event.dataTransfer.effectAllowed = 'copyLink';
}
