import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { DuneQueryResult } from "~~/utils/dune/duneClient";
import { duneCache } from "~~/utils/dune/duneCache";
import { hasDuneAccess } from "~~/utils/dune/accessControl";

interface UseDuneQueryOptions {
  queryId: number;
  parameters?: Record<string, any>;
  autoExecute?: boolean;
  pollInterval?: number;
  maxWaitTime?: number;
  /**
   * 是否使用缓存
   * @default true
   */
  useCache?: boolean;
  /**
   * 缓存时间（毫秒）
   * @default 300000 (5分钟)
   */
  cacheTTL?: number;
  /**
   * 钱包地址（用于权限验证），如果不提供则使用 useAccount 获取
   */
  address?: string;
}

interface UseDuneQueryResult {
  data: DuneQueryResult | null;
  loading: boolean;
  error: string | null;
  execute: () => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Hook 用于执行 Dune 查询并获取结果
 * 
 * @example
 * const { data, loading, error, execute } = useDuneQuery({
 *   queryId: 123456,
 *   parameters: { param1: "value1" },
 *   autoExecute: true
 * });
 */
export function useDuneQuery(options: UseDuneQueryOptions): UseDuneQueryResult {
  const { 
    queryId, 
    parameters, 
    autoExecute = false, 
    pollInterval = 2000, 
    maxWaitTime = 60000,
    useCache = true,
    cacheTTL = 300000, // 5 分钟
    address: providedAddress,
  } = options;
  
  const { address: connectedAddress } = useAccount();
  const address = providedAddress || connectedAddress;
  
  const [data, setData] = useState<DuneQueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    if (!queryId) {
      setError("queryId 是必需的");
      return;
    }

    // 权限检查
    if (!hasDuneAccess(address)) {
      setError("无权限访问 Dune 数据，请联系管理员");
      setData(null);
      setLoading(false);
      return;
    }

    // 检查缓存
    if (useCache) {
      const cachedData = duneCache.get(queryId, parameters);
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/dune", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "execute-and-wait",
          queryId,
          parameters,
          pollInterval,
          maxWaitTime,
          address, // 传递地址用于权限验证
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403) {
          throw new Error("无权限访问 Dune 数据，请联系管理员");
        }
        throw new Error(errorData.message || errorData.error || `请求失败: ${response.status}`);
      }

      const result = await response.json();
      setData(result);

      // 缓存结果
      if (useCache && result.state === "QUERY_STATE_COMPLETED") {
        duneCache.set(queryId, result, parameters, cacheTTL);
      }
    } catch (err: any) {
      setError(err.message || "执行查询失败");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [queryId, parameters, pollInterval, maxWaitTime, useCache, cacheTTL, address]);

  const refetch = useCallback(() => {
    return execute();
  }, [execute]);

  useEffect(() => {
    if (autoExecute) {
      execute();
    }
  }, [autoExecute, execute]);

  return {
    data,
    loading,
    error,
    execute,
    refetch,
  };
}

