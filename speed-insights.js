(function () {
  if (typeof window === "undefined" || window.si) {
    return;
  }

  window.si = function (...params) {
    window.siq = window.siq || [];
    window.siq.push(params);
  };

  if (document.head.querySelector('script[src*="/_vercel/speed-insights/script.js"]')) {
    return;
  }

  const script = document.createElement("script");
  script.src = "/_vercel/speed-insights/script.js";
  script.defer = true;
  script.dataset.sdkn = "@vercel/speed-insights";
  script.dataset.sdkv = "2.0.0";
  document.head.appendChild(script);
})();
