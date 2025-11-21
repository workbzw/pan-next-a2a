"use client";

import { useState, useEffect, useMemo } from "react";
import { useScaffoldReadContract, useScaffoldContract } from "~~/hooks/scaffold-eth";
import { LinkWithParams } from "~~/components/LinkWithParams";
import { useLanguage } from "~~/utils/i18n/LanguageContext";
import { useAgentCard } from "~~/hooks/useAgentCard";

const DiscoverPage = () => {
  const { t } = useLanguage();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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
      
      for (const id of allAgentIds) {
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

  // 过滤 Agents
  const filteredAgents = useMemo(() => {
    if (!searchQuery) return agents;
    const query = searchQuery.toLowerCase();
    // 这里可以根据 agentCard 的内容进行搜索
    return agents;
  }, [agents, searchQuery]);

  // 获取最近添加的 Agents
  const recentAgents = filteredAgents.slice(0, 4);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section - PANdora */}
      <HeroSection />

      {/* 主要内容区域 */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* 搜索和筛选区域 */}
        <div className="mb-10 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="relative mb-6">
            <input
              type="text"
              placeholder="Search by model, task, category and more"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3.5 pl-12 pr-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-gray-50 focus:bg-white"
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Try 建议标签 */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-700 font-semibold">Try:</span>
            {["Newest image to video models", "Flux Kontext", "Generate 3D model", "Create music", "Remove background", "Upscale", "Training", "Try on clothing"].map((tag, index) => (
              <button
                key={index}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-orange-100 hover:text-orange-700 rounded-lg transition-all duration-200 flex items-center gap-2 border border-transparent hover:border-orange-200 font-medium"
              >
                {tag}
              </button>
            ))}
            <LinkWithParams
              href="/agent-store"
              className="ml-auto px-4 py-2 text-sm text-orange-600 hover:text-orange-700 font-semibold hover:underline transition-all"
            >
              View all models →
            </LinkWithParams>
          </div>
        </div>

        {/* 余额和主操作部分 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* 左侧：余额部分 */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-orange-50 via-yellow-50 to-orange-50 rounded-2xl p-6 border-2 border-orange-100 shadow-lg shadow-orange-100/50">
              <h2 className="text-2xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                {t("yourBalance")}
              </h2>
              <div className="flex flex-col gap-3 mb-5">
                <button className="group relative px-4 py-3 bg-white rounded-xl border-2 border-orange-200 hover:border-orange-400 hover:shadow-md transition-all duration-200 text-left">
                  <span className="flex items-center gap-3 text-gray-700 font-semibold">
                    <div className="p-1.5 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                    {t("points")}
                  </span>
                </button>
                <button className="group relative px-4 py-3 bg-white rounded-xl border-2 border-orange-200 hover:border-orange-400 hover:shadow-md transition-all duration-200 text-left">
                  <span className="flex items-center gap-3 text-gray-700 font-semibold">
                    <div className="p-1.5 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    </div>
                    {t("inviteFriends")}
                  </span>
                </button>
              </div>
              <div className="bg-white/90 rounded-xl p-5 border-2 border-orange-100 shadow-sm">
                <div className="text-sm text-gray-700 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0 shadow-sm"></div>
                    <p className="text-xs leading-relaxed font-medium">{t("newUserOpenBoxReward")}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0 shadow-sm"></div>
                    <p className="text-xs leading-relaxed font-medium">{t("newUserCreateAgentReward")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：主操作部分 */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              {t("mainOperations")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              {/* PANdora Box */}
              <MainOperationCard
                icon={
                  <svg className="w-10 h-10 text-[#FF6B00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                }
                title={t("pandoraBox")}
                price="0.005 BNB"
                description={t("pandoraBoxDescription")}
                buttonText={t("openBox")}
                buttonLink="/agent-store/2"
                features={[
                  t("feature1"),
                  t("feature2"),
                  t("feature3"),
                ]}
              />

              {/* Create Agent */}
              <MainOperationCard
                icon={
                  <svg className="w-10 h-10 text-[#FF6B00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                }
                title={t("createAgent")}
                price="1 BNB"
                description={t("createAgentDescription")}
                buttonText={t("createAgent")}
                buttonLink="/agent-store/register"
                features={[
                  t("advantage1"),
                  t("advantage2"),
                  t("advantage3"),
                ]}
              />
            </div>
          </div>
        </div>

        {/* Recently Added Section */}
        {recentAgents.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-1 h-8 bg-gradient-to-b from-orange-500 to-orange-400 rounded-full"></div>
                Recently Added
              </h2>
              <button className="text-gray-600 hover:text-orange-600 font-semibold text-lg transition-colors flex items-center gap-2 group">
                View all
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentAgents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} showNewBadge={true} />
              ))}
            </div>
          </div>
        )}

        {/* All Agents Grid */}
        {filteredAgents.length > 4 && (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
              <div className="w-1 h-8 bg-gradient-to-b from-orange-500 to-orange-400 rounded-full"></div>
              All Agents
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredAgents.slice(4).map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-20">
            <span className="loading loading-spinner loading-lg text-gray-400"></span>
            <p className="text-gray-600 mt-4">{t("loading")}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredAgents.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-600 text-xl">{t("noAgentsAvailable")}</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Hero Section - PANdora
 */
function HeroSection() {
  return (
    <div className="relative bg-gradient-to-br from-orange-100 via-yellow-50 to-blue-50 overflow-hidden">
      {/* 动态背景装饰 */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255, 107, 0, 0.3) 0%, transparent 50%),
                            radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.3) 0%, transparent 50%),
                            radial-gradient(circle at 40% 20%, rgba(251, 191, 36, 0.3) 0%, transparent 50%)`,
        }}></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-16">
        <div className="max-w-2xl">
          {/* 标签 */}
          <div className="flex gap-2 mb-4">
            <span className="px-3 py-1 bg-white/80 backdrop-blur-sm rounded-lg text-sm font-medium text-gray-700 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              image-to-image
            </span>
            <span className="px-3 py-1 bg-white/80 backdrop-blur-sm rounded-lg text-sm font-medium text-gray-700 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              image-editing
            </span>
          </div>

          {/* 标题 */}
          <h1 className="text-5xl font-bold text-gray-900 mb-4">PANdora</h1>

          {/* 描述 */}
          <p className="text-lg text-gray-700 mb-6">
            By opening a PANdora box, your agent pays for an agent.
          </p>

          {/* 按钮 */}
          <div className="flex gap-4">
            <LinkWithParams
              href="/agent-store/2"
              className="px-8 py-3.5 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl font-semibold hover:from-gray-800 hover:to-gray-700 transition-all duration-200 shadow-lg shadow-gray-900/30 hover:shadow-gray-900/50"
            >
              Try it now!
            </LinkWithParams>
            <button className="px-8 py-3.5 bg-white/90 backdrop-blur-sm text-gray-700 rounded-xl font-semibold hover:bg-white border-2 border-gray-200 hover:border-gray-300 transition-all duration-200 shadow-sm">
              See docs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 主操作卡片组件
 */
function MainOperationCard({
  icon,
  title,
  price,
  description,
  buttonText,
  buttonLink,
  features,
}: {
  icon: React.ReactNode;
  title: string;
  price: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  features: string[];
}) {
  const { t } = useLanguage();
  
  return (
    <div className="group relative bg-white border-2 border-gray-200 rounded-2xl overflow-hidden hover:shadow-2xl hover:border-orange-300 transition-all duration-300 h-full flex flex-col">
      <div className="p-6 flex flex-col flex-1">
        {/* 图标、标题、价格和按钮 */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
          <div className="flex items-center gap-4 flex-1">
            <div 
              className="rounded-xl bg-gradient-to-br from-[#FF6B00]/20 to-[#FF8C00]/20 flex items-center justify-center border border-[#FF6B00]/30 shadow-lg shadow-[#FF6B00]/20 flex-shrink-0"
              style={{ width: '60px', height: '60px', minWidth: '60px', maxWidth: '60px', minHeight: '60px', maxHeight: '60px' }}
            >
              {icon}
            </div>
            <div className="flex-1 min-h-[60px] flex flex-col justify-center">
              <h3 className="text-xl font-bold text-gray-900 mb-1">{title}</h3>
              <div className="text-2xl font-bold text-[#FF6B00] leading-tight">
                <div className="block">{price.split(' ')[0]}</div>
                <div className="block text-lg">{price.split(' ')[1] || ''}</div>
              </div>
            </div>
          </div>
          <LinkWithParams
            href={buttonLink}
            className="w-full md:w-auto md:flex-shrink-0 px-6 py-3 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white rounded-xl font-semibold hover:from-[#FF8C00] hover:to-[#FF9A00] transition-all duration-200 text-center shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50"
          >
            {buttonText}
          </LinkWithParams>
        </div>

        {/* 描述 */}
        <p className="text-sm text-gray-600 mb-4 leading-relaxed flex-shrink-0">{description}</p>

        {/* 特性列表 */}
        <div className="bg-gradient-to-br from-orange-50 via-yellow-50 to-orange-50 rounded-xl p-5 border-2 border-orange-100 shadow-sm flex-1">
          <div className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-xl">✨</span>
            <span>{title === t("pandoraBox") ? t("features") : t("advantages")}</span>
          </div>
          <div className="space-y-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3 text-xs text-gray-700">
                <div className="w-2 h-2 rounded-full bg-[#FF6B00] mt-1.5 flex-shrink-0 shadow-sm"></div>
                <span className="leading-relaxed font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Agent 卡片组件
 */
function AgentCard({ agent, showNewBadge = false }: { agent: any; showNewBadge?: boolean }) {
  const agentCardLink = agent.agentCardLink && agent.agentCardLink.trim() 
    ? agent.agentCardLink.trim() 
    : undefined;
  
  const { agentCard } = useAgentCard(
    agentCardLink,
    !!agentCardLink
  );

  const name = agentCard?.name || `Agent ${agent.id}`;
  const description = agentCard?.description || "";
  const capabilities = agentCard?.capabilities || [];
  const primaryCapability = capabilities[0];

  // 获取标签
  const tags = useMemo(() => {
    const tagList: string[] = [];
    if (primaryCapability?.name) {
      tagList.push(primaryCapability.name);
    }
    return tagList;
  }, [primaryCapability]);

  // 获取图标（根据 capability 类型）
  const getIcon = (tag: string) => {
    if (tag.includes("image") || tag.includes("video")) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    if (tag.includes("text") || tag.includes("speech")) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  return (
    <LinkWithParams
      href={`/agent-store/${agent.id}`}
      className="group relative block bg-white border-2 border-gray-200 rounded-2xl overflow-hidden hover:shadow-2xl hover:border-orange-300 transition-all duration-300"
    >
      {/* New Badge */}
      {showNewBadge && (
        <div className="absolute top-3 left-3 z-10 px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg">
          new
        </div>
      )}

      {/* 图片占位符 */}
      <div className="w-full h-48 bg-gradient-to-br from-orange-200 via-yellow-100 to-blue-200 relative overflow-hidden group-hover:scale-105 transition-transform duration-300">
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-16 h-16 text-gray-400 group-hover:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </div>

      <div className="p-5">
        {/* 标题 */}
        <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-1 group-hover:text-orange-600 transition-colors">{name}</h3>

        {/* 标签 */}
        {tags.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            {tags.slice(0, 1).map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1.5 text-xs font-semibold text-orange-700 bg-orange-100 rounded-lg flex items-center gap-1.5 border border-orange-200"
              >
                {getIcon(tag)}
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 描述 */}
        {description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-4 leading-relaxed">{description}</p>
        )}

        {/* 底部标签按钮 */}
        {tags.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {tags.slice(1, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-50 rounded-lg border border-gray-200"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </LinkWithParams>
  );
}

export default DiscoverPage;

