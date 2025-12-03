"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { hasDuneAccess } from "~~/utils/dune/accessControl";

interface DuneDashboardProps {
  /**
   * Dune 仪表板的 ID
   * 可以在 Dune 仪表板页面的 URL 中找到，例如: https://dune.com/dashboard/123456
   */
  dashboardId: number;
  /**
   * 仪表板高度（像素）
   * @default 600
   */
  height?: number;
  /**
   * 是否自动刷新
   * @default false
   */
  autoRefresh?: boolean;
  /**
   * 刷新间隔（秒）
   * @default 300
   */
  refreshInterval?: number;
  /**
   * 自定义样式类名
   */
  className?: string;
}

/**
 * Dune 仪表板嵌入组件
 * 
 * @example
 * <DuneDashboard 
 *   dashboardId={123456}
 *   height={800}
 *   autoRefresh={true}
 *   refreshInterval={300}
 * />
 */
export function DuneDashboard({
  dashboardId,
  height = 600,
  autoRefresh = false,
  refreshInterval = 300,
  className = "",
}: DuneDashboardProps) {
  const { address } = useAccount();
  const [refreshKey, setRefreshKey] = useState(0);
  const hasAccess = hasDuneAccess(address);

  // 构建嵌入 URL
  const embedUrl = `https://dune.com/embeds/${dashboardId}?theme=dark&autoRefresh=${autoRefresh ? refreshInterval : 0}`;

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  if (!hasAccess) {
    return (
      <div className={`bg-gradient-to-br from-[#1A110A]/90 to-[#261A10]/90 border border-red-500/30 rounded-2xl p-8 text-center ${className}`}>
        <div className="text-red-400 text-4xl mb-4">🔒</div>
        <h3 className="text-xl font-bold text-white mb-2">无权限访问</h3>
        <p className="text-white/70">当前地址没有权限查看此仪表板</p>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${className}`}>
      <div className="absolute top-2 right-2 z-10">
        <button
          onClick={handleRefresh}
          className="px-3 py-1.5 bg-[#FF6B00]/80 hover:bg-[#FF6B00] text-white text-sm rounded-lg transition-colors shadow-lg"
          title="刷新仪表板"
        >
          🔄 刷新
        </button>
      </div>
      <iframe
        key={refreshKey}
        src={embedUrl}
        height={height}
        className="w-full border-0 rounded-lg"
        style={{ minHeight: `${height}px` }}
        title={`Dune Dashboard ${dashboardId}`}
        allow="clipboard-write"
      />
    </div>
  );
}

