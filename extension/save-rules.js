/*
 * Rules for the hover Save button: which media qualify, which pages and
 * elements opt out, and how a save travels to Animation Reference.
 * Pure functions with no DOM side effects, shared by the content script and
 * unit tests (loaded as a classic content script, or required in tests).
 */
(function (root) {
  /** Smallest on-screen size that is useful as animation reference (16:9 at 200px wide). */
  const MIN_WIDTH = 200;
  const MIN_HEIGHT = 112;

  /** Element attributes that opt media out of saving, including Pinterest's, which sites already use. */
  const OPT_OUT_ATTRIBUTES = ['nopin', 'data-pin-nopin', 'data-animref-nosave'];
  /** How far up the tree an opt-out attribute on a wrapper still applies. */
  const OPT_OUT_DEPTH = 6;

  /** Our own site has its own save controls; webmail is private by nature. */
  const EXCLUDED_HOSTS = [
    /(^|\.)animationreference\.org$/,
    /^localhost$/,
    /^mail\.google\.com$/,
    /^outlook\.(live|office|office365)\.com$/,
    /^mail\.yahoo\.com$/,
    /^mail\.proton\.me$/,
    /^app\.fastmail\.com$/,
    /^mail\.aol\.com$/,
    /^mail\.zoho\.com$/,
    /(^|\.)icloud\.com$/,
  ];

  /** Post pages the server can fetch a full video from by URL alone. */
  const SUPPORTED_POST_URL = /^https?:\/\/(?:[^/]+\.)?(?:instagram\.com|youtube\.com|youtu\.be|tiktok\.com|vimeo\.com|x\.com|twitter\.com|facebook\.com|fb\.watch|sakugabooru\.com)\//i;

  function isHostExcluded(hostname) {
    const host = String(hostname || '').toLowerCase();
    return EXCLUDED_HOSTS.some((pattern) => pattern.test(host));
  }

  /** Page-wide opt-out: <meta name="pinterest" content="nopin"> or <meta name="animationreference" content="nosave">. */
  function pageOptsOut(metas) {
    return (metas || []).some((meta) => {
      const name = String(meta.name || '').toLowerCase().trim();
      const content = String(meta.content || '').toLowerCase().trim();
      return (name === 'pinterest' && content === 'nopin') || (name === 'animationreference' && content === 'nosave');
    });
  }

  function elementOptsOut(element) {
    let node = element;
    for (let depth = 0; node && depth <= OPT_OUT_DEPTH; depth += 1) {
      if (typeof node.hasAttribute === 'function' && OPT_OUT_ATTRIBUTES.some((name) => node.hasAttribute(name))) return true;
      node = node.parentElement;
    }
    return false;
  }

  function mediaKind(element) {
    const tag = String(element?.tagName || '').toUpperCase();
    if (tag === 'IMG') return 'image';
    if (tag === 'VIDEO') return 'video';
    return null;
  }

  /** Rendered size must be big enough; images must also have a big enough file behind them. */
  function meetsSize({ kind, renderedWidth, renderedHeight, naturalWidth, naturalHeight }) {
    if (!(renderedWidth >= MIN_WIDTH && renderedHeight >= MIN_HEIGHT)) return false;
    if (kind === 'image') return naturalWidth >= MIN_WIDTH && naturalHeight >= MIN_HEIGHT;
    return true;
  }

  function isHttpUrl(value) {
    return typeof value === 'string' && /^https?:\/\//i.test(value);
  }

  /**
   * How a save travels:
   *  - 'file': the media is a plain http(s) file; the extension downloads it
   *    in the user's browser and uploads it.
   *  - 'link': the media streams in pieces (blob: video) on a post page the
   *    server can fetch by URL.
   *  - 'unsupported': neither; the capture panel is the way in.
   */
  function saveMode({ kind, mediaUrl, pageUrl }) {
    if (isHttpUrl(mediaUrl)) return 'file';
    if (kind === 'video' && SUPPORTED_POST_URL.test(String(pageUrl || ''))) return 'link';
    return 'unsupported';
  }

  /** A right-clicked link to a supported post can be saved by URL. */
  function linkSaveMode(linkUrl) {
    return SUPPORTED_POST_URL.test(String(linkUrl || '')) ? 'link' : 'unsupported';
  }

  function cleanText(value, max) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
  }

  /** The best available human title: alt text, then title/aria-label, then the page title. */
  function suggestedTitle({ alt, titleAttribute, ariaLabel, pageTitle }) {
    for (const candidate of [alt, titleAttribute, ariaLabel, pageTitle]) {
      const text = cleanText(candidate, 120);
      // Skip filename-like alt text such as "IMG_2041.jpg".
      if (text && !/^[\w-]+\.(jpe?g|png|gif|webp|avif|mp4|webm|mov)$/i.test(text)) return text;
    }
    return 'Saved reference';
  }

  /** File types the upload API accepts, keyed by MIME type, with the matching size cap. */
  const ACCEPTED_TYPES = {
    'image/jpeg': { kind: 'image', ext: 'jpg' },
    'image/png': { kind: 'image', ext: 'png' },
    'image/webp': { kind: 'image', ext: 'webp' },
    'image/gif': { kind: 'image', ext: 'gif' },
    'video/mp4': { kind: 'video', ext: 'mp4' },
    'video/webm': { kind: 'video', ext: 'webm' },
    'video/quicktime': { kind: 'video', ext: 'mov' },
  };
  const MAX_BYTES = { image: 25 * 1024 * 1024, video: 250 * 1024 * 1024 };
  const EXTENSION_TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };

  /** Resolve a usable MIME type from the response header, falling back to the URL's file extension. */
  function resolveMediaType(contentType, url) {
    const header = String(contentType || '').split(';')[0].trim().toLowerCase();
    if (ACCEPTED_TYPES[header]) return header;
    try {
      const ext = new URL(url).pathname.split('.').pop().toLowerCase();
      if (EXTENSION_TYPES[ext]) return EXTENSION_TYPES[ext];
    } catch {
      // Not a parseable URL: fall through.
    }
    return null;
  }

  const api = {
    MIN_WIDTH,
    MIN_HEIGHT,
    OPT_OUT_ATTRIBUTES,
    SUPPORTED_POST_URL,
    ACCEPTED_TYPES,
    MAX_BYTES,
    isHostExcluded,
    pageOptsOut,
    elementOptsOut,
    mediaKind,
    meetsSize,
    saveMode,
    linkSaveMode,
    suggestedTitle,
    resolveMediaType,
  };

  root.AR_SAVE_RULES = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : self);
