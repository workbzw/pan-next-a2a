# Dune Analytics 集成指南

本项目已集成 Dune Analytics API，可以在前端展示链上数据分析结果。

## 📋 前置要求

1. **Dune Analytics 账号**
   - 访问 https://dune.com 注册账号
   - 创建查询并获取 Query ID

2. **API Key**
   - 在 Dune 账号设置中生成 API Key
   - 在项目根目录的 `.env` 文件中添加：
     ```bash
     DUNE_API_KEY=your_dune_api_key_here
     ```

## 🚀 快速开始

### 1. 设置环境变量

在 `packages/nextjs/.env` 或项目根目录 `.env` 文件中添加：

```bash
DUNE_API_KEY=your_dune_api_key_here
```

### 2. 访问 Dune 页面

启动开发服务器后，访问：
```
http://localhost:3000/dune
```

### 3. 使用示例

#### 在组件中使用 Hook

```typescript
import { useDuneQuery } from "~~/hooks/useDuneQuery";

function MyComponent() {
  const { data, loading, error, execute } = useDuneQuery({
    queryId: 123456, // 你的 Dune Query ID
    parameters: { param1: "value1" }, // 可选参数
    autoExecute: true, // 是否自动执行
  });

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;
  if (!data) return null;

  return (
    <div>
      {data.result?.rows.map((row, idx) => (
        <div key={idx}>{JSON.stringify(row)}</div>
      ))}
    </div>
  );
}
```

#### 直接调用 API

```typescript
// 执行查询并等待结果
const response = await fetch("/api/dune", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "execute-and-wait",
    queryId: 123456,
    parameters: { param1: "value1" },
  }),
});

const result = await response.json();
console.log(result.result.rows);
```

## 📁 文件结构

```
packages/nextjs/
├── utils/dune/
│   ├── duneClient.ts          # Dune API 客户端
│   └── duneCache.ts           # 数据缓存机制
├── app/api/dune/
│   └── route.ts               # Dune API 代理路由
├── hooks/
│   └── useDuneQuery.ts        # React Hook（支持缓存）
├── components/
│   ├── DuneDashboard.tsx      # 仪表板嵌入组件
│   └── DuneChart.tsx          # 数据可视化组件
└── app/dune/
    └── page.tsx               # Dune 数据展示页面（包含三个标签页）
```

## 🔧 API 参考

### DuneClient 方法

#### `executeQuery(queryId, parameters?)`
执行查询，返回执行 ID。

#### `getQueryResult(executionId)`
获取查询执行状态和结果。

#### `executeQueryAndWait(queryId, parameters?, maxWaitTime?, pollInterval?)`
执行查询并等待结果完成（自动轮询）。

#### `getQueryResultCSV(executionId)`
获取查询结果的 CSV 格式。

### API 路由

#### `POST /api/dune`
执行 Dune 查询。

**请求体：**
```json
{
  "action": "execute" | "execute-and-wait",
  "queryId": 123456,
  "parameters": { "param1": "value1" },
  "maxWaitTime": 60000,
  "pollInterval": 2000
}
```

#### `GET /api/dune?action=status&executionId=xxx`
获取查询执行状态。

#### `GET /api/dune?action=csv&executionId=xxx`
获取查询结果的 CSV 格式。

## 🆕 新增功能

### 1. **嵌入 Dune 仪表板**

使用 `DuneDashboard` 组件直接嵌入 Dune 上的仪表板：

```typescript
import { DuneDashboard } from "~~/components/DuneDashboard";

<DuneDashboard
  dashboardId={123456}
  height={800}
  autoRefresh={true}
  refreshInterval={300}
/>
```

### 2. **数据缓存机制**

自动缓存查询结果，避免频繁调用 API：

```typescript
const { data } = useDuneQuery({
  queryId: 123456,
  useCache: true,        // 启用缓存（默认）
  cacheTTL: 300000,      // 缓存时间 5 分钟
  autoExecute: true,
});
```

### 3. **数据可视化组件**

使用 `DuneChart` 组件快速创建图表：

```typescript
import { DuneChart } from "~~/components/DuneChart";

// 数字显示
<DuneChart
  queryId={123456}
  chartType="number"
  columns={{ value: "total", label: "label" }}
  title="总交易数"
/>

// 条形图
<DuneChart
  queryId={123456}
  chartType="bar"
  columns={{ x: "date", y: "value" }}
  title="每日交易量"
/>

// 折线图
<DuneChart
  queryId={123456}
  chartType="line"
  columns={{ x: "date", y: "value" }}
  title="价格趋势"
/>

// 饼图
<DuneChart
  queryId={123456}
  chartType="pie"
  columns={{ label: "category", value: "amount" }}
  title="分类占比"
/>
```

## 💡 使用场景

### 1. 显示项目统计数据

```typescript
// 查询总交易数、总收入等（带缓存）
const { data } = useDuneQuery({
  queryId: 123456,
  autoExecute: true,
  useCache: true,  // 使用缓存，减少 API 调用
});
```

### 2. 实时监控链上活动

```typescript
// 定期刷新数据
const { data, refetch } = useDuneQuery({
  queryId: 123456,
  autoExecute: true,
  useCache: false,  // 实时数据不使用缓存
});

useEffect(() => {
  const interval = setInterval(() => {
    refetch();
  }, 60000); // 每分钟刷新

  return () => clearInterval(interval);
}, [refetch]);
```

### 3. 用户数据分析

```typescript
// 根据用户地址查询数据
const { data } = useDuneQuery({
  queryId: 123456,
  parameters: { userAddress: address },
  autoExecute: !!address,
  useCache: true,
});
```

### 4. 嵌入完整仪表板

```typescript
// 在页面中嵌入 Dune 仪表板
<DuneDashboard
  dashboardId={123456}
  height={800}
  autoRefresh={true}
  refreshInterval={300}
/>
```

## 📊 创建 Dune 查询示例

### 查询 PaymentSBT 合约的总交易数

```sql
SELECT 
  COUNT(*) as total_transactions,
  SUM(amount) as total_amount,
  COUNT(DISTINCT payer) as unique_payers
FROM ethereum.transactions
WHERE to = '0xa80447C2B2e958ae12105dba4BE9095557d1CC90'
  AND block_time >= NOW() - INTERVAL '30' DAY
```

### 查询每日注册数

```sql
SELECT 
  DATE(block_time) as date,
  COUNT(*) as registrations
FROM ethereum.transactions
WHERE to = '0xcb44Aa73A739de6E0cD805e0a18AC086B658FA41'
  AND function_name = 'registerAgent'
GROUP BY DATE(block_time)
ORDER BY date DESC
```

## ⚠️ 注意事项

1. **API Key 安全**
   - 永远不要在前端代码中暴露 API Key
   - API Key 应该只在服务器端使用（通过 API 路由）

2. **查询限制**
   - Dune API 有速率限制
   - 建议缓存查询结果，避免频繁调用

3. **错误处理**
   - 始终处理可能的错误情况
   - 查询可能需要一些时间才能完成

4. **数据格式**
   - Dune 返回的数据格式可能因查询而异
   - 建议在前端进行数据验证和格式化

## 🔗 相关链接

- [Dune Analytics 官网](https://dune.com)
- [Dune API 文档](https://docs.dune.com/api-reference)
- [Dune 查询示例](https://dune.com/browse/queries)

