# Token Price Monitor System

这是一个基于自然语言的代币价格监控系统，包含三个子项目：

## 开发环境

- 操作系统：macOS
- Node.js：v20.18.1
- npm：10.8.2

## 项目结构

- `nest-gbm-stock`: 价格生成服务，模拟生成 BTC/USD 的价格数据
- `token-price-monitor`: 价格监控服务，处理自然语言意图并监控价格变化
- `ai-chat`: Web 前端界面，提供聊天式的价格监控配置界面

## 安装和运行

### 1. 价格生成服务 (nest-gbm-stock)

```bash
cd nest-gbm-stock
npm install
npm run start
```

服务将在 http://localhost:3001 启动，提供模拟的价格数据流。

### 2. 价格监控服务 (token-price-monitor)

```bash
cd token-price-monitor
npm install
npm run start
```

服务将在 http://localhost:3000 启动，提供以下功能：

- 自然语言意图解析
- 价格监控
- WebSocket 实时通知

### 3. Web 前端界面 (ai-chat)

```bash
cd ai-chat
npm install
npm run dev
```

应用将在 http://localhost:5173 启动（会自动打开浏览器），提供以下功能：

- 聊天式界面
- 自然语言价格监控配置
- 实时价格通知显示

## 使用

1. 直接访问 http://localhost:5173 在聊天框输入内容进行交互。
2. 要测试通知偏好的注册和查询可查看下面的文档，将 `curl xxx` 复制到终端，回车即可。

## API 接口文档

### 价格监控服务 (token-price-monitor) API

#### 1. 注册用户通知偏好

```http
POST /intents
Content-Type: application/json

{
  "userId": "user123",
  "intent": "当价格高于100时通知我"
}
```

curl 示例：

```bash
curl -X POST http://localhost:3000/intents \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "intent": "当价格高于100时通知我"
  }'
```

响应示例：

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user123",
  "condition": {
    "type": "PRICE_PATTERN",
    "parameters": {
      "conditions": [
        {
          "type": "CLOSE",
          "comparison": "HIGHER",
          "target": "FIXED_VALUE",
          "value": 100
        }
      ],
      "operator": "AND",
      "notification": {
        "frequency": "IMMEDIATE"
      }
    },
    "description": "当价格高于100时通知我"
  },
  "createdAt": "2024-03-10T12:00:00.000Z",
  "updatedAt": "2024-03-10T12:00:00.000Z"
}
```

#### 2. 获取用户通知偏好

```http
GET /notifications/user/{userId}
```

curl 示例：

```bash
curl http://localhost:3000/notifications/user/user123
```

响应示例：

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user123",
    "condition": {
      "type": "PRICE_PATTERN",
      "parameters": {
        "conditions": [
          {
            "type": "CLOSE",
            "comparison": "HIGHER",
            "target": "FIXED_VALUE",
            "value": 100
          }
        ],
        "operator": "AND",
        "notification": {
          "frequency": "IMMEDIATE"
        }
      },
      "description": "当价格高于100时通知我"
    },
    "createdAt": "2024-03-10T12:00:00.000Z",
    "updatedAt": "2024-03-10T12:00:00.000Z"
  }
]
```

#### 3. 获取用户特定通知偏号

```http
GET /notifications/{id}
```

curl 示例：

```bash
curl http://localhost:3000/notifications/550e8400-e29b-41d4-a716-446655440000
```

响应示例：与创建监控意图的响应格式相同

## 环境要求

- Node.js >= 18
- npm >= 9

## 注意事项

1. 确保按照顺序启动服务
2. 确保所有必需的端口 (3000, 3001, 5173) 未被占用

## 故障排除

1. 如果遇到端口占用问题：

   ```bash
   # 查找占用端口的进程
   lsof -i :3000
   lsof -i :3001
   lsof -i :5173

   # 终止进程
   kill -9 <进程ID>
   ```

2. 如果遇到 Node.js 版本问题，建议使用 nvm 进行 Node.js 版本管理：

   ```bash
   # 安装指定版本
   nvm install 20.18.1

   # 使用指定版本
   nvm use 20.18.1
   ```
