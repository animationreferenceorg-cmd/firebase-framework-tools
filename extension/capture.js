(() => {
  if (window.__animationReferenceCaptureInstalled) return;
  window.__animationReferenceCaptureInstalled = true;

  function activeVideo() {
    const videos = [...document.querySelectorAll('video')];
    return videos
      .filter((video) => {
        const rect = video.getBoundingClientRect();
        return rect.width > 80 && rect.height > 45 && rect.bottom > 0 && rect.top < innerHeight;
      })
      .sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))[0] || null;
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'AR_CAPTURE') return false;
    const video = activeVideo();
    if (!video) {
      sendResponse({ ok: false, error: 'No visible HTML5 video was found on this page.' });
      return false;
    }
    const canonical = document.querySelector('link[rel="canonical"]')?.href || location.href;
    const thumbnail = document.querySelector('meta[property="og:image"]')?.content || video.poster || '';
    sendResponse({
      ok: true,
      currentTime: Number(video.currentTime || 0),
      duration: Number.isFinite(video.duration) ? video.duration : null,
      pageUrl: canonical,
      title: document.querySelector('meta[property="og:title"]')?.content || document.title,
      thumbnailUrl: thumbnail,
    });
    return false;
  });
})();
