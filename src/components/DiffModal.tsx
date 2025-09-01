import React, { useState } from 'react';
import { Modal, App } from 'obsidian';
import { TypewriterDisplay } from './TypewriterDisplay';

interface DiffModalProps {
	app: App;
	originalText: string;
	aiResult: string;
	onAccept: () => void;
	onReject: () => void;
}

// 对比确认模态框
export class DiffModal extends Modal {
	private originalText: string;
	private aiResult: string;
	private onAccept: () => void;
	private onReject: () => void;
	private showTypewriter: boolean = true;

	constructor(
		app: App, 
		originalText: string, 
		aiResult: string, 
		onAccept: () => void, 
		onReject: () => void
	) {
		super(app);
		this.originalText = originalText;
		this.aiResult = aiResult;
		this.onAccept = onAccept;
		this.onReject = onReject;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		
		contentEl.createEl('h2', { text: 'AI处理结果对比' });

		// 创建对比容器
		const diffContainer = contentEl.createDiv('diff-container');
		diffContainer.style.cssText = `
			display: flex;
			flex-direction: column;
			gap: 20px;
			max-height: 60vh;
			overflow-y: auto;
			padding: 16px 0;
		`;

		// 原文区域
		const originalSection = diffContainer.createDiv('original-section');
		originalSection.createEl('h3', { text: '原文：' });
		const originalContent = originalSection.createDiv('original-content');
		originalContent.style.cssText = `
			background: var(--background-secondary);
			border: 1px solid var(--background-modifier-border);
			border-radius: 8px;
			padding: 16px;
			font-family: var(--font-monospace);
			font-size: 14px;
			line-height: 1.5;
			white-space: pre-wrap;
		`;
		originalContent.textContent = this.originalText;

		// AI建议区域
		const aiSection = diffContainer.createDiv('ai-section');
		aiSection.createEl('h3', { text: 'AI建议：' });
		const aiContent = aiSection.createDiv('ai-content');
		aiContent.style.cssText = `
			background: var(--background-primary-alt);
			border: 1px solid var(--interactive-accent);
			border-radius: 8px;
			padding: 16px;
			min-height: 100px;
		`;

		// 使用React渲染打字机效果
		import('react-dom/client').then(({ createRoot }) => {
			const root = createRoot(aiContent);
			root.render(
				React.createElement(TypewriterDisplay, {
					content: this.aiResult,
					speed: 20,
					onComplete: () => {
						this.showTypewriter = false;
						this.renderButtons(contentEl);
					}
				})
			);
		});
	}

	private renderButtons(contentEl: HTMLElement) {
		// 按钮容器
		const buttonContainer = contentEl.createDiv('modal-button-container');
		buttonContainer.style.cssText = `
			display: flex;
			justify-content: flex-end;
			gap: 12px;
			margin-top: 20px;
			padding-top: 16px;
			border-top: 1px solid var(--background-modifier-border);
		`;

		// 拒绝按钮
		const rejectButton = buttonContainer.createEl('button', { text: '拒绝' });
		rejectButton.style.cssText = `
			padding: 8px 16px;
			border: 1px solid var(--background-modifier-border);
			border-radius: 6px;
			background: var(--background-secondary);
			color: var(--text-normal);
			cursor: pointer;
		`;
		rejectButton.onclick = () => {
			this.onReject();
			this.close();
		};

		// 接受按钮
		const acceptButton = buttonContainer.createEl('button', { text: '接受', cls: 'mod-cta' });
		acceptButton.style.cssText = `
			padding: 8px 16px;
			border: 1px solid var(--interactive-accent);
			border-radius: 6px;
			background: var(--interactive-accent);
			color: var(--text-on-accent);
			cursor: pointer;
		`;
		acceptButton.onclick = () => {
			this.onAccept();
			this.close();
		};
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}