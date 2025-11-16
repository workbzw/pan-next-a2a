"use client";

import React, { useRef } from "react";
import { LinkWithParams } from "~~/components/LinkWithParams";
import { usePathname } from "next/navigation";
import { hardhat } from "viem/chains";
import { Bars3Icon, BugAntIcon, ShoppingBagIcon } from "@heroicons/react/24/outline";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { LanguageSwitcher } from "~~/components/LanguageSwitcher";
import { useOutsideClick, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { useLanguage } from "~~/utils/i18n/LanguageContext";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

export const HeaderMenuLinks = () => {
  const pathname = usePathname();
  const { t } = useLanguage();

  const menuLinks: HeaderMenuLink[] = [
    {
      label: t("agentStore"),
      href: "/agent-store",
      icon: <ShoppingBagIcon className="h-4 w-4" />,
    },
    {
      label: "Explore",
      href: "/explore",
      icon: <Bars3Icon className="h-4 w-4" />,
    },
    // Debug Contracts - 暂时隐藏，保留代码以便后续恢复
    // {
    //   label: t("debugContracts"),
    //   href: "/debug",
    //   icon: <BugAntIcon className="h-4 w-4" />,
    // },
  ];

  return (
    <>
      {menuLinks.map(({ label, href, icon }) => {
        // 如果路径是 / 或 /agent-store，Agent Store 按钮应该被选中
        const isActive = pathname === href || (href === "/agent-store" && pathname === "/") || (href === "/explore" && pathname === "/explore");
        return (
          <li key={href}>
            <LinkWithParams
              href={href}
              className={`${
                isActive ? "bg-gradient-to-r from-[#FF6B00]/30 to-[#FF8C00]/30 border border-[#FF6B00]/50 text-white" : "text-white/70"
              } hover:bg-gradient-to-r hover:from-[#FF6B00]/20 hover:to-[#FF8C00]/20 hover:text-white py-1.5 px-3 text-sm rounded-lg gap-2 grid grid-flow-col transition-all duration-300`}
            >
              {icon}
              <span>{label}</span>
            </LinkWithParams>
          </li>
        );
      })}
    </>
  );
};

/**
 * Site header
 */
export const Header = () => {
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;

  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(burgerMenuRef, () => {
    burgerMenuRef?.current?.removeAttribute("open");
  });

  return (
    <div className="sticky lg:static top-0 navbar bg-gradient-to-r from-[#1A110A]/95 via-[#261A10]/95 to-[#1A110A]/95 backdrop-blur-xl min-h-0 shrink-0 justify-between z-20 px-0 sm:px-2 border-b border-[#FF6B00]/20 animate-gradient">
      <div className="navbar-start w-auto lg:w-1/2">
        <details className="dropdown" ref={burgerMenuRef}>
          <summary className="ml-1 btn btn-ghost lg:hidden hover:bg-transparent">
            <Bars3Icon className="h-1/2" />
          </summary>
          <ul
            className="menu menu-compact dropdown-content mt-3 p-2 shadow-sm bg-base-100 rounded-box w-52"
            onClick={() => {
              burgerMenuRef?.current?.removeAttribute("open");
            }}
          >
            <HeaderMenuLinks />
          </ul>
        </details>
        <ul className="hidden lg:flex lg:flex-nowrap menu menu-horizontal px-1 gap-2 ml-4">
          <HeaderMenuLinks />
        </ul>
      </div>
      <div className="navbar-end grow mr-4 gap-2">
        <LanguageSwitcher />
        <RainbowKitCustomConnectButton />
        {isLocalNetwork && <FaucetButton />}
      </div>
    </div>
  );
};
