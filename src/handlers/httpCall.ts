export interface HttpCallParams {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  timeoutMs?: number;
}

export interface HttpCallResult {
  status: number;
  data: any;
  headers: Record<string, string>;
}

export async function execHttpCall(params: HttpCallParams): Promise<HttpCallResult> {
  const { url, method = "GET", headers = {}, body, timeoutMs } = params;
  const controller = timeoutMs ? new AbortController() : null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  if (controller && timeoutMs) {
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
      signal: controller?.signal,
    });

    const contentType = response.headers.get("content-type") || "";
    let data: any = null;

    if (contentType.includes("application/json")) {
      data = await response.json();
    } else if (contentType.includes("text/")) {
      data = await response.text();
    } else {
      data = await response.arrayBuffer();
    }

    return {
      status: response.status,
      data,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
