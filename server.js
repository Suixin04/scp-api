const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const port = process.env.PORT || 3000;

// 中间件配置
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS 支持
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

let scps = {};

// 数据库文件路径 - 支持多个可能的数据库文件
const possibleDbFiles = [
  "../scp-scraper/scp_database_cn.json",
  "../scp-scraper/sample_database.json",
  "database.json"
];

// 加载数据库文件
function loadDatabase() {
  for (const dbFile of possibleDbFiles) {
    const dbPath = path.resolve(__dirname, dbFile);
    if (fs.existsSync(dbPath)) {
      try {
        const data = fs.readFileSync(dbPath, "utf8");
        scps = JSON.parse(data);
        console.log(`成功加载数据库: ${dbPath}`);
        console.log(`加载了 ${Object.keys(scps).length} 个 SCP 条目`);
        return;
      } catch (err) {
        console.error(`解析数据库文件失败 ${dbPath}:`, err.message);
      }
    }
  }
  console.error("未找到可用的数据库文件");
}

// 启动时加载数据库
loadDatabase();

// 获取单个 SCP 条目
app.get("/scp/:id", (req, res) => {
  const scpId = req.params.id;

  // 输入验证
  if (!validateScpId(scpId)) {
    return res.status(400).json({
      error: "无效的 SCP ID 格式",
      message: "SCP ID 必须是数字或 SCP-XXX 格式",
      provided: scpId
    });
  }

  // 支持多种 ID 格式：数字、带前缀的字符串
  let normalizedId = scpId;
  if (scpId.toLowerCase().startsWith('scp-')) {
    normalizedId = scpId.substring(4);
  }
  
  // 尝试不同的键格式
  let scp = scps[normalizedId] || scps[scpId] || scps[`SCP-${normalizedId}`];
  
  if (scp) {
    res.json(scp);
  } else {
    res.status(404).json({ 
      error: "SCP not found",
      requested_id: scpId,
      available_count: Object.keys(scps).length
    });
  }
});

// 获取所有 SCP 条目列表
app.get("/scp", (req, res) => {
  const { limit, offset, series } = req.query;
  
  // 验证分页参数
  const pagination = validatePagination(limit, offset);
  
  // 验证系列参数
  if (series && (isNaN(parseInt(series)) || parseInt(series) < 1)) {
    return res.status(400).json({
      error: "无效的系列编号",
      message: "系列编号必须是大于 0 的整数"
    });
  }
  
  let scpList = Object.keys(scps).map(key => ({
    id: scps[key].id || `SCP-${key}`,
    name: scps[key].name || "未知",
    class: scps[key].class || "未分类",
    series: scps[key].series || 1
  }));
  
  // 按系列过滤
  if (series) {
    scpList = scpList.filter(scp => scp.series == parseInt(series));
  }
  
  // 分页
  const total = scpList.length;
  const paginatedList = scpList.slice(pagination.offset, pagination.offset + pagination.limit);
  
  res.json({
    data: paginatedList,
    pagination: {
      total,
      limit: pagination.limit,
      offset: pagination.offset,
      has_more: pagination.offset + pagination.limit < total
    }
  });
});

