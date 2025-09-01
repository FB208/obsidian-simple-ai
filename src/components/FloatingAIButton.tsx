import React, { useState, useEffect } from 'react';
import { Editor } from 'obsidian';
import { AITemplate } from '../types';

interface FloatingAIButtonProps {
	editor: Editor;
	templates: AITemplate[];
	onTemplateSelect: (template: AITemplate, selectedText: string) => void;
	position: { x: number; y: number };
	visible: boolean;
	onClose: () => void;
}

// 浮动AI按钮组件
export const FloatingAIButton: React.FC<FloatingAIButtonProps> = ({
	editor,
	templates,
	onTemplateSelect,
	position,
	visible,
	onClose
}) => {
	const [isExpanded, setIsExpanded] = useState(false);
	const [selectedText, setSelectedText] = useState('');

	// 获取当前选中的文本
	useEffect(() => {
		if (visible) {
			const selection = editor.getSelection();
			setSelectedText(selection);
		}
	}, [visible, editor]);

	// 点击外部区域关闭菜单，支持键盘操作
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest('.floating-ai-button')) {
				onClose();
				setIsExpanded(false);
			}
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onClose();
				setIsExpanded(false);
			}
		};

		if (visible) {
			document.addEventListener('mousedown', handleClickOutside);
			document.addEventListener('keydown', handleKeyDown);
			return () => {
				document.removeEventListener('mousedown', handleClickOutside);
				document.removeEventListener('keydown', handleKeyDown);
			};
		}
	}, [visible, onClose]);

	// 处理AI按钮点击
	const handleMainButtonClick = () => {
		if (templates.length === 1) {
			// 如果只有一个模板，直接执行
			onTemplateSelect(templates[0], selectedText);
		} else {
			// 展开/收起菜单
			setIsExpanded(!isExpanded);
		}
	};

	// 处理模板选择
	const handleTemplateSelect = (template: AITemplate) => {
		onTemplateSelect(template, selectedText);
		setIsExpanded(false);
	};

	if (!visible) return null;

	const enabledTemplates = templates.filter(template => template.enabled);

	return (
		<div 
			className="floating-ai-button"
			style={{
				position: 'fixed',
				left: position.x,
				top: position.y,
				zIndex: 10000,
			}}
		>
			{/* 主AI按钮 */}
			<button
				className="floating-ai-main-button"
				onClick={handleMainButtonClick}
				title={enabledTemplates.length === 1 ? enabledTemplates[0].name : 'AI助手'}
			>
				{/* AI机器人图标 */}
				<svg 
					width="16" 
					height="16" 
					viewBox="0 0 24 24" 
					fill="currentColor"
				>
					<path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1L13.5 2.5L16.17 5.17C15.24 5.06 14.24 5 13.13 5H10.87C9.76 5 8.76 5.06 7.83 5.17L10.5 2.5L9 1L3 7V9C3 10.1 3.9 11 5 11V16C5 17.1 5.9 18 7 18H9C9.55 18 10 17.55 10 17V12H14V17C14 17.55 14.45 18 15 18H17C18.1 18 19 17.1 19 16V11C20.1 11 21 10.1 21 9Z"/>
				</svg>
				
				{enabledTemplates.length > 1 && (
					<svg 
						width="8" 
						height="8" 
						viewBox="0 0 24 24" 
						fill="currentColor"
						style={{ 
							marginLeft: '4px',
							transform: isExpanded ? 'rotate(180deg)' : 'none',
							transition: 'transform 0.2s ease'
						}}
					>
						<path d="M7 10l5 5 5-5z"/>
					</svg>
				)}
			</button>

			{/* 展开的模板菜单 */}
			{isExpanded && enabledTemplates.length > 1 && (
				<div className="floating-ai-menu">
					{enabledTemplates.map((template) => (
						<button
							key={template.id}
							className="floating-ai-menu-item"
							onClick={() => handleTemplateSelect(template)}
							title={template.prompt}
						>
							<span className="floating-ai-menu-item-icon">
								{template.icon === 'expand' && (
									<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
										<path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
									</svg>
								)}
								{template.icon === 'edit' && (
									<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
										<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
									</svg>
								)}
								{template.icon === 'globe' && (
									<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
										<path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/>
									</svg>
								)}
								{template.icon === 'bot' && (
									<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
										<path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1L13.5 2.5L16.17 5.17C15.24 5.06 14.24 5 13.13 5H10.87C9.76 5 8.76 5.06 7.83 5.17L10.5 2.5L9 1L3 7V9C3 10.1 3.9 11 5 11V16C5 17.1 5.9 18 7 18H9C9.55 18 10 17.55 10 17V12H14V17C14 17.55 14.45 18 15 18H17C18.1 18 19 17.1 19 16V11C20.1 11 21 10.1 21 9Z"/>
									</svg>
								)}
							</span>
							<span className="floating-ai-menu-item-text">
								{template.name}
							</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
};