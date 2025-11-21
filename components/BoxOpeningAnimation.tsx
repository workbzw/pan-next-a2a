"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useLanguage } from "~~/utils/i18n/LanguageContext";

type BoxOpeningAnimationProps = {
  isOpen: boolean;
  imageUrl?: string;
  onClose: () => void;
};

export const BoxOpeningAnimation: React.FC<BoxOpeningAnimationProps> = ({
  isOpen,
  imageUrl,
  onClose,
}) => {
  const { t } = useLanguage();
  const [showImage, setShowImage] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // 下载图片功能
  const handleDownload = () => {
    if (!imageUrl) return;
    
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `pandora-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (!isOpen) {
      setShowImage(false);
      setImageLoaded(false);
      return;
    }

    // 如果有图片URL，等待图片加载完成后显示
    if (imageUrl && typeof window !== "undefined") {
      const img = new window.Image();
      img.onload = () => {
        setImageLoaded(true);
        // 图片加载完成后，延迟一点显示图片
        setTimeout(() => {
          setShowImage(true);
        }, 500);
      };
      img.onerror = () => {
        console.error("图片加载失败");
        setImageLoaded(true);
        setShowImage(true);
      };
      img.src = imageUrl;
    } else {
      // 如果没有图片URL，直接显示（只显示盒子颤抖）
      setImageLoaded(true);
    }
  }, [isOpen, imageUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* 旋转的光芒背景 - 太阳光芒效果（只在图片显示后出现） */}
      {showImage && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <div 
            className="animate-rotate-glow relative rounded-full overflow-hidden" 
            style={{ 
              width: "200vw", 
              height: "200vh",
              minWidth: "6000px",
              minHeight: "6000px",
              transformOrigin: "center center" 
            }}
          >
            {/* 单层太阳光芒 - 黄白间隔条状 */}
            <div 
              className="absolute inset-0 opacity-90"
              style={{
                background: "repeating-conic-gradient(from 0deg, rgba(255,237,74,1) 0deg 6deg, rgba(255,255,255,1) 6deg 12deg)"
              }}
            ></div>
          </div>
        </div>
      )}

      {/* 内容区域 */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* 礼盒 */}
        <div 
          className={`relative z-10 ${!showImage ? "animate-shake" : ""}`}
          style={{ transformOrigin: "50% 50%" }}
        >
          <Image
            src="/box-full.png"
            alt="Gift Box"
            width={300}
            height={300}
            className="object-contain"
            priority
          />
        </div>

        {/* 图片展示（盖住礼盒，中心对齐） */}
        {imageUrl && imageLoaded && showImage && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div
              className="animate-image-appear rounded-lg shadow-2xl overflow-hidden"
              style={{
                width: "min(66.67vw, 66.67vh)",
                height: "min(66.67vw, 66.67vh)",
                aspectRatio: "1",
                flexShrink: 0,
              }}
            >
              <img
                src={imageUrl}
                alt="Result Image"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 关闭和下载按钮 */}
      {showImage && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex gap-4">
          <button
            onClick={handleDownload}
            className="px-6 py-3 bg-[#FF6B00]/80 hover:bg-[#FF6B00] text-white rounded-lg font-semibold transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {t("download")}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-[#FF6B00]/80 hover:bg-[#FF6B00] text-white rounded-lg font-semibold transition-all"
          >
            {t("close")}
          </button>
        </div>
      )}
    </div>
  );
};

