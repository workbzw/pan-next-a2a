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
      if (rpcOverrideUrl) {
        // 如果配置了自定义 RPC，优先使用
        rpcFallbacks = [
          http(rpcOverrideUrl),
          // 添加多个公共 RPC 作为 fallback
          http("https://data-seed-prebsc-1-s1.binance.org:8545"),
          http("https://data-seed-prebsc-2-s1.binance.org:8545"),
          http("https://bsc-testnet-rpc.publicnode.com"),
        ];
      } else if (alchemyHttpUrl) {
        // 如果 Alchemy 可用，优先使用，但添加 fallback
        rpcFallbacks = [
          http(alchemyHttpUrl),
          // 添加多个公共 RPC 作为 fallback
          http("https://data-seed-prebsc-1-s1.binance.org:8545"),
          http("https://data-seed-prebsc-2-s1.binance.org:8545"),
          http("https://bsc-testnet-rpc.publicnode.com"),
        ];
      } else {
        // 如果没有配置，使用多个公共 RPC
        rpcFallbacks = [
          http("https://data-seed-prebsc-1-s1.binance.org:8545"),
          http("https://data-seed-prebsc-2-s1.binance.org:8545"),
          http("https://bsc-testnet-rpc.publicnode.com"),
          http("https://1rpc.io/bnb/testnet"),
        ];
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
