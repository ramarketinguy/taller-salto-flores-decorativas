(function () {
  const checkout = document.getElementById("checkout");
  const triggers = document.querySelectorAll("[data-checkout-trigger]");
  const paymentLinks = document.querySelectorAll("[data-payment-link]");
  const whatsappLinks = document.querySelectorAll(".whatsapp-button");
  const revealItems = document.querySelectorAll(".reveal");
  let checkoutTracked = false;

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
    const eventId = createEventId();

    trackMetaEvent({
      eventName: "Lead",
      eventId,
      leadSource: "reservation_cta",
      dataLayerEvent: "lead_reservation_cta",
      customData: {
        currency: "UYU",
        value: 6050,
        content_name: "Taller Arte floral en papel de arroz y buttercream",
        content_category: "Boton reserva cupo",
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
    trackCheckout();
    checkout.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  triggers.forEach((trigger) => {
    trigger.setAttribute("aria-controls", "checkout");
    trigger.setAttribute("aria-expanded", "false");
    trigger.addEventListener("click", () => {
      if (trigger.hasAttribute("data-reservation-lead-trigger")) {
        trackReservationLead();
      }

      openCheckout();
    });
  });

  paymentLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const eventId = createEventId();

      trackMetaEvent({
        eventName: "Lead",
        eventId,
        leadSource: "mercado_pago",
        dataLayerEvent: "lead_mercado_pago",
        customData: {
          currency: "UYU",
          value: 6050,
          content_name: "Taller Arte floral en papel de arroz y buttercream",
          content_category: "Mercado Pago",
          payment_type: "Mercado Pago"
        }
      });
    });
  });

  whatsappLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const eventId = createEventId();

      trackMetaEvent({
        eventName: "Lead",
        eventId,
        leadSource: "whatsapp_comprobante",
        dataLayerEvent: "lead_whatsapp_comprobante",
        customData: {
          content_name: "Consulta WhatsApp taller floral",
          content_category: "WhatsApp comprobante",
          link_url: link.href
        }
      });
    });
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
