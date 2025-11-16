"use client";

import { useState, useEffect, useMemo } from "react";
import { formatEther } from "viem";
import { useScaffoldReadContract, useScaffoldContract } from "~~/hooks/scaffold-eth";
import { LinkWithParams } from "~~/components/LinkWithParams";
import { useLanguage } from "~~/utils/i18n/LanguageContext";
import { useAgentCard } from "~~/hooks/useAgentCard";

const HomePage = () => {
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

  // 加载 Agents
  useEffect(() => {
    let isMounted = true;

    const loadAgents = async () => {
      if (!agentStoreContract || isLoadingIds) {
        return;
      }

      if (!Array.isArray(allAgentIds)) {
        if (isMounted) {
          setAgents([]);
          setLoading(false);
        }
        return;
      }

      if (allAgentIds.length === 0) {
        if (isMounted) {
          setAgents([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      const agentList = [];
      
      // 只加载前3个热门 Agent
      const topAgents = allAgentIds.slice(0, 3);
      
      for (const id of topAgents) {
        if (!isMounted) break;
        
        try {
          const fullInfo = await agentStoreContract.read.getAgentFullInfo([id]);
          const [listing] = fullInfo;
          
          if (listing.listed) {
            const agentCardLink = listing.agentCardLink && listing.agentCardLink.trim() 
              ? listing.agentCardLink.trim() 
              : undefined;
            
            agentList.push({
              id: id.toString(),
              agentCardLink: agentCardLink,
              owner: listing.owner,
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
  }, [agentIdsStable, agentStoreContract?.address, allAgentIds, isLoadingIds]);

  return (
    <div className="relative flex items-center flex-col grow pt-10 pb-10 min-h-screen bg-gradient-to-br from-[#1A110A] via-[#261A10] to-[#1A110A] overflow-hidden">
      {/* 背景装饰元素 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 大型渐变圆形装饰 */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#FF6B00]/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#FF8C00]/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FF6B00]/5 rounded-full blur-3xl"></div>
        
        {/* 网格背景 */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `linear-gradient(rgba(255, 107, 0, 0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255, 107, 0, 0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}></div>
        
        {/* 装饰性光效 */}
        <div className="absolute top-20 left-1/4 w-2 h-2 bg-[#FF6B00] rounded-full blur-sm animate-pulse"></div>
        <div className="absolute top-40 right-1/3 w-3 h-3 bg-[#FF8C00] rounded-full blur-sm animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-32 left-1/3 w-2 h-2 bg-[#FF6B00] rounded-full blur-sm animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>
      
      <div className="relative px-5 w-full max-w-7xl">
        {/* 欢迎标题 */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-white mb-4 animate-text-shimmer">
            {t("welcomeToPANNetwork")}
          </h1>
          <p className="text-xl text-white/70">
            {t("startYourJourney")}
          </p>
        </div>

        {/* 你的余额部分 */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-6 animate-text-shimmer flex items-center gap-3">
            <svg className="w-7 h-7 text-[#FF6B00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t("yourBalance")}
          </h2>
          <div className="flex items-center gap-4 mb-6">
            <button className="group relative btn rounded-xl bg-gradient-to-r from-[#FF6B00] via-[#FF7A00] to-[#FF8C00] hover:from-[#FF8C00] hover:via-[#FF9A00] hover:to-[#FFA040] text-white border-0 transition-all duration-300 shadow-lg shadow-[#FF6B00]/30 hover:shadow-[#FF6B00]/50 px-6 py-3 font-semibold overflow-hidden">
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
              <span className="relative z-10 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                {t("points")}
              </span>
            </button>
            <button className="group relative btn rounded-xl bg-gradient-to-r from-[#FF6B00] via-[#FF7A00] to-[#FF8C00] hover:from-[#FF8C00] hover:via-[#FF9A00] hover:to-[#FFA040] text-white border-0 transition-all duration-300 shadow-lg shadow-[#FF6B00]/30 hover:shadow-[#FF6B00]/50 px-6 py-3 font-semibold overflow-hidden">
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
              <span className="relative z-10 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Invite friends
              </span>
            </button>
          </div>
          <div className="group relative card bg-gradient-to-br from-[#1A110A]/90 to-[#261A10]/90 backdrop-blur-xl border border-[#FF6B00]/30 rounded-2xl p-6 shadow-xl shadow-black/30 hover:shadow-[#FF6B00]/20 transition-all duration-300">
            {/* 装饰性渐变背景 */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B00]/5 via-transparent to-[#FF8C00]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
            
            {/* 顶部装饰线 */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF6B00]/40 to-transparent rounded-t-2xl"></div>
            
            <div className="relative text-sm text-white/80 space-y-3">
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#FF6B00]/5 transition-colors">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF6B00] shadow-lg shadow-[#FF6B00]/50"></div>
                <p className="font-medium">{t("newUserOpenBoxReward")}</p>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#FF6B00]/5 transition-colors">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF6B00] shadow-lg shadow-[#FF6B00]/50"></div>
                <p className="font-medium">{t("newUserCreateAgentReward")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 主操作部分 */}
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-white mb-8 animate-text-shimmer flex items-center gap-3">
            <svg className="w-7 h-7 text-[#FF6B00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {t("mainOperations")}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Open Box */}
            <div className="group relative card bg-gradient-to-br from-[#1A110A]/90 to-[#261A10]/90 backdrop-blur-xl border border-[#FF6B00]/30 rounded-2xl overflow-hidden shadow-xl shadow-black/30 hover:shadow-[#FF6B00]/20 hover:shadow-2xl transition-all duration-500 hover:border-[#FF6B00]/60 hover:-translate-y-2 flex flex-col">
              {/* 装饰性渐变背景 */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B00]/8 via-transparent to-[#FF8C00]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              
              {/* 顶部装饰线 */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#FF6B00]/60 to-transparent"></div>
              
              {/* 左侧装饰条 */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#FF6B00]/40 via-[#FF6B00]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              
              <div className="card-body p-8 relative">
                <div className="space-y-6">
                  {/* 顶部：图标、标题、价格和按钮横向排列 */}
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                    {/* 左侧：图标和标题 */}
                    <div className="flex items-center gap-4 flex-1">
                      <div 
                        className="rounded-xl bg-gradient-to-br from-[#FF6B00]/20 to-[#FF8C00]/20 flex items-center justify-center border border-[#FF6B00]/30 shadow-lg shadow-[#FF6B00]/20 flex-shrink-0"
                        style={{ width: '80px', height: '80px', minWidth: '80px', maxWidth: '80px', minHeight: '80px', maxHeight: '80px' }}
                      >
                        <svg className="w-10 h-10 text-[#FF6B00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-white mb-2">{t("pandoraBox")}</h3>
                        <div className="text-3xl font-bold text-[#FF6B00]">0.005 BNB</div>
                      </div>
                    </div>

                    {/* 右侧：按钮 */}
                    <div className="w-full md:w-auto md:flex-shrink-0">
                      <button className="group/btn relative btn btn-lg w-full md:w-48 rounded-xl bg-gradient-to-r from-[#FF6B00] via-[#FF7A00] to-[#FF8C00] hover:from-[#FF8C00] hover:via-[#FF9A00] hover:to-[#FFA040] text-white border-0 transition-all duration-300 shadow-lg shadow-[#FF6B00]/40 hover:shadow-[#FF6B00]/60 font-bold text-base px-6 py-4 overflow-hidden">
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></span>
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          {t("openBox")}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* 描述 */}
                  <div className="pt-2">
                    <p className="text-white/80 text-base leading-relaxed">
                      {t("pandoraBoxDescription")}
                    </p>
                  </div>

                  {/* 特性列表 */}
                  <div className="pt-2">
                    <div className="p-6 rounded-xl bg-gradient-to-br from-[#FF6B00]/10 to-[#FF8C00]/5 border border-[#FF6B00]/30 hover:border-[#FF6B00]/50 transition-colors">
                      <div className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                        <span className="text-lg">✨</span>
                        <span>{t("features")}</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 text-sm text-white/80">
                          <div className="w-2 h-2 rounded-full bg-[#FF6B00] mt-1.5 flex-shrink-0 shadow-lg shadow-[#FF6B00]/50"></div>
                          <span className="leading-relaxed">{t("feature1")}</span>
                        </div>
                        <div className="flex items-start gap-3 text-sm text-white/80">
                          <div className="w-2 h-2 rounded-full bg-[#FF6B00] mt-1.5 flex-shrink-0 shadow-lg shadow-[#FF6B00]/50"></div>
                          <span className="leading-relaxed">{t("feature2")}</span>
                        </div>
                        <div className="flex items-start gap-3 text-sm text-white/80">
                          <div className="w-2 h-2 rounded-full bg-[#FF6B00] mt-1.5 flex-shrink-0 shadow-lg shadow-[#FF6B00]/50"></div>
                          <span className="leading-relaxed">{t("feature3")}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Create Agent */}
            <div className="group relative card bg-gradient-to-br from-[#1A110A]/90 to-[#261A10]/90 backdrop-blur-xl border border-[#FF6B00]/30 rounded-2xl overflow-hidden shadow-xl shadow-black/30 hover:shadow-[#FF6B00]/20 hover:shadow-2xl transition-all duration-500 hover:border-[#FF6B00]/60 hover:-translate-y-2 flex flex-col">
              {/* 装饰性渐变背景 */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B00]/8 via-transparent to-[#FF8C00]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              
              {/* 顶部装饰线 */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#FF6B00]/60 to-transparent"></div>
              
              {/* 左侧装饰条 */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#FF6B00]/40 via-[#FF6B00]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              
              <div className="card-body p-8 relative">
                <div className="space-y-6">
                  {/* 顶部：图标、标题、价格和按钮横向排列 */}
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                    {/* 左侧：图标和标题 */}
                    <div className="flex items-center gap-4 flex-1">
                      <div 
                        className="rounded-xl bg-gradient-to-br from-[#FF6B00]/20 to-[#FF8C00]/20 flex items-center justify-center border border-[#FF6B00]/30 shadow-lg shadow-[#FF6B00]/20 flex-shrink-0"
                        style={{ width: '80px', height: '80px', minWidth: '80px', maxWidth: '80px', minHeight: '80px', maxHeight: '80px' }}
                      >
                        <svg className="w-10 h-10 text-[#FF6B00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-white mb-2">{t("createAgent")}</h3>
                        <div className="text-3xl font-bold text-[#FF6B00]">1 BNB</div>
                      </div>
                    </div>

                    {/* 右侧：按钮 */}
                    <div className="w-full md:w-auto md:flex-shrink-0">
                      <button className="group/btn relative btn btn-lg w-full md:w-48 rounded-xl bg-gradient-to-r from-[#FF6B00] via-[#FF7A00] to-[#FF8C00] hover:from-[#FF8C00] hover:via-[#FF9A00] hover:to-[#FFA040] text-white border-0 transition-all duration-300 shadow-lg shadow-[#FF6B00]/40 hover:shadow-[#FF6B00]/60 font-bold text-base px-6 py-4 overflow-hidden">
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></span>
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          {t("createAgent")}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* 描述 */}
                  <div className="pt-2">
                    <p className="text-white/80 text-base leading-relaxed">
                      {t("createAgentDescription")}
                    </p>
                  </div>

                  {/* 特性列表 */}
                  <div className="pt-2">
                    <div className="p-6 rounded-xl bg-gradient-to-br from-[#FF6B00]/10 to-[#FF8C00]/5 border border-[#FF6B00]/30 hover:border-[#FF6B00]/50 transition-colors">
                      <div className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                        <span className="text-lg">✨</span>
                        <span>{t("advantages")}</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 text-sm text-white/80">
                          <div className="w-2 h-2 rounded-full bg-[#FF6B00] mt-1.5 flex-shrink-0 shadow-lg shadow-[#FF6B00]/50"></div>
                          <span className="leading-relaxed">{t("advantage1")}</span>
                        </div>
                        <div className="flex items-start gap-3 text-sm text-white/80">
                          <div className="w-2 h-2 rounded-full bg-[#FF6B00] mt-1.5 flex-shrink-0 shadow-lg shadow-[#FF6B00]/50"></div>
                          <span className="leading-relaxed">{t("advantage2")}</span>
                        </div>
                        <div className="flex items-start gap-3 text-sm text-white/80">
                          <div className="w-2 h-2 rounded-full bg-[#FF6B00] mt-1.5 flex-shrink-0 shadow-lg shadow-[#FF6B00]/50"></div>
                          <span className="leading-relaxed">{t("advantage3")}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 服务市场部分 */}
        <div>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-white animate-text-shimmer flex items-center gap-3">
              <svg className="w-7 h-7 text-[#FF6B00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {t("serviceMarketplace")}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full text-center py-12">
                <span className="loading loading-spinner loading-lg text-[#FF6B00]"></span>
                <p className="text-xl text-white/70 mt-4">{t("loading")}</p>
              </div>
            ) : agents.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-xl text-white/70">{t("noAgentsAvailable")}</p>
              </div>
            ) : (
              agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Agent 卡片组件
 */
function AgentCard({ agent }: { agent: any }) {
  const { t } = useLanguage();
  const agentCardLink = agent.agentCardLink && agent.agentCardLink.trim() 
    ? agent.agentCardLink.trim() 
    : undefined;
  
  const { agentCard, loading: cardLoading } = useAgentCard(
    agentCardLink,
    !!agentCardLink
  );

  // 获取价格并安全转换
  const price = agentCard?.capabilities?.[0]?.pricing?.price;
  const formatPrice = (price: string | number | undefined): string => {
    if (!price) return t("pricePending");
    
    try {
      // 如果 price 是字符串，尝试转换为 BigInt
      if (typeof price === "string") {
        // 检查是否是有效的数字字符串（wei 单位）
        if (/^\d+$/.test(price)) {
          const priceBigInt = BigInt(price);
          const formatted = formatEther(priceBigInt);
          return `${parseFloat(formatted).toFixed(6).replace(/\.?0+$/, "")} BNB/次`;
        }
        // 如果已经是格式化的字符串（如 "0.005"），直接返回
        return `${price} BNB/次`;
      }
      // 如果是数字，假设是 wei 单位
      if (typeof price === "number") {
        const priceBigInt = BigInt(Math.floor(price));
        const formatted = formatEther(priceBigInt);
        return `${parseFloat(formatted).toFixed(6).replace(/\.?0+$/, "")} BNB/次`;
      }
      return t("pricePending");
    } catch (error) {
      // 如果转换失败，返回原始值或默认值
      return typeof price === "string" ? `${price} BNB/次` : t("pricePending");
    }
  };
  
  const priceDisplay = formatPrice(price);

  // 获取名称
  const name = agentCard?.name || `Agent ${agent.id}`;

  return (
    <div className="group relative h-full flex flex-col bg-gradient-to-br from-[#1A110A] via-[#261A10] to-[#1A110A] backdrop-blur-xl border border-[#FF6B00]/20 rounded-2xl overflow-hidden shadow-xl shadow-black/30 hover:shadow-[#FF6B00]/20 hover:shadow-2xl transition-all duration-500 hover:border-[#FF6B00]/60 hover:-translate-y-2">
      {/* 装饰性渐变背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B00]/8 via-transparent to-[#FF8C00]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      
      {/* 顶部装饰线 */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#FF6B00]/60 to-transparent"></div>
      
      {/* 左侧装饰条 */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#FF6B00]/40 via-[#FF6B00]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      
      <div className="relative flex flex-col flex-grow p-6">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-white mb-2">{name}</h3>
          {agentCard?.capabilities?.[0]?.name && (
            <p className="text-sm text-white/70">{agentCard.capabilities[0].name}</p>
          )}
        </div>
        <p className="text-sm text-white/80 mb-4">({priceDisplay})</p>
        
        {/* 底部按钮区域 */}
        <div className="mt-auto pt-4 border-t border-[#FF6B00]/20">
          <LinkWithParams
            href={`/agent-store/${agent.id}`}
            className="group/btn relative block w-full text-center px-4 py-2 text-sm font-bold rounded-xl bg-gradient-to-r from-[#FF6B00] via-[#FF7A00] to-[#FF8C00] text-white border-0 transition-all duration-300 hover:from-[#FF8C00] hover:via-[#FF9A00] hover:to-[#FFA040] hover:shadow-xl hover:shadow-[#FF6B00]/40 transform hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
          >
            {/* 按钮光效 */}
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></span>
            <span className="relative z-10 flex items-center justify-center gap-2">
              {t("tryAgent")}
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

export default HomePage;

