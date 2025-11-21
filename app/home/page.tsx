"use client";

import { useState, useEffect, useMemo } from "react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldContract, useCopyToClipboard, useTotalPoints, useSelfMintSBTPoints, useSelfCreateAgentPoints, useReferMintSBTPoints, useReferCreateAgentPoints } from "~~/hooks/scaffold-eth";
import { LinkWithParams } from "~~/components/LinkWithParams";
import { useLanguage } from "~~/utils/i18n/LanguageContext";
import { useAgentCard } from "~~/hooks/useAgentCard";
import CryptoJS from "crypto-js";
import { DocumentDuplicateIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { addQueryParams } from "~~/utils/urlParams";

const HomePage = () => {
  const { t } = useLanguage();
  const { address } = useAccount();
  const router = useRouter();
  const { copyToClipboard, isCopiedToClipboard } = useCopyToClipboard();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteCount, setInviteCount] = useState<number | null>(null);
  const [loadingInviteCount, setLoadingInviteCount] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // 获取合约实例
  const { data: agentStoreContract } = useScaffoldContract({
    contractName: "AgentStore",
  });

  // 读取注册费用
  const { data: registrationFee } = useScaffoldReadContract({
    contractName: "AgentStore",
    functionName: "registrationFee",
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

  // 查询邀请人数（基于 AgentStore 的 referrer）
  useEffect(() => {
    const fetchInviteCount = async () => {
      if (!address || !agentStoreContract) {
        setInviteCount(null);
        return;
      }

      try {
        setLoadingInviteCount(true);
        
        // 1. 计算钱包地址的 MD5 并取最后 8 位
        const md5Hash = CryptoJS.MD5(address.toLowerCase()).toString();
        const referrerCode = md5Hash.slice(-8);
        console.log("钱包地址:", address);
        console.log("MD5 哈希:", md5Hash);
        console.log("推荐码 (最后8位):", referrerCode);

        // 2. 调用 AgentStore 合约获取该推荐码的所有 Agent IDs
        const agentIds = await agentStoreContract.read.getAgentsByReferrer([referrerCode]) as bigint[];
        
        if (!agentIds || agentIds.length === 0) {
          setInviteCount(0);
          setLoadingInviteCount(false);
          return;
        }

        console.log("推荐码对应的 Agent IDs:", agentIds);

        // 3. 批量查询每个 Agent 的 owner，并去重
        const ownerPromises = agentIds.map(async (agentId) => {
          try {
            const fullInfo = await agentStoreContract.read.getAgentFullInfo([agentId]);
            const [listing] = fullInfo;
            return listing.owner.toLowerCase();
          } catch (error) {
            console.error(`查询 Agent ${agentId} 的 owner 失败:`, error);
            return null;
          }
        });

        const owners = await Promise.all(ownerPromises);
        const uniqueOwners = new Set(owners.filter(owner => owner !== null));
        
        console.log("去重后的邀请人数:", uniqueOwners.size);
        setInviteCount(uniqueOwners.size);
      } catch (error) {
        console.error("查询邀请人数失败:", error);
        setInviteCount(null);
      } finally {
        setLoadingInviteCount(false);
      }
    };

    fetchInviteCount();
  }, [address, agentStoreContract?.address]);

  // 计算邀请链接
  const inviteLink = useMemo(() => {
    if (!address) return "";
    const md5Hash = CryptoJS.MD5(address.toLowerCase()).toString();
    const referrerCode = md5Hash.slice(-8);
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/home?referrer=${referrerCode}`;
  }, [address]);

  // 获取各项积分（useTotalPoints 内部已经调用了所有单独的 hooks，所以只需要调用一次）
  const { totalPoints, breakdown, isLoading: isLoadingTotalPoints } = useTotalPoints(
    address as `0x${string}` | undefined
  );
  
  // 从 breakdown 中获取各项积分，避免重复查询
  const selfMintSBTPoints = breakdown.selfMintSBT;
  const selfCreateAgentPoints = breakdown.selfCreateAgent;
  const referMintSBTPoints = breakdown.referMintSBT;
  const referCreateAgentPoints = breakdown.referCreateAgent;
  
  // 使用 isLoadingTotalPoints 作为所有积分的加载状态
  const isLoadingSelfMintSBT = isLoadingTotalPoints;
  const isLoadingSelfCreateAgent = isLoadingTotalPoints;
  const isLoadingReferMintSBT = isLoadingTotalPoints;
  const isLoadingReferCreateAgent = isLoadingTotalPoints;

  // 处理复制邀请链接
  const handleCopyInviteLink = async () => {
    if (inviteLink) {
      await copyToClipboard(inviteLink);
    }
  };

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
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-white mb-4 animate-text-shimmer leading-tight">
            {t("welcomeToPANNetwork")}
          </h1>
          <p className="text-xl text-white/70">
            {t("startYourJourney")}
          </p>
          <p className="text-xl text-white/70">
            {t("startYourJourneySubtitle")}
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
                {address && (
                  <span className="ml-2 flex items-center">
                    {isLoadingTotalPoints ? (
                      <span className="inline-flex items-center justify-center w-5 h-5">
                        <span className="loading loading-spinner loading-xs text-white/60"></span>
                      </span>
                    ) : (
                      <span className="relative inline-flex items-center justify-center min-w-[2rem] h-6 px-2 rounded-full bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-sm border border-white/30 shadow-sm">
                        <span className="text-xs font-bold text-white leading-none">
                          {totalPoints.toLocaleString()}
                        </span>
                      </span>
                    )}
                  </span>
                )}
              </span>
            </button>
            <button 
              onClick={() => setShowInviteModal(true)}
              className="group relative btn rounded-xl bg-gradient-to-r from-[#FF6B00] via-[#FF7A00] to-[#FF8C00] hover:from-[#FF8C00] hover:via-[#FF9A00] hover:to-[#FFA040] text-white border-0 transition-all duration-300 shadow-lg shadow-[#FF6B00]/30 hover:shadow-[#FF6B00]/50 px-6 py-3 font-semibold overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
              <span className="relative z-10 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                {t("inviteFriends")}
              </span>
            </button>
          </div>

          {/* 积分详情卡片 */}
          {address && (
            <div className="group relative card bg-gradient-to-br from-[#1A110A]/90 to-[#261A10]/90 backdrop-blur-xl border border-[#FF6B00]/30 rounded-2xl p-6 shadow-xl shadow-black/30 hover:shadow-[#FF6B00]/20 transition-all duration-300 mb-6">
              {/* 装饰性渐变背景 */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B00]/5 via-transparent to-[#FF8C00]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
              
              {/* 顶部装饰线 */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF6B00]/40 to-transparent rounded-t-2xl"></div>
              
              <div className="relative">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#FF6B00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  {t("pointsDetails")}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 自己mintSBT积分 */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-[#FF6B00]/10 to-[#FF8C00]/5 border border-[#FF6B00]/20 hover:border-[#FF6B00]/40 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white/70">{t("selfMintSBT")}</span>
                      {isLoadingSelfMintSBT ? (
                        <span className="loading loading-spinner loading-xs text-[#FF6B00]"></span>
                      ) : (
                        <span className="text-lg font-bold text-[#FF6B00]">{selfMintSBTPoints.toLocaleString()}</span>
                      )}
                    </div>
                    <div className="text-xs text-white/50">{t("selfMintSBTPointsDesc")}</div>
                  </div>

                  {/* 自己创建Agent积分 */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-[#FF6B00]/10 to-[#FF8C00]/5 border border-[#FF6B00]/20 hover:border-[#FF6B00]/40 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white/70">{t("selfCreateAgent")}</span>
                      {isLoadingSelfCreateAgent ? (
                        <span className="loading loading-spinner loading-xs text-[#FF6B00]"></span>
                      ) : (
                        <span className="text-lg font-bold text-[#FF6B00]">{selfCreateAgentPoints.toLocaleString()}</span>
                      )}
                    </div>
                    <div className="text-xs text-white/50">{t("selfCreateAgentPointsDesc")}</div>
                  </div>

                  {/* 推荐别人mintSBT积分 */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-[#FF6B00]/10 to-[#FF8C00]/5 border border-[#FF6B00]/20 hover:border-[#FF6B00]/40 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white/70">{t("referMintSBT")}</span>
                      {isLoadingReferMintSBT ? (
                        <span className="loading loading-spinner loading-xs text-[#FF6B00]"></span>
                      ) : (
                        <span className="text-lg font-bold text-[#FF6B00]">{referMintSBTPoints.toLocaleString()}</span>
                      )}
                    </div>
                    <div className="text-xs text-white/50">{t("referMintSBTPointsDesc")}</div>
                  </div>

                  {/* 推荐别人创建Agent积分 */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-[#FF6B00]/10 to-[#FF8C00]/5 border border-[#FF6B00]/20 hover:border-[#FF6B00]/40 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white/70">{t("referCreateAgent")}</span>
                      {isLoadingReferCreateAgent ? (
                        <span className="loading loading-spinner loading-xs text-[#FF6B00]"></span>
                      ) : (
                        <span className="text-lg font-bold text-[#FF6B00]">{referCreateAgentPoints.toLocaleString()}</span>
                      )}
                    </div>
                    <div className="text-xs text-white/50">{t("referCreateAgentPointsDesc")}</div>
                  </div>
                </div>

                {/* 总积分 */}
                <div className="mt-4 pt-4 border-t border-[#FF6B00]/20">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-white">{t("totalPoints")}</span>
                    {isLoadingTotalPoints ? (
                      <span className="loading loading-spinner loading-sm text-[#FF6B00]"></span>
                    ) : (
                      <span className="text-2xl font-bold text-[#FF6B00]">{totalPoints.toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 主操作部分 */}
        <div className="mb-10">
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
                      <button 
                        onClick={() => router.push(addQueryParams("/agent-store/4"))}
                        className="group/btn relative btn btn-lg w-full md:w-48 rounded-xl bg-gradient-to-r from-[#FF6B00] via-[#FF7A00] to-[#FF8C00] hover:from-[#FF8C00] hover:via-[#FF9A00] hover:to-[#FFA040] text-white border-0 transition-all duration-300 shadow-lg shadow-[#FF6B00]/40 hover:shadow-[#FF6B00]/60 font-bold text-base px-6 py-4 overflow-hidden"
                      >
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
                        <h3 className="text-2xl font-bold text-white mb-2">{t("createAgentTitle")}</h3>
                        <div className="text-3xl font-bold text-[#FF6B00]">
                          {registrationFee ? `${formatEther(registrationFee)} BNB` : "Loading..."}
                        </div>
                      </div>
                    </div>

                    {/* 右侧：按钮 */}
                    <div className="w-full md:w-auto md:flex-shrink-0">
                      <button 
                        onClick={() => router.push(addQueryParams("/agent-store/register"))}
                        className="group/btn relative btn btn-lg w-full md:w-48 rounded-xl bg-gradient-to-r from-[#FF6B00] via-[#FF7A00] to-[#FF8C00] hover:from-[#FF8C00] hover:via-[#FF9A00] hover:to-[#FFA040] text-white border-0 transition-all duration-300 shadow-lg shadow-[#FF6B00]/40 hover:shadow-[#FF6B00]/60 font-bold text-base px-6 py-4 overflow-hidden"
                      >
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

      {/* 邀请弹窗 */}
      {showInviteModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowInviteModal(false);
            }
          }}
        >
          <div className="relative w-full max-w-md mx-4">
            <div className="bg-gradient-to-br from-[#1A110A] via-[#261A10] to-[#1A110A] border border-[#FF6B00]/30 rounded-2xl shadow-2xl overflow-hidden">
              {/* 顶部装饰线 */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#FF6B00]/60 to-transparent"></div>
              
              {/* 关闭按钮 */}
              <button
                onClick={() => setShowInviteModal(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-colors z-10"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* 弹窗内容 */}
              <div className="p-6 pt-8">
                <h3 className="text-2xl font-bold text-white mb-2">{t("inviteModalTitle")}</h3>
                <p className="text-sm text-white/70 mb-6">{t("inviteModalDescription")}</p>
                
                {!address ? (
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-sm text-white/70 text-center">{t("connectWalletToGenerate")}</p>
                  </div>
                ) : (
                  <>
                    {/* 邀请链接显示区域 */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-white/80 mb-2">{t("inviteLink")}</label>
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
                        <input
                          type="text"
                          value={inviteLink}
                          readOnly
                          className="flex-1 bg-transparent text-white text-sm outline-none break-all"
                        />
                        <button
                          onClick={handleCopyInviteLink}
                          disabled={!inviteLink}
                          className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#FF6B00]/20 hover:bg-[#FF6B00]/30 border border-[#FF6B00]/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                          title={t("copyLink")}
                        >
                          {isCopiedToClipboard ? (
                            <CheckCircleIcon className="w-5 h-5 text-[#FF6B00]" />
                          ) : (
                            <DocumentDuplicateIcon className="w-5 h-5 text-[#FF6B00]" />
                          )}
                        </button>
                      </div>
                      {isCopiedToClipboard && (
                        <p className="mt-2 text-xs text-[#FF6B00]">{t("copiedToClipboard")}</p>
                      )}
                    </div>

                    {/* 提示信息 */}
                    <div className="p-4 rounded-xl bg-[#FF6B00]/10 border border-[#FF6B00]/20">
                      <p className="text-xs text-white/70 leading-relaxed">
                        {t("inviteRewardTip")}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
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

