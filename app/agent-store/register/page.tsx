"use client";

import type { NextPage } from "next";
import { useState } from "react";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useRouter } from "next/navigation";
import { addQueryParams } from "~~/utils/urlParams";
import { LinkWithParams } from "~~/components/LinkWithParams";
import { useLanguage } from "~~/utils/i18n/LanguageContext";
import { useAgentCard } from "~~/hooks/useAgentCard";

const RegisterAgent: NextPage = () => {
  const router = useRouter();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    agentCardLink: "",
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // 获取 Agent Card 数据以提取 Agent 链接
  const { agentCard, loading: cardLoading, error: cardError } = useAgentCard(
    formData.agentCardLink,
    formData.agentCardLink.length > 0
  );

  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: "AgentStore",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setIsRegistering(true);

    try {
      // 验证 Agent Card 链接
      if (!formData.agentCardLink || formData.agentCardLink.trim() === "") {
        throw new Error(t("agentCardLinkRequired") || "Agent Card Link is required");
      }

      // 如果 Agent Card 已加载，验证是否包含必要信息
      if (cardError) {
        throw new Error(t("agentCardLoadError") || `Failed to load Agent Card: ${cardError}`);
      }

      if (cardLoading) {
        throw new Error(t("agentCardLoading") || "Please wait for Agent Card to load");
      }

      if (!agentCard) {
        throw new Error(t("agentCardInvalid") || "Invalid Agent Card. Please check the URL.");
      }

      // 调用合约注册（只需要 agentCardLink）
      await writeContractAsync({
        functionName: "registerAndListAgent",
        args: [
          formData.agentCardLink,
        ] as any,
      });

      // 成功后跳转
      router.push(addQueryParams("/agent-store"));
    } catch (error: any) {
      console.error("Registration error:", error);
      setValidationError(error.message || t("registrationFailed") || "Registration failed");
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <>
      <div className="flex items-center flex-col grow pt-10 pb-10 bg-gradient-to-br from-[#1A110A] via-[#261A10] to-[#1A110A] min-h-screen animate-gradient">
        <div className="px-5 w-full max-w-3xl">
          <div className="mb-8">
            <LinkWithParams href="/agent-store" className="btn btn-sm mb-4 bg-[#261A10]/50 backdrop-blur-sm border-[#FF6B00]/20 text-white hover:bg-[#FF6B00]/20 transition-all">
              {t("backToStore")}
            </LinkWithParams>
            <h1 className="text-4xl font-bold mb-3 animate-text-shimmer">
              {t("registerNewAgentTitle")}
            </h1>
            <p className="text-white/70 mt-3 text-lg">
              {t("registerDescription")}
            </p>
          </div>

          <div className="card bg-gradient-to-br from-[#1A110A]/90 to-[#261A10]/90 backdrop-blur-xl border border-[#FF6B00]/30 animate-border-glow">
            <div className="card-body p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* AgentCard 链接（唯一必填项） */}
                <div className="form-control">
                  <label className="label pb-2">
                    <span className="label-text text-base font-semibold text-white">
                      {t("agentCardLink")} <span className="text-[#FF6B00]">{t("required")}</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder={t("exampleAgentCardLink")}
                    className="input w-full h-12 text-base font-mono rounded-lg bg-[#1A110A]/50 border-2 border-[#FF6B00]/30 text-white placeholder:text-gray-500 focus:border-[#FF6B00] focus:bg-[#261A10]/70 focus:outline-none focus:ring-0 transition-all duration-300"
                    value={formData.agentCardLink}
                    onChange={(e) =>
                      setFormData({ ...formData, agentCardLink: e.target.value })
                    }
                    required
                  />
                  <label className="label pt-1">
                    <span className="label-text-alt text-sm text-[#FF6B00]/70">
                      {t("agentCardLinkHint")}
                    </span>
                  </label>
                  
                  {/* Agent Card 验证状态 */}
                  {formData.agentCardLink && (
                    <div className="mt-2">
                      {cardLoading && (
                        <div className="flex items-center gap-2 text-sm text-white/50">
                          <span className="loading loading-spinner loading-xs text-[#FF6B00]"></span>
                          {t("validatingAgentCard") || "Validating Agent Card..."}
                        </div>
                      )}
                      {cardError && (
                        <div className="alert alert-error py-2 px-3 mt-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs">{cardError}</span>
                        </div>
                      )}
                      {agentCard && !cardLoading && !cardError && (
                        <div className="alert alert-success py-2 px-3 mt-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="text-xs">
                            <div className="font-semibold">{t("agentCardValid") || "Agent Card Valid"}</div>
                            {agentCard.endpoints?.task && (
                              <div className="text-xs opacity-70 mt-1">
                                {t("agentLinkExtracted") || "Agent Link"}: {agentCard.endpoints.task}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {agentCard && !agentCard.endpoints?.task && !cardLoading && (
                        <div className="alert alert-warning py-2 px-3 mt-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span className="text-xs">{t("agentLinkMissing") || "Agent Card must contain 'endpoints.task' field"}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 错误提示 */}
                {validationError && (
                  <div className="alert alert-error">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{validationError}</span>
                  </div>
                )}

                {/* 提交按钮 */}
                <div className="flex gap-4 pt-4">
                  <LinkWithParams 
                    href="/agent-store" 
                    className="btn flex-1 h-14 text-base rounded-lg bg-[#1A110A]/50 border-2 border-[#261A10]/50 text-white hover:bg-[#261A10]/70 hover:border-[#FF6B00]/50 transition-all duration-300"
                  >
                    {t("cancel")}
                  </LinkWithParams>
                  <button
                    type="submit"
                    className="btn flex-1 h-14 text-base font-semibold rounded-lg bg-[#FF6B00] hover:bg-[#FF8C00] text-white border-0 transition-all duration-300 transform hover:scale-[1.02] animate-pulse-glow"
                    disabled={isRegistering}
                  >
                    {isRegistering ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        {t("registering")}
                      </>
                    ) : (
                      t("register")
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RegisterAgent;

