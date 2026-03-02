import { sanitizeText } from "./index";

type FetchType = typeof globalThis.fetch;

const originalFetch: FetchType | undefined = globalThis.fetch;

if (originalFetch) {
  globalThis.fetch = (async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    let patchedInit = init;

    if (init && typeof init.body === "string" && init.body.length > 0) {
      const { safeText } = sanitizeText(init.body);
      patchedInit = { ...init, body: safeText };
    }

    return originalFetch(input as any, patchedInit as any);
  }) as FetchType;
}

