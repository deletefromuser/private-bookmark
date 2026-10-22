(function (global) {
  const HTML_ESCAPES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
  }

  function safeUrl(value) {
    try {
      const url = new URL(String(value));
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return url.href;
      }
    } catch (e) {
      // Leave invalid URLs unusable.
    }
    return '#';
  }

  global.AppUtils = { escapeHtml, safeUrl };
})(globalThis);
