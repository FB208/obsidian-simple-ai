import { App, PluginSettingTab, Setting, Notice, Modal } from 'obsidian';
import SimpleAIPlugin from '../main';
import { AITemplate, DEFAULT_TEMPLATES } from './types';

// 插件设置页面
export class SimpleAISettingTab extends PluginSettingTab {
	plugin: SimpleAIPlugin;

	constructor(app: App, plugin: SimpleAIPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// 标题
		containerEl.createEl('h2', { text: 'Simple AI 设置' });

		// API 基础URL设置
		new Setting(containerEl)
			.setName('API 基础URL')
			.setDesc('OpenAI兼容API的基础URL地址')
			.addText(text => text
				.setPlaceholder('https://api.openai.com/v1')
				.setValue(this.plugin.settings.baseUrl)
				.onChange(async (value) => {
					this.plugin.settings.baseUrl = value;
					await this.plugin.saveSettings();
				}));

		// API密钥设置
		new Setting(containerEl)
			.setName('API 密钥')
			.setDesc('用于访问AI服务的API密钥')
			.addText(text => {
				text.inputEl.type = 'password';
				text
					.setPlaceholder('输入你的API密钥')
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value;
						await this.plugin.saveSettings();
					});
			});

		// 模型设置
		new Setting(containerEl)
			.setName('模型')
			.setDesc('要使用的AI模型名称')
			.addText(text => text
				.setPlaceholder('gpt-3.5-turbo')
				.setValue(this.plugin.settings.model)
				.onChange(async (value) => {
					this.plugin.settings.model = value;
					await this.plugin.saveSettings();
				}));

		// 温度设置
		new Setting(containerEl)
			.setName('温度')
			.setDesc('控制回答的创造性 (0.0 - 2.0)')
			.addSlider(slider => slider
				.setLimits(0, 2, 0.1)
				.setValue(this.plugin.settings.temperature)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.temperature = value;
					await this.plugin.saveSettings();
				}));

		// 最大令牌数设置
		new Setting(containerEl)
			.setName('最大令牌数')
			.setDesc('AI回答的最大长度')
			.addSlider(slider => slider
				.setLimits(100, 4000, 100)
				.setValue(this.plugin.settings.maxTokens)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.maxTokens = value;
					await this.plugin.saveSettings();
				}));

		// 系统提示设置
		new Setting(containerEl)
			.setName('系统提示')
			.setDesc('定义AI助手的行为和角色')
			.addTextArea(text => text
				.setPlaceholder('输入系统提示...')
				.setValue(this.plugin.settings.systemPrompt)
				.onChange(async (value) => {
					this.plugin.settings.systemPrompt = value;
					await this.plugin.saveSettings();
				}));

		// AI模板设置区域
		containerEl.createEl('h3', { text: 'AI模板设置' });
		containerEl.createEl('p', { 
			text: '配置右键菜单中显示的AI功能模板，可以添加、编辑或删除模板。',
			cls: 'setting-item-description'
		});

		// 显示现有模板
		this.displayTemplates(containerEl);

		// 添加新模板按钮
		new Setting(containerEl)
			.setName('添加新模板')
			.setDesc('创建一个新的AI处理模板')
			.addButton(button => button
				.setButtonText('添加模板')
				.onClick(() => {
					this.addNewTemplate();
				}));

		// 测试连接按钮
		new Setting(containerEl)
			.setName('测试连接')
			.setDesc('测试API连接是否正常')
			.addButton(button => button
				.setButtonText('测试连接')
				.setCta()
				.onClick(async () => {
					await this.testConnection();
				}));
	}

	// 测试API连接
	private async testConnection(): Promise<void> {
		if (!this.plugin.settings.apiKey) {
			new Notice('请先设置API密钥');
			return;
		}

		const button = this.containerEl.querySelector('.mod-cta') as HTMLButtonElement;
		const originalText = button.textContent;
		
		try {
			button.textContent = '测试中...';
			button.disabled = true;

			const { OpenAIAPI } = await import('./api');
			const api = new OpenAIAPI(this.plugin.settings);
			
			const response = await api.chatCompletion({
				model: this.plugin.settings.model,
				messages: [
					{ role: 'user', content: '你好，请简单回复确认连接成功' }
				]
			});

			new Notice('连接成功！AI回复: ' + response.substring(0, 50) + '...');
		} catch (error) {
			console.error('连接测试失败:', error);
			new Notice('连接失败: ' + (error instanceof Error ? error.message : '未知错误'));
		} finally {
			button.textContent = originalText;
			button.disabled = false;
		}
	}

	// 显示AI模板列表
	private displayTemplates(containerEl: HTMLElement): void {
		const templatesContainer = containerEl.createDiv('templates-container');
		
		this.plugin.settings.templates.forEach((template, index) => {
			const templateEl = templatesContainer.createDiv('template-setting');
			
			new Setting(templateEl)
				.setName(template.name)
				.setDesc(`提示词: ${template.prompt.substring(0, 50)}...`)
				.addToggle(toggle => toggle
					.setValue(template.enabled)
					.onChange(async (value) => {
						this.plugin.settings.templates[index].enabled = value;
						await this.plugin.saveSettings();
					}))
				.addButton(button => button
					.setButtonText('编辑')
					.onClick(() => {
						this.editTemplate(index);
					}))
				.addButton(button => button
					.setButtonText('删除')
					.setWarning()
					.onClick(async () => {
						this.plugin.settings.templates.splice(index, 1);
						await this.plugin.saveSettings();
						this.display(); // 重新显示设置页面
					}));
		});
	}

	// 添加新模板
	private addNewTemplate(): void {
		const newTemplate: AITemplate = {
			id: `template_${Date.now()}`,
			name: '新模板',
			prompt: '请处理以下文本：',
			icon: 'bot',
			enabled: true
		};
		
		this.plugin.settings.templates.push(newTemplate);
		this.editTemplate(this.plugin.settings.templates.length - 1);
	}

	// 编辑模板
	private editTemplate(index: number): void {
		const template = this.plugin.settings.templates[index];
		
		// 创建模态框来编辑模板
		const modal = new TemplateEditModal(this.app, template, async (updatedTemplate) => {
			this.plugin.settings.templates[index] = updatedTemplate;
			await this.plugin.saveSettings();
			this.display(); // 重新显示设置页面
		});
		
		modal.open();
	}
}