// 搜索 SCP 条目
app.get("/search", (req, res) => {
  const { q, class: scpClass, series } = req.query;
  
  // 输入验证
  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    return res.status(400).json({ 
      error: "搜索查询参数 'q' 是必需的",
      message: "请提供有效的搜索关键词"
    });
  }
  
  if (q.length > 100) {
    return res.status(400).json({
      error: "搜索查询过长",
      message: "搜索关键词不能超过 100 个字符"
    });
  }
  
  // 验证系列参数
  if (series && (isNaN(parseInt(series)) || parseInt(series) < 1)) {
    return res.status(400).json({
      error: "无效的系列编号",
      message: "系列编号必须是大于 0 的整数"
    });
  }
  
  const results = [];
  const searchTerm = q.toLowerCase().trim();
  
  for (const [key, scp] of Object.entries(scps)) {
    let matches = false;
    
    // 在 ID、名称、描述中搜索
    if (scp.id && scp.id.toLowerCase().includes(searchTerm)) matches = true;
    if (scp.name && scp.name.toLowerCase().includes(searchTerm)) matches = true;
    if (scp.description && scp.description.toLowerCase().includes(searchTerm)) matches = true;
    
    // 按分级过滤
    if (scpClass && scp.class && scp.class.toLowerCase() !== scpClass.toLowerCase()) {
      matches = false;
    }
    
    // 按系列过滤
    if (series && scp.series && scp.series != parseInt(series)) {
      matches = false;
    }
    
    if (matches) {
      results.push({
        id: scp.id || `SCP-${key}`,
        name: scp.name || "未知",
        class: scp.class || "未分类",
        series: scp.series || 1,
        description: scp.description ? scp.description.substring(0, 200) + '...' : "无描述"
      });
    }
  }
  
  res.json({
    query: q,
    results: results.slice(0, 20), // 限制搜索结果数量
    total_found: results.length
  });
});

// 获取统计信息
app.get("/stats", (req, res) => {
  const stats = {
    total_scps: Object.keys(scps).length,
    by_class: {},
    by_series: {}
  };
  
  for (const scp of Object.values(scps)) {
    // 按分级统计
    const scpClass = scp.class || "未分类";
    stats.by_class[scpClass] = (stats.by_class[scpClass] || 0) + 1;
    
    // 按系列统计
    const series = scp.series || 1;
    stats.by_series[series] = (stats.by_series[series] || 0) + 1;
  }
  
  res.json(stats);
});

// 获取 SCP 图片
app.get("/scp/:id/images", (req, res) => {
  const scpId = req.params.id;
  
  // 输入验证
  if (!validateScpId(scpId)) {
    return res.status(400).json({
      error: "无效的 SCP ID 格式",
      message: "SCP ID 必须是数字或 SCP-XXX 格式",
      provided: scpId
    });
  }
  
  let normalizedId = scpId;
  if (scpId.toLowerCase().startsWith('scp-')) {
    normalizedId = scpId.substring(4);
  }
  
  const scp = scps[normalizedId] || scps[scpId] || scps[`SCP-${normalizedId}`];
  
  if (!scp) {
    return res.status(404).json({ error: "SCP not found" });
  }
  
  res.json({
    id: scp.id || `SCP-${normalizedId}`,
    images: scp.images || [],
    image_count: (scp.images || []).length
  });
});

// 获取 SCP 标签
app.get("/scp/:id/tags", (req, res) => {
  const scpId = req.params.id;
  
  // 输入验证
  if (!validateScpId(scpId)) {
    return res.status(400).json({
      error: "无效的 SCP ID 格式",
      message: "SCP ID 必须是数字或 SCP-XXX 格式",
      provided: scpId
    });
  }
  
  let normalizedId = scpId;
  if (scpId.toLowerCase().startsWith('scp-')) {
    normalizedId = scpId.substring(4);
  }
  
  const scp = scps[normalizedId] || scps[scpId] || scps[`SCP-${normalizedId}`];
  
  if (!scp) {
    return res.status(404).json({ error: "SCP not found" });
  }
  
  res.json({
    id: scp.id || `SCP-${normalizedId}`,
    tags: scp.tags || [],
    tag_count: (scp.tags || []).length
  });
});

