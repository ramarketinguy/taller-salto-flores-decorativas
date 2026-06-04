(function () {
  window.dataLayer = window.dataLayer || [];

  const getCookie = (name) => {
    const value = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${name}=`));

    return value ? decodeURIComponent(value.split("=").slice(1).join("=")) : "";
  };

  const createEventId = () => {
    const params = new URLSearchParams(window.location.search);
    const externalId = params.get("event_id") || params.get("payment_id") || params.get("collection_id");

    if (externalId) {
      return `purchase-${externalId.slice(0, 80)}`;
    }

    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }

    return `purchase-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const eventId = createEventId();
  const storageKey = `purchase_tracked:${eventId}`;

  if (!window.sessionStorage.getItem(storageKey)) {
    const customData = {
      currency: "UYU",
      value: 6050,
      content_name: "Taller Arte floral en papel de arroz y buttercream",
      content_category: "Seminario presencial",
      num_items: 1
    };

    if (typeof window.fbq === "function") {
      window.fbq("track", "Purchase", customData, { eventID: eventId });
    }

    window.dataLayer.push({
      event: "purchase",
      event_id: eventId,
      ...customData
    });

    window
      .fetch("/api/meta-capi/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          eventId,
          eventName: "Purchase",
          leadSource: "thank_you_page",
          customData,
          sourceUrl: window.location.href,
          fbp: getCookie("_fbp"),
          fbc: getCookie("_fbc")
        })
      })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Meta CAPI request failed");
        }
      })
      .catch(() => {
        window.dataLayer.push({
          event: "capi_event_error",
          event_name: "Purchase",
          item_name: "Taller Arte floral en papel de arroz y buttercream"
        });
      });

    window.sessionStorage.setItem(storageKey, "1");
  }

  const revealItems = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 }
    );

    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }
})();
