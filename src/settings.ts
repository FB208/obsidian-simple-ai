import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import SimpleAIPlugin from '../main';

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
}