# SCP API v2.0

一个功能完整的 SCP 基金会数据 API 服务器，支持搜索、分页、标签过滤等高级功能。

## 特性

- 🔍 全文搜索功能
- 📄 分页支持
- 🏷️ 标签系统
- 📊 统计信息
- 🖼️ 图片支持
- 🔗 系列分类
- ✅ 输入验证和错误处理
- 🌐 CORS 支持

## 安装和运行

1. 克隆仓库
2. 运行 `npm install` 安装依赖
3. 运行 `npm start` 启动服务器（生产环境）
4. 或运行 `npm run dev` 启动开发服务器（自动重启）
5. 服务器将在 http://localhost:3000 上运行

## API 端点

### 基础端点

#### GET /health
健康检查端点，返回服务状态和数据库信息。

**响应：**
```json
{
  "status": "healthy",
  "database": {
    "loaded": true,
    "path": "../scp-scraper/scp_database_cn.json",
    "entries": 150
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### GET /stats
获取数据库统计信息。

**响应：**
```json
{
  "total_entries": 150,
  "by_class": {
    "Safe": 45,
    "Euclid": 78,
    "Keter": 27
  },
  "by_series": {
    "1": 100,
    "2": 50
  }
}
```

### SCP 条目端点

#### GET /scp/:id
获取指定 ID 的 SCP 条目。

**参数：**
- `id`: SCP 编号（支持格式：173, SCP-173, scp-173）

**示例：**
```
GET /scp/173
GET /scp/SCP-173
```

**响应：**
```json
{
  "id": "SCP-173",
  "name": "雕塑",
  "class": "Euclid",
  "series": 1,
  "containment": "收容程序描述",
  "description": "项目描述",
  "images": ["image1.jpg", "image2.jpg"],
  "tags": ["雕塑", "敌意", "观察"],
  "more_info": {
    "additional_field": "value"
  }
}
```

#### GET /scp
获取 SCP 条目列表，支持分页和系列过滤。

**查询参数：**
- `limit`: 每页条目数（默认：50，最大：100）
- `offset`: 偏移量（默认：0）
- `series`: 系列编号过滤（1-9）

**示例：**
```
GET /scp?limit=20&offset=0
GET /scp?series=1&limit=10
```

**响应：**
```json
{
  "data": [
    {
      "id": "SCP-173",
      "name": "雕塑",
      "class": "Euclid",
      "series": 1
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

#### GET /scp/:id/images
获取指定 SCP 的图片信息。

**响应：**
```json
{
  "id": "SCP-173",
  "images": ["image1.jpg", "image2.jpg"]
}
```

#### GET /scp/:id/tags
获取指定 SCP 的标签信息。

**响应：**
```json
{
  "id": "SCP-173",
  "tags": ["雕塑", "敌意", "观察"]
}
```

### 搜索端点

#### GET /search
搜索 SCP 条目。

**查询参数：**
- `q`: 搜索关键词（必需，最大100字符）
- `class`: 按分级过滤（Safe, Euclid, Keter等）
- `series`: 按系列过滤（1-9）

**示例：**
```
GET /search?q=雕塑
GET /search?q=敌意&class=Euclid
GET /search?q=观察&series=1
```

**响应：**
```json
{
  "query": "雕塑",
  "results": [
    {
      "id": "SCP-173",
      "name": "雕塑",
      "class": "Euclid",
      "series": 1,
      "description": "SCP-173是一个由混凝土和钢筋构成的雕塑..."
    }
  ],
  "total_found": 1
}
```

### 标签端点

#### GET /tags
获取所有可用标签及其使用次数。

**响应：**
```json
{
  "tags": {
    "雕塑": 5,
    "敌意": 23,
    "观察": 15
  },
  "total_tags": 150
}
```

#### GET /tags/:tag
按标签搜索 SCP，支持分页。

**查询参数：**
- `limit`: 每页条目数（默认：20，最大：100）
- `offset`: 偏移量（默认：0）

**示例：**
```
GET /tags/敌意?limit=10
```

**响应：**
```json
{
  "tag": "敌意",
  "data": [
    {
      "id": "SCP-173",
      "name": "雕塑",
      "class": "Euclid",
      "series": 1
    }
  ],
  "pagination": {
    "total": 23,
    "limit": 10,
    "offset": 0,
    "has_more": true
  }
}
```

### 系列端点

#### GET /series/:number
获取指定系列的所有 SCP。

**参数：**
- `number`: 系列编号（1-9）

**示例：**
```
GET /series/1
```

**响应：**
```json
{
  "series": 1,
  "count": 100,
  "data": [
    {
      "id": "SCP-173",
      "name": "雕塑",
      "class": "Euclid",
      "series": 1
    }
  ]
}
```

## 错误处理

API 使用标准 HTTP 状态码：

- `200`: 成功
- `400`: 请求参数错误
- `404`: 资源未找到
- `500`: 服务器内部错误

错误响应格式：
```json
{
  "error": "错误类型",
  "message": "详细错误信息",
  "provided": "用户提供的参数（如适用）"
}
```

## 数据库兼容性

API 自动检测并加载以下数据库文件：
1. `../scp-scraper/scp_database_cn.json`（主数据库）
2. `../scp-scraper/sample_database.json`（示例数据库）
3. `./database.json`（本地数据库）

支持的数据结构：
```json
{
  "173": {
    "id": "SCP-173",
    "name": "雕塑",
    "class": "Euclid",
    "series": 1,
    "containment": "收容程序描述",
    "description": "项目描述",
    "images": ["image1.jpg"],
    "tags": ["雕塑", "敌意"],
    "more_info": {
      "additional_data": "value"
    }
  }
}
```

## 开发

### 依赖
- Node.js >= 14.0.0
- Express.js
- nodemon（开发依赖）

### 脚本
- `npm start`: 启动生产服务器
- `npm run dev`: 启动开发服务器（自动重启）

### 特性
- 自动 CORS 支持
- 请求日志记录
- 优雅关闭
- 全局错误处理
- 输入验证
- 分页支持

## 许可证

MIT License
```
