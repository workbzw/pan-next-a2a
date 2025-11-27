"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useScaffoldReadContract, useScaffoldWriteContract, useScaffoldContract } from "~~/hooks/scaffold-eth";
import { Address } from "@scaffold-ui/components";
import { LinkWithParams } from "~~/components/LinkWithParams";
import { formatEther, parseEther } from "viem";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
// useDeployedContractInfo 已移除：不再需要 PaymentSBT 合约信息
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { useLanguage } from "~~/utils/i18n/LanguageContext";
import { useAgentCard } from "~~/hooks/useAgentCard";
import { AgentCardDetail } from "~~/components/AgentCard/AgentCardDetail";
import { getQueryParam } from "~~/utils/urlParams";
import { BoxOpeningAnimation } from "~~/components/BoxOpeningAnimation";
import { ExecutionChecklist } from "~~/components/ExecutionChecklist";

// SBT卡片组件
const SBTCard = ({ 
  tokenId, 
  paymentSBTContract, 
  targetNetwork 
}: { 
  tokenId: bigint; 
  paymentSBTContract: any; 
  targetNetwork: any;
}) => {
  const { t } = useLanguage();
  const [sbtInfo, setSbtInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInfo = async () => {
      if (!paymentSBTContract) {
        setLoading(false);
        return;
      }
      try {
        const [info, rarity] = await Promise.all([
          paymentSBTContract.read.getPaymentInfo([tokenId]) as Promise<any>,
          paymentSBTContract.read.getRarity([tokenId]) as Promise<bigint | number>,
        ]);
        // 将 bigint 转换为 number（合约返回的枚举值是 bigint）
        const rarityFromGetRarity = typeof rarity === 'bigint' ? Number(rarity) : rarity;
        // 也从 paymentInfo 中获取稀有度（作为备用）
        const rarityFromInfo = typeof info.rarity === 'bigint' ? Number(info.rarity) : (info.rarity ?? rarityFromGetRarity);
        // 优先使用 getRarity 的结果，如果为 undefined 则使用 paymentInfo 中的
        const rarityNumber = rarityFromGetRarity !== undefined ? rarityFromGetRarity : rarityFromInfo;
        
        
        setSbtInfo({
          amount: info.amount,
          payer: info.payer,
          recipient: info.recipient,
          timestamp: info.timestamp,
          description: info.description,
          referrer: info.referrer || "",
          rarity: rarityNumber, // 0 = N, 1 = R, 2 = S
        });
      } catch (e) {
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, [tokenId, paymentSBTContract]);

  if (loading) {
    return (
      <div className="p-4 rounded-lg bg-[#1A110A]/50 border border-[#FF6B00]/20">
        <span className="loading loading-spinner loading-sm"></span>
        <span className="ml-2 text-white/70">{t("loading")}</span>
      </div>
    );
  }

  if (!sbtInfo) {
    return (
      <div className="p-4 rounded-lg bg-[#1A110A]/50 border border-red-500/20">
        <p className="text-red-400">{t("sbtLoadError")}</p>
      </div>
    );
  }

  // 根据稀有度获取标签样式
  const getRarityBadge = (rarity: number) => {
    switch (rarity) {
      case 0: // N级 - 灰色
        return (
          <div className="badge badge-sm bg-gray-500/20 text-gray-300 border border-gray-500/30">
            N
          </div>
        );
      case 1: // R级 - 白色
        return (
          <div className="badge badge-sm bg-white/20 text-white border border-white/30">
            R
          </div>
        );
      case 2: // S级 - 彩色（渐变）
        return (
          <div className="badge badge-sm bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 text-white border border-transparent">
            S
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 rounded-lg bg-[#1A110A]/50 border border-[#FF6B00]/20 hover:border-[#FF6B00]/40 transition-all">
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="text-xs text-white/50">{t("tokenId")}</span>
          <span className="ml-2 text-white font-mono">{tokenId.toString()}</span>
        </div>
        <div className="flex items-center gap-2">
          {sbtInfo.rarity !== undefined && getRarityBadge(sbtInfo.rarity)}
          <div className="badge badge-sm bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/30">
            SBT
          </div>
        </div>
      </div>
      <div className="space-y-2 text-sm mt-3">
        <div className="flex justify-between">
          <span className="text-white/70">{t("recipientAddress")}</span>
          <Address address={sbtInfo.recipient} />
        </div>
        {/* Referrer Code temporarily hidden */}
        {false && (
          <div className="flex justify-between">
            <span className="text-white/70">{t("referrerCode")}</span>
            <span className="text-white/80 text-xs font-mono">
              {sbtInfo.referrer && sbtInfo.referrer.trim() ? sbtInfo.referrer : t("noReferrer")}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-white/70">{t("paymentTime")}</span>
          <span className="text-white/80 text-xs">
            {new Date(Number(sbtInfo.timestamp) * 1000).toLocaleString()}
          </span>
        </div>
        {sbtInfo.description && (
          <div className="mt-2 pt-2 border-t border-[#FF6B00]/20">
            <span className="text-white/70">{t("description")}</span>
            <p className="text-white/80 text-xs mt-1">{sbtInfo.description}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const AgentDetail = () => {
  const params = useParams();
  const agentId = params?.id ? BigInt(params.id as string) : BigInt(0);
  const { t } = useLanguage();

  // 评价功能已移除
  // const [rating, setRating] = useState(5);
  // const [comment, setComment] = useState("");
  // const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [requestResult, setRequestResult] = useState<{
    success: boolean;
    data?: any;
    error?: string;
  } | null>(null);
  // mintedSBT 状态已移除：用户直接支付给 Agent，Agent 自行处理 SBT 铸造
  const [showMySBTs, setShowMySBTs] = useState(false);
  const [isUnlisting, setIsUnlisting] = useState(false);
  const [showBoxAnimation, setShowBoxAnimation] = useState(false);
  const [animationImageUrl, setAnimationImageUrl] = useState<string | undefined>(undefined);
  const [showExecutionChecklist, setShowExecutionChecklist] = useState(false);
  const [executionSteps, setExecutionSteps] = useState<Array<{id: string; label: string; status: "pending" | "executing" | "completed" | "error"}>>([]);
  const { address } = useAccount();
  const { targetNetwork } = useTargetNetwork();

  // 获取 Agent 完整信息
  const { data: agentInfo, refetch } = useScaffoldReadContract({
    contractName: "AgentStore",
    functionName: "getAgentFullInfo",
    args: [agentId],
  });

  // 评价功能已移除
  // const { data: feedbacks } = useScaffoldReadContract({
  //   contractName: "ReputationRegistry",
  //   functionName: "getFeedbacks",
  //   args: agentId > 0n ? [agentId] : ([0n] as readonly [bigint]),
  //   query: {
  //     enabled: agentId > 0n,
  //   },
  // });

  // 获取用户拥有的所有SBT
  const mySBTsQuery = useScaffoldReadContract({
    contractName: "PaymentSBT" as any,
    functionName: "getTokensByOwner",
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address && showMySBTs,
    },
  } as any);
  const mySBTs = mySBTsQuery.data as bigint[] | undefined;
  const refetchMySBTs = mySBTsQuery.refetch;

  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: "AgentStore",
  });

  // PaymentSBT 合约相关 hooks 已移除：用户直接支付给 Agent，Agent 自行处理 SBT 铸造
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  
  // 保留 PaymentSBT 合约查询用于查看用户的 SBT（只读）
  const { data: paymentSBTContract } = useScaffoldContract({
    contractName: "PaymentSBT" as any,
    walletClient: undefined, // 只读，不需要 walletClient
  });

  const methods = ["GET", "POST", "PUT", "DELETE"];

  // 编码交易哈希到base64（用于请求头）
  // 在浏览器环境中使用 btoa，在 Node.js 环境中使用 Buffer
  const encodeTx = (txHash: string): string => {
    if (typeof window !== 'undefined') {
      // 浏览器环境
      return btoa(txHash);
    } else {
      // Node.js 环境
      return Buffer.from(txHash).toString("base64");
    }
  };

  const handleCallAgent = async () => {
    if (!listing) {
      return;
    }
    
    setIsCalling(true);
    setRequestResult(null);
    
    // 初始化执行步骤
    const initialSteps = [
      { id: "wallet", label: t("stepWalletSignature"), status: "pending" as const },
      { id: "transaction", label: t("stepTransactionSent"), status: "pending" as const },
      { id: "confirm", label: t("stepTransactionConfirmed"), status: "pending" as const },
      { id: "api", label: t("stepApiCall"), status: "pending" as const },
      { id: "image", label: t("stepImageGeneration"), status: "pending" as const },
    ];
    setExecutionSteps(initialSteps);
    setShowExecutionChecklist(true);
    setShowBoxAnimation(false); // 先隐藏礼盒动画
    
    // 更新步骤状态的辅助函数
    const updateStep = (stepId: string, status: "pending" | "executing" | "completed" | "error") => {
      setExecutionSteps(prev => prev.map(step => 
        step.id === stepId ? { ...step, status } : step
      ));
    };
    
    try {
      // 从 Agent Card 获取请求方式和 URL（所有信息从 Agent Card 获取）
      if (!agentCard) {
        throw new Error("Agent Card is required to call this Agent");
      }
      
      const method = agentCard.calling?.method?.toUpperCase() || "GET";
      const url = agentCard.endpoints?.task;
      
      if (!url) {
        throw new Error("Agent Card must contain 'endpoints.task'");
      }
      
      
      // 请求参数从用户输入获取（如果有输入框的话）
      let requestParams = {};
      // 注意：如果需要从 Agent Card 的 inputSchema 生成默认参数，可以在这里处理
      
      // 构建请求配置
      let targetUrl = url;
      const requestConfig: RequestInit = {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
      };
      
      // 如果 Agent Card 中有 calling.headers，合并到请求头中
      if (agentCard?.calling?.headers) {
        Object.entries(agentCard.calling.headers).forEach(([key, value]) => {
          // 如果值是占位符（如 "base64_encoded_transaction_hash"），暂时跳过，后续会在付款后添加
          if (value && !value.includes("base64_encoded_transaction_hash") && !value.includes("必需")) {
            requestConfig.headers = {
              ...requestConfig.headers,
              [key]: value,
            };
          }
        });
      }
      
      // 根据请求方式处理参数
      if (method === "POST" || method === "PUT") {
        // POST和PUT请求，将参数放入body
        // 如果 Agent Card 的 note 说请求体可以为空，且没有参数，则使用空对象
        if (agentCard?.calling?.note?.includes("请求体可以为空") && Object.keys(requestParams).length === 0) {
          requestConfig.body = JSON.stringify({});
        } else {
          requestConfig.body = JSON.stringify(requestParams);
        }
      } else if (method === "GET" || method === "DELETE") {
        // GET和DELETE请求，将参数添加到URL
        if (Object.keys(requestParams).length > 0) {
          try {
            const urlObj = new URL(url);
            Object.keys(requestParams).forEach((key) => {
              urlObj.searchParams.append(key, String(requestParams[key as keyof typeof requestParams]));
            });
            targetUrl = urlObj.toString();
          } catch (e) {
            setRequestResult({
              success: false,
              error: t("agentLinkFormatError"),
            });
            setIsCalling(false);
            return;
          }
        }
      }
      
      // 发送HTTP请求（优先直接访问，遇到 CORS 错误时使用代理）
      let response: Response;
      
      // 如果不需要付款（第一次请求），更新步骤状态
      let needsPayment = false;
      
      try {
        // 更新步骤：API 调用中
        updateStep("wallet", "completed"); // 如果不需要付款，跳过钱包签名
        updateStep("transaction", "completed"); // 如果不需要付款，跳过交易
        updateStep("confirm", "completed"); // 如果不需要付款，跳过确认
        updateStep("api", "executing");
        // 优先尝试直接访问
        response = await fetch(targetUrl, requestConfig);
      } catch (directError: any) {
        // 如果是 CORS 错误，使用代理
        const errorMessage = directError.message || directError.toString();
        if (
          errorMessage.includes("CORS") ||
          errorMessage.includes("Failed to fetch") ||
          errorMessage.includes("NetworkError") ||
          errorMessage.includes("Access-Control")
        ) {
          try {
            // 使用 Next.js API 代理路由
            response = await fetch("/api/proxy-agent", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                url: targetUrl,
                method: method,
                headers: requestConfig.headers,
                body: requestConfig.body,
              }),
            });
          } catch (proxyError: any) {
            // 代理也失败了
            const networkErrorMsg = (t("networkConnectionError" as any) as string) || "Network connection failed. Please check the Agent URL and your network connection.";
            throw new Error(networkErrorMsg);
          }
        } else {
          // 其他错误直接抛出
          throw directError;
        }
      }
      
      // 处理402 Payment Required错误
      if (response.status === 402) {
        needsPayment = true;
        // 重置步骤状态，因为需要付款流程
        setExecutionSteps([
          { id: "wallet", label: t("stepWalletSignature"), status: "pending" as const },
          { id: "transaction", label: t("stepTransactionSent"), status: "pending" as const },
          { id: "confirm", label: t("stepTransactionConfirmed"), status: "pending" as const },
          { id: "api", label: t("stepApiCall"), status: "pending" as const },
          { id: "image", label: t("stepImageGeneration"), status: "pending" as const },
        ]);
        
        // 检查钱包连接
        if (!address) {
          throw new Error(t("connectWalletForPayment"));
        }
        
        // 解析付款详情（代理返回的 JSON）
        let paymentDetails;
        try {
          const responseData = await response.json();
          
          // 支持 x402 协议格式：{ accepts: [{ address, maxAmountRequired, currency, ... }], x402Version: 1 }
          if (responseData.accepts && Array.isArray(responseData.accepts) && responseData.accepts.length > 0) {
            // x402 格式：从 accepts 数组的第一个元素获取支付信息
            const accept = responseData.accepts[0];
            
            // 检查必需的字段：价格
            if (!accept.maxAmountRequired && !accept.price && !accept.amount) {
              throw new Error(t("paymentDetailsFormatError"));
            }
            
            // 检查必需的字段：地址
            if (!accept.address) {
              throw new Error(t("paymentDetailsFormatError"));
            }
            
            paymentDetails = {
              address: accept.address,
              price: accept.maxAmountRequired || accept.price || accept.amount, // 优先使用 maxAmountRequired，兼容其他字段名
              currency: accept.currency || "ETH",
              network: accept.network,
              description: accept.description,
              scheme: accept.scheme,
              resource: accept.resource,
            };
          } else if (responseData.data && typeof responseData.data === 'object') {
            // 嵌套结构：{ data: { price: ... } }
            paymentDetails = responseData.data;
          } else if (responseData.paymentDetails && typeof responseData.paymentDetails === 'object') {
            // 嵌套结构：{ paymentDetails: { price: ... } }
            paymentDetails = responseData.paymentDetails;
          } else if (responseData.price !== undefined || responseData.maxAmountRequired !== undefined) {
            // 直接格式：{ price: ... } 或 { maxAmountRequired: ... }
            paymentDetails = {
              ...responseData,
              price: responseData.price || responseData.maxAmountRequired || responseData.amount,
            };
          } else {
            // 尝试查找任何包含 price 字段的对象
            paymentDetails = responseData;
          }
        } catch (e) {
          if (e instanceof Error && e.message.includes("paymentDetailsFormatError")) {
            throw e; // 重新抛出格式错误
          }
          throw new Error(t("cannotParse402Response"));
        }
        
        
        // 安全检查：验证付款详情格式
        if (!paymentDetails || typeof paymentDetails !== 'object') {
          throw new Error(t("paymentDetailsFormatError"));
        }
        
        // 检查价格字段（支持多种字段名：price, maxAmountRequired, amount）
        const priceFieldValue = paymentDetails.price || paymentDetails.maxAmountRequired || paymentDetails.amount;
        if (!priceFieldValue && priceFieldValue !== 0 && priceFieldValue !== "0") {
          throw new Error(t("paymentDetailsFormatError"));
        }
        
        // 统一使用 price 字段（保持原始值，可能是 wei 单位）
        if (!paymentDetails.price) {
          paymentDetails.price = priceFieldValue;
        }
        
        // 检查地址字段（必需）
        if (!paymentDetails.address) {
          throw new Error(t("paymentDetailsFormatError"));
        }
        
        // 将价格转换为 BigInt 以便处理（支持 wei 单位）
        let priceInWei: bigint;
        try {
          const priceStr = paymentDetails.price.toString();
          // 如果价格看起来是 wei（大于 1e12），直接使用
          // 否则假设是 ETH 单位，需要转换为 wei
          const priceNum = parseFloat(priceStr);
          if (priceNum > 1e12 || priceStr.length > 15) {
            // 看起来是 wei 单位
            priceInWei = BigInt(priceStr);
          } else {
            // 看起来是 ETH 单位，转换为 wei
            priceInWei = parseEther(priceStr);
          }
        } catch (e) {
          throw new Error(`${t("priceFormatError")} ${paymentDetails.price}`);
        }
        
        // 安全检查：确保价格大于 0
        if (priceInWei <= 0n) {
          throw new Error(`${t("priceFormatError")} ${paymentDetails.price}`);
        }
        
        // 将 wei 转换为 ETH 进行验证（防止价格过大）
        const priceInEth = Number(priceInWei) / 1e18;
        
        // 安全检查：防止价格过大（防止溢出，例如超过 1000 ETH）
        if (priceInEth > 1000) {
          throw new Error(`Price too large: ${priceInEth} ETH. Maximum allowed: 1000 ETH`);
        }
        
        // 安全检查：验证价格是有效数字（ETH 单位）
        if (isNaN(priceInEth) || priceInEth <= 0) {
          throw new Error(`${t("priceFormatError")} ${paymentDetails.price}`);
        }
        
        // priceInWei 已经在上面计算好了，直接使用
        
        // 检查网络是否匹配（如果有指定）
        if (paymentDetails.network) {
          // 这里可以添加网络切换逻辑
        }
        
        // 验证 Agent 返回的支付地址
        if (!paymentDetails.address) {
          throw new Error("Agent 返回的支付信息中缺少收款地址");
        }
        
        const agentPaymentAddress = paymentDetails.address as `0x${string}`;
        
        
        if (!walletClient) {
          throw new Error(t("walletClientNotConnected"));
        }
        
        if (!publicClient) {
          throw new Error(t("publicClientNotConnected"));
        }
        
        // 直接发送原生代币转账到 Agent 返回的地址
        
        let txHash: string;
        try {
          
          // 更新步骤：钱包签名中
          updateStep("wallet", "executing");
          
          // 使用 walletClient 发送原生代币转账
          const hash = await walletClient.sendTransaction({
            to: agentPaymentAddress,
            value: priceInWei,
            account: address as `0x${string}`,
          });
          
          if (!hash) {
            throw new Error(t("transactionFailedNoHash"));
          }
          
          txHash = hash;
          
          // 更新步骤：钱包签名完成，交易已发送
          updateStep("wallet", "completed");
          updateStep("transaction", "completed");
          updateStep("confirm", "executing");
          
          // 等待交易确认
          const receipt = await publicClient.waitForTransactionReceipt({
            hash: txHash as `0x${string}`,
            timeout: 60_000, // 60秒超时
          });
          
          
          // 更新步骤：交易确认完成
          updateStep("confirm", "completed");
          updateStep("api", "executing");
          
        } catch (error: any) {
          
          // 更新当前执行中的步骤为错误状态
          setExecutionSteps(prev => prev.map(step => 
            step.status === "executing" ? { ...step, status: "error" as const } : step
          ));
          
          // 检查用户拒绝交易的多种情况
          const errorMessage = error.message || error.shortMessage || error.details || "";
          const errorString = errorMessage.toLowerCase();
          const errorName = error.name || "";
          const errorNameLower = errorName.toLowerCase();
          
          // 检查是否是用户拒绝交易（包括 TransactionExecutionError）
          if (
            errorString.includes("user rejected") ||
            errorString.includes("user denied") ||
            errorString.includes("user cancelled") ||
            errorString.includes("rejected") ||
            errorString.includes("denied") ||
            errorString.includes("denied transaction signature") ||
            errorNameLower.includes("userrejected") ||
            errorNameLower.includes("transactionexecutionerror") ||
            error.name === "UserRejectedRequestError" ||
            error.code === 4001 || // MetaMask用户拒绝错误码
            error.cause?.code === 4001
          ) {
            // 更新步骤状态为错误
            updateStep("wallet", "error");
            throw new Error(t("paymentCancelled"));
          } else if (
            errorString.includes("insufficient funds") ||
            errorString.includes("balance") ||
            error.code === "INSUFFICIENT_FUNDS"
          ) {
            updateStep("wallet", "error");
            throw new Error(t("insufficientFunds"));
          } else if (errorString.includes("network") || errorString.includes("chain")) {
            updateStep("wallet", "error");
            throw new Error(t("networkError"));
          } else {
            // 提取更友好的错误信息
            const friendlyError = errorMessage.includes("ContractFunctionExecutionError") || errorMessage.includes("TransactionExecutionError")
              ? t("transactionExecutionFailed")
              : errorMessage || t("unknownError");
            updateStep("wallet", "error");
            throw new Error(`${t("paymentFailed")} ${friendlyError}`);
          }
        }
        
        // 传递txHash给Agent，Agent可以通过链上查询验证付款信息
        // 检查 Agent Card 中是否有 X-PAYMENT 头的配置要求
        let paymentHeaderValue: string;
        if (agentCard?.calling?.headers?.["X-PAYMENT"]) {
          // 如果 Agent Card 中指定了 X-PAYMENT 的格式，使用它（可能是占位符）
          const headerTemplate = agentCard.calling.headers["X-PAYMENT"];
          if (headerTemplate.includes("base64_encoded_transaction_hash") || headerTemplate.includes("必需")) {
            // 使用 base64 编码的 txHash
            paymentHeaderValue = encodeTx(txHash);
          } else {
            // 直接使用 txHash（如果 Agent Card 指定了其他格式）
            paymentHeaderValue = txHash;
          }
        } else {
          // 默认使用 base64 编码
          paymentHeaderValue = encodeTx(txHash);
        }
        
        requestConfig.headers = {
          ...requestConfig.headers,
          "X-PAYMENT": paymentHeaderValue,
        };
        
        // 从 URL 参数中获取 referrer，并添加到请求体的 ext.referrer 字段
        const referrerCode = getQueryParam("referrer");
        
        // 修改请求体，添加 ext.referrer 字段
        if (method === "POST" || method === "PUT") {
          try {
            // 解析现有的请求体
            let bodyData: any = {};
            if (requestConfig.body) {
              bodyData = JSON.parse(requestConfig.body as string);
            }
            
            // 添加 ext 对象（如果不存在）
            if (!bodyData.ext) {
              bodyData.ext = {};
            }
            
            // 如果有 referrer，添加到 ext.referrer
            if (referrerCode && referrerCode.trim()) {
              bodyData.ext.referrer = referrerCode.trim();
            } else {
            }
            
            // 更新请求体
            requestConfig.body = JSON.stringify(bodyData);
          } catch (e) {
            // 如果解析失败，创建一个新的请求体
            const bodyData: any = {};
            if (referrerCode && referrerCode.trim()) {
              bodyData.ext = { referrer: referrerCode.trim() };
            }
            requestConfig.body = JSON.stringify(bodyData);
          }
        } else if (method === "GET" || method === "DELETE") {
          // GET/DELETE 请求，referrer 已经在 URL 参数中
          // 但为了确保 Agent 后端能读取到，我们也可以将 referrer 添加到请求体中（如果 Agent 支持）
          
          // 对于 GET/DELETE 请求，如果 Agent 后端期望从请求体读取，我们也添加到请求体中
          // 注意：某些 Agent 后端可能不支持 GET 请求的 body，但我们可以尝试
          if (referrerCode && referrerCode.trim()) {
            try {
              const bodyData: any = {
                ext: {
                  referrer: referrerCode.trim()
                }
              };
              requestConfig.body = JSON.stringify(bodyData);
            } catch (e) {
            }
          }
        }
        
        try {
          // 更新步骤：API 调用中
          updateStep("api", "executing");
          // 优先尝试直接访问
          response = await fetch(targetUrl, requestConfig);
        } catch (directError: any) {
          // 如果是 CORS 错误，使用代理
          const errorMessage = directError.message || directError.toString();
          if (
            errorMessage.includes("CORS") ||
            errorMessage.includes("Failed to fetch") ||
            errorMessage.includes("NetworkError") ||
            errorMessage.includes("Access-Control")
          ) {
            try {
              // 使用 Next.js API 代理路由
              response = await fetch("/api/proxy-agent", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  url: targetUrl,
                  method: method,
                  headers: requestConfig.headers,
                  body: requestConfig.body,
                }),
              });
            } catch (proxyError: any) {
              // 代理也失败了
              const networkErrorMsg = (t("networkConnectionError" as any) as string) || "Network connection failed. Please check the Agent URL and your network connection.";
              throw new Error(networkErrorMsg);
            }
          } else {
            // 其他错误直接抛出
            throw directError;
          }
        }
      }
      
      // 处理最终响应（代理返回的 JSON）
      let responseData: any;
      try {
        responseData = await response.json();
      } catch (e) {
        // 如果解析失败，尝试作为文本
        responseData = await response.text();
      }
      
      if (response.ok) {
        setRequestResult({
          success: true,
          data: responseData,
        });
        
        // 提取图片URL（支持多种可能的字段名和嵌套结构）
        let imageUrl: string | undefined = undefined;
        
        if (typeof responseData === "string") {
          // 如果是字符串，尝试解析为 JSON
          try {
            const parsed = JSON.parse(responseData);
            imageUrl = parsed?.image || 
                      parsed?.imageUrl || 
                      parsed?.url || 
                      parsed?.data?.image ||
                      parsed?.data?.imageUrl ||
                      parsed?.data?.data ||
                      parsed?.result?.image ||
                      parsed?.result?.imageUrl;
          } catch (e) {
            // 不是 JSON，检查是否是 URL
            if (responseData.startsWith("http://") || responseData.startsWith("https://")) {
              imageUrl = responseData;
            }
          }
        } else if (typeof responseData === "object" && responseData !== null) {
          const data = responseData as any;
          imageUrl = data?.image || 
                    data?.imageUrl || 
                    data?.url || 
                    data?.data?.image ||
                    data?.data?.imageUrl ||
                    data?.data?.data ||
                    data?.result?.image ||
                    data?.result?.imageUrl;
        }
        
        // 更新步骤：API 调用完成
        updateStep("api", "completed");
        updateStep("image", "executing");
        
        // 如果找到有效的图片URL，设置图片URL
        if (imageUrl && (imageUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || imageUrl.includes("image") || imageUrl.includes("png") || imageUrl.includes("jpg"))) {
          setAnimationImageUrl(imageUrl);
          // 更新步骤：图片生成完成
          updateStep("image", "completed");
        } else {
          // 即使没有图片，也标记为完成
          updateStep("image", "completed");
          // 如果没有找到图片，清空图片URL
          setAnimationImageUrl(undefined);
        }
        
        // 注意：使用次数记录已移除，避免每次调用都产生链上交易
        // 如果需要记录使用次数，可以考虑：
        // 1. 只在付款时记录（通过 PaymentSBT 事件）
        // 2. 使用链下索引服务
        // 3. 让用户手动选择是否记录
      } else {
        // 检查是否是 PaymentSBT 授权错误
        let errorMessage = `请求失败: ${response.status} ${response.statusText}`;
        const errorData = responseData?.error || responseData?.message || responseData?.details?.error || "";
        
        if (errorData && errorData.includes("Only authorized minter")) {
          // 查询授权地址和当前调用地址
          try {
            const authorizedMinter = paymentSBTContract 
              ? await paymentSBTContract.read.authorizedMinter([])
              : null;
            const currentCaller = responseData?.details?.caller || 
                                  responseData?.caller || 
                                  responseData?.details?.txHash?.from ||
                                  t("unknownCallerAddress");
            
            const authorizedLabel = t("authorizedMinterAddress");
            const currentCallerLabel = t("currentCallerAddress");
            const permissionInfoLabel = t("permissionInfo");
            const tipLabel = t("minterPermissionTip");
            
            errorMessage = `${errorData}\n\n${permissionInfoLabel}:\n` +
              `✅ ${authorizedLabel}: ${authorizedMinter || t("queryFailed")}\n` +
              `❌ ${currentCallerLabel}: ${currentCaller}\n\n` +
              `💡 ${tipLabel}`;
          } catch (queryError) {
            errorMessage = `${errorData}\n\n💡 ${t("minterPermissionErrorTip")}`;
          }
        } else if (errorData) {
          errorMessage = errorData;
        }
        
        setRequestResult({
          success: false,
          error: errorMessage,
          data: responseData, // 即使失败也显示响应数据
        });
      }
    } catch (error: any) {
      
      // 更新当前执行中的步骤为错误状态
      setExecutionSteps(prev => prev.map(step => 
        step.status === "executing" ? { ...step, status: "error" as const } : step
      ));
      
      setRequestResult({
        success: false,
        error: error.message || t("requestFailed") + " " + t("networkError"),
      });
      
      // 延迟隐藏执行清单，让用户看到错误状态
      setTimeout(() => {
        setShowExecutionChecklist(false);
      }, 3000);
    } finally {
      setIsCalling(false);
    }
  };

  // 下架 Agent
  const handleUnlistAgent = async () => {
    if (!listing) return;
    
    if (!confirm(t("confirmUnlist"))) {
      return;
    }

    setIsUnlisting(true);
    try {
      await writeContractAsync({
        functionName: "unlistAgent",
        args: [agentId],
      });
      alert(t("agentUnlistedSuccess"));
      // 跳转回首页
      window.location.href = "/home";
    } catch (error: any) {
      const errorMessage = error.message || error.shortMessage || error.details || "";
      const errorString = errorMessage.toLowerCase();
      
      if (
        errorString.includes("user rejected") ||
        errorString.includes("user denied") ||
        errorString.includes("user cancelled") ||
        errorString.includes("rejected") ||
        errorString.includes("denied") ||
        error.name === "UserRejectedRequestError" ||
        error.code === 4001
      ) {
        alert(t("unlistCancelled"));
      } else if (errorString.includes("not owner")) {
        alert(t("onlyOwnerCanUnlist"));
      } else {
        const unknownErrorText = t("unlistFailed") + " " + (errorMessage || "Unknown error");
        alert(unknownErrorText);
      }
    } finally {
      setIsUnlisting(false);
    }
  };

  // 评价功能已移除
  // const handleSubmitRating = async () => {
  //   if (!comment.trim()) {
  //     alert("请输入评价内容");
  //     return;
  //   }

  //   setIsSubmitting(true);
  //   try {
  //     await writeContractAsync({
  //       functionName: "submitRating",
  //       args: [agentId, rating, comment],
  //     });
  //     setComment("");
  //     refetch();
  //     alert("评价提交成功！");
  //   } catch (error) {
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };


  // 解析 agentInfo（这是一个元组）
  const listing = agentInfo?.[0];
  const identity = agentInfo?.[1];
  const averageRating = agentInfo?.[2];
  const feedbackCount = agentInfo?.[3];

  // 检查是否是 Agent 的所有者
  const isOwner = address && listing && listing.owner?.toLowerCase() === address.toLowerCase();

  // 获取 Agent Card 数据（如果 agentCardLink 存在）
  const { agentCard, loading: cardLoading, error: cardError } = useAgentCard(
    listing?.agentCardLink,
    !!listing?.agentCardLink
  );

  return (
    <>
      <div className="flex items-center flex-col grow pt-10 pb-10">
        <div className="px-5 w-full max-w-4xl">
          <LinkWithParams href="/home" className="btn btn-sm mb-4 rounded-lg bg-[#1A110A]/50 border-2 border-[#261A10]/50 text-white hover:bg-[#261A10]/70 hover:border-[#FF6B00]/50 transition-all duration-300">
            {t("backToStore")}
          </LinkWithParams>

          {listing && identity ? (
            <>
              {/* Agent Card 详情（如果有 agentCardLink，优先显示） */}
              {listing.agentCardLink && (
                <div className="mb-6">
                  <AgentCardDetail 
                    agentCard={agentCard} 
                    loading={cardLoading} 
                    error={cardError}
                  />
                </div>
              )}

              {/* 所有者信息（仅显示必要的权限信息） */}
              <div className="card bg-gradient-to-br from-[#1A110A]/90 to-[#261A10]/90 backdrop-blur-xl border border-[#FF6B00]/30 rounded-lg mb-6 animate-border-glow">
                <div className="card-body">
                  <h2 className="card-title text-xl text-white mb-4">{t("agentOwner") || "Owner"}</h2>
                  <Address address={listing.owner} />
                  
                  {/* 显示推荐人信息 - Referrer Code temporarily hidden */}
                  {false && listing?.referrer && listing.referrer.trim() && (
                    <div className="mt-4 pt-4 border-t border-[#FF6B00]/20">
                      <div className="flex items-center gap-2">
                        <span className="text-white/70 text-sm">{t("referrerCode") || "Referrer Code"}:</span>
                        <span className="text-[#FF6B00] font-mono text-sm">{listing.referrer}</span>
                      </div>
                    </div>
                  )}

                  <div className="card-actions justify-between mt-6">
                    {/* 所有者操作按钮 */}
                    {isOwner && (
                      <button
                        className="btn btn-sm rounded-lg bg-[#1A110A]/50 border-2 border-red-500/50 text-red-400 hover:bg-red-500/20 hover:border-red-500 transition-all duration-300"
                        onClick={handleUnlistAgent}
                        disabled={isUnlisting || !listing.listed}
                      >
                        {isUnlisting ? (
                          <>
                            <span className="loading loading-spinner loading-sm"></span>
                            {t("unlisting")}
                          </>
                        ) : (
                          t("unlistAgent")
                        )}
                      </button>
                    )}
                    
                    {/* 调用 Agent 按钮 */}
                    <button
                      className={`btn btn-lg rounded-lg bg-[#FF6B00] hover:bg-[#FF8C00] text-white border-0 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${isOwner ? "ml-auto" : ""}`}
                      onClick={handleCallAgent}
                      disabled={isCalling || !listing.listed}
                    >
                      {isCalling ? (
                        <>
                          <span className="loading loading-spinner loading-sm"></span>
                          {t("calling")}
                        </>
                      ) : (
                        t("callAgent")
                      )}
                    </button>
                  </div>

                  {/* 请求结果展示 */}
                  {requestResult && (
                    <div className={`mt-6 p-4 rounded-lg border-2 ${
                      requestResult.success
                        ? "bg-green-500/10 border-green-500/30"
                        : "bg-red-500/10 border-red-500/30"
                    }`}>
                      <h3 className={`text-lg font-semibold mb-2 ${
                        requestResult.success ? "text-green-400" : "text-red-400"
                      }`}>
                        {requestResult.success ? t("callSuccess") : t("callFailed")}
                      </h3>
                      {requestResult.error && (
                        <div className="mb-3 p-3 bg-red-900/20 rounded-lg border border-red-500/30">
                          <p className="text-sm text-red-300 font-medium">{t("errorMessage")}</p>
                          <div className="text-sm text-red-200 mt-1 whitespace-pre-wrap space-y-2">
                            {requestResult.error.split('\n').map((line: string, index: number) => {
                              // 高亮显示地址（支持中英文）
                              const authorizedLabel = t("authorizedMinterAddress");
                              const callerLabel = t("currentCallerAddress");
                              const isAuthorizedLine = line.includes(authorizedLabel) || line.includes("授权铸造者地址") || line.includes("Authorized Minter Address");
                              const isCallerLine = line.includes(callerLabel) || line.includes("当前调用地址") || line.includes("Current Caller Address");
                              
                              if (isAuthorizedLine || isCallerLine) {
                                const colonIndex = line.indexOf(':');
                                if (colonIndex > 0) {
                                  const label = line.substring(0, colonIndex).trim();
                                  const address = line.substring(colonIndex + 1).trim();
                                  return (
                                    <div key={index} className="flex items-start gap-2">
                                      <span className={isAuthorizedLine ? "text-green-400" : "text-red-400"}>
                                        {isAuthorizedLine ? "✅" : "❌"}
                                      </span>
                                      <span>
                                        <span className="font-medium">{label}:</span>
                                        <span className="ml-2 font-mono text-xs bg-black/30 px-2 py-1 rounded break-all">
                                          {address}
                                        </span>
                                      </span>
                                    </div>
                                  );
                                }
                              }
                              // 普通文本
                              return <p key={index}>{line}</p>;
                            })}
                          </div>
                        </div>
                      )}
                      {requestResult.data !== undefined && (
                        <div className="mt-2">
                          <p className="text-sm text-white/70 mb-1">{t("httpResponseData")}</p>
                          {(() => {
                            // 尝试提取图片 URL
                            let imageUrl: string | null = null;
                            
                            if (typeof requestResult.data === "string") {
                              // 如果是字符串，尝试解析为 JSON
                              try {
                                const parsed = JSON.parse(requestResult.data);
                                if (parsed?.data?.data && typeof parsed.data.data === "string") {
                                  imageUrl = parsed.data.data;
                                } else if (parsed?.data && typeof parsed.data === "string") {
                                  imageUrl = parsed.data;
                                }
                              } catch (e) {
                                // 不是 JSON，检查是否是 URL
                                if (requestResult.data.startsWith("http://") || requestResult.data.startsWith("https://")) {
                                  imageUrl = requestResult.data;
                                }
                              }
                            } else if (typeof requestResult.data === "object" && requestResult.data !== null) {
                              // 如果是对象，查找 data.data 字段
                              const data = requestResult.data as any;
                              if (data?.data?.data && typeof data.data.data === "string") {
                                imageUrl = data.data.data;
                              } else if (data?.data && typeof data.data === "string") {
                                imageUrl = data.data;
                              } else if (data?.url && typeof data.url === "string") {
                                imageUrl = data.url;
                              }
                            }
                            
                            // 如果找到图片 URL，显示图片
                            if (imageUrl && (imageUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || imageUrl.includes("image") || imageUrl.includes("png") || imageUrl.includes("jpg"))) {
                              return (
                                <div className="bg-[#261A10]/50 p-3 rounded-lg border border-[#FF6B00]/20">
                                  <img 
                                    src={imageUrl} 
                                    alt="Agent Response" 
                                    className="max-w-full h-auto rounded-lg border border-[#FF6B00]/30"
                                    onError={(e) => {
                                      // 如果图片加载失败，显示原始数据
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = "none";
                                      const fallback = target.nextElementSibling as HTMLElement;
                                      if (fallback) fallback.style.display = "block";
                                    }}
                                  />
                                  <pre className="bg-[#261A10]/50 p-3 rounded-lg text-xs overflow-x-auto text-white/80 border border-[#FF6B00]/20 font-mono max-h-64 overflow-y-auto hidden">
                                    {typeof requestResult.data === "string" 
                                      ? requestResult.data 
                                      : JSON.stringify(requestResult.data, null, 2)}
                                  </pre>
                                </div>
                              );
                            }
                            
                            // 否则显示 JSON 文本
                            return (
                              <pre className="bg-[#261A10]/50 p-3 rounded-lg text-xs overflow-x-auto text-white/80 border border-[#FF6B00]/20 font-mono max-h-64 overflow-y-auto">
                                {typeof requestResult.data === "string" 
                                  ? requestResult.data 
                                  : JSON.stringify(requestResult.data, null, 2)}
                              </pre>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SBT 铸造信息已移除：用户直接支付给 Agent，Agent 会自行处理 SBT 铸造 */}
                </div>
              </div>

              {/* 我的SBT区域 */}
              {address && (
                <div className="card bg-gradient-to-br from-[#1A110A]/90 to-[#261A10]/90 backdrop-blur-xl border border-[#FF6B00]/30 rounded-lg mb-6">
                  <div className="card-body">
                    <div className="flex justify-between items-center">
                      <h2 className="card-title text-white">{t("myPaymentSBTs")}</h2>
                      <button
                        className="btn btn-sm rounded-lg bg-[#FF6B00] hover:bg-[#FF8C00] text-white border-0 transition-all duration-300"
                        onClick={() => {
                          setShowMySBTs(!showMySBTs);
                          if (!showMySBTs) {
                            refetchMySBTs();
                          }
                        }}
                      >
                        {showMySBTs ? t("hide") : t("viewMySBTs")}
                      </button>
                    </div>

                    {showMySBTs && (
                      <div className="mt-4">
                        {mySBTs && Array.isArray(mySBTs) && (mySBTs as bigint[]).length > 0 ? (
                          <div className="space-y-3">
                            {(mySBTs as bigint[]).map((tokenId: bigint, index: number) => (
                              <SBTCard key={index} tokenId={tokenId} paymentSBTContract={paymentSBTContract} targetNetwork={targetNetwork} />
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-white/70">{t("noSBTRecords")}</p>
                            <p className="text-sm text-white/50 mt-2">{t("sbtHint")}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 评价功能已移除 */}
            </>
          ) : (
            <div className="text-center py-12">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <p className="text-xl text-white/70 mt-4">{t("loading")}</p>
            </div>
          )}
        </div>
      </div>

      {/* 执行清单 */}
      <ExecutionChecklist
        isOpen={showExecutionChecklist}
        steps={executionSteps}
        onComplete={() => {
          setShowExecutionChecklist(false);
          setShowBoxAnimation(true);
        }}
      />

      {/* 礼盒开启动画 */}
      <BoxOpeningAnimation
        isOpen={showBoxAnimation}
        imageUrl={animationImageUrl}
        onClose={() => {
          setShowBoxAnimation(false);
          setAnimationImageUrl(undefined);
        }}
      />
    </>
  );
};

export default AgentDetail;

