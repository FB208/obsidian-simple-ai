import { Plugin, Editor, MarkdownView } from 'obsidian';
import { SimpleAISettingTab } from './src/settings';
import { SimpleAIModal } from './src/modal';
import { DEFAULT_SETTINGS, SimpleAISettings } from './src/types';

// 主插件类
export default class SimpleAIPlugin extends Plugin {
	settings: SimpleAISettings;

	async onload() {
		await this.loadSettings();

		// 添加设置页面
		this.addSettingTab(new SimpleAISettingTab(this.app, this));

		// 添加命令
		this.addCommand({
			id: 'open-ai-assistant',
			name: '打开AI助手',
			editorCallback: (editor: Editor) => {
				new SimpleAIModal(this.app, this, editor).open();
			}
		});

		// 添加右键菜单
		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu, editor, view) => {
				if (view instanceof MarkdownView) {
					menu.addItem((item) => {
						item
							.setTitle('AI助手')
							.setIcon('bot')
							.onClick(() => {
								new SimpleAIModal(this.app, this, editor).open();
							});
					});
				}
			})
		);
	}

	onunload() {
		// 清理工作
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}