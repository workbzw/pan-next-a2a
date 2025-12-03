# Dune 数据访问控制配置

## 📋 概述

Dune 数据现在支持基于钱包地址的访问控制，只有授权的地址才能查看数据。

## 🔧 配置方法

### 方法一：使用环境变量（推荐）

在项目根目录或 `packages/nextjs/.env` 文件中添加：

```bash
DUNE_ALLOWED_ADDRESSES=0x1234567890123456789012345678901234567890,0xabcdefabcdefabcdefabcdefabcdefabcdefabcd
```

多个地址用逗号分隔，不区分大小写。

### 方法二：修改代码

编辑 `packages/nextjs/utils/dune/accessControl.ts` 文件，在 `getAllowedAddresses()` 函数中修改默认地址列表：

```typescript
// 默认允许的地址列表
return [
  "0x1234567890123456789012345678901234567890",
  "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
];
```

## 🚀 使用方式

### 1. 在组件中使用访问守卫

```typescript
import { DuneAccessGuard } from "~~/components/DuneAccessGuard";
import { DuneChart } from "~~/components/DuneChart";

<DuneAccessGuard>
  <DuneChart queryId={123456} />
</DuneAccessGuard>
```

### 2. 在 Hook 中自动检查权限

```typescript
import { useDuneQuery } from "~~/hooks/useDuneQuery";
import { useAccount } from "wagmi";

const { address } = useAccount();
const { data, loading, error } = useDuneQuery({
  queryId: 123456,
  address, // 自动检查权限
  autoExecute: true,
});
```

### 3. 手动检查权限

```typescript
import { hasDuneAccess } from "~~/utils/dune/accessControl";
import { useAccount } from "wagmi";

const { address } = useAccount();

if (hasDuneAccess(address)) {
  // 有权限，显示数据
} else {
  // 无权限，显示提示
}
```

## 🔒 权限检查流程

1. **前端检查**：组件和 Hook 会自动检查用户钱包地址
2. **API 检查**：所有 API 请求都会验证地址权限
3. **双重保护**：即使前端被绕过，API 也会拒绝未授权请求

## ⚠️ 注意事项

1. **环境变量优先级**：如果设置了 `DUNE_ALLOWED_ADDRESSES` 环境变量，会优先使用环境变量中的地址
2. **地址格式**：地址会自动转换为小写进行比较，不区分大小写
3. **未配置情况**：如果没有配置任何授权地址，默认拒绝所有访问
4. **安全性**：API Key 仍然只在服务器端使用，不会暴露给前端

## 📝 示例

### 添加单个地址

```bash
DUNE_ALLOWED_ADDRESSES=0x74cC09316deab81EE874839e1DA9E84Ec066369C
```

### 添加多个地址

```bash
DUNE_ALLOWED_ADDRESSES=0x74cC09316deab81EE874839e1DA9E84Ec066369C,0x316fb57Ae002066A406C649c42Ed33d04aC0c8f2,0x1234567890123456789012345678901234567890
```

## 🛠️ 故障排查

### 问题：显示"无权限访问"

1. 检查是否连接了钱包
2. 检查钱包地址是否在授权列表中
3. 检查环境变量是否正确设置
4. 重启开发服务器（环境变量更改后需要重启）

### 问题：环境变量不生效

1. 确认环境变量文件位置正确（项目根目录或 `packages/nextjs/.env`）
2. 确认环境变量名称正确：`DUNE_ALLOWED_ADDRESSES`
3. 确认地址格式正确（以 `0x` 开头，42 个字符）
4. 重启开发服务器

## 🔐 安全建议

1. **生产环境**：使用环境变量配置，不要硬编码地址
2. **定期审查**：定期检查授权地址列表
3. **最小权限**：只授权必要的地址
4. **日志记录**：考虑添加访问日志记录（可选）

