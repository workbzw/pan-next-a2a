# Dune Analytics Query ID 获取指南

## 📍 如何获取 Query ID

### 步骤 1: 访问 Dune Analytics

1. 打开浏览器，访问 [https://dune.com](https://dune.com)
2. 注册或登录你的账号

### 步骤 2: 创建新查询

1. 登录后，点击页面右上角的 **"New Query"** 或 **"Create"** 按钮
2. 选择你要查询的区块链网络（例如：BNB Chain / BSC）

### 步骤 3: 编写 SQL 查询

在查询编辑器中编写 SQL 查询语句。以下是三个统计数据的查询示例：

#### 1. 登入钱包数（唯一钱包地址数量）

```sql
-- 查询连接到合约的唯一钱包地址数量
SELECT 
  COUNT(DISTINCT "from") as count
FROM bsc.transactions
WHERE "to" = 'YOUR_CONTRACT_ADDRESS'  -- 替换为你的合约地址
  AND block_time >= NOW() - INTERVAL '30' DAY
```

或者查询所有与你的应用交互的唯一地址：

```sql
SELECT 
  COUNT(DISTINCT "from") as count
FROM bsc.transactions
WHERE (
  "to" = 'YOUR_AGENT_STORE_CONTRACT'  -- AgentStore 合约地址
  OR "to" = 'YOUR_PAYMENT_SBT_CONTRACT'  -- PaymentSBT 合约地址
)
  AND block_time >= NOW() - INTERVAL '30' DAY
```

#### 2. 支付次数（总交易数）

```sql
-- 查询支付交易的总次数
SELECT 
  COUNT(*) as count
FROM bsc.transactions
WHERE "to" = 'YOUR_PAYMENT_CONTRACT_ADDRESS'  -- 替换为支付合约地址
  AND block_time >= NOW() - INTERVAL '30' DAY
  AND value > 0  -- 只统计有金额的交易
```

#### 3. 支付金额总数

```sql
-- 查询总支付金额（BNB）
SELECT 
  SUM(value) / 1e18 as total_amount  -- 转换为 BNB 单位
FROM bsc.transactions
WHERE "to" = 'YOUR_PAYMENT_CONTRACT_ADDRESS'  -- 替换为支付合约地址
  AND block_time >= NOW() - INTERVAL '30' DAY
  AND value > 0
```

### 步骤 4: 获取 Query ID

1. 编写完 SQL 查询后，点击右上角的 **"Run"** 或 **"Execute"** 按钮执行查询
2. 查询执行成功后，查看浏览器地址栏
3. URL 格式类似：`https://dune.com/queries/1234567`
4. **Query ID 就是 URL 中的数字部分**（例如：`1234567`）

### 步骤 5: 配置到项目中

将获取到的 Query ID 添加到 `.env` 文件中：

```env
# Dune Analytics 统计数据 Query IDs
NEXT_PUBLIC_DUNE_QUERY_UNIQUE_WALLETS=1234567
NEXT_PUBLIC_DUNE_QUERY_PAYMENT_COUNT=1234568
NEXT_PUBLIC_DUNE_QUERY_TOTAL_PAYMENT=1234569
```

## 🔍 查找合约地址

如果你需要查询特定合约的数据，可以在以下位置找到合约地址：

### AgentStore 合约地址
- 部署后会在控制台输出
- 或在 `packages/hardhat/broadcast/` 目录下的部署记录中查找

### PaymentSBT 合约地址
- 同样在部署记录中查找
- 或在区块链浏览器（如 BscScan）上搜索合约名称

## 📝 查询结果格式要求

为了确保统计数据正确显示，你的 Dune 查询需要返回以下格式：

### 登入钱包数和支付次数
查询应该返回一个包含 `count` 列的结果：

```sql
SELECT COUNT(*) as count FROM ...
```

结果示例：
```
count
-----
1234
```

### 支付金额总数
查询应该返回一个包含 `total_amount` 列的结果：

```sql
SELECT SUM(value) / 1e18 as total_amount FROM ...
```

结果示例：
```
total_amount
------------
567.89
```

## 🎯 完整示例查询

### 示例 1: 查询 PAN Network 的唯一用户数

```sql
SELECT 
  COUNT(DISTINCT "from") as count
FROM bsc.transactions
WHERE (
  "to" = '0xYOUR_AGENT_STORE_ADDRESS'  -- AgentStore 合约
  OR "to" = '0xYOUR_PAYMENT_SBT_ADDRESS'  -- PaymentSBT 合约
)
  AND block_time >= NOW() - INTERVAL '90' DAY
```

### 示例 2: 查询总支付次数

```sql
SELECT 
  COUNT(*) as count
FROM bsc.transactions
WHERE "to" = '0xYOUR_PAYMENT_CONTRACT_ADDRESS'
  AND value > 0
  AND block_time >= NOW() - INTERVAL '90' DAY
```

### 示例 3: 查询总支付金额（BNB）

```sql
SELECT 
  SUM(value) / 1e18 as total_amount
FROM bsc.transactions
WHERE "to" = '0xYOUR_PAYMENT_CONTRACT_ADDRESS'
  AND value > 0
  AND block_time >= NOW() - INTERVAL '90' DAY
```

## ⚠️ 注意事项

1. **列名必须匹配**：
   - 登入钱包数和支付次数：列名必须是 `count`
   - 支付金额总数：列名必须是 `total_amount`

2. **如果列名不同**：
   - 可以在代码中修改 `columns` 配置
   - 或使用 SQL 的 `AS` 关键字重命名列

3. **数据单位**：
   - 支付金额建议以 BNB 为单位（除以 1e18）
   - 确保数值格式正确

4. **查询性能**：
   - 避免查询过大的时间范围
   - 建议使用索引字段（如 `block_time`）

## 🔗 相关资源

- [Dune Analytics 官网](https://dune.com)
- [Dune SQL 文档](https://docs.dune.com/queries/dune-sql)
- [Dune 查询示例库](https://dune.com/browse/queries)
- [BSC 数据表文档](https://docs.dune.com/data-tables/blockchain/bnb-chain)

