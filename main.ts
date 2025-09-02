import { Plugin, Editor, MarkdownView, Notice, WorkspaceLeaf } from 'obsidian';
import { SimpleAISettingTab } from './src/settings';
import { DEFAULT_SETTINGS, SimpleAISettings, AITemplate } from './src/types';
import { OpenAIAPI } from './src/api';
import { FloatingAIManager } from './src/FloatingAIManager';
import { InlineDiffManager } from './src/InlineDiffManager';
import { VIEW_TYPE_SIMPLE_AI, SimpleAIView } from './src/view';

// 主插件类
export default class SimpleAIPlugin extends Plugin {
	settings: SimpleAISettings;
	floatingAIManager: FloatingAIManager | null = null;
	inlineDiffManager: InlineDiffManager | null = null;

	async onload() {
		await this.loadSettings();

		// 添加设置页面
		this.addSettingTab(new SimpleAISettingTab(this.app, this));

		// 初始化管理器
		this.initFloatingAIManager();
		this.inlineDiffManager = new InlineDiffManager(this.app);

		// 注册侧边栏视图
		this.registerView(
			VIEW_TYPE_SIMPLE_AI,
			(leaf: WorkspaceLeaf) => new SimpleAIView(leaf, this)
		);

		// 添加命令（打开侧边栏）
		this.addCommand({
			id: 'open-ai-assistant',
			name: '打开AI助手',
			editorCallback: (editor: Editor) => {
				this.activateSimpleAIView(editor);
			}
		});

	}

	onunload() {
		// 销毁管理器
		if (this.floatingAIManager) {
			this.floatingAIManager.destroy();
			this.floatingAIManager = null;
		}
		if (this.inlineDiffManager) {
			this.inlineDiffManager.cleanup();
			this.inlineDiffManager = null;
		}
		// 卸载视图
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_SIMPLE_AI);
		for (const leaf of leaves) {
			leaf.detach();
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// 更新浮动按钮管理器的模板
		if (this.floatingAIManager) {
			this.floatingAIManager.updateTemplates(this.settings.templates);
		}
	}

	// 初始化浮动AI按钮管理器
	private initFloatingAIManager() {
		if (this.floatingAIManager) {
			this.floatingAIManager.destroy();
		}
		
		this.floatingAIManager = new FloatingAIManager(
			this.app,
			this.settings.templates,
			this.handleFloatingButtonTemplateSelect.bind(this)
		);
	}

	// 打开并激活右侧 Simple AI 视图
	private async activateSimpleAIView(editor: Editor) {
		// 计算初始文本：优先选中内容，否则当前行
		const selectedText = editor.getSelection();
		const initialText = selectedText || editor.getLine(editor.getCursor().line);

		let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_SIMPLE_AI)[0];
		if (!leaf) {
			leaf = this.app.workspace.getRightLeaf(false);
		}
		if (!leaf) return;

		await leaf.setViewState({ type: VIEW_TYPE_SIMPLE_AI, active: true });
		await this.app.workspace.revealLeaf(leaf);

		const view = leaf.view as SimpleAIView;
		view.setContext(editor, initialText);
	}

	// 处理浮动按钮模板选择
	private async handleFloatingButtonTemplateSelect(template: AITemplate, selectedText: string) {
		if (!this.settings.apiKey) {
			new Notice('请先在设置中配置API密钥');
			return;
		}

		if (!selectedText.trim()) {
			new Notice('没有可处理的文本内容');
			return;
		}

		// 设置处理状态
		this.floatingAIManager?.setProcessing(true);

		try {
			const api = new OpenAIAPI(this.settings);
			let aiResult = '';
			
			// 使用流式处理
			await api.customProcessStream(selectedText, template.prompt, (chunk: string) => {
				aiResult += chunk;
			});
			
			// 流式处理完成，设置状态为非处理中
			this.floatingAIManager?.setProcessing(false);
			
			// 获取当前活动编辑器
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView && this.inlineDiffManager) {
				const editor = activeView.editor;
				
				// 显示内联差异对比
				await this.inlineDiffManager.showInlineDiff(
					editor,
					selectedText,
					aiResult,
					template.name
				);
			}
			
		} catch (error) {
			console.error('AI处理失败:', error);
			this.floatingAIManager?.setProcessing(false);
			new Notice(`${template.name}处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

}