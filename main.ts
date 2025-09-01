import { Plugin, Editor, MarkdownView, Notice } from 'obsidian';
import { SimpleAISettingTab } from './src/settings';
import { SimpleAIModal } from './src/modal';
import { DEFAULT_SETTINGS, SimpleAISettings, AITemplate } from './src/types';
import { OpenAIAPI } from './src/api';
import { FloatingAIManager } from './src/FloatingAIManager';

// 主插件类
export default class SimpleAIPlugin extends Plugin {
	settings: SimpleAISettings;
	floatingAIManager: FloatingAIManager | null = null;

	async onload() {
		await this.loadSettings();

		// 添加设置页面
		this.addSettingTab(new SimpleAISettingTab(this.app, this));

		// 初始化浮动AI按钮管理器
		this.initFloatingAIManager();

		// 添加命令
		this.addCommand({
			id: 'open-ai-assistant',
			name: '打开AI助手',
			editorCallback: (editor: Editor) => {
				new SimpleAIModal(this.app, this, editor).open();
			}
		});

	}

	onunload() {
		// 销毁浮动AI按钮管理器
		if (this.floatingAIManager) {
			this.floatingAIManager.destroy();
			this.floatingAIManager = null;
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
			
			// 导入并显示对比模态框
			const { DiffModal } = await import('./src/components/DiffModal');
			
			const diffModal = new DiffModal(
				this.app,
				selectedText,
				aiResult,
				() => {
					// 接受：替换选中文本
					const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
					if (activeView) {
						const editor = activeView.editor;
						editor.replaceSelection(aiResult);
					}
					new Notice(`${template.name}处理完成`);
				},
				() => {
					// 拒绝：不做任何操作
					new Notice('已拒绝AI建议');
				}
			);
			
			diffModal.open();
			
		} catch (error) {
			console.error('AI处理失败:', error);
			this.floatingAIManager?.setProcessing(false);
			new Notice(`${template.name}处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

}