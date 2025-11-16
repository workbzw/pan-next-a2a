/**
 * URL 参数工具函数
 * 用于在页面跳转时保留邀请参数等查询参数
 */

/**
 * 获取当前页面的所有查询参数
 * @returns URLSearchParams 对象
 */
export function getCurrentQueryParams(): URLSearchParams {
  if (typeof window === "undefined") {
    return new URLSearchParams();
  }
  return new URLSearchParams(window.location.search);
}

/**
 * 将查询参数添加到 URL
 * @param href 原始 URL
 * @param preserveParams 是否保留当前页面的查询参数（默认 true）
 * @returns 带有查询参数的完整 URL
 */
export function addQueryParams(
  href: string,
  preserveParams: boolean = true
): string {
  if (!preserveParams) {
    return href;
  }

  const currentParams = getCurrentQueryParams();
  
  // 如果没有查询参数，直接返回原始 href
  if (currentParams.toString().length === 0) {
    return href;
  }

  // 解析目标 URL
  try {
    const url = new URL(href, window.location.origin);
    
    // 将当前页面的查询参数添加到目标 URL
    currentParams.forEach((value, key) => {
      // 如果目标 URL 已经有相同的参数，保留目标 URL 的参数（不覆盖）
      if (!url.searchParams.has(key)) {
        url.searchParams.set(key, value);
      }
    });
    
    // 返回相对路径（去掉 origin）
    return url.pathname + url.search;
  } catch (e) {
    // 如果解析失败（可能是相对路径），手动拼接
    const separator = href.includes("?") ? "&" : "?";
    return `${href}${separator}${currentParams.toString()}`;
  }
}

/**
 * 获取查询参数的值
 * @param key 参数名
 * @returns 参数值，如果不存在则返回 null
 */
export function getQueryParam(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

/**
 * 检查是否存在指定的查询参数
 * @param key 参数名
 * @returns 是否存在
 */
export function hasQueryParam(key: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  return params.has(key);
}

