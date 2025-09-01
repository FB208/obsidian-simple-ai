import { Editor, MarkdownView, WorkspaceLeaf } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import React from 'react';
import { FloatingAIButton } from './components/FloatingAIButton';
import { AITemplate } from './types';

interface Position {
	x: number;
	y: number;
}

// 浮动AI按钮管理器
export class FloatingAIManager {
	private app: any;
	private container: HTMLElement | null = null;
	private root: Root | null = null;
	private currentEditor: Editor | null = null;
	private selectionTimeout: NodeJS.Timeout | null = null;
	private isVisible = false;
	private position: Position = { x: 0, y: 0 };
	private templates: AITemplate[] = [];
	private onTemplateSelect: (template: AITemplate, selectedText: string) => void;

	constructor(
		app: any, 
		templates: AITemplate[],
		onTemplateSelect: (template: AITemplate, selectedText: string) => void
	) {
		this.app = app;
		this.templates = templates;
		this.onTemplateSelect = onTemplateSelect;
		this.init();
	}

	private init() {
		// 创建浮动按钮容器
		this.container = document.createElement('div');
		this.container.id = 'floating-ai-container';
		this.container.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			pointer-events: none;
			z-index: 10000;
		`;
		document.body.appendChild(this.container);

		// 创建React根节点
		this.root = createRoot(this.container);

		// 监听工作区变化
		this.app.workspace.on('active-leaf-change', this.handleLeafChange.bind(this));
		
		// 监听全局选择变化
		document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));
		
		// 监听滚动事件
		document.addEventListener('scroll', this.handleScroll.bind(this), true);
		
		// 监听窗口调整大小
		window.addEventListener('resize', this.handleResize.bind(this));
	}

	// 处理工作区叶子变化
	private handleLeafChange(leaf: WorkspaceLeaf | null) {
		if (leaf?.view instanceof MarkdownView) {
			this.currentEditor = leaf.view.editor;
		} else {
			this.currentEditor = null;
			this.hideButton();
		}
	}

	// 处理文本选择变化
	private handleSelectionChange() {
		// 防抖处理，避免频繁触发
		if (this.selectionTimeout) {
			clearTimeout(this.selectionTimeout);
		}

		this.selectionTimeout = setTimeout(() => {
			this.checkAndShowButton();
		}, 150);
	}

	// 检查并显示按钮
	private checkAndShowButton() {
		if (!this.currentEditor) {
			this.hideButton();
			return;
		}

		const selection = this.currentEditor.getSelection();
		
		if (!selection || selection.trim().length === 0) {
			this.hideButton();
			return;
		}

		// 获取选择区域的位置
		const position = this.getSelectionPosition();
		if (position) {
			this.position = position;
			this.showButton();
		}
	}

	// 获取选择区域的位置
	private getSelectionPosition(): Position | null {
		try {
			const selection = window.getSelection();
			if (!selection || selection.rangeCount === 0) {
				return null;
			}

			const range = selection.getRangeAt(0);
			const rect = range.getBoundingClientRect();
			
			if (rect.width === 0 && rect.height === 0) {
				return null;
			}

			// 按钮预计尺寸
			const buttonWidth = 160;  // 考虑展开菜单的宽度
			const buttonHeight = 40;

			// 计算最佳位置
			let x = rect.right + 8;
			let y = rect.top - 45;

			// 智能位置调整：防止超出视窗边界
			if (x + buttonWidth > window.innerWidth) {
				// 如果右边放不下，尝试放到选择区域的左边
				x = Math.max(rect.left - buttonWidth - 8, 10);
			}

			if (y < 10) {
				// 如果上方放不下，放到选择区域下方
				y = rect.bottom + 8;
			}

			// 最终边界检查
			x = Math.max(10, Math.min(x, window.innerWidth - buttonWidth));
			y = Math.max(10, Math.min(y, window.innerHeight - buttonHeight));

			return { x, y };
		} catch (error) {
			console.error('获取选择位置失败:', error);
			return null;
		}
	}

	// 显示浮动按钮
	private showButton() {
		if (!this.root || !this.container) return;

		this.isVisible = true;
		this.container.style.pointerEvents = 'auto';

		this.root.render(
			React.createElement(FloatingAIButton, {
				editor: this.currentEditor!,
				templates: this.templates,
				onTemplateSelect: this.onTemplateSelect,
				position: this.position,
				visible: this.isVisible,
				onClose: this.hideButton.bind(this)
			})
		);
	}

	// 隐藏浮动按钮
	private hideButton() {
		if (!this.root || !this.container) return;

		this.isVisible = false;
		this.container.style.pointerEvents = 'none';

		this.root.render(
			React.createElement(FloatingAIButton, {
				editor: this.currentEditor!,
				templates: this.templates,
				onTemplateSelect: this.onTemplateSelect,
				position: this.position,
				visible: this.isVisible,
				onClose: this.hideButton.bind(this)
			})
		);
	}

	// 处理滚动事件
	private handleScroll() {
		if (this.isVisible) {
			// 滚动时重新计算位置或隐藏按钮
			const position = this.getSelectionPosition();
			if (position) {
				this.position = position;
				this.showButton(); // 更新位置
			} else {
				this.hideButton();
			}
		}
	}

	// 处理窗口大小调整
	private handleResize() {
		if (this.isVisible) {
			// 窗口调整大小时重新计算位置
			const position = this.getSelectionPosition();
			if (position) {
				this.position = position;
				this.showButton(); // 更新位置
			} else {
				this.hideButton();
			}
		}
	}

	// 更新模板列表
	updateTemplates(templates: AITemplate[]) {
		this.templates = templates;
		if (this.isVisible) {
			this.showButton(); // 重新渲染
		}
	}

	// 销毁管理器
	destroy() {
		// 清除定时器
		if (this.selectionTimeout) {
			clearTimeout(this.selectionTimeout);
		}

		// 移除事件监听器
		document.removeEventListener('selectionchange', this.handleSelectionChange.bind(this));
		document.removeEventListener('scroll', this.handleScroll.bind(this), true);
		window.removeEventListener('resize', this.handleResize.bind(this));

		// 卸载React组件
		if (this.root) {
			this.root.unmount();
			this.root = null;
		}

		// 移除DOM容器
		if (this.container && this.container.parentNode) {
			this.container.parentNode.removeChild(this.container);
			this.container = null;
		}

		// 清空状态
		this.currentEditor = null;
		this.isVisible = false;
		this.templates = [];
	}
}