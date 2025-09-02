# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个Obsidian插件（obsidian-simple-ai），类似Notion AI的简单文本编辑助手。该插件提供了基于AI模板的文本处理功能，支持文本扩写、改写、翻译等操作，并具有浮动按钮和内联差异显示功能。

## 开发环境设置

### 环境要求
- Node.js 16+
- TypeScript 4.7.4
- React 18.2.0

### 包管理器命令
```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 构建生产版本
npm run build

# 版本管理
npm run version
```

## 项目架构

### 核心文件结构
```
├── main.ts                           # 插件主入口文件
├── src/
│   ├── types.ts                      # TypeScript类型定义和默认模板
│   ├── api.ts                        # OpenAI API兼容接口
│   ├── settings.ts                   # 插件设置页面
│   ├── view.tsx                      # 主视图组件
│   ├── FloatingAIManager.ts          # 浮动AI按钮管理器
│   ├── InlineDiffManager.ts          # 内联差异管理器
│   └── components/
│       ├── FloatingAIButton.tsx      # 浮动AI按钮组件
│       ├── InlineDiff.tsx            # 内联差异显示组件
│       └── TypewriterDisplay.tsx     # 打字机效果显示组件
├── styles.css                        # 主样式文件
├── esbuild.config.mjs                # 构建配置
├── tsconfig.json                     # TypeScript配置
└── manifest.json                     # Obsidian插件清单
```

### 架构模式
- **主插件类**: `SimpleAIPlugin` - 管理插件生命周期、命令和事件
- **API层**: `api.ts` - 处理与AI服务的通信，兼容OpenAI格式
- **设置管理**: `SimpleAISettingTab` - 插件配置界面
- **浮动管理**: `FloatingAIManager` - 管理文本选择时的浮动AI按钮
- **差异管理**: `InlineDiffManager` - 管理内联文本差异显示和应用
- **UI组件**: 基于React构建的组件系统
- **类型系统**: 完整的TypeScript类型定义

### AI功能模块
插件基于模板系统，默认支持以下AI模板：
- `expand` - 扩写：添加更多细节、例子和解释
- `rewrite` - 改写：保持原意不变，使用不同表达方式
- `translate` - 翻译：将文本翻译成英语

### 核心功能特性
- **浮动AI按钮**: 选择文本时自动显示AI操作按钮
- **内联差异显示**: 以差异格式显示AI处理结果
- **打字机效果**: AI响应时的动画显示效果
- **模板系统**: 可自定义的AI处理模板
- **实时预览**: 支持接受或拒绝AI建议

## 构建系统

项目使用esbuild进行快速构建：
- 开发模式：`npm run dev`（启用监听和内联源码映射）
- 生产模式：`npm run build`（包含TypeScript类型检查）
- 输出文件：`main.js`
- 支持React JSX自动转换

## 开发指南

### 添加新的AI模板
1. 在 `src/types.ts` 中的 `DEFAULT_TEMPLATES` 数组中添加新模板
2. 设置模板的 `id`、`name`、`prompt`、`icon` 和 `enabled` 属性
3. 模板会自动显示在浮动按钮菜单中

### 修改设置选项
1. 更新 `src/types.ts` 中的 `SimpleAISettings` 接口
2. 修改 `DEFAULT_SETTINGS` 常量
3. 在 `src/settings.ts` 中添加对应的UI控件

### 添加新的UI组件
1. 在 `src/components/` 目录下创建新的 `.tsx` 文件
2. 使用React函数式组件和TypeScript类型
3. 遵循现有组件的命名和结构规范

### 样式修改
- 主样式文件：`styles.css`
- 使用Obsidian的CSS变量系统保持主题一致性
- 支持浮动按钮、差异显示、打字机效果等专用样式

### 管理器扩展
- **FloatingAIManager**: 负责浮动按钮的显示和隐藏逻辑
- **InlineDiffManager**: 负责差异显示的创建、更新和删除

## 重要注意事项

- 项目使用简体中文作为主要语言
- API兼容OpenAI格式，但支持自定义baseUrl
- 构建时会进行TypeScript类型检查
- React组件使用函数式组件和Hooks模式
- 遵循Obsidian插件开发规范和安全要求
- 插件ID为 `simple-ai`，显示名称为 `Simple AI`
- 支持桌面和移动端使用（`isDesktopOnly: false`）
- 最低支持Obsidian版本：0.15.0

## 技术特色

- **流式处理**: 支持AI响应的流式显示
- **用户体验**: 优雅的动画效果和交互反馈
- **扩展性**: 基于模板的架构便于功能扩展
- **兼容性**: 广泛兼容各种OpenAI格式的AI服务