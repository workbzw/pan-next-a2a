"use client";

import { useState, useEffect, useMemo } from "react";
import { useScaffoldReadContract, useScaffoldContract } from "~~/hooks/scaffold-eth";
import { LinkWithParams } from "~~/components/LinkWithParams";
import { useLanguage } from "~~/utils/i18n/LanguageContext";
import { useAgentCard } from "~~/hooks/useAgentCard";

const ExplorePage = () => {
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
    <div className="min-h-screen bg-white">
      <div className="w-full">
        {/* Hero Section - PANdora Box */}
        <HeroSection />

        {/* 搜索和筛选区域 */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            {/* 搜索栏 */}
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search by model, task, category and more"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-12 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <span className="text-sm text-gray-600 font-medium">Try:</span>
              {["Newest image to video models", "Flux Kontext", "Generate 3D model", "Create music", "Remove background", "Upscale", "Training", "Try on clothing"].map((tag, index) => (
                <button
                  key={index}
                  className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
                >
                  {tag}
                </button>
              ))}
              <LinkWithParams
                href="/agent-store"
                className="ml-auto px-4 py-1.5 text-sm text-gray-700 hover:text-gray-900 font-medium"
              >
                View all models →
              </LinkWithParams>
            </div>
          </div>
        </div>

        {/* Recently Added Section */}
        {recentAgents.length > 0 && (
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Recently Added</h2>
              <button className="text-gray-600 hover:text-gray-900 font-medium">→</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentAgents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} showNewBadge={true} />
              ))}
            </div>
          </div>
        )}

        {/* All Agents Grid */}
        {filteredAgents.length > 5 && (
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredAgents.slice(5).map((agent) => (
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
 * Hero Section - PANdora Box
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
          <h1 className="text-5xl font-bold text-gray-900 mb-4">PANdora Box</h1>

          {/* 描述 */}
          <p className="text-lg text-gray-700 mb-6">
            Pay 0.005 BNB to open PANdora Box, unlock exclusive AI-generated content!
          </p>

          {/* 按钮 */}
          <div className="flex gap-4">
            <LinkWithParams
              href="/agent-store/2"
              className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Try it now!
            </LinkWithParams>
            <button className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors">
              See docs
            </button>
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
      className="group relative block bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300"
    >
      {/* New Badge */}
      {showNewBadge && (
        <div className="absolute top-3 left-3 z-10 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded">
          new
        </div>
      )}

      {/* 图片占位符 */}
      <div className="w-full h-48 bg-gradient-to-br from-orange-200 via-yellow-100 to-blue-200 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </div>

      <div className="p-4">
        {/* 标题 */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">{name}</h3>

        {/* 标签 */}
        {tags.length > 0 && (
          <div className="flex items-center gap-2 mb-2">
            {tags.slice(0, 1).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded flex items-center gap-1"
              >
                {getIcon(tag)}
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 描述 */}
        {description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{description}</p>
        )}

        {/* 底部标签按钮 */}
        {tags.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {tags.slice(1, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-50 rounded border border-gray-200"
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

export default ExplorePage;
