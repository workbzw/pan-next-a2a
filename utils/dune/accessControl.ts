/**
 * Dune 数据访问控制
 * 基于钱包地址的权限管理
 */

/**
 * 授权访问的地址列表
 * 可以通过环境变量配置，格式：NEXT_PUBLIC_DUNE_ALLOWED_ADDRESSES=0x123...,0x456...
 * 注意：客户端组件需要使用 NEXT_PUBLIC_ 前缀
 */
const getAllowedAddresses = (): string[] => {
  // 客户端使用 NEXT_PUBLIC_ 前缀，服务端可以使用普通环境变量
  const envAddresses = typeof window !== "undefined" 
    ? process.env.NEXT_PUBLIC_DUNE_ALLOWED_ADDRESSES
    : process.env.DUNE_ALLOWED_ADDRESSES || process.env.NEXT_PUBLIC_DUNE_ALLOWED_ADDRESSES;
    
  if (envAddresses) {
    return envAddresses.split(",").map(addr => addr.trim().toLowerCase());
  }
  
  // 默认允许的地址列表（如果没有配置环境变量）
  // 可以在代码中硬编码，或者从数据库/配置文件读取
  return [];
};

/**
 * 检查地址是否有权限访问 Dune 数据
 * @param address 钱包地址
 * @returns 是否有权限
 */
export function hasDuneAccess(address: string | undefined | null): boolean {
  if (!address) {
    return false;
  }

  const allowedAddresses = getAllowedAddresses();
  
  // 如果没有配置任何地址，默认拒绝访问
  if (allowedAddresses.length === 0) {
    return false;
  }

  return allowedAddresses.includes(address.toLowerCase());
}

/**
 * 获取所有授权地址（仅用于调试/管理）
 */
export function getAllowedAddressesList(): string[] {
  return getAllowedAddresses();
}

