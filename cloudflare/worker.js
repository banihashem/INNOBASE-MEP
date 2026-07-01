/**
 * MEP-light™ Cloudflare Worker — Reverse Proxy
 * 
 * Routes requests from mep.innobase.app → Cloud Run service
 * by rewriting the Host header to the Cloud Run URL.
 */

const CLOUD_RUN_ORIGIN = "https://market-entry-prioritizer-52156375400.europe-west2.run.app";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    // Build the target URL on Cloud Run
    const targetUrl = CLOUD_RUN_ORIGIN + url.pathname + url.search;
    
    // Clone the request with the new URL and correct Host header
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
    
    // Return the response with CORS headers preserved
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  },
};
