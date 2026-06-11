(function () {
  const checkout = document.getElementById("checkout");
  const triggers = document.querySelectorAll("[data-checkout-trigger]");
  const paymentLinks = document.querySelectorAll("[data-payment-link]");
  const whatsappLinks = document.querySelectorAll(".whatsapp-button");
  const workshopModal = document.getElementById("workshop-modal");
  const workshopModalOpenButtons = document.querySelectorAll("[data-workshop-modal-open]");
  const workshopModalCloseButtons = document.querySelectorAll("[data-workshop-modal-close]");
  const lightbox = document.getElementById("image-lightbox");
  const lightboxImage = document.querySelector("[data-lightbox-image]");
  const lightboxTriggers = document.querySelectorAll("[data-lightbox-src]");
  const lightboxCloseButtons = document.querySelectorAll("[data-lightbox-close]");
  const revealItems = document.querySelectorAll(".reveal");
  let checkoutTracked = false;
  let checkoutLeadTracked = false;
  let lastLightboxTrigger = null;
  let lastWorkshopModalTrigger = null;

  window.dataLayer = window.dataLayer || [];

  const getCookie = (name) => {
    const value = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${name}=`));

    return value ? decodeURIComponent(value.split("=").slice(1).join("=")) : "";
  };

  const createEventId = () => {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }

    return `checkout-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const sendEventToConversionsApi = ({ eventId, eventName, leadSource, customData }) => {
    const payload = {
      eventId,
      eventName,
      leadSource,
      customData,
      sourceUrl: window.location.href,
      fbp: getCookie("_fbp"),
      fbc: getCookie("_fbc")
    };

    window
      .fetch("/api/meta-capi/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        keepalive: true,
        body: JSON.stringify(payload)
      })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Meta CAPI request failed");
        }
      })
      .catch(() => {
        window.dataLayer.push({
          event: "capi_event_error",
          event_name: eventName,
          item_name: "Taller Arte floral en papel de arroz y buttercream"
        });
      });
  };

  const trackMetaEvent = ({ eventName, eventId, leadSource, dataLayerEvent, customData }) => {
    if (typeof window.fbq === "function") {
      window.fbq("track", eventName, customData, { eventID: eventId });
    }

    window.dataLayer.push({
      event: dataLayerEvent,
      event_id: eventId,
      lead_source: leadSource,
      ...customData
    });

    sendEventToConversionsApi({
      eventId,
      eventName,
      leadSource,
      customData
    });
  };

  const trackCheckout = () => {
    if (checkoutTracked) {
      return;
    }

    checkoutTracked = true;
    const eventId = createEventId();

    trackMetaEvent({
      eventName: "InitiateCheckout",
      eventId,
      leadSource: "checkout_section",
      dataLayerEvent: "begin_checkout",
      customData: {
        currency: "UYU",
        value: 6050,
        content_name: "Taller Arte floral en papel de arroz y buttercream",
        content_category: "Seminario presencial",
        num_items: 1
      }
    });
  };

  const trackReservationLead = () => {
    if (checkoutLeadTracked) {
      return;
    }

    checkoutLeadTracked = true;
    const eventId = createEventId();

    trackMetaEvent({
      eventName: "Lead",
      eventId,
      leadSource: "reservation_cta",
      dataLayerEvent: "lead_price_reveal",
      customData: {
        currency: "UYU",
        value: 6050,
        content_name: "Taller Arte floral en papel de arroz y buttercream",
        content_category: "Precios revelados",
        num_items: 1
      }
    });
  };

  const openCheckout = () => {
    if (!checkout) {
      return;
    }

    checkout.classList.add("is-open");
    checkout.setAttribute("aria-hidden", "false");
    document.querySelector(".checkout-intro")?.classList.add("is-visible");
    checkout.classList.add("is-visible");
    triggers.forEach((trigger) => {
      trigger.setAttribute("aria-expanded", "true");
    });
    trackReservationLead();
    trackCheckout();
    checkout.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  triggers.forEach((trigger) => {
    trigger.setAttribute("aria-controls", "checkout");
    trigger.setAttribute("aria-expanded", "false");
    trigger.addEventListener("click", () => {
      openCheckout();
    });
  });

  paymentLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const eventId = createEventId();
      const productValue = Number(link.dataset.productValue);
      const pendingPurchase = {
        product: link.dataset.productKey || "",
        content_name: link.dataset.productName || "Taller Arte floral en papel de arroz y buttercream",
        content_category: link.dataset.productCategory || "Mercado Pago",
        created_at: Date.now()
      };
      const customData = {
        content_name: pendingPurchase.content_name,
        content_category: pendingPurchase.content_category,
        payment_type: "Mercado Pago"
      };

      if (Number.isFinite(productValue) && productValue > 0) {
        customData.currency = "UYU";
        customData.value = productValue;
        pendingPurchase.value = productValue;
      }

      try {
        window.localStorage.setItem("pending_taller_purchase", JSON.stringify(pendingPurchase));
      } catch {
        // Tracking still proceeds when storage is unavailable.
      }

      trackMetaEvent({
        eventName: "Lead",
        eventId,
        leadSource: "mercado_pago",
        dataLayerEvent: "lead_mercado_pago",
        customData
      });
    });
  });

  whatsappLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const eventId = createEventId();

      trackMetaEvent({
        eventName: "Lead",
        eventId,
        leadSource: link.dataset.whatsappSource || "whatsapp",
        dataLayerEvent: "lead_whatsapp",
        customData: {
          content_name: link.dataset.whatsappName || "Consulta WhatsApp taller floral",
          content_category: link.dataset.whatsappCategory || "WhatsApp",
          link_url: link.href
        }
      });
    });
  });

  const closeWorkshopModal = () => {
    if (!workshopModal) {
      return;
    }

    workshopModal.classList.remove("is-open");
    workshopModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-workshop-modal-open");
    lastWorkshopModalTrigger?.focus();
  };

  workshopModalOpenButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!workshopModal) {
        return;
      }

      lastWorkshopModalTrigger = button;
      workshopModal.classList.add("is-open");
      workshopModal.setAttribute("aria-hidden", "false");
      document.body.classList.add("is-workshop-modal-open");
      workshopModal.querySelector(".workshop-modal-close")?.focus();
    });
  });

  workshopModalCloseButtons.forEach((button) => {
    button.addEventListener("click", closeWorkshopModal);
  });

  const closeLightbox = () => {
    if (!lightbox || !lightboxImage) {
      return;
    }

    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    lightboxImage.removeAttribute("src");
    lightboxImage.setAttribute("alt", "");
    document.body.classList.remove("is-lightbox-open");

    if (lastLightboxTrigger) {
      lastLightboxTrigger.focus();
    }
  };

  lightboxTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      if (!lightbox || !lightboxImage) {
        return;
      }

      lastLightboxTrigger = trigger;
      lightboxImage.src = trigger.dataset.lightboxSrc;
      lightboxImage.alt = trigger.dataset.lightboxAlt || "";
      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.classList.add("is-lightbox-open");
      lightbox.querySelector(".image-lightbox-close")?.focus();
    });
  });

  lightboxCloseButtons.forEach((button) => {
    button.addEventListener("click", closeLightbox);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && workshopModal?.classList.contains("is-open")) {
      closeWorkshopModal();
      return;
    }

    if (event.key === "Escape" && lightbox?.classList.contains("is-open")) {
      closeLightbox();
    }
  });

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