// 模板编辑模态框
class TemplateEditModal extends Modal {
	template: AITemplate;
	onSave: (template: AITemplate) => Promise<void>;

	constructor(app: App, template: AITemplate, onSave: (template: AITemplate) => Promise<void>) {
		super(app);
		this.template = { ...template }; // 创建副本
		this.onSave = onSave;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: '编辑AI模板' });

		// 模板名称
		new Setting(contentEl)
			.setName('模板名称')
			.setDesc('在右键菜单中显示的名称')
			.addText(text => text
				.setValue(this.template.name)
				.onChange(value => {
					this.template.name = value;
				}));

		// 图标
		new Setting(contentEl)
			.setName('图标')
			.setDesc('菜单项的图标名称')
			.addText(text => text
				.setValue(this.template.icon)
				.onChange(value => {
					this.template.icon = value;
				}));

		// 提示词
		new Setting(contentEl)
			.setName('提示词')
			.setDesc('发送给AI的指令，文本内容会附加在提示词后面')
			.addTextArea(text => text
				.setValue(this.template.prompt)
				.onChange(value => {
					this.template.prompt = value;
				}));

		// 按钮
		const buttonContainer = contentEl.createDiv('modal-button-container');
		buttonContainer.style.display = 'flex';
		buttonContainer.style.justifyContent = 'flex-end';
		buttonContainer.style.gap = '10px';
		buttonContainer.style.marginTop = '20px';

		const cancelButton = buttonContainer.createEl('button', { text: '取消' });
		cancelButton.onclick = () => this.close();

		const saveButton = buttonContainer.createEl('button', { text: '保存', cls: 'mod-cta' });
		saveButton.onclick = async () => {
			await this.onSave(this.template);
			this.close();
		};
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}