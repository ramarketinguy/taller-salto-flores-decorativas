const metaPixelId = process.env.META_PIXEL_ID || "996195842979937";
const metaAccessToken = process.env.META_CAPI_ACCESS_TOKEN;
const metaTestEventCode = process.env.META_TEST_EVENT_CODE;
const graphVersion = process.env.META_GRAPH_VERSION || "v23.0";

const getClientIp = (request) => {
  const forwardedFor = request.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return request.socket?.remoteAddress || "";
};

const parseBody = async (request) => {
  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  if (typeof request.body === "string") {
    return JSON.parse(request.body || "{}");
  }

  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 32_000) {
        reject(new Error("Payload too large"));
        request.destroy();
      }
    });

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
  });
};

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("allow", "POST");
    response.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  if (!metaAccessToken) {
    response.status(503).json({
      ok: false,
      error: "META_CAPI_ACCESS_TOKEN is not configured"
    });
    return;
  }

  let body;

  try {
    body = await parseBody(request);
  } catch (error) {
    response.status(400).json({ ok: false, error: error.message });
    return;
  }

  const eventId = typeof body.eventId === "string" ? body.eventId.slice(0, 120) : "";
  const eventName =
    typeof body.eventName === "string" && ["InitiateCheckout", "Lead"].includes(body.eventName)
      ? body.eventName
      : "InitiateCheckout";
  const leadSource = typeof body.leadSource === "string" ? body.leadSource.slice(0, 80) : "";
  const customData = body.customData && typeof body.customData === "object" ? body.customData : {};
  const sourceUrl =
    typeof body.sourceUrl === "string" && body.sourceUrl.startsWith("http")
      ? body.sourceUrl
      : request.headers.referer || "";
  const fbp = typeof body.fbp === "string" ? body.fbp.slice(0, 200) : undefined;
  const fbc = typeof body.fbc === "string" ? body.fbc.slice(0, 200) : undefined;

  if (!eventId) {
    response.status(400).json({ ok: false, error: "eventId is required" });
    return;
  }

  const userData = {
    client_ip_address: getClientIp(request),
    client_user_agent: request.headers["user-agent"] || ""
  };

  if (fbp) {
    userData.fbp = fbp;
  }

  if (fbc) {
    userData.fbc = fbc;
  }

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "website",
        event_source_url: sourceUrl,
        user_data: userData,
        custom_data: {
          currency: "UYU",
          value: 6050,
          content_name: "Taller Arte floral en papel de arroz y buttercream",
          content_category: "Seminario presencial",
          num_items: 1,
          lead_source: leadSource,
          ...customData
        }
      }
    ]
  };

  if (metaTestEventCode) {
    payload.test_event_code = metaTestEventCode;
  }

  try {
    const metaResponse = await fetch(
      `https://graph.facebook.com/${graphVersion}/${metaPixelId}/events?access_token=${encodeURIComponent(
        metaAccessToken
      )}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    const metaPayload = await metaResponse.json().catch(() => ({}));

    if (!metaResponse.ok) {
      response.status(502).json({
        ok: false,
        error: "Meta CAPI request failed",
        meta: metaPayload
      });
      return;
    }

    response.status(200).json({
      ok: true,
      event_id: eventId,
      meta: metaPayload
    });
  } catch {
    response.status(502).json({
      ok: false,
      error: "Meta CAPI request could not be sent"
    });
  }
};
