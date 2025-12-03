"use client";

import React, { useState } from "react";
import { useAccount } from "wagmi";
import { useDuneQuery } from "~~/hooks/useDuneQuery";
import { DuneDashboard } from "~~/components/DuneDashboard";
import { DuneChart } from "~~/components/DuneChart";
import { DuneAccessGuard } from "~~/components/DuneAccessGuard";
import { hasDuneAccess } from "~~/utils/dune/accessControl";

/**
 * Dune Analytics 数据展示页面
 * 
 * 使用说明:
 * 1. 在 Dune 创建查询并获取 Query ID
 * 2. 在 .env 文件中设置 DUNE_API_KEY
 * 3. 在此页面输入 Query ID 查看结果
 */
export default function DunePage() {
  const { address, isConnected } = useAccount();
  const [queryId, setQueryId] = useState<number | null>(null);
  const [inputQueryId, setInputQueryId] = useState("");
  const [dashboardId, setDashboardId] = useState<number | null>(null);
  const [inputDashboardId, setInputDashboardId] = useState("");
  const [activeTab, setActiveTab] = useState<"query" | "dashboard" | "chart">("query");
  
  // 统计数据 Query IDs（可以通过环境变量配置）
  // 注意：这些 Query ID 需要在 Dune Analytics 中创建对应的查询
  const statsQueryIds = {
    uniqueWallets: typeof window !== "undefined" 
      ? parseInt(process.env.NEXT_PUBLIC_DUNE_QUERY_UNIQUE_WALLETS || "0")
      : parseInt(process.env.DUNE_QUERY_UNIQUE_WALLETS || process.env.NEXT_PUBLIC_DUNE_QUERY_UNIQUE_WALLETS || "0"),
    paymentCount: typeof window !== "undefined"
      ? parseInt(process.env.NEXT_PUBLIC_DUNE_QUERY_PAYMENT_COUNT || "0")
      : parseInt(process.env.DUNE_QUERY_PAYMENT_COUNT || process.env.NEXT_PUBLIC_DUNE_QUERY_PAYMENT_COUNT || "0"),
    totalPaymentAmount: typeof window !== "undefined"
      ? parseInt(process.env.NEXT_PUBLIC_DUNE_QUERY_TOTAL_PAYMENT || "0")
      : parseInt(process.env.DUNE_QUERY_TOTAL_PAYMENT || process.env.NEXT_PUBLIC_DUNE_QUERY_TOTAL_PAYMENT || "0"),
  };

  const hasAccess = hasDuneAccess(address ?? undefined);

  const { data, loading, error, execute } = useDuneQuery({
    queryId: queryId || 0,
    autoExecute: false,
    useCache: true,
    ...(address && { address }),
  });

  const handleExecute = () => {
    const id = parseInt(inputQueryId);
    if (isNaN(id) || id <= 0) {
      alert("请输入有效的 Query ID");
      return;
    }
    setQueryId(id);
    execute();
  };

  const handleLoadDashboard = () => {
    const id = parseInt(inputDashboardId);
    if (isNaN(id) || id <= 0) {
      alert("请输入有效的 Dashboard ID");
      return;
    }
    setDashboardId(id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A110A] via-[#261A10] to-[#1A110A] p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Dune Analytics 数据</h1>

        {/* 权限提示 */}
        {!isConnected && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mb-8">
            <p className="text-yellow-300">⚠️ 请先连接钱包以访问 Dune 数据</p>
          </div>
        )}

        {isConnected && !hasAccess && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-8">
            <p className="text-red-300">
              🔒 当前地址 <code className="bg-[#1A110A] px-2 py-1 rounded text-white">{address}</code> 没有权限访问 Dune 数据
            </p>
            <p className="text-red-200 text-sm mt-2">请联系管理员添加访问权限</p>
          </div>
        )}

        {isConnected && hasAccess && (
          <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-8">
            <p className="text-green-300">✅ 已授权访问</p>
          </div>
        )}

        <DuneAccessGuard>

        {/* 统计数据展示 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">数据统计</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 登入钱包数 */}
            <div className="bg-gradient-to-br from-[#1A110A]/90 to-[#261A10]/90 border border-[#FF6B00]/30 rounded-2xl p-6 hover:border-[#FF6B00]/60 transition-colors">
              <h3 className="text-lg font-semibold text-white/70 mb-4">登入钱包数</h3>
              {statsQueryIds.uniqueWallets > 0 ? (
                <div className="min-h-[80px]">
                  <DuneChart
                    queryId={statsQueryIds.uniqueWallets}
                    chartType="number"
                    columns={{ value: "count" }}
                    title=""
                    autoRefresh={true}
                    refreshInterval={60}
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl font-bold text-[#FF6B00]/50 mb-2">-</div>
                  <p className="text-white/50 text-sm">请在 .env 中配置<br/>NEXT_PUBLIC_DUNE_QUERY_UNIQUE_WALLETS</p>
                </div>
              )}
            </div>

            {/* 支付次数 */}
            <div className="bg-gradient-to-br from-[#1A110A]/90 to-[#261A10]/90 border border-[#FF6B00]/30 rounded-2xl p-6 hover:border-[#FF6B00]/60 transition-colors">
              <h3 className="text-lg font-semibold text-white/70 mb-4">支付次数</h3>
              {statsQueryIds.paymentCount > 0 ? (
                <div className="min-h-[80px]">
                  <DuneChart
                    queryId={statsQueryIds.paymentCount}
                    chartType="number"
                    columns={{ value: "count" }}
                    title=""
                    autoRefresh={true}
                    refreshInterval={60}
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl font-bold text-[#FF6B00]/50 mb-2">-</div>
                  <p className="text-white/50 text-sm">请在 .env 中配置<br/>NEXT_PUBLIC_DUNE_QUERY_PAYMENT_COUNT</p>
                </div>
              )}
            </div>

            {/* 支付金额总数 */}
            <div className="bg-gradient-to-br from-[#1A110A]/90 to-[#261A10]/90 border border-[#FF6B00]/30 rounded-2xl p-6 hover:border-[#FF6B00]/60 transition-colors">
              <h3 className="text-lg font-semibold text-white/70 mb-4">支付金额总数</h3>
              {statsQueryIds.totalPaymentAmount > 0 ? (
                <div className="min-h-[80px]">
                  <DuneChart
                    queryId={statsQueryIds.totalPaymentAmount}
                    chartType="number"
                    columns={{ value: "total_amount" }}
                    title=""
                    autoRefresh={true}
                    refreshInterval={60}
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl font-bold text-[#FF6B00]/50 mb-2">-</div>
                  <p className="text-white/50 text-sm">请在 .env 中配置<br/>NEXT_PUBLIC_DUNE_QUERY_TOTAL_PAYMENT</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 标签页切换 */}
        <div className="flex gap-4 mb-8 border-b border-[#FF6B00]/30">
          <button
            onClick={() => setActiveTab("query")}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === "query"
                ? "text-[#FF6B00] border-b-2 border-[#FF6B00]"
                : "text-white/70 hover:text-white"
            }`}
          >
            查询数据
          </button>
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === "dashboard"
                ? "text-[#FF6B00] border-b-2 border-[#FF6B00]"
                : "text-white/70 hover:text-white"
            }`}
          >
            仪表板
          </button>
          <button
            onClick={() => setActiveTab("chart")}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === "chart"
                ? "text-[#FF6B00] border-b-2 border-[#FF6B00]"
                : "text-white/70 hover:text-white"
            }`}
          >
            图表组件
          </button>
        </div>

        {/* 查询数据标签页 */}
        {activeTab === "query" && (
          <>
            {/* 查询输入 */}
            <div className="bg-gradient-to-br from-[#1A110A]/90 to-[#261A10]/90 border border-[#FF6B00]/30 rounded-2xl p-6 mb-8">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-white/70 text-sm mb-2">Query ID</label>
                  <input
                    type="number"
                    value={inputQueryId}
                    onChange={(e) => setInputQueryId(e.target.value)}
                    placeholder="输入 Dune Query ID"
                    className="w-full px-4 py-2 bg-[#1A110A] border border-[#FF6B00]/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
                <button
                  onClick={handleExecute}
                  disabled={loading || !inputQueryId}
                  className="px-6 py-2 bg-[#FF6B00] hover:bg-[#FF8C00] text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "查询中..." : "执行查询"}
                </button>
              </div>
            </div>

            {/* 错误显示 */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-8">
                <p className="text-red-300">❌ {error}</p>
              </div>
            )}

            {/* 加载状态 */}
            {loading && (
              <div className="bg-gradient-to-br from-[#1A110A]/90 to-[#261A10]/90 border border-[#FF6B00]/30 rounded-2xl p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF6B00] mb-4"></div>
                <p className="text-white/70">正在执行查询...</p>
              </div>
            )}

            {/* 结果显示 */}
            {data && data.state === "QUERY_STATE_COMPLETED" && data.result && (
              <div className="bg-gradient-to-br from-[#1A110A]/90 to-[#261A10]/90 border border-[#FF6B00]/30 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">查询结果</h2>
            
            {/* 元数据 */}
            <div className="mb-6 p-4 bg-[#1A110A]/50 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-white/70">总行数:</span>
                  <span className="text-white ml-2">{data.result.metadata.total_row_count}</span>
                </div>
                <div>
                  <span className="text-white/70">执行时间:</span>
                  <span className="text-white ml-2">{data.result.metadata.execution_time_millis}ms</span>
                </div>
                <div>
                  <span className="text-white/70">数据大小:</span>
                  <span className="text-white ml-2">{(data.result.metadata.result_set_bytes / 1024).toFixed(2)} KB</span>
                </div>
                <div>
                  <span className="text-white/70">数据点:</span>
                  <span className="text-white ml-2">{data.result.metadata.datapoint_count}</span>
                </div>
              </div>
            </div>

            {/* 数据表格 */}
            {data.result.rows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[#FF6B00]/30">
                      {data.result.metadata.column_names.map((col, idx) => (
                        <th
                          key={idx}
                          className="px-4 py-3 text-left text-white/70 font-semibold text-sm"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.result.rows.slice(0, 100).map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className="border-b border-[#FF6B00]/10 hover:bg-[#FF6B00]/5 transition-colors"
                      >
                        {data.result.metadata.column_names.map((col, colIdx) => (
                          <td
                            key={colIdx}
                            className="px-4 py-3 text-white/80 text-sm"
                          >
                            {typeof row[col] === "object"
                              ? JSON.stringify(row[col])
                              : String(row[col] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.result.rows.length > 100 && (
                  <p className="text-white/50 text-sm mt-4 text-center">
                    仅显示前 100 行，共 {data.result.rows.length} 行
                  </p>
                )}
              </div>
            ) : (
              <p className="text-white/70 text-center py-8">查询结果为空</p>
            )}
              </div>
            )}
          </>
        )}

        {/* 仪表板标签页 */}
        {activeTab === "dashboard" && (
          <>
            <div className="bg-gradient-to-br from-[#1A110A]/90 to-[#261A10]/90 border border-[#FF6B00]/30 rounded-2xl p-6 mb-8">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-white/70 text-sm mb-2">Dashboard ID</label>
                  <input
                    type="number"
                    value={inputDashboardId}
                    onChange={(e) => setInputDashboardId(e.target.value)}
                    placeholder="输入 Dune Dashboard ID"
                    className="w-full px-4 py-2 bg-[#1A110A] border border-[#FF6B00]/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
                <button
                  onClick={handleLoadDashboard}
                  disabled={!inputDashboardId}
                  className="px-6 py-2 bg-[#FF6B00] hover:bg-[#FF8C00] text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  加载仪表板
                </button>
              </div>
            </div>

            {dashboardId && (
              <DuneDashboard
                dashboardId={dashboardId}
                height={800}
                autoRefresh={true}
                refreshInterval={300}
              />
            )}
          </>
        )}

        {/* 图表组件标签页 */}
        {activeTab === "chart" && (
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-[#1A110A]/90 to-[#261A10]/90 border border-[#FF6B00]/30 rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">图表组件示例</h2>
              <p className="text-white/70 text-sm mb-6">
                以下是一些使用 DuneChart 组件的示例。你需要替换为实际的 Query ID。
              </p>

              {/* 数字显示示例 */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">数字显示</h3>
                <DuneChart
                  queryId={0} // 替换为实际 Query ID
                  chartType="number"
                  columns={{ value: "total", label: "label" }}
                  title="总交易数"
                  className="max-w-md"
                />
              </div>

              {/* 表格示例 */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">数据表格</h3>
                <DuneChart
                  queryId={0} // 替换为实际 Query ID
                  chartType="table"
                  title="交易列表"
                />
              </div>

              {/* 条形图示例 */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">条形图</h3>
                <DuneChart
                  queryId={0} // 替换为实际 Query ID
                  chartType="bar"
                  columns={{ x: "date", y: "value" }}
                  title="每日交易量"
                />
              </div>
            </div>
          </div>
        )}

        {/* 使用说明 */}
        <div className="mt-8 bg-gradient-to-br from-[#1A110A]/90 to-[#261A10]/90 border border-[#FF6B00]/30 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">📖 使用说明</h2>
          <ol className="list-decimal list-inside space-y-2 text-white/70 text-sm">
            <li>在 <a href="https://dune.com" target="_blank" rel="noopener noreferrer" className="text-[#FF6B00] hover:underline">Dune Analytics</a> 创建查询或仪表板</li>
            <li>获取 Query ID 或 Dashboard ID（在 URL 中）</li>
            <li>在项目根目录的 <code className="bg-[#1A110A] px-2 py-1 rounded">.env</code> 文件中设置 <code className="bg-[#1A110A] px-2 py-1 rounded">DUNE_API_KEY</code></li>
            <li>使用相应的组件或页面功能查看数据</li>
          </ol>
        </div>
        </DuneAccessGuard>
      </div>
    </div>
  );
}

