# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个Obsidian插件（obsidian-simple-ai），类似Notion AI的简单文本编辑助手。该插件提供了基本的AI文本处理功能，如文本改进、缩短、扩展、翻译和总结。

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
├── main.ts                    # 插件主入口文件
├── src/
│   ├── types.ts               # TypeScript类型定义
│   ├── api.ts                 # OpenAI API兼容接口
│   ├── settings.ts            # 插件设置页面
│   ├── modal.tsx              # 主要模态框组件
│   └── components/
│       └── AIAssistantModal.tsx  # AI助手界面组件
├── esbuild.config.mjs         # 构建配置
├── tsconfig.json              # TypeScript配置
└── manifest.json              # Obsidian插件清单
```

### 架构模式
- **主插件类**: `SimpleAIPlugin` - 管理插件生命周期、命令和事件
- **API层**: `OpenAIAPI` - 处理与AI服务的通信，兼容OpenAI格式
- **设置管理**: `SimpleAISettingTab` - 插件配置界面
- **UI组件**: 基于React构建的模态框界面
- **类型系统**: 完整的TypeScript类型定义

### AI功能模块
插件支持以下AI操作类型：
- `improve` - 改进文本
- `shorten` - 缩短文本  
- `expand` - 扩展文本
- `translate` - 翻译文本
- `summarize` - 总结文本
- `custom` - 自定义处理

## 构建系统

项目使用esbuild进行快速构建：
- 开发模式：`npm run dev`（启用监听和内联源码映射）
- 生产模式：`npm run build`（包含TypeScript类型检查）
- 输出文件：`main.js`
- 支持React JSX自动转换

## 开发指南

### 添加新的AI功能
1. 在 `src/types.ts` 中扩展 `AIAction` 类型
2. 在 `src/api.ts` 中添加对应的方法
3. 在UI组件中添加相应的按钮和处理逻辑

### 修改设置选项
1. 更新 `src/types.ts` 中的 `SimpleAISettings` 接口
2. 修改 `DEFAULT_SETTINGS` 常量
3. 在 `src/settings.ts` 中添加对应的UI控件

### 样式修改
- 主样式文件：`styles.css`
- 使用Obsidian的CSS变量系统保持主题一致性

## 重要注意事项

- 项目使用简体中文作为主要语言
- API兼容OpenAI格式，但支持自定义baseUrl
- 构建时会进行TypeScript类型检查
- React组件使用函数式组件和Hooks模式
- 遵循Obsidian插件开发规范和安全要求