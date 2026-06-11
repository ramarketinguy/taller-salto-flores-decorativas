const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const envPath = path.join(root, ".env.local");

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const port = Number(process.env.PORT || 4173);
const metaPixelId = process.env.META_PIXEL_ID || "996195842979937";
const metaAccessToken = process.env.META_CAPI_ACCESS_TOKEN;
const metaTestEventCode = process.env.META_TEST_EVENT_CODE;
const graphVersion = process.env.META_GRAPH_VERSION || "v23.0";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const readJsonBody = (request) =>
  new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 32_000) {
        request.destroy();
        reject(new Error("Payload too large"));
      }
    });

    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
  });

const sendJson = (response, status, payload) => {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(payload));
};

const getClientIp = (request) => {
  const forwardedFor = request.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return request.socket.remoteAddress;
};

const sendMetaCheckoutEvent = async (request, response) => {
  if (!metaAccessToken) {
    sendJson(response, 503, {
      ok: false,
      error: "META_CAPI_ACCESS_TOKEN is not configured"
    });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { ok: false, error: error.message });
    return;
  }

  const eventId = typeof body.eventId === "string" ? body.eventId.slice(0, 120) : "";
  const eventName =
    typeof body.eventName === "string" &&
    ["InitiateCheckout", "Lead", "Purchase"].includes(body.eventName)
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
    sendJson(response, 400, { ok: false, error: "eventId is required" });
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
      sendJson(response, 502, {
        ok: false,
        error: "Meta CAPI request failed",
        meta: metaPayload
      });
      return;
    }

    sendJson(response, 200, {
      ok: true,
      event_id: eventId,
      meta: metaPayload
    });
  } catch (error) {
    sendJson(response, 502, {
      ok: false,
      error: "Meta CAPI request could not be sent"
    });
  }
};

const serveStatic = (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const pathname = decodeURIComponent(requestUrl.pathname);
  const safePath = pathname === "/" ? "/index.html" : pathname === "/gracias" ? "/gracias.html" : pathname;
  const filePath = path.normalize(path.join(root, safePath));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "content-type": mimeTypes[ext] || "application/octet-stream",
      "cache-control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable"
    });
    response.end(content);
  });
};

const server = http.createServer((request, response) => {
  if (request.method === "POST" && request.url === "/api/meta-capi/checkout") {
    sendMetaCheckoutEvent(request, response);
    return;
  }

  if (request.method === "GET" || request.method === "HEAD") {
    serveStatic(request, response);
    return;
  }

  response.writeHead(405, { "content-type": "text/plain; charset=utf-8" });
  response.end("Method not allowed");
});

server.listen(port, () => {
  console.log(`Landing running at http://localhost:${port}`);
  console.log(`Meta CAPI pixel: ${metaPixelId}`);
});
