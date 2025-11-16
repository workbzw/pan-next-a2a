"use client";

import type { NextPage } from "next";
import { useState, useEffect, useMemo } from "react";
import { useScaffoldReadContract, useScaffoldContract } from "~~/hooks/scaffold-eth";
import { LinkWithParams } from "~~/components/LinkWithParams";
import { useLanguage } from "~~/utils/i18n/LanguageContext";
import { useAgentCard } from "~~/hooks/useAgentCard";
import { AgentCardSummary } from "~~/components/AgentCard/AgentCardSummary";

const AgentStore: NextPage = () => {
  const { t } = useLanguage();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 获取合约实例
  const { data: agentStoreContract } = useScaffoldContract({
    contractName: "AgentStore",
  });

  // 获取所有上架的 Agents
  const { data: allAgentIds, isLoading: isLoadingIds } = useScaffoldReadContract({
    contractName: "AgentStore",
    functionName: "getAllListedAgents",
  });

  // 使用 useMemo 来稳定 allAgentIds 的引用
  const agentIdsStable = useMemo(() => {
    if (!allAgentIds || !Array.isArray(allAgentIds)) return null;
    return allAgentIds.map(id => id.toString()).join(",");
  }, [allAgentIds]);

  // 更新 loading 状态
  useEffect(() => {
    // 如果还在加载 IDs 或合约未准备好，显示加载中
    if (isLoadingIds || !agentStoreContract) {
      setLoading(true);
      return;
    }

    // 如果 IDs 加载完成，但 useEffect 会处理实际的数据加载
    // 这里不设置 loading 为 false，让 useEffect 来控制
  }, [isLoadingIds, agentStoreContract]);

  useEffect(() => {
    let isMounted = true;

    const loadAgents = async () => {
      // 检查依赖项是否准备好
      if (!agentStoreContract || isLoadingIds) {
        return;
      }

      // allAgentIds 已经加载完成，处理数据
      if (!Array.isArray(allAgentIds)) {
        if (isMounted) {
          setAgents([]);
          setLoading(false);
        }
        return;
      }

      // 如果数组为空，直接设置空列表
      if (allAgentIds.length === 0) {
        if (isMounted) {
          setAgents([]);
          setLoading(false);
        }
        return;
      }

      // 开始加载详细信息
      setLoading(true);
      const agentList = [];
      
      for (const id of allAgentIds) {
        if (!isMounted) break;
        
        try {
          const fullInfo = await agentStoreContract.read.getAgentFullInfo([id]);
          const [listing, identity, averageRating, feedbackCount] = fullInfo;
          
          // 只显示已上架的
          if (listing.listed) {
            // 确保 agentCardLink 不是空字符串
            const agentCardLink = listing.agentCardLink && listing.agentCardLink.trim() 
              ? listing.agentCardLink.trim() 
              : undefined;
            
            agentList.push({
              id: id.toString(),
              agentCardLink: agentCardLink, // Agent Card 链接（所有信息从 Agent Card 获取）
              owner: listing.owner,
              usageCount: listing.usageCount?.toString() || "0",
              averageRating: averageRating ? (Number(averageRating) / 1000).toFixed(1) : "N/A",
              feedbackCount: feedbackCount?.toString() || "0",
            });
          }
        } catch (error) {
          console.error("Error loading agent:", error);
        }
      }
      
      if (isMounted) {
        setAgents(agentList);
        setLoading(false);
      }
    };

    loadAgents();

    return () => {
      isMounted = false;
    };
    // 依赖项：当合约地址或 Agent IDs 稳定值变化时重新加载
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentIdsStable, agentStoreContract?.address, allAgentIds, isLoadingIds]);


  return (
    <>
      <div className="flex items-center flex-col grow pt-10 pb-10">
        <div className="px-5 w-full max-w-7xl">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold animate-text-shimmer">
              {t("agentShop")}
            </h1>
            <LinkWithParams 
              href="/agent-store/register" 
              className="btn rounded-lg bg-[#FF6B00] hover:bg-[#FF8C00] text-white border-0 transition-all duration-300 transform hover:scale-105 animate-pulse-glow"
            >
              {t("registerNewAgent")}
            </LinkWithParams>
          </div>

          {/* Agent 列表 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full text-center py-12">
                <span className="loading loading-spinner loading-lg text-[#FF6B00]"></span>
                <p className="text-xl text-white/70 mt-4">{t("loading")}</p>
              </div>
            ) : agents.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-xl text-white/70">
                  {t("noAgentsYet")}
                </p>
              </div>
            ) : (
              agents.map((agent) => (
                <AgentCardItem key={agent.id} agent={agent} t={t} />
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

/**
 * Agent 卡片项组件（支持 Agent Card 数据）
 */
function AgentCardItem({ 
  agent, 
  t 
}: { 
  agent: any; 
  t: (key: any) => string;
}) {
  // 获取 Agent Card 数据（如果 agentCardLink 存在且不为空）
  const agentCardLink = agent.agentCardLink && agent.agentCardLink.trim() 
    ? agent.agentCardLink.trim() 
    : undefined;
  
  const { agentCard, loading: cardLoading, error: cardError } = useAgentCard(
    agentCardLink,
    !!agentCardLink
  );

  return (
    <div 
      className="group relative h-full flex flex-col bg-gradient-to-br from-[#1A110A] via-[#261A10] to-[#1A110A] backdrop-blur-xl border border-[#FF6B00]/20 rounded-2xl overflow-hidden shadow-xl shadow-black/30 hover:shadow-[#FF6B00]/20 hover:shadow-2xl transition-all duration-500 hover:border-[#FF6B00]/60 hover:-translate-y-2"
      style={{ animationDelay: `${(parseInt(agent.id) % 3) * 0.3}s` }}
    >
      {/* 装饰性渐变背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B00]/8 via-transparent to-[#FF8C00]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      
      {/* 顶部装饰线 */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#FF6B00]/60 to-transparent"></div>
      
      {/* 左侧装饰条 */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#FF6B00]/40 via-[#FF6B00]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      
      <div className="relative flex flex-col flex-grow p-7">
        {/* 显示 Agent Card 信息（所有信息从 Agent Card 获取） */}
        {agentCardLink ? (
          <>
            {cardError && (
              <div className="mb-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
                Error loading Agent Card: {cardError}
              </div>
            )}
            <AgentCardSummary agentCard={agentCard} loading={cardLoading} className="flex-grow" />
          </>
        ) : (
          <div className="flex-grow space-y-3">
            <h2 className="text-2xl font-bold text-white">{`Agent #${agent.id}`}</h2>
            <p className="text-sm text-white/70 line-clamp-2 leading-relaxed">
              {t("noAgentCard") || "No Agent Card available"}
            </p>
          </div>
        )}
        
        {/* 底部按钮区域 */}
        <div className="mt-8 pt-5 border-t border-[#FF6B00]/20">
          <LinkWithParams
            href={`/agent-store/${agent.id}`}
            className="group/btn relative block w-full text-center px-5 py-3 text-sm font-bold rounded-xl bg-gradient-to-r from-[#FF6B00] via-[#FF7A00] to-[#FF8C00] text-white border-0 transition-all duration-300 hover:from-[#FF8C00] hover:via-[#FF9A00] hover:to-[#FFA040] hover:shadow-xl hover:shadow-[#FF6B00]/40 transform hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
          >
            {/* 按钮光效 */}
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></span>
            <span className="relative z-10 flex items-center justify-center gap-2">
              {t("viewDetails")}
              <svg className="w-4 h-4 transform group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </LinkWithParams>
        </div>
      </div>
    </div>
  );
}

export default AgentStore;
