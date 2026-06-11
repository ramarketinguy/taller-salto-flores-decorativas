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

  const getPurchaseData = () => {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get("payment_id") || params.get("collection_id");
    const status = params.get("status") || params.get("collection_status");
    let pendingPurchase = null;

    try {
      pendingPurchase = JSON.parse(window.localStorage.getItem("pending_taller_purchase") || "null");
    } catch {
      pendingPurchase = null;
    }

    const pendingIsRecent =
      pendingPurchase &&
      Number.isFinite(pendingPurchase.created_at) &&
      Date.now() - pendingPurchase.created_at < 24 * 60 * 60 * 1000;
    const product = params.get("product") || (pendingIsRecent ? pendingPurchase.product : "");
    const transactionAmount = Number(params.get("transaction_amount"));

    if (!paymentId || (status && status !== "approved") || (!product && !pendingIsRecent)) {
      return null;
    }

    const products = {
      "jornada-completa": {
        value: 6050,
        content_name: "Jornada completa: papel de arroz y buttercream",
        content_category: "Jornada completa"
      },
      papel: {
        content_name: "Taller individual: Flores de papel",
        content_category: "Taller individual"
      },
      buttercream: {
        content_name: "Taller individual: Flores en buttercream",
        content_category: "Taller individual"
      }
    };

    const purchase = products[product] || {
      content_name: pendingPurchase.content_name,
      content_category: pendingPurchase.content_category
    };

    if (pendingIsRecent && Number.isFinite(pendingPurchase.value) && pendingPurchase.value > 0) {
      purchase.value = pendingPurchase.value;
    }

    if (Number.isFinite(transactionAmount) && transactionAmount > 0) {
      purchase.value = transactionAmount;
    }

    return purchase.value ? purchase : null;
  };

  const sendPurchaseToConversionsApi = ({ eventId, customData }) => {
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
  };

  const purchaseData = getPurchaseData();

  if (purchaseData) {
    const eventId = createEventId();
    const storageKey = `purchase_tracked:${eventId}`;
    const customData = {
      currency: "UYU",
      num_items: 1,
      ...purchaseData
    };

    if (!window.sessionStorage.getItem(storageKey)) {
      if (typeof window.fbq === "function") {
        window.fbq("track", "Purchase", customData, { eventID: eventId });
      }

      window.dataLayer.push({
        event: "purchase",
        event_id: eventId,
        ...customData
      });

      sendPurchaseToConversionsApi({
        eventId,
        customData
      });

      window.sessionStorage.setItem(storageKey, "1");
      window.localStorage.removeItem("pending_taller_purchase");
    }
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
