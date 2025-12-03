/**
 * Dune Analytics API 客户端
 * 
 * 文档: https://docs.dune.com/api-reference
 */

export interface DuneQueryResult {
  execution_id: string;
  state: "QUERY_STATE_PENDING" | "QUERY_STATE_EXECUTING" | "QUERY_STATE_COMPLETED" | "QUERY_STATE_FAILED";
  submitted_at: string;
  expires_at: string;
  execution_started_at?: string;
  execution_ended_at?: string;
  result?: {
    rows: any[];
    metadata: {
      column_names: string[];
      result_set_bytes: number;
      total_row_count: number;
      datapoint_count: number;
      pending_time_millis: number;
      execution_time_millis: number;
    };
  };
}

export interface DuneQueryParams {
  query_id: number;
  parameters?: Record<string, any>;
}

class DuneClient {
  private apiKey: string;
  private baseUrl = "https://api.dune.com/api/v1";

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.DUNE_API_KEY || "";
    if (!this.apiKey) {
      console.warn("⚠️  Dune API Key 未设置，请设置 DUNE_API_KEY 环境变量");
    }
  }

  /**
   * 执行查询
   * @param queryId 查询 ID
   * @param parameters 查询参数（可选）
   * @returns 执行 ID
   */
  async executeQuery(queryId: number, parameters?: Record<string, any>): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Dune API Key 未设置");
    }

    const url = `${this.baseUrl}/query/${queryId}/execute`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-Dune-API-Key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query_parameters: parameters || {},
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Dune API 错误: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return data.execution_id;
  }

  /**
   * 获取查询执行状态和结果
   * @param executionId 执行 ID
   * @returns 查询结果
   */
  async getQueryResult(executionId: string): Promise<DuneQueryResult> {
    if (!this.apiKey) {
      throw new Error("Dune API Key 未设置");
    }

    const url = `${this.baseUrl}/execution/${executionId}/status`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Dune-API-Key": this.apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Dune API 错误: ${error.message || response.statusText}`);
    }

    return await response.json();
  }

  /**
   * 执行查询并等待结果（轮询）
   * @param queryId 查询 ID
   * @param parameters 查询参数（可选）
   * @param maxWaitTime 最大等待时间（毫秒），默认 60 秒
   * @param pollInterval 轮询间隔（毫秒），默认 2 秒
   * @returns 查询结果
   */
  async executeQueryAndWait(
    queryId: number,
    parameters?: Record<string, any>,
    maxWaitTime: number = 60000,
    pollInterval: number = 2000
  ): Promise<DuneQueryResult> {
    // 执行查询
    const executionId = await this.executeQuery(queryId, parameters);

    // 轮询等待结果
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitTime) {
      const result = await this.getQueryResult(executionId);

      if (result.state === "QUERY_STATE_COMPLETED") {
        return result;
      }

      if (result.state === "QUERY_STATE_FAILED") {
        throw new Error("查询执行失败");
      }

      // 等待后继续轮询
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error("查询执行超时");
  }

  /**
   * 获取查询结果（CSV 格式）
   * @param executionId 执行 ID
   * @returns CSV 字符串
   */
  async getQueryResultCSV(executionId: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Dune API Key 未设置");
    }

    const url = `${this.baseUrl}/execution/${executionId}/results/csv`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Dune-API-Key": this.apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Dune API 错误: ${error.message || response.statusText}`);
    }

    return await response.text();
  }
}

// 导出单例实例
export const duneClient = new DuneClient();

