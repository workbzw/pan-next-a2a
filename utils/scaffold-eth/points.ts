/**
 * 积分规则：
 * - 自己mintSBT：N级=50积分，R级=700积分，S级=10000积分
 * - 自己创建Agent：每次2200积分
 * - 推荐别人mintSBT：每次10积分
 * - 推荐别人创建Agent：每个Agent 200积分
 */

// 积分常量
export const POINTS = {
  SBT_N: 50,           // N级SBT积分
  SBT_R: 700,          // R级SBT积分
  SBT_S: 10000,        // S级SBT积分
  CREATE_AGENT: 2200,  // 创建Agent积分
  REFER_SBT: 10,       // 推荐mintSBT积分
  REFER_AGENT: 200,    // 推荐创建Agent积分（每个Agent）
} as const;

/**
 * 1. 统计自己mintSBT所获得的积分
 * 使用方式：在 React 组件中使用 useScaffoldReadContract hook
 * 
 * 示例：
 * const { data: rarityStats } = useScaffoldReadContract({
 *   contractName: "PaymentSBT",
 *   functionName: "getRarityStatsByOwner",
 *   args: [address],
 * });
 * 
 * const points = useMemo(() => {
 *   if (!rarityStats) return 0;
 *   const [nCount, rCount, sCount] = rarityStats;
 *   return Number(nCount) * POINTS.SBT_N + Number(rCount) * POINTS.SBT_R + Number(sCount) * POINTS.SBT_S;
 * }, [rarityStats]);
 * 
 * @param nCount N级SBT数量
 * @param rCount R级SBT数量
 * @param sCount S级SBT数量
 * @returns 积分总数
 */
export function calculateSelfMintSBTPoints(
  nCount: bigint | number,
  rCount: bigint | number,
  sCount: bigint | number
): number {
  return (
    Number(nCount) * POINTS.SBT_N +
    Number(rCount) * POINTS.SBT_R +
    Number(sCount) * POINTS.SBT_S
  );
}

/**
 * 2. 统计自己创建Agent所获得的积分
 * 使用方式：在 React 组件中遍历所有Agent，统计owner是当前地址的数量
 * 
 * 示例：
 * const { data: allAgentIds } = useScaffoldReadContract({
 *   contractName: "AgentStore",
 *   functionName: "getAllListedAgents",
 * });
 * 
 * // 然后遍历 allAgentIds，查询每个 Agent 的 owner
 * 
 * @param agentCount 自己创建的Agent数量
 * @returns 积分总数
 */
export function calculateSelfCreateAgentPoints(agentCount: number): number {
  return agentCount * POINTS.CREATE_AGENT;
}

/**
 * 3. 统计推荐别人mintSBT获得的积分
 * 使用方式：在 React 组件中使用 useScaffoldReadContract hook
 * 
 * 示例：
 * const { data: tokenIds } = useScaffoldReadContract({
 *   contractName: "PaymentSBT",
 *   functionName: "getTokensByReferrer",
 *   args: [referrerCode],
 * });
 * 
 * const points = useMemo(() => {
 *   if (!tokenIds || tokenIds.length === 0) return 0;
 *   return calculateReferMintSBTPoints(tokenIds.length);
 * }, [tokenIds]);
 * 
 * @param tokenCount 推荐的SBT Token数量
 * @returns 积分总数
 */
export function calculateReferMintSBTPoints(tokenCount: number): number {
  return tokenCount * POINTS.REFER_SBT;
}

/**
 * 4. 统计推荐别人创建Agent获得的积分
 * 使用方式：在 React 组件中使用 useScaffoldReadContract hook
 * 
 * 示例：
 * const { data: agentIds } = useScaffoldReadContract({
 *   contractName: "AgentStore",
 *   functionName: "getAgentsByReferrer",
 *   args: [referrerCode],
 * });
 * 
 * const points = useMemo(() => {
 *   if (!agentIds || agentIds.length === 0) return 0;
 *   return calculateReferCreateAgentPoints(agentIds.length);
 * }, [agentIds]);
 * 
 * @param agentCount 推荐的Agent数量
 * @returns 积分总数
 */
export function calculateReferCreateAgentPoints(agentCount: number): number {
  return agentCount * POINTS.REFER_AGENT;
}

/**
 * 计算用户的总积分
 * @param selfMintSBTPoints 自己mintSBT的积分
 * @param selfCreateAgentPoints 自己创建Agent的积分
 * @param referMintSBTPoints 推荐别人mintSBT的积分
 * @param referCreateAgentPoints 推荐别人创建Agent的积分
 * @returns 总积分
 */
export function calculateTotalPoints(
  selfMintSBTPoints: number,
  selfCreateAgentPoints: number,
  referMintSBTPoints: number,
  referCreateAgentPoints: number
): number {
  return (
    selfMintSBTPoints +
    selfCreateAgentPoints +
    referMintSBTPoints +
    referCreateAgentPoints
  );
}

/**
 * 从地址计算推荐码（MD5后8位）
 * @param address 用户地址
 * @returns 推荐码
 */
export function getReferrerCodeFromAddress(address: string): string {
  // 这里需要在客户端使用，所以需要动态导入 crypto-js
  // 或者使用浏览器环境的 crypto API
  if (typeof window === "undefined") {
    throw new Error("getReferrerCodeFromAddress can only be called in browser");
  }
  
  // 使用动态导入
  const CryptoJS = require("crypto-js");
  const md5Hash = CryptoJS.MD5(address.toLowerCase()).toString();
  return md5Hash.slice(-8);
}

