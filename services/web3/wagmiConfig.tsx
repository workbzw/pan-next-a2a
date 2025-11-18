import { wagmiConnectors } from "./wagmiConnectors";
import { Chain, createClient, fallback, http } from "viem";
import { hardhat, mainnet } from "viem/chains";
import { createConfig } from "wagmi";
import scaffoldConfig, { DEFAULT_ALCHEMY_API_KEY, ScaffoldConfig } from "~~/scaffold.config";
import { getAlchemyHttpUrl } from "~~/utils/scaffold-eth";

const { targetNetworks } = scaffoldConfig;

// 只使用配置的目标网络，不自动添加 mainnet（因为用户只使用 BSC Testnet）
export const enabledChains = targetNetworks;

export const wagmiConfig = createConfig({
  chains: enabledChains,
  connectors: wagmiConnectors(),
  ssr: true,
  client({ chain }) {
    let rpcFallbacks: ReturnType<typeof http>[] = [];

    // BSC Testnet (chainId: 97) 的特殊处理：添加多个 fallback RPC
    if (chain.id === 97) {
      const rpcOverrideUrl = (scaffoldConfig.rpcOverrides as ScaffoldConfig["rpcOverrides"])?.[chain.id];
      const alchemyHttpUrl = getAlchemyHttpUrl(chain.id);
      
      // 构建多个 fallback RPC，按优先级排序
      // 公共 RPC 作为可靠的 fallback
      const publicRpcs = [
        http("https://data-seed-prebsc-1-s1.binance.org:8545"),
        http("https://data-seed-prebsc-2-s1.binance.org:8545"),
        http("https://bsc-testnet-rpc.publicnode.com"),
        http("https://1rpc.io/bnb/testnet"),
      ];
      
      if (rpcOverrideUrl) {
        // 如果配置了自定义 RPC（通常是 Alchemy 或环境变量指定的 RPC），优先使用
        rpcFallbacks = [
          http(rpcOverrideUrl),
          // 如果配置的 RPC 不是 Alchemy，且 Alchemy 可用，也添加到 fallback
          ...(alchemyHttpUrl && !rpcOverrideUrl.includes("alchemy.com") 
            ? [http(alchemyHttpUrl)] 
            : []),
          // 添加公共 RPC 作为 fallback
          ...publicRpcs,
        ];
      } else if (alchemyHttpUrl) {
        // 如果没有配置自定义 RPC，但 Alchemy 可用，优先使用 Alchemy
        rpcFallbacks = [
          http(alchemyHttpUrl),
          // 添加公共 RPC 作为 fallback
          ...publicRpcs,
        ];
      } else {
        // 如果没有配置，使用公共 RPC
        rpcFallbacks = publicRpcs;
      }
    } else {
      // 其他链的处理逻辑
      const rpcOverrideUrl = (scaffoldConfig.rpcOverrides as ScaffoldConfig["rpcOverrides"])?.[chain.id];
      if (rpcOverrideUrl) {
        rpcFallbacks = [http(rpcOverrideUrl)];
      } else {
        const alchemyHttpUrl = getAlchemyHttpUrl(chain.id);
        if (alchemyHttpUrl) {
          rpcFallbacks = [http(alchemyHttpUrl)];
        } else {
          const defaultRpcUrl = chain.rpcUrls.default.http[0];
          if (defaultRpcUrl) {
            rpcFallbacks = [http(defaultRpcUrl)];
          } else {
            rpcFallbacks = [http()];
          }
        }
      }
    }

    return createClient({
      chain,
      transport: fallback(rpcFallbacks),
      ...(chain.id !== (hardhat as Chain).id
        ? {
            pollingInterval: scaffoldConfig.pollingInterval,
          }
        : {}),
    });
  },
});
