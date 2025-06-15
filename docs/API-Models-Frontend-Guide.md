# BrainyAI API模型前端功能指南

## 🎯 功能概述

BrainyAI现在支持API模式的AI模型配置，允许用户添加和管理OpenAI、Claude、Gemini等提供商的API模型，并支持MCP工具调用功能。

## 📱 主要组件

### 1. ModelConfigManager (模型配置管理器)
- **位置**: `libs/chatbot/ModelConfigManager.ts`
- **功能**: 管理API模型配置的增删改查
- **特性**:
  - 本地存储配置信息
  - 配置验证和错误处理
  - 支持多种提供商
  - 预设模板功能

### 2. APIModelProvider (API模型状态管理)
- **位置**: `provider/APIModelProvider.tsx`
- **功能**: 统一管理API模型的状态和选择
- **特性**:
  - 配置加载和缓存
  - 模型选择状态管理
  - Bot实例创建
  - 错误处理

### 3. AddModelConfigForm (添加/编辑模型表单)
- **位置**: `component/AddModelConfigForm.tsx`
- **功能**: 提供完整的模型配置表单
- **特性**:
  - 分标签页设计（基础配置、高级设置、预设模板）
  - 实时验证
  - 连接测试
  - 预设模板快速配置

### 4. ModelCheckList (模型选择列表)
- **位置**: `component/ModelCheckList.tsx`
- **功能**: 扩展现有模型选择界面，支持API模型
- **特性**:
  - Web模型和API模型统一显示
  - 模型状态指示
  - 快速操作按钮

### 5. APIModelIndicator (API模型状态指示器)
- **位置**: `component/APIModelIndicator.tsx`
- **功能**: 显示当前选中的API模型状态
- **特性**:
  - 紧凑和详细两种显示模式
  - MCP工具状态指示
  - 模型信息Tooltip

### 6. QuickAddAPIModel (快速添加API模型)
- **位置**: `component/QuickAddAPIModel.tsx`
- **功能**: 提供常用模型的快速配置
- **特性**:
  - 预设模板下拉菜单
  - 简化配置流程
  - 支持自定义模型

### 7. APIModelManagement (API模型管理页面)
- **位置**: `component/APIModelManagement.tsx`
- **功能**: 完整的API模型管理界面
- **特性**:
  - 表格形式展示所有配置
  - 搜索和过滤功能
  - 批量操作
  - 连接测试

## 🚀 使用方法

### 添加API模型

#### 方法1: 快速添加
1. 点击"Quick Add API Model"按钮
2. 选择预设模板（GPT-4、GPT-3.5 Turbo、Claude 3 Haiku等）
3. 填写API Key和其他必要信息
4. 点击"Add Model"完成添加

#### 方法2: 完整配置
1. 在模型选择界面点击"添加"按钮
2. 在"基础配置"标签页填写基本信息
3. 在"高级设置"标签页调整参数
4. 可选择"预设模板"快速填充
5. 测试连接后保存

### 管理API模型

1. 访问API模型管理页面
2. 使用搜索和过滤功能查找模型
3. 通过表格操作编辑、删除或测试模型
4. 使用开关控制模型的选择状态

### 在聊天中使用

1. 在模型选择界面选择API模型
2. 聊天界面会显示API模型状态指示器
3. 支持MCP工具的模型会显示工具状态
4. 享受更强大的AI对话和工具调用功能

## 🔧 技术特性

### 配置存储
- 使用Plasmo Storage进行本地存储
- 支持配置的导入导出
- 自动备份和恢复

### 安全性
- API Key本地加密存储
- 连接测试验证
- 错误处理和降级

### 用户体验
- 响应式设计
- 实时状态更新
- 友好的错误提示
- 快捷操作支持

### MCP工具集成
- 自动检测工具支持
- 工具状态实时显示
- 工具调用过程可视化

## 📋 配置示例

### OpenAI GPT-4配置
```json
{
  "name": "My GPT-4",
  "provider": "openai",
  "mode": "api",
  "model": "gpt-4",
  "apiKey": "sk-...",
  "baseUrl": "https://api.openai.com/v1",
  "maxTokens": 8000,
  "temperature": 0.7,
  "supportsMCP": true,
  "description": "OpenAI GPT-4 with MCP tools"
}
```

### Claude 3 Haiku配置
```json
{
  "name": "Claude 3 Haiku",
  "provider": "claude",
  "mode": "api",
  "model": "claude-3-haiku-20240307",
  "apiKey": "sk-ant-...",
  "baseUrl": "https://api.anthropic.com",
  "maxTokens": 4000,
  "temperature": 0.7,
  "supportsMCP": true,
  "description": "Anthropic Claude 3 Haiku"
}
```

## 🎨 界面截图说明

### 模型选择界面
- 显示Web模型和API模型
- API模型带有特殊标识
- 支持MCP的模型显示工具图标

### 添加模型表单
- 三个标签页：基础配置、高级设置、预设模板
- 实时验证和错误提示
- 连接测试功能

### 管理界面
- 表格形式展示所有配置
- 搜索、过滤、排序功能
- 批量操作和状态管理

## 🔍 故障排除

### 常见问题

1. **API Key无效**
   - 检查API Key格式
   - 确认API Key权限
   - 使用连接测试验证

2. **连接失败**
   - 检查网络连接
   - 验证Base URL设置
   - 确认防火墙设置

3. **MCP工具不可用**
   - 确认模型支持工具调用
   - 检查MCP服务器状态
   - 查看工具配置

### 调试信息
- 查看浏览器控制台日志
- 检查网络请求状态
- 使用开发者工具调试

## 📚 开发指南

### 扩展新的提供商

1. 在`ModelConfigManager`中添加新的provider类型
2. 创建对应的APIBot实现
3. 更新工厂函数支持新provider
4. 添加预设模板和UI支持

### 自定义组件

所有组件都支持className和其他props传递，可以轻松集成到现有界面中。

### 状态管理

使用`useAPIModel` Hook访问API模型状态：

```typescript
import { useAPIModel } from '~provider/APIModelProvider';

const MyComponent = () => {
  const {
    apiConfigs,
    selectedConfigs,
    selectConfig,
    unselectConfig,
    isConfigSelected
  } = useAPIModel();

  // 使用状态...
};
```

## 🎯 下一步计划

1. **更多提供商支持**: 添加更多AI提供商
2. **批量操作**: 支持批量导入导出配置
3. **使用统计**: 添加API使用量统计
4. **成本控制**: 实现API成本监控
5. **团队共享**: 支持配置的团队共享

---

**文档版本**: v1.0
**最后更新**: 2025-01-15
**状态**: 已完成前端实现