// 按标签搜索 SCP
app.get("/tags/:tag", (req, res) => {
  const tag = req.params.tag;
  const { limit, offset } = req.query;
  
  // 输入验证
  if (!tag || typeof tag !== 'string' || tag.trim().length === 0) {
    return res.status(400).json({
      error: "无效的标签",
      message: "标签不能为空"
    });
  }
  
  if (tag.length > 50) {
    return res.status(400).json({
      error: "标签过长",
      message: "标签长度不能超过 50 个字符"
    });
  }
  
  // 验证分页参数
  const pagination = validatePagination(limit, offset);
  
  const results = [];
  const normalizedTag = tag.toLowerCase();
  
  for (const [key, scp] of Object.entries(scps)) {
    if (scp.tags && scp.tags.some(t => t.toLowerCase().includes(normalizedTag))) {
      results.push({
        id: scp.id || `SCP-${key}`,
        name: scp.name || "未知",
        class: scp.class || "未分类",
        series: scp.series || 1,
        tags: scp.tags
      });
    }
  }
  
  const total = results.length;
  const paginatedResults = results.slice(pagination.offset, pagination.offset + pagination.limit);
  
  res.json({
    tag: req.params.tag,
    results: paginatedResults,
    pagination: {
      total,
      limit: pagination.limit,
      offset: pagination.offset,
      has_more: pagination.offset + pagination.limit < total
    }
  });
});

// 获取所有可用标签
app.get("/tags", (req, res) => {
  const tagCounts = {};
  
  for (const scp of Object.values(scps)) {
    if (scp.tags) {
      for (const tag of scp.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
  }
  
  const sortedTags = Object.entries(tagCounts)
    .sort(([,a], [,b]) => b - a)
    .map(([tag, count]) => ({ tag, count }));
  
  res.json({
    total_unique_tags: sortedTags.length,
    tags: sortedTags
  });
});

// 获取系列信息
app.get("/series/:number", (req, res) => {
  const seriesNumber = parseInt(req.params.number);
  
  // 输入验证
  if (isNaN(seriesNumber) || seriesNumber < 1 || seriesNumber > 9) {
    return res.status(400).json({ 
      error: "无效的系列编号",
      message: "系列编号必须是 1-9 之间的整数"
    });
  }
  
  const seriesScps = [];
  
  for (const [key, scp] of Object.entries(scps)) {
    if (scp.series === seriesNumber) {
      seriesScps.push({
        id: scp.id || `SCP-${key}`,
        name: scp.name || "未知",
        class: scp.class || "未分类"
      });
    }
  }
  
  res.json({
    series: seriesNumber,
    count: seriesScps.length,
    scps: seriesScps
  });
});

// 健康检查端点
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    database_loaded: Object.keys(scps).length > 0,
    total_entries: Object.keys(scps).length,
    timestamp: new Date().toISOString()
  });
});

// 输入验证辅助函数
function validateScpId(id) {
  if (!id) return false;
  // 支持数字、SCP-XXX 格式
  return /^\d+$/.test(id) || /^scp-\d+$/i.test(id);
}

function validatePagination(limit, offset) {
  const parsedLimit = parseInt(limit);
  const parsedOffset = parseInt(offset);
  
  return {
    limit: Math.min(Math.max(parsedLimit || 50, 1), 100), // 限制在 1-100 之间
    offset: Math.max(parsedOffset || 0, 0)
  };
}

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'API 端点未找到',
    message: `路径 ${req.originalUrl} 不存在`,
    available_endpoints: [
      'GET /health',
      'GET /scp',
      'GET /scp/:id',
      'GET /scp/:id/images',
      'GET /scp/:id/tags',
      'GET /search',
      'GET /stats',
      'GET /tags',
      'GET /tags/:tag',
      'GET /series/:number'
    ]
  });
});

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  
  // 语法错误（如无效的 JSON）
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: '请求格式错误',
      message: '无效的 JSON 格式'
    });
  }
  
  // 默认服务器错误
  res.status(500).json({
    error: '内部服务器错误',
    message: '服务器遇到了一个错误，请稍后重试',
    timestamp: new Date().toISOString()
  });
});

// 优雅关闭处理
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在优雅关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，正在优雅关闭服务器...');
  process.exit(0);
});

// 启动服务器
app.listen(port, () => {
  console.log(`SCP API 服务器运行在端口 ${port}`);
  console.log(`访问 http://localhost:${port}/health 检查服务状态`);
  console.log(`访问 http://localhost:${port}/scp 获取 SCP 列表`);
  console.log(`数据库状态: ${Object.keys(scps).length > 0 ? '已加载' : '未加载'}`);
});
