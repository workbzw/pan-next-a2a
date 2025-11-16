"use client";

import Link, { LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import { addQueryParams } from "~~/utils/urlParams";
import { useEffect, useState } from "react";
import React from "react";

/**
 * 带查询参数保留的 Link 组件
 * 自动保留当前页面的所有查询参数到目标链接
 */
export const LinkWithParams = React.forwardRef<
  HTMLAnchorElement,
  LinkProps & {
    preserveParams?: boolean;
    className?: string;
    children?: React.ReactNode;
  }
>(({ href, preserveParams = true, ...props }, ref) => {
  const pathname = usePathname();
  const [finalHref, setFinalHref] = useState<string>(href as string);

  useEffect(() => {
    if (preserveParams && typeof window !== "undefined") {
      const hrefWithParams = addQueryParams(href as string, preserveParams);
      setFinalHref(hrefWithParams);
    } else {
      setFinalHref(href as string);
    }
  }, [href, preserveParams, pathname]);

  return <Link href={finalHref} ref={ref} {...props} />;
});

LinkWithParams.displayName = "LinkWithParams";

