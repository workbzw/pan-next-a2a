"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useDuneQuery } from "~~/hooks/useDuneQuery";
import { DuneQueryResult } from "~~/utils/dune/duneClient";
import { hasDuneAccess } from "~~/utils/dune/accessControl";

interface DuneChartProps {
  /**
   * Dune 查询 ID
   */
  queryId: number;
  /**
   * 查询参数
   */
  parameters?: Record<string, any>;
  /**
   * 图表类型
   */
  chartType?: "line" | "bar" | "pie" | "table" | "number";
  /**
   * 数据列配置
   */
  columns?: {
    x?: string; // X 轴列名
    y?: string; // Y 轴列名
    label?: string; // 标签列名（用于饼图）
    value?: string; // 数值列名（用于数字显示）
  };
  /**
   * 图表标题
   */
  title?: string;
  /**
   * 是否自动刷新
   */
  autoRefresh?: boolean;
  /**
   * 刷新间隔（秒）
   */
  refreshInterval?: number;
  /**
   * 自定义样式类名
   */
  className?: string;
}

/**
 * Dune 数据可视化组件
 * 
 * @example
 * <DuneChart
 *   queryId={123456}
 *   chartType="line"
 *   columns={{ x: "date", y: "value" }}
 *   title="每日交易量"
 *   autoRefresh={true}
 * />
 */
export function DuneChart({
  queryId,
  parameters,
  chartType = "table",
  columns,
  title,
  autoRefresh = false,
  refreshInterval = 300,
  className = "",
}: DuneChartProps) {
  const { address } = useAccount();
  const { data, loading, error, refetch } = useDuneQuery({
    queryId,
    parameters,
    autoExecute: true,
    useCache: true,
    address,
  });

  const hasAccess = hasDuneAccess(address);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh || !data) return;

    const interval = setInterval(() => {
      refetch();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, data, refetch]);

  if (!hasAccess) {
    return (
      <div className={`bg-gradient-to-br from-[#1A110A]/90 to-[#261A10]/90 border border-red-500/30 rounded-2xl p-8 text-center ${className}`}>
        <div className="text-red-400 text-4xl mb-4">🔒</div>
        <h3 className="text-xl font-bold text-white mb-2">无权限访问</h3>
        <p className="text-white/70">当前地址没有权限查看此数据</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FF6B00] mb-4"></div>
          <p className="text-white/70">加载数据中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-500/20 border border-red-500/50 rounded-lg p-4 ${className}`}>
        <p className="text-red-300">❌ {error}</p>
      </div>
    );
  }

  if (!data || data.state !== "QUERY_STATE_COMPLETED" || !data.result) {
    return (
      <div className={`text-center p-8 text-white/70 ${className}`}>
        暂无数据
      </div>
    );
  }

  const rows = data.result.rows;
  const columnNames = data.result.metadata.column_names;

  if (rows.length === 0) {
    return (
      <div className={`text-center p-8 text-white/70 ${className}`}>
        查询结果为空
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-[#1A110A]/90 to-[#261A10]/90 border border-[#FF6B00]/30 rounded-2xl p-6 ${className}`}>
      {title && (
        <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
      )}

      {/* 数字显示 */}
      {chartType === "number" && columns?.value && (
        <div className="text-center">
          <div className="text-5xl font-bold text-[#FF6B00] mb-2">
            {rows[0]?.[columns.value]?.toLocaleString() || "0"}
          </div>
          {columns.label && rows[0]?.[columns.label] && (
            <div className="text-white/70 text-sm">{rows[0][columns.label]}</div>
          )}
        </div>
      )}

      {/* 表格显示 */}
      {chartType === "table" && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#FF6B00]/30">
                {columnNames.map((col, idx) => (
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
              {rows.slice(0, 50).map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="border-b border-[#FF6B00]/10 hover:bg-[#FF6B00]/5 transition-colors"
                >
                  {columnNames.map((col, colIdx) => (
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
          {rows.length > 50 && (
            <p className="text-white/50 text-sm mt-4 text-center">
              仅显示前 50 行，共 {rows.length} 行
            </p>
          )}
        </div>
      )}

      {/* 简单的条形图（使用 CSS） */}
      {chartType === "bar" && columns?.x && columns?.y && (
        <div className="space-y-2">
          {rows.slice(0, 20).map((row, idx) => {
            const xValue = row[columns.x!];
            const yValue = parseFloat(row[columns.y!]) || 0;
            const maxValue = Math.max(...rows.map(r => parseFloat(r[columns.y!]) || 0));
            const percentage = maxValue > 0 ? (yValue / maxValue) * 100 : 0;

            return (
              <div key={idx} className="flex items-center gap-4">
                <div className="w-32 text-white/80 text-sm truncate">{String(xValue)}</div>
                <div className="flex-1 bg-[#1A110A] rounded-full h-6 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="w-24 text-right text-white/70 text-sm">{yValue.toLocaleString()}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* 简单的折线图（使用 CSS） */}
      {chartType === "line" && columns?.x && columns?.y && (
        <div className="relative h-64">
          <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke="#FF6B00"
              strokeWidth="2"
              points={rows
                .slice(0, 50)
                .map((row, idx) => {
                  const x = (idx / Math.max(rows.length - 1, 1)) * 400;
                  const yValue = parseFloat(row[columns.y!]) || 0;
                  const maxValue = Math.max(...rows.map(r => parseFloat(r[columns.y!]) || 0));
                  const y = maxValue > 0 ? 200 - (yValue / maxValue) * 200 : 200;
                  return `${x},${y}`;
                })
                .join(" ")}
            />
          </svg>
        </div>
      )}

      {/* 简单的饼图（使用 CSS） */}
      {chartType === "pie" && columns?.label && columns?.value && (
        <div className="flex flex-wrap gap-4 justify-center">
          {rows.slice(0, 10).map((row, idx) => {
            const label = String(row[columns.label!]);
            const value = parseFloat(row[columns.value!]) || 0;
            const total = rows.reduce((sum, r) => sum + (parseFloat(r[columns.value!]) || 0), 0);
            const percentage = total > 0 ? (value / total) * 100 : 0;

            return (
              <div key={idx} className="text-center">
                <div className="w-24 h-24 rounded-full border-4 border-[#FF6B00] flex items-center justify-center mb-2"
                  style={{
                    background: `conic-gradient(#FF6B00 ${percentage}%, transparent ${percentage}%)`,
                  }}
                >
                  <div className="w-16 h-16 rounded-full bg-[#1A110A] flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{percentage.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="text-white/70 text-xs mt-2 max-w-24 truncate">{label}</div>
                <div className="text-white/50 text-xs">{value.toLocaleString()}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

