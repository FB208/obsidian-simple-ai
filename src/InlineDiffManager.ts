import { Editor, MarkdownView } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import React from 'react';
import { InlineDiff } from './components/InlineDiff';

interface DiffSession {
	originalText: string;
	originalFrom: { line: number; ch: number };
	originalTo: { line: number; ch: number };
	aiResult: string;
	diffElement: HTMLElement;
	root: Root;
}

// 内联差异管理器 - 在编辑器中直接显示VSCode风格的diff
export class InlineDiffManager {
	private app: any;
	private activeSessions: Map<string, DiffSession> = new Map();

	constructor(app: any) {
		this.app = app;
	}

	// 在编辑器中显示内联差异对比
	async showInlineDiff(
		editor: Editor,
		originalText: string,
		aiResult: string,
		templateName: string
	): Promise<void> {
		const sessionId = `diff_${Date.now()}`;
		
		// 获取选中文本的位置
		const from = editor.getCursor('from');
		const to = editor.getCursor('to');
		
		// 在原文位置后插入diff容器
		const diffContainer = document.createElement('div');
		diffContainer.className = 'obsidian-inline-diff-wrapper';
		diffContainer.style.cssText = `
			margin: 16px 0;
			position: relative;
			z-index: 100;
		`;

		// 创建React根节点
		const root = createRoot(diffContainer);
		
		// 渲染InlineDiff组件
		root.render(
			React.createElement(InlineDiff, {
				editor: editor,
				originalText: originalText,
				aiResult: aiResult,
				onAccept: () => this.acceptDiff(sessionId),
				onReject: () => this.rejectDiff(sessionId),
				onComplete: () => {
					// 打字机效果完成后，可以做一些额外处理
				}
			})
		);

		// 将diff容器插入到编辑器视图中
		const editorView = this.getEditorView(editor);
		if (editorView) {
			// 在编辑器内容区域后添加diff显示
			const editorContainer = editorView.containerEl.querySelector('.cm-editor');
			if (editorContainer) {
				editorContainer.parentElement?.insertBefore(diffContainer, editorContainer.nextSibling);
			}
		}

		// 保存会话信息
		const session: DiffSession = {
			originalText,
			originalFrom: from,
			originalTo: to,
			aiResult,
			diffElement: diffContainer,
			root
		};
		
		this.activeSessions.set(sessionId, session);
	}

	// 接受差异更改
	private acceptDiff(sessionId: string) {
		const session = this.activeSessions.get(sessionId);
		if (!session) return;

		// 获取当前活动编辑器
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView) {
			const editor = activeView.editor;
			
			// 替换原选中文本为AI结果
			editor.setSelection(session.originalFrom, session.originalTo);
			editor.replaceSelection(session.aiResult);
		}

		// 清理diff显示
		this.cleanupSession(sessionId);
		
		// 显示成功提示
		// new Notice('已接受AI建议');
	}

	// 拒绝差异更改
	private rejectDiff(sessionId: string) {
		const session = this.activeSessions.get(sessionId);
		if (!session) return;

		// 仅清理diff显示，不修改原文
		this.cleanupSession(sessionId);
		
		// 显示提示
		// new Notice('已拒绝AI建议');
	}

	// 清理会话
	private cleanupSession(sessionId: string) {
		const session = this.activeSessions.get(sessionId);
		if (!session) return;

		// 卸载React组件
		session.root.unmount();
		
		// 移除DOM元素
		if (session.diffElement && session.diffElement.parentNode) {
			session.diffElement.parentNode.removeChild(session.diffElement);
		}

		// 从活动会话中移除
		this.activeSessions.delete(sessionId);
	}

	// 获取编辑器视图
	private getEditorView(editor: Editor): MarkdownView | null {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		return activeView?.editor === editor ? activeView : null;
	}

	// 清理所有活动会话
	cleanup() {
		for (const sessionId of this.activeSessions.keys()) {
			this.cleanupSession(sessionId);
		}
		this.activeSessions.clear();
	}
}