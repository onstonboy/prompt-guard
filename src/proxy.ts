import http, { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { sanitizeText, desanitizeText } from "./index";

interface GuardProxyOptions {
  port?: number;
  host?: string;
}

function collectBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req
      .on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
      .on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
      .on("error", reject);
  });
}

async function forwardRequest(
  targetUrl: string,
  originalReq: IncomingMessage,
  sanitizedBody: string | undefined
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  const urlObj = new URL(targetUrl);

  const bodyBuffer = sanitizedBody ? Buffer.from(sanitizedBody, "utf8") : undefined;

  const opts: http.RequestOptions = {
    protocol: urlObj.protocol,
    hostname: urlObj.hostname,
    port: urlObj.port || (urlObj.protocol === "https:" ? 443 : 80),
    path: urlObj.pathname + urlObj.search,
    method: originalReq.method,
    headers: {
      ...originalReq.headers,
      host: urlObj.host,
      "content-length": bodyBuffer ? Buffer.byteLength(bodyBuffer).toString() : "0",
    },
  };

  return new Promise((resolve, reject) => {
    const httpModule = urlObj.protocol === "https:" ? require("https") : require("http");
    const proxied = httpModule.request(opts, (res: IncomingMessage) => {
      const chunks: Buffer[] = [];
      res
        .on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
        .on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          resolve({ status: res.statusCode || 500, headers: res.headers, body });
        })
        .on("error", reject);
    });

    proxied.on("error", reject);

    if (bodyBuffer) {
      proxied.write(bodyBuffer);
    }
    proxied.end();
  });
}

export function runProxy(options: GuardProxyOptions = {}) {
  const port = options.port ?? Number(process.env.PROMPT_GUARD_PROXY_PORT || 8787);
  const host = options.host ?? "127.0.0.1";

  const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const target = req.headers["x-guard-target"];
      if (!target || Array.isArray(target)) {
        res.statusCode = 400;
        res.end(
          'Missing "x-guard-target" header. Please set it to the full upstream URL (e.g. https://api.example.com/path).'
        );
        return;
      }

      const contentType = (req.headers["content-type"] || "").toString();
      let originalBody: string | undefined;
      let safeBody: string | undefined;
      let mappings: ReturnType<typeof sanitizeText>["mappings"] = [];

      if (req.method !== "GET" && req.method !== "HEAD") {
        originalBody = await collectBody(req);

        if (originalBody && /json|text|application\/x-www-form-urlencoded/i.test(contentType)) {
          const result = sanitizeText(originalBody);
          safeBody = result.safeText;
          mappings = result.mappings;
        } else {
          safeBody = originalBody;
        }
      }

      const upstream = await forwardRequest(target, req, safeBody);

      let responseBody = upstream.body;
      if (responseBody && mappings.length > 0) {
        responseBody = desanitizeText(responseBody, mappings);
      }

      res.statusCode = upstream.status;
      // Copy headers except for content-length (we will recalc)
      Object.entries(upstream.headers).forEach(([key, value]) => {
        if (!value) return;
        if (key.toLowerCase() === "content-length") return;
        res.setHeader(key, value as any);
      });
      res.setHeader("content-length", Buffer.byteLength(responseBody, "utf8").toString());
      res.end(responseBody);
    } catch (err) {
      console.error("[prompt-guard-proxy] Error:", err);
      if (!res.writableEnded) {
        res.statusCode = 500;
        res.end("prompt-guard proxy error");
      }
    }
  });

  server.listen(port, host, () => {
    console.log(
      `[prompt-guard-proxy] Listening on http://${host}:${port}. Forward requests here and set 'x-guard-target' header to the real upstream URL.`
    );
  });
}

