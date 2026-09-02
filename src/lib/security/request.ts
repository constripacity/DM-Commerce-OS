const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Reject browser state-changing requests that came from another origin.
 * Requests without browser origin metadata remain available to local CLI clients.
 */
export function isTrustedMutationRequest(request: Request) {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

  const requestUrl = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",", 1)[0];
  const protocol = forwardedProtocol || requestUrl.protocol.replace(":", "");
  const trustedOrigins = new Set([requestUrl.origin]);
  if (host) trustedOrigins.add(`${protocol}://${host}`);
  const origin = request.headers.get("origin");
  if (origin && !trustedOrigins.has(origin)) return false;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return false;
  }
  return true;
}
