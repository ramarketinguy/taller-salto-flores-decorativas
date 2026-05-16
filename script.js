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

  const sendCheckoutToConversionsApi = (eventId) => {
    const payload = {
      eventId,
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
          event: "capi_checkout_error",
          item_name: "Taller Arte floral en papel de arroz y buttercream"
        });
      });
  };

  const trackCheckout = () => {
    if (checkoutTracked) {
      return;
    }

    checkoutTracked = true;
    const eventId = createEventId();

    if (typeof window.fbq === "function") {
      window.fbq(
        "track",
        "InitiateCheckout",
        {
          currency: "UYU",
          value: 6050,
          content_name: "Taller Arte floral en papel de arroz y buttercream",
          content_category: "Seminario presencial",
          num_items: 1
        },
        { eventID: eventId }
      );
    }

    window.dataLayer.push({
      event: "begin_checkout",
      event_id: eventId,
      currency: "UYU",
      value: 6050,
      item_name: "Taller Arte floral en papel de arroz y buttercream"
    });

    sendCheckoutToConversionsApi(eventId);
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
    trigger.addEventListener("click", openCheckout);
  });

  paymentLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (typeof window.fbq === "function") {
        window.fbq("track", "AddPaymentInfo", {
          currency: "UYU",
          value: 6050,
          content_name: "Taller Arte floral en papel de arroz y buttercream"
        });
      }

      window.dataLayer.push({
        event: "add_payment_info",
        payment_type: "Mercado Pago",
        currency: "UYU",
        value: 6050
      });
    });
  });

  whatsappLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (typeof window.fbq === "function") {
        window.fbq("track", "Contact", {
          content_name: "Consulta WhatsApp taller floral",
          content_category: "WhatsApp"
        });
      }

      window.dataLayer.push({
        event: "whatsapp_click",
        link_url: link.href,
        item_name: "Taller Arte floral en papel de arroz y buttercream"
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
