/**
 * MEP-light™ Cloudflare Worker — Reverse Proxy
 * 
 * Routes requests from mep.innobase.app → Cloud Run service
 * by rewriting the Host header to the Cloud Run URL.
 * 
 * Key responsibilities:
 *   - Forward all headers including Authorization (JWT tokens)
 *   - Handle CORS preflight for the custom domain
 *   - Preserve response headers from Cloud Run
 */

const CLOUD_RUN_ORIGIN = "https://market-entry-prioritizer-52156375400.europe-west2.run.app";
const ALLOWED_ORIGIN = "https://mep.innobase.app";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Handle CORS preflight (OPTIONS) at the edge for faster response
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
          "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Build the target URL on Cloud Run
    const targetUrl = CLOUD_RUN_ORIGIN + url.pathname + url.search;
    
    // Clone the request with the new URL and all original headers
    // (including Authorization which carries the JWT token)
    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: "follow",
    });
    
    // Override the Host header to match Cloud Run's expected hostname
    modifiedRequest.headers.set("Host", "market-entry-prioritizer-52156375400.europe-west2.run.app");
    
    // Forward the request and return the response
    const response = await fetch(modifiedRequest);
    
    // Clone response and add CORS headers for the custom domain
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    newHeaders.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    newHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};
