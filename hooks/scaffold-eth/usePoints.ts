import { useMemo, useState, useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "./useScaffoldReadContract";
import { useScaffoldContract } from "./useScaffoldContract";
import {
  POINTS,
  calculateSelfMintSBTPoints,
  calculateSelfCreateAgentPoints,
  calculateReferMintSBTPoints,
  calculateReferCreateAgentPoints,
  calculateTotalPoints,
  getReferrerCodeFromAddress,
} from "~~/utils/scaffold-eth/points";

/**
 * Hook: 获取自己mintSBT所获得的积分
 * @param address 用户地址（可选，默认使用当前连接的钱包地址）
 * @returns 积分总数
 */
export function useSelfMintSBTPoints(address?: `0x${string}`) {
  const { address: connectedAddress } = useAccount();
  const targetAddress = address || connectedAddress;

  const { data: rarityStats } = useScaffoldReadContract({
    contractName: "PaymentSBT",
    functionName: "getRarityStatsByOwner",
    args: targetAddress ? ([targetAddress] as const) : ([undefined] as const),
    watch: false, // 禁用自动监听，避免频繁更新
  });

  const points = useMemo(() => {
    if (!rarityStats || !Array.isArray(rarityStats) || rarityStats.length < 3) {
      return 0;
    }
    const [nCount, rCount, sCount] = rarityStats;
    return calculateSelfMintSBTPoints(nCount, rCount, sCount);
  }, [rarityStats]);

  return {
    points,
    isLoading: !rarityStats && !!targetAddress,
    rarityStats,
  };
}

/**
 * Hook: 获取自己创建Agent所获得的积分
 * 注意：这个hook需要遍历所有Agent，可能性能较慢
 * @param address 用户地址（可选，默认使用当前连接的钱包地址）
 * @returns 积分总数
 */
export function useSelfCreateAgentPoints(address?: `0x${string}`) {
  const { address: connectedAddress } = useAccount();
  const targetAddress = address || connectedAddress;

  const { data: allAgentIds } = useScaffoldReadContract({
    contractName: "AgentStore",
    functionName: "getAllListedAgents",
    watch: false, // 禁用自动监听，避免频繁更新
  });

  const { data: agentStoreContract } = useScaffoldContract({
    contractName: "AgentStore",
  });

  const [agentCount, setAgentCount] = useState<number>(0);
  const [isLoadingCount, setIsLoadingCount] = useState<boolean>(false);
  
  // 使用 ref 来跟踪上一次查询的参数，避免重复查询
  const lastQueryRef = useRef<string>("");
  const isQueryingRef = useRef<boolean>(false);

  // 稳定 allAgentIds 的引用
  const stableAgentIds = useMemo(() => {
    if (!allAgentIds || !Array.isArray(allAgentIds)) return null;
    return allAgentIds.map(id => id.toString()).join(",");
  }, [allAgentIds]);

  // 稳定 agentStoreContract 的引用
  const contractAddress = agentStoreContract?.address;
  
  // 生成查询键，用于判断是否需要重新查询
  const queryKey = useMemo(() => {
    return `${targetAddress || ""}-${stableAgentIds || ""}-${contractAddress || ""}`;
  }, [targetAddress, stableAgentIds, contractAddress]);

  // 遍历所有Agent，统计属于该用户的Agent数量
  useEffect(() => {
    // 如果查询键没有变化，或者正在查询中，则跳过
    if (queryKey === lastQueryRef.current || isQueryingRef.current) {
      return;
    }

    let isMounted = true;

    const countUserAgents = async () => {
      if (!targetAddress || !allAgentIds || !Array.isArray(allAgentIds) || !agentStoreContract) {
        if (isMounted) {
          setAgentCount(0);
          setIsLoadingCount(false);
          lastQueryRef.current = queryKey;
        }
        return;
      }

      if (allAgentIds.length === 0) {
        if (isMounted) {
          setAgentCount(0);
          setIsLoadingCount(false);
          lastQueryRef.current = queryKey;
        }
        return;
      }

      // 标记正在查询
      isQueryingRef.current = true;
      setIsLoadingCount(true);
      let count = 0;

      try {
        for (const agentId of allAgentIds) {
          if (!isMounted) break;

          try {
            const fullInfo = await agentStoreContract.read.getAgentFullInfo([agentId]);
            const [listing] = fullInfo;

            // 检查是否是目标用户创建的Agent且已上架
            if (listing.owner?.toLowerCase() === targetAddress.toLowerCase() && listing.listed) {
              count++;
            }
          } catch (error) {
            console.error(`查询Agent ${agentId} 失败:`, error);
            // 继续处理下一个Agent
          }
        }
      } finally {
        isQueryingRef.current = false;
      }

      if (isMounted) {
        setAgentCount(count);
        setIsLoadingCount(false);
        lastQueryRef.current = queryKey;
      }
    };

    countUserAgents();

    return () => {
      isMounted = false;
    };
  }, [queryKey, targetAddress, allAgentIds, agentStoreContract]);

  const points = useMemo(() => {
    return calculateSelfCreateAgentPoints(agentCount);
  }, [agentCount]);

  return {
    points,
    isLoading: (!allAgentIds && !!targetAddress) || isLoadingCount,
    agentCount,
  };
}

/**
 * Hook: 获取推荐别人mintSBT获得的积分
 * @param referrerCode 推荐码（可选，如果不提供则从当前地址计算）
 * @returns 积分总数
 */
export function useReferMintSBTPoints(referrerCode?: string) {
  const { address } = useAccount();

  const code = useMemo(() => {
    if (referrerCode) return referrerCode;
    if (address) return getReferrerCodeFromAddress(address);
    return "";
  }, [referrerCode, address]);

  const { data: tokenIds } = useScaffoldReadContract({
    contractName: "PaymentSBT",
    functionName: "getTokensByReferrer",
    args: code ? ([code] as const) : ([undefined] as const),
    watch: false, // 禁用自动监听，避免频繁更新
  });

  const points = useMemo(() => {
    if (!tokenIds || !Array.isArray(tokenIds)) {
      return 0;
    }
    return calculateReferMintSBTPoints(tokenIds.length);
  }, [tokenIds]);

  return {
    points,
    isLoading: !tokenIds && !!code,
    tokenCount: tokenIds?.length || 0,
    referrerCode: code,
  };
}

/**
 * Hook: 获取推荐别人创建Agent获得的积分
 * @param referrerCode 推荐码（可选，如果不提供则从当前地址计算）
 * @returns 积分总数
 */
export function useReferCreateAgentPoints(referrerCode?: string) {
  const { address } = useAccount();

  const code = useMemo(() => {
    if (referrerCode) return referrerCode;
    if (address) return getReferrerCodeFromAddress(address);
    return "";
  }, [referrerCode, address]);

  const { data: agentIds } = useScaffoldReadContract({
    contractName: "AgentStore",
    functionName: "getAgentsByReferrer",
    args: code ? ([code] as const) : ([undefined] as const),
    watch: false, // 禁用自动监听，避免频繁更新
  });

  const points = useMemo(() => {
    if (!agentIds || !Array.isArray(agentIds)) {
      return 0;
    }
    return calculateReferCreateAgentPoints(agentIds.length);
  }, [agentIds]);

  return {
    points,
    isLoading: !agentIds && !!code,
    agentCount: agentIds?.length || 0,
    referrerCode: code,
  };
}

/**
 * Hook: 获取用户的总积分
 * @param address 用户地址（可选，默认使用当前连接的钱包地址）
 * @param referrerCode 推荐码（可选，如果不提供则从地址计算）
 * @returns 总积分和各项积分详情
 */
export function useTotalPoints(address?: `0x${string}`, referrerCode?: string) {
  const selfMintSBTPoints = useSelfMintSBTPoints(address);
  const selfCreateAgentPoints = useSelfCreateAgentPoints(address);
  const referMintSBTPoints = useReferMintSBTPoints(referrerCode);
  const referCreateAgentPoints = useReferCreateAgentPoints(referrerCode);

  const totalPoints = useMemo(() => {
    return calculateTotalPoints(
      selfMintSBTPoints.points,
      selfCreateAgentPoints.points,
      referMintSBTPoints.points,
      referCreateAgentPoints.points
    );
  }, [
    selfMintSBTPoints.points,
    selfCreateAgentPoints.points,
    referMintSBTPoints.points,
    referCreateAgentPoints.points,
  ]);

  const isLoading =
    selfMintSBTPoints.isLoading ||
    selfCreateAgentPoints.isLoading ||
    referMintSBTPoints.isLoading ||
    referCreateAgentPoints.isLoading;

  return {
    totalPoints,
    isLoading,
    breakdown: {
      selfMintSBT: selfMintSBTPoints.points,
      selfCreateAgent: selfCreateAgentPoints.points,
      referMintSBT: referMintSBTPoints.points,
      referCreateAgent: referCreateAgentPoints.points,
    },
  };
}

