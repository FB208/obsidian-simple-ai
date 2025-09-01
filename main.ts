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

		// 添加分级右键菜单
		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu, editor, view) => {
				if (view instanceof MarkdownView) {
					// 创建AI主菜单
					menu.addItem((item) => {
						item
							.setTitle('AI')
							.setIcon('bot');
					});
					
					// 添加AI子菜单项
					const enabledTemplates = this.settings.templates.filter(template => template.enabled);
					enabledTemplates.forEach(template => {
						menu.addItem((item) => {
							item
								.setTitle(`AI > ${template.name}`)
								.setIcon(template.icon)
								.onClick(async () => {
									await this.processTextWithTemplate(editor, template);
								});
						});
					});
				}
			})
		);
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

		// 显示处理状态
		const notice = new Notice(`正在使用${template.name}处理文本...`, 0);

		try {
			const api = new OpenAIAPI(this.settings);
			const processedText = await api.customProcess(selectedText, template.prompt);
			
			// 获取当前活动的编辑器
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView) {
				const editor = activeView.editor;
				// 替换选中文本
				editor.replaceSelection(processedText);
			}
			
			notice.hide();
			new Notice(`${template.name}处理完成`);
		} catch (error) {
			console.error('AI处理失败:', error);
			notice.hide();
			new Notice(`${template.name}处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	// 获取选中文本或全文
	private getTextContent(editor: Editor): string {
		const selectedText = editor.getSelection();
		if (selectedText && selectedText.trim().length > 0) {
			return selectedText;
		}
		// 如果没有选中内容，返回全文
		return editor.getValue();
	}

	// 使用模板处理文本
	private async processTextWithTemplate(editor: Editor, template: AITemplate): Promise<void> {
		if (!this.settings.apiKey) {
			new Notice('请先在设置中配置API密钥');
			return;
		}

		const textContent = this.getTextContent(editor);
		if (!textContent.trim()) {
			new Notice('没有可处理的文本内容');
			return;
		}

		// 显示处理状态
		const notice = new Notice(`正在使用${template.name}处理文本...`, 0);

		try {
			const api = new OpenAIAPI(this.settings);
			const processedText = await api.customProcess(textContent, template.prompt);
			
			// 替换选中文本或在光标位置插入处理后的文本
			const selectedText = editor.getSelection();
			if (selectedText && selectedText.trim().length > 0) {
				// 有选中文本，替换选中内容
				editor.replaceSelection(processedText);
			} else {
				// 没有选中文本，在光标位置插入
				const cursor = editor.getCursor();
				editor.replaceRange('\n\n' + processedText, cursor);
			}
			
			notice.hide();
			new Notice(`${template.name}处理完成`);
		} catch (error) {
			console.error('AI处理失败:', error);
			notice.hide();
			new Notice(`${template.name}处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}
}