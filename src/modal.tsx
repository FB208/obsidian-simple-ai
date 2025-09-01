import { App, Editor, Modal } from 'obsidian';
import { createRoot, Root } from 'react-dom/client';
import React from 'react';
import SimpleAIPlugin from '../main';
import { AIAssistantModal } from './components/AIAssistantModal';
import { OpenAIAPI } from './api';

// 简单AI模态框类
export class SimpleAIModal extends Modal {
	private plugin: SimpleAIPlugin;
	private editor: Editor;
	private root: Root | null = null;
	private api: OpenAIAPI;

	constructor(app: App, plugin: SimpleAIPlugin, editor: Editor) {
		super(app);
		this.plugin = plugin;
		this.editor = editor;
		this.api = new OpenAIAPI(plugin.settings);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('simple-ai-modal-container');

		// 获取当前选中的文本或光标位置的文本
		const selectedText = this.editor.getSelection();
		
		// 如果没有选中文本，尝试获取当前行
		const initialText = selectedText || this.editor.getLine(this.editor.getCursor().line);

		// 创建React根节点并渲染组件
		this.root = createRoot(contentEl);
		this.root.render(
			<AIAssistantModal
				initialText={initialText}
				api={this.api}
				onTextChange={this.handleTextChange.bind(this)}
				onClose={this.close.bind(this)}
			/>
		);
	}

	onClose() {
		if (this.root) {
			this.root.unmount();
			this.root = null;
		}
		const { contentEl } = this;
		contentEl.empty();
	}

	// 处理文本变更
	private handleTextChange(newText: string) {
		const selection = this.editor.getSelection();
		
		if (selection) {
			// 如果有选中文本，替换选中的内容
			this.editor.replaceSelection(newText);
		} else {
			// 如果没有选中文本，在光标位置插入
			this.editor.replaceRange(newText, this.editor.getCursor());
		}
	}
}