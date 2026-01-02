"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { formatEther, parseEther } from "viem";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { useScaffoldReadContract, useScaffoldContract, useCopyToClipboard, useTotalPoints, useSelfMintSBTPoints, useSelfCreateAgentPoints, useReferMintSBTPoints, useReferCreateAgentPoints } from "~~/hooks/scaffold-eth";
import { LinkWithParams } from "~~/components/LinkWithParams";
import { useLanguage } from "~~/utils/i18n/LanguageContext";
import { useAgentCard } from "~~/hooks/useAgentCard";
import CryptoJS from "crypto-js";
import { DocumentDuplicateIcon, CheckCircleIcon, KeyIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { addQueryParams, getQueryParam } from "~~/utils/urlParams";
import { BoxOpeningAnimation } from "~~/components/BoxOpeningAnimation";
import { ExecutionChecklist } from "~~/components/ExecutionChecklist";
import { notification } from "~~/utils/scaffold-eth";

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
  
  // Call Agent 相关状态
  const [isCalling, setIsCalling] = useState(false);
  const [requestResult, setRequestResult] = useState<{
    success: boolean;
    data?: any;
    error?: string;
  } | null>(null);
  const [showBoxAnimation, setShowBoxAnimation] = useState(false);
  const [animationImageUrl, setAnimationImageUrl] = useState<string | undefined>(undefined);
  const [showExecutionChecklist, setShowExecutionChecklist] = useState(false);
  const [executionSteps, setExecutionSteps] = useState<Array<{id: string; label: string; status: "pending" | "executing" | "completed" | "error"}>>([]);
  
  // 获取钱包客户端
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

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

        // 2. 调用 AgentStore 合约获取该推荐码的所有 Agent IDs
        const agentIds = await agentStoreContract.read.getAgentsByReferrer([referrerCode]) as bigint[];
        
        if (!agentIds || agentIds.length === 0) {
          setInviteCount(0);
          setLoadingInviteCount(false);
          return;
        }


        // 3. 批量查询每个 Agent 的 owner，并去重
        const ownerPromises = agentIds.map(async (agentId) => {
          try {
            const fullInfo = await agentStoreContract.read.getAgentFullInfo([agentId]);
            const [listing] = fullInfo;
            return listing.owner.toLowerCase();
          } catch (error) {
            return null;
          }
        });

        const owners = await Promise.all(ownerPromises);
        const uniqueOwners = new Set(owners.filter(owner => owner !== null));
        
        setInviteCount(uniqueOwners.size);
      } catch (error) {
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

  // 获取 agent-store/1 的信息（用于 PANdora 卡片）
  const { data: pandoraAgentInfo } = useScaffoldReadContract({
    contractName: "AgentStore",
    functionName: "getAgentFullInfo",
    args: [BigInt(1)],
  });
  
  const pandoraListing = pandoraAgentInfo?.[0];
  const pandoraAgentCardLink = pandoraListing?.agentCardLink;
  
  // 获取 PANdora Agent Card
  const { agentCard: pandoraAgentCard, loading: pandoraCardLoading } = useAgentCard(
    pandoraAgentCardLink,
    !!pandoraAgentCardLink
  );

  // 编码交易哈希到base64（用于请求头）
  const encodeTx = (txHash: string): string => {
    if (typeof window !== 'undefined') {
      return btoa(txHash);
    } else {
      return Buffer.from(txHash).toString("base64");
    }
  };

  // Call Agent 处理函数（从详情页复制并适配）
  const handleCallPandoraAgent = async () => {
    // 检查是否已连接钱包
    if (!address) {
      // 提示用户连接钱包
      notification.warning(
        <div>
          <p className="font-bold">{t("connectWalletForPayment") || "Please connect your wallet first"}</p>
          <p className="text-sm mt-1">Connect your wallet to open PANdora box</p>
        </div>,
        { duration: 4000 }
      );
      return;
    }
    
    if (!pandoraListing || !pandoraAgentCard || pandoraCardLoading) {
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
    setShowBoxAnimation(false);
    
    // 更新步骤状态的辅助函数
    const updateStep = (stepId: string, status: "pending" | "executing" | "completed" | "error") => {
      setExecutionSteps(prev => prev.map(step => 
        step.id === stepId ? { ...step, status } : step
      ));
    };
    
    try {
      if (!pandoraAgentCard) {
        throw new Error("Agent Card is required to call this Agent");
      }
      
      const method = pandoraAgentCard.calling?.method?.toUpperCase() || "GET";
      const url = pandoraAgentCard.endpoints?.task;
      
      if (!url) {
        throw new Error("Agent Card must contain 'endpoints.task'");
      }
      
      let requestParams = {};
      let targetUrl = url;
      const requestConfig: RequestInit = {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
      };
      
      if (pandoraAgentCard?.calling?.headers) {
        Object.entries(pandoraAgentCard.calling.headers).forEach(([key, value]) => {
          if (value && !value.includes("base64_encoded_transaction_hash") && !value.includes("必需")) {
            requestConfig.headers = {
              ...requestConfig.headers,
              [key]: value,
            };
          }
        });
      }
      
      if (method === "POST" || method === "PUT") {
        if (pandoraAgentCard?.calling?.note?.includes("请求体可以为空") && Object.keys(requestParams).length === 0) {
          requestConfig.body = JSON.stringify({});
        } else {
          requestConfig.body = JSON.stringify(requestParams);
        }
      } else if (method === "GET" || method === "DELETE") {
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
      
      let response: Response;
      let needsPayment = false;
      
      try {
        updateStep("wallet", "completed");
        updateStep("transaction", "completed");
        updateStep("confirm", "completed");
        updateStep("api", "executing");
        response = await fetch(targetUrl, requestConfig);
      } catch (directError: any) {
        const errorMessage = directError.message || directError.toString();
        if (
          errorMessage.includes("CORS") ||
          errorMessage.includes("Failed to fetch") ||
          errorMessage.includes("NetworkError") ||
          errorMessage.includes("Access-Control")
        ) {
          try {
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
            const networkErrorMsg = (t("networkConnectionError" as any) as string) || "Network connection failed. Please check the Agent URL and your network connection.";
            throw new Error(networkErrorMsg);
          }
        } else {
          throw directError;
        }
      }
      
      if (response.status === 402) {
        needsPayment = true;
        setExecutionSteps([
          { id: "wallet", label: t("stepWalletSignature"), status: "pending" as const },
          { id: "transaction", label: t("stepTransactionSent"), status: "pending" as const },
          { id: "confirm", label: t("stepTransactionConfirmed"), status: "pending" as const },
          { id: "api", label: t("stepApiCall"), status: "pending" as const },
          { id: "image", label: t("stepImageGeneration"), status: "pending" as const },
        ]);
        
        if (!address) {
          throw new Error(t("connectWalletForPayment"));
        }
        
        let paymentDetails;
        try {
          const responseData = await response.json();
          
          if (responseData.accepts && Array.isArray(responseData.accepts) && responseData.accepts.length > 0) {
            const accept = responseData.accepts[0];
            
            if (!accept.maxAmountRequired && !accept.price && !accept.amount) {
              throw new Error(t("paymentDetailsFormatError"));
            }
            
            if (!accept.address) {
              throw new Error(t("paymentDetailsFormatError"));
            }
            
            paymentDetails = {
              address: accept.address,
              price: accept.maxAmountRequired || accept.price || accept.amount,
              currency: accept.currency || "ETH",
              network: accept.network,
              description: accept.description,
              scheme: accept.scheme,
              resource: accept.resource,
            };
          } else if (responseData.data && typeof responseData.data === 'object') {
            paymentDetails = responseData.data;
          } else if (responseData.paymentDetails && typeof responseData.paymentDetails === 'object') {
            paymentDetails = responseData.paymentDetails;
          } else if (responseData.price !== undefined || responseData.maxAmountRequired !== undefined) {
            paymentDetails = {
              ...responseData,
              price: responseData.price || responseData.maxAmountRequired || responseData.amount,
            };
          } else {
            paymentDetails = responseData;
          }
        } catch (e) {
          if (e instanceof Error && e.message.includes("paymentDetailsFormatError")) {
            throw e;
          }
          throw new Error(t("cannotParse402Response"));
        }
        
        if (!paymentDetails || typeof paymentDetails !== 'object') {
          throw new Error(t("paymentDetailsFormatError"));
        }
        
        const priceFieldValue = paymentDetails.price || paymentDetails.maxAmountRequired || paymentDetails.amount;
        if (!priceFieldValue && priceFieldValue !== 0 && priceFieldValue !== "0") {
          throw new Error(t("paymentDetailsFormatError"));
        }
        
        if (!paymentDetails.price) {
          paymentDetails.price = priceFieldValue;
        }
        
        if (!paymentDetails.address) {
          throw new Error(t("paymentDetailsFormatError"));
        }
        
        let priceInWei: bigint;
        try {
          const priceStr = paymentDetails.price.toString();
          const priceNum = parseFloat(priceStr);
          if (priceNum > 1e12 || priceStr.length > 15) {
            priceInWei = BigInt(priceStr);
          } else {
            priceInWei = parseEther(priceStr);
          }
        } catch (e) {
          throw new Error(`${t("priceFormatError")} ${paymentDetails.price}`);
        }
        
        if (priceInWei <= 0n) {
          throw new Error(`${t("priceFormatError")} ${paymentDetails.price}`);
        }
        
        const priceInEth = Number(priceInWei) / 1e18;
        
        if (priceInEth > 1000) {
          throw new Error(`Price too large: ${priceInEth} ETH. Maximum allowed: 1000 ETH`);
        }
        
        if (isNaN(priceInEth) || priceInEth <= 0) {
          throw new Error(`${t("priceFormatError")} ${paymentDetails.price}`);
        }
        
        const agentPaymentAddress = paymentDetails.address as `0x${string}`;
        
        if (!walletClient) {
          throw new Error(t("walletClientNotConnected"));
        }
        
        if (!publicClient) {
          throw new Error(t("publicClientNotConnected"));
        }
        
        let txHash: string;
        try {
          updateStep("wallet", "executing");
          
          const hash = await walletClient.sendTransaction({
            to: agentPaymentAddress,
            value: priceInWei,
            account: address as `0x${string}`,
          });
          
          if (!hash) {
            throw new Error(t("transactionFailedNoHash"));
          }
          
          txHash = hash;
          
          updateStep("wallet", "completed");
          updateStep("transaction", "completed");
          updateStep("confirm", "executing");
          
          const receipt = await publicClient.waitForTransactionReceipt({
            hash: txHash as `0x${string}`,
            timeout: 60_000,
          });
          
          updateStep("confirm", "completed");
          updateStep("api", "executing");
          
        } catch (error: any) {
          setExecutionSteps(prev => prev.map(step => 
            step.status === "executing" ? { ...step, status: "error" as const } : step
          ));
          
          const errorMessage = error.message || error.shortMessage || error.details || "";
          const errorString = errorMessage.toLowerCase();
          const errorName = error.name || "";
          const errorNameLower = errorName.toLowerCase();
          
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
            error.code === 4001 ||
            error.cause?.code === 4001
          ) {
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
            const friendlyError = errorMessage.includes("ContractFunctionExecutionError") || errorMessage.includes("TransactionExecutionError")
              ? t("transactionExecutionFailed")
              : errorMessage || t("unknownError");
            updateStep("wallet", "error");
            throw new Error(`${t("paymentFailed")} ${friendlyError}`);
          }
        }
        
        let paymentHeaderValue: string;
        if (pandoraAgentCard?.calling?.headers?.["X-PAYMENT"]) {
          const headerTemplate = pandoraAgentCard.calling.headers["X-PAYMENT"];
          if (headerTemplate.includes("base64_encoded_transaction_hash") || headerTemplate.includes("必需")) {
            paymentHeaderValue = encodeTx(txHash);
          } else {
            paymentHeaderValue = txHash;
          }
        } else {
          paymentHeaderValue = encodeTx(txHash);
        }
        
        requestConfig.headers = {
          ...requestConfig.headers,
          "X-PAYMENT": paymentHeaderValue,
        };
        
        const referrerCode = getQueryParam("referrer");
        
        if (method === "POST" || method === "PUT") {
          try {
            let bodyData: any = {};
            if (requestConfig.body) {
              bodyData = JSON.parse(requestConfig.body as string);
            }
            
            if (!bodyData.ext) {
              bodyData.ext = {};
            }
            
            if (referrerCode && referrerCode.trim()) {
              bodyData.ext.referrer = referrerCode.trim();
            }
            
            requestConfig.body = JSON.stringify(bodyData);
          } catch (e) {
            const bodyData: any = {};
            if (referrerCode && referrerCode.trim()) {
              bodyData.ext = { referrer: referrerCode.trim() };
            }
            requestConfig.body = JSON.stringify(bodyData);
          }
        } else if (method === "GET" || method === "DELETE") {
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
          updateStep("api", "executing");
          response = await fetch(targetUrl, requestConfig);
        } catch (directError: any) {
          const errorMessage = directError.message || directError.toString();
          if (
            errorMessage.includes("CORS") ||
            errorMessage.includes("Failed to fetch") ||
            errorMessage.includes("NetworkError") ||
            errorMessage.includes("Access-Control")
          ) {
            try {
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
              const networkErrorMsg = (t("networkConnectionError" as any) as string) || "Network connection failed. Please check the Agent URL and your network connection.";
              throw new Error(networkErrorMsg);
            }
          } else {
            throw directError;
          }
        }
      }
      
      let responseData: any;
      try {
        responseData = await response.json();
      } catch (e) {
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
        // 放宽验证条件：只要包含 http 或 https，就认为是可能的图片URL
        if (imageUrl && (
          imageUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || 
          imageUrl.includes("image") || 
          imageUrl.includes("png") || 
          imageUrl.includes("jpg") ||
          imageUrl.startsWith("http://") ||
          imageUrl.startsWith("https://")
        )) {
          setAnimationImageUrl(imageUrl);
          // 更新步骤：图片生成完成
          updateStep("image", "completed");
        } else {
          // 即使没有图片，也标记为完成
          updateStep("image", "completed");
          // 如果没有找到图片，清空图片URL（但动画仍会显示，只显示盒子）
          setAnimationImageUrl(undefined);
        }
        
        // 注意：动画显示由 ExecutionChecklist 的 onComplete 回调统一处理
        // 即使没有图片，动画也会显示（只显示盒子颤抖效果）
      } else {
        let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
        const errorData = responseData?.message || responseData?.error || responseData?.details?.message || responseData?.details?.error || "";
        
        if (errorData && errorData.includes("Only authorized minter")) {
          try {
            errorMessage = `${errorData}\n\n💡 ${t("minterPermissionErrorTip")}`;
          } catch (queryError: any) {
            errorMessage = `${errorData}\n\n💡 ${t("minterPermissionErrorTip")}`;
          }
        } else if (errorData) {
          errorMessage = errorData;
        } else {
          errorMessage = `Request failed: ${response.status} ${response.statusText}. Please check the API response for more details. Full response: ${JSON.stringify(responseData)}`;
        }
        
        updateStep("api", "error");
        setRequestResult({
          success: false,
          error: errorMessage,
          data: responseData,
        });
        
        setTimeout(() => {
          setShowExecutionChecklist(false);
        }, 3000);
      }
    } catch (err: any) {
      setExecutionSteps(prev => prev.map(step => 
        step.status === "executing" ? { ...step, status: "error" as const } : step
      ));
      
      setRequestResult({
        success: false,
        error: err.message || t("unknownError"),
      });
      
      setTimeout(() => {
        setShowExecutionChecklist(false);
      }, 3000);
    } finally {
      setIsCalling(false);
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
          <h1 className="text-6xl font-bold text-white mb-4 animate-text-shimmer leading-tight whitespace-pre-line">
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
            {/* Open Box - Marketplace Style */}
            <div 
              onClick={handleCallPandoraAgent}
              className={`group relative bg-gradient-to-br from-[#1A110A]/90 to-[#261A10]/90 backdrop-blur-xl border border-[#FF6B00]/30 rounded-2xl overflow-hidden shadow-xl shadow-black/30 transition-all duration-500 ${
                address 
                  ? "hover:shadow-[#FF6B00]/20 hover:shadow-2xl hover:border-[#FF6B00]/60 hover:-translate-y-2 cursor-pointer" 
                  : "opacity-75 cursor-not-allowed"
              }`}
            >
              <div className="relative p-6 h-full min-h-[280px] flex flex-col">
                {/* 右上角 Detail 链接 */}
                <div className="absolute top-6 right-6 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(addQueryParams("/agent-store/1"));
                    }}
                    className="text-white text-sm font-medium underline hover:text-[#FF6B00] transition-colors"
                  >
                    Detail
                  </button>
                </div>

                {/* 左上角 LIMITED EDITION 标签 */}
                <div className="mb-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#FF6B00] bg-[#1A110A]/80">
                    <svg className="w-3 h-3 text-[#FF6B00]" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-[#FF6B00] text-xs font-bold uppercase tracking-wide">LIMITED EDITION</span>
                  </div>
                </div>

                {/* 标题 */}
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">{t("pandoraBox")}</h3>

                {/* 描述、图标和箭头 */}
                <div className="flex items-center gap-12 mb-4 flex-1">
                  {/* 描述文字靠左 */}
                  <p className="text-white/60 text-sm leading-relaxed flex-1 line-clamp-3">
                    {t("pandoraBoxDescription")}
                  </p>
                  
                  {/* 立体盒子图标 */}
                  <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 flex items-center justify-center">
                    <svg className="w-full h-full text-[#FF6B00]" viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      {/* 盒子顶部（等轴测投影） */}
                      <path d="M30 40 L70 20 L110 40 L70 60 Z" fill="currentColor" fillOpacity="0.25" stroke="currentColor" />
                      {/* 盒子前面 */}
                      <path d="M30 40 L70 60 L70 100 L30 80 Z" fill="currentColor" fillOpacity="0.35" stroke="currentColor" />
                      {/* 盒子右侧 */}
                      <path d="M70 20 L110 40 L110 80 L70 100 Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" />
                    </svg>
                  </div>
                  
                  {/* 右侧圆形箭头按钮 - 手机端隐藏，电脑端显示 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCallPandoraAgent();
                    }}
                    className="hidden md:flex flex-shrink-0 w-10 h-10 rounded-full bg-[#FF6B00]/80 hover:bg-[#FF6B00] text-white items-center justify-center transition-all duration-300 shadow-lg shadow-[#FF6B00]/40 hover:shadow-[#FF6B00]/60"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* 底部：价格 */}
                <div className="flex items-end mt-auto">
                  <div className="flex items-baseline gap-4">
                    <div className="text-3xl font-bold text-[#FF6B00]">0.005 BNB</div>
                    <div className="text-xs text-white/50">Gas fees apply</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Create Agent - Marketplace Style */}
            <div 
              onClick={() => {
                if (!address) {
                  notification.warning(
                    <div>
                      <p className="font-bold">{t("connectWalletForPayment") || "Please connect your wallet first"}</p>
                      <p className="text-sm mt-1">Connect your wallet to register an agent</p>
                    </div>,
                    { duration: 4000 }
                  );
                  return;
                }
                router.push(addQueryParams("/agent-store/register"));
              }}
              className={`group relative bg-gradient-to-br from-[#1A110A]/90 to-[#261A10]/90 backdrop-blur-xl border border-[#FF6B00]/30 rounded-2xl overflow-hidden shadow-xl shadow-black/30 transition-all duration-500 ${
                address 
                  ? "hover:shadow-[#FF6B00]/20 hover:shadow-2xl hover:border-[#FF6B00]/60 hover:-translate-y-2 cursor-pointer" 
                  : "opacity-75 cursor-not-allowed"
              }`}
            >
              <div className="relative p-6 h-full min-h-[280px] flex flex-col">
                {/* 右上角 Detail 链接 */}
                <div className="absolute top-6 right-6 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!address) {
                        notification.warning(
                          <div>
                            <p className="font-bold">{t("connectWalletForPayment") || "Please connect your wallet first"}</p>
                            <p className="text-sm mt-1">Connect your wallet to register an agent</p>
                          </div>,
                          { duration: 4000 }
                        );
                        return;
                      }
                      router.push(addQueryParams("/agent-store/register"));
                    }}
                    className="text-white text-sm font-medium underline hover:text-[#FF6B00] transition-colors"
                  >
                    Detail
                  </button>
                </div>

                {/* 左上角标签（可选） */}
                <div className="mb-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#FF6B00] bg-[#1A110A]/80">
                    <svg className="w-3 h-3 text-[#FF6B00]" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-[#FF6B00] text-xs font-bold uppercase tracking-wide">PREMIUM</span>
                  </div>
                </div>

                {/* 标题 */}
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">{t("createAgentTitle")}</h3>

                {/* 描述、图标和箭头 */}
                <div className="flex items-center gap-12 mb-4 flex-1">
                  {/* 描述文字靠左 */}
                  <p className="text-white/60 text-sm leading-relaxed flex-1 line-clamp-3">
                    {t("createAgentDescription")}
                  </p>
                  
                  {/* 钥匙图标（Agent Owner） */}
                  <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 flex items-center justify-center">
                    <KeyIcon className="w-10 h-10 md:w-12 md:h-12 text-[#FF6B00]" />
                  </div>
                  
                  {/* 右侧圆形箭头按钮 - 手机端隐藏，电脑端显示 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!address) {
                        notification.warning(
                          <div>
                            <p className="font-bold">{t("connectWalletForPayment") || "Please connect your wallet first"}</p>
                            <p className="text-sm mt-1">Connect your wallet to register an agent</p>
                          </div>,
                          { duration: 4000 }
                        );
                        return;
                      }
                      router.push(addQueryParams("/agent-store/register"));
                    }}
                    className="hidden md:flex flex-shrink-0 w-10 h-10 rounded-full bg-[#FF6B00]/80 hover:bg-[#FF6B00] text-white items-center justify-center transition-all duration-300 shadow-lg shadow-[#FF6B00]/40 hover:shadow-[#FF6B00]/60"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* 底部：价格 */}
                <div className="flex items-end mt-auto">
                  <div className="flex items-baseline gap-4">
                    <div className="text-3xl font-bold text-[#FF6B00]">
                      {registrationFee ? `${formatEther(registrationFee)} BNB` : "Loading..."}
                    </div>
                    <div className="text-xs text-white/50">Gas fees apply</div>
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
          return `${parseFloat(formatted).toFixed(6).replace(/\.?0+$/, "")} BNB ${t("perTime")}`;
        }
        // 如果已经是格式化的字符串（如 "0.005"），直接返回
        return `${price} BNB ${t("perTime")}`;
      }
      // 如果是数字，假设是 wei 单位
      if (typeof price === "number") {
        const priceBigInt = BigInt(Math.floor(price));
        const formatted = formatEther(priceBigInt);
        return `${parseFloat(formatted).toFixed(6).replace(/\.?0+$/, "")} BNB ${t("perTime")}`;
      }
      return t("pricePending");
    } catch (error) {
      // 如果转换失败，返回原始值或默认值
      return typeof price === "string" ? `${price} BNB ${t("perTime")}` : t("pricePending");
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

