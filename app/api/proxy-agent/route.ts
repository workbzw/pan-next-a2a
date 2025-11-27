import { NextRequest, NextResponse } from "next/server";
import fetch from "node-fetch";

/**
 * 带重试的 fetch 函数
 * 使用 node-fetch 替代默认的 fetch，以便更好地控制超时
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit & { timeout?: number } = {},
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<Response> {
  let lastError: Error | null = null;
  const timeout = options.timeout || 60000; // 默认 60 秒超时
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // 使用 node-fetch，它支持更长的超时时间
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        timeout: timeout, // node-fetch 支持 timeout 选项
      } as any);
      
      clearTimeout(timeoutId);
      
      // node-fetch 返回的 Response 需要转换为标准的 Response
      // 但 Next.js 的 Response 和 node-fetch 的 Response 兼容
      return response as any;
    } catch (error: any) {
      lastError = error;
      
      // 如果是连接超时错误，且还有重试机会，则等待后重试
      if (
        attempt < maxRetries - 1 &&
        (error.message?.includes("timeout") ||
          error.message?.includes("fetch failed") ||
          error.message?.includes("aborted") ||
          error.cause?.code === "UND_ERR_CONNECT_TIMEOUT" ||
          error.cause?.code === "UND_ERR_SOCKET" ||
          error.cause?.code === "ECONNREFUSED" ||
          error.cause?.code === "ENOTFOUND" ||
          error.code === "ETIMEDOUT" ||
          error.code === "ECONNREFUSED" ||
          error.code === "ENOTFOUND")
      ) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        retryDelay *= 2; // 指数退避
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError || new Error("All retry attempts failed");
}

/**
 * API 代理路由 - 用于解决 CORS 问题
 * 前端通过这个代理调用 Agent API，避免跨域问题
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, method = "GET", headers = {}, body: requestBody } = body;

    // 验证 URL
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // 验证 URL 格式
    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // 构建请求配置
    const fetchOptions: RequestInit = {
      method: method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    // 如果有请求体，添加到配置中
    if (requestBody && (method === "POST" || method === "PUT")) {
      fetchOptions.body = typeof requestBody === "string" 
        ? requestBody 
        : JSON.stringify(requestBody);
    }

    // 发送请求到目标 Agent API
    
    // 使用带重试的 fetch（使用 node-fetch，支持更长的超时时间）
    const response = await fetchWithRetry(
      targetUrl.toString(),
      {
        ...fetchOptions,
        timeout: 60000, // 60 秒超时
      },
      3, // 最多重试 3 次
      2000 // 初始延迟 2 秒
    );


    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      return NextResponse.json(
        { 
          error: "Target API error",
          status: response.status,
          message: errorText 
        },
        { status: response.status }
      );
    }

    // 获取响应数据
    const contentType = response.headers.get("content-type");
    let data: any;
    
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    // 返回响应（包括状态码和响应头）
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        // 转发重要的响应头
        "Content-Type": response.headers.get("content-type") || "application/json",
        // 允许前端访问响应头
        "Access-Control-Expose-Headers": "*",
      },
    });
  } catch (error: any) {
    // 提供更详细的错误信息
    let errorMessage = error.message || "Unknown error";
    if (error.name === "AbortError" || error.message?.includes("timeout") || error.message?.includes("aborted")) {
      errorMessage = "Request timeout - the target API took too long to respond";
    } else if (error.message?.includes("fetch failed") || error.message?.includes("ECONNREFUSED") || error.message?.includes("ENOTFOUND")) {
      errorMessage = "Failed to connect to target API. Please check the URL and network connection.";
    } else if (error.message?.includes("getaddrinfo")) {
      errorMessage = "DNS resolution failed. Please check if the URL is correct.";
    }
    
    return NextResponse.json(
      { 
        error: "Proxy request failed",
        message: errorMessage,
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * 支持 GET 请求（用于简单的代理）
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "URL parameter is required" },
      { status: 400 }
    );
  }

  try {
    // 解码 URL
    const decodedUrl = decodeURIComponent(url);

    // 验证 URL 格式
    try {
      new URL(decodedUrl);
    } catch (urlError) {
      return NextResponse.json(
        { error: "Invalid URL format", url: decodedUrl },
        { status: 400 }
      );
    }

    // 使用带重试的 fetch（使用 node-fetch，支持更长的超时时间）
    const response = await fetchWithRetry(
      decodedUrl,
      {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; AgentProxy/1.0)",
        },
        timeout: 60000, // 60 秒超时
      },
      3, // 最多重试 3 次
      2000 // 初始延迟 2 秒
    );


    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      return NextResponse.json(
        { 
          error: "Target API error",
          status: response.status,
          message: errorText 
        },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type");
    let data: any;
    
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/json",
      },
    });
  } catch (error: any) {
    // 提供更详细的错误信息
    let errorMessage = error.message || "Unknown error";
    if (error.name === "AbortError" || error.message?.includes("timeout") || error.message?.includes("aborted")) {
      errorMessage = "Request timeout - the target API took too long to respond";
    } else if (error.message?.includes("fetch failed") || error.message?.includes("ECONNREFUSED") || error.message?.includes("ENOTFOUND")) {
      errorMessage = "Failed to connect to target API. Please check the URL and network connection.";
    } else if (error.message?.includes("getaddrinfo")) {
      errorMessage = "DNS resolution failed. Please check if the URL is correct.";
    }
    
    return NextResponse.json(
      { 
        error: "Proxy request failed",
        message: errorMessage,
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

