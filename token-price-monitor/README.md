# Token Price Monitor Service

这是一个基于 NestJS 的代币价格监控服务，它可以根据用户定义的条件监控价格变化并发送通知。

## 功能特点

- 实时价格监控：通过 SSE 连接实时获取价格数据
- 自定义通知条件：支持用户注册自定义的价格监控条件
- 灵活的通知机制：当满足条件时通过多种方式发送通知
- 可扩展的架构：支持添加新的价格模式和通知方式

## 安装

```bash
npm install
```

## 运行

```bash
# 开发模式
npm run start:dev

# 生产模式
npm run start:prod
```

## API 接口

### 注册通知偏好

```http
POST /notifications
Content-Type: application/json

{
  "userId": "user123",
  "condition": {
    "type": "PRICE_PATTERN",
    "parameters": {
      // 具体的参数
    },
    "description": "当前开盘价低于前一价格柱的开盘价，且当前收盘价高于前一价格柱的收盘价"
  }
}
```

### 获取特定通知偏好

```http
GET /notifications/:id
```

### 获取用户所有通知偏好

```http
GET /notifications/user/:userId
```

## 项目结构

```
src/
  ├── controllers/        # 控制器
  ├── services/          # 服务
  ├── interfaces/        # 接口定义
  ├── dto/              # 数据传输对象
  └── app.module.ts     # 主模块
```

## 技术栈

- NestJS
- TypeScript
- Event Emitter
- Server-Sent Events (SSE)

## 注意事项

1. 确保价格数据源服务（http://localhost:3000/stocks/prices）正在运行

## 思考

- 在生产环境中，建议实现适当的用户认证和授权机制
- 根据实际需求调整通知方式（目前仅实现了控制台日志）
