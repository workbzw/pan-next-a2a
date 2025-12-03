"use client";

import { useAccount } from "wagmi";
import { hasDuneAccess } from "~~/utils/dune/accessControl";

interface DuneAccessGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showMessage?: boolean;
}

/**
 * Dune 数据访问守卫组件
 * 只允许授权地址访问子组件
 * 
 * @example
 * <DuneAccessGuard>
 *   <DuneChart queryId={123456} />
 * </DuneAccessGuard>
 */
export function DuneAccessGuard({
  children,
  fallback,
  showMessage = true,
}: DuneAccessGuardProps) {
  const { address, isConnected } = useAccount();
  const hasAccess = hasDuneAccess(address);

  if (!isConnected) {
    return (
      <div className="bg-gradient-to-br from-[#1A110A]/90 to-[#261A10]/90 border border-[#FF6B00]/30 rounded-2xl p-8 text-center">
        <p className="text-white/70 mb-4">请先连接钱包</p>
        {fallback}
      </div>
    );
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="bg-gradient-to-br from-[#1A110A]/90 to-[#261A10]/90 border border-red-500/30 rounded-2xl p-8 text-center">
        <div className="text-red-400 text-4xl mb-4">🔒</div>
        <h3 className="text-xl font-bold text-white mb-2">无权限访问</h3>
        <p className="text-white/70 mb-4">
          当前地址 <code className="bg-[#1A110A] px-2 py-1 rounded text-[#FF6B00]">{address}</code> 没有权限访问 Dune 数据
        </p>
        {showMessage && (
          <p className="text-white/50 text-sm">请联系管理员添加访问权限</p>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

