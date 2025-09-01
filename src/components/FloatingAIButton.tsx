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
	isProcessing?: boolean;
	selectedText?: string;
}

// 浮动AI按钮组件
export const FloatingAIButton: React.FC<FloatingAIButtonProps> = ({
	editor,
	templates,
	onTemplateSelect,
	position,
	visible,
	onClose,
	isProcessing = false,
	selectedText: propSelectedText = ''
}) => {
	const [isExpanded, setIsExpanded] = useState(false);
	const [selectedText, setSelectedText] = useState('');

	// 获取当前选中的文本
	useEffect(() => {
		if (visible) {
			// 优先使用传递来的选中文本，避免重新获取时选择状态已改变
			if (propSelectedText) {
				setSelectedText(propSelectedText);
			} else {
				const selection = editor.getSelection();
				setSelectedText(selection);
			}
		}
	}, [visible, editor, propSelectedText]);

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
		if (isProcessing) return; // 处理中时禁用点击
		
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
				className={`floating-ai-main-button ${isProcessing ? 'processing' : ''}`}
				onClick={handleMainButtonClick}
				title={isProcessing ? 'AI正在处理...' : (enabledTemplates.length === 1 ? enabledTemplates[0].name : 'AI助手')}
				disabled={isProcessing}
			>
				{/* AI机器人图标 */}
				<svg 
					className="icon" 
					viewBox="0 0 1024 1024" 
					xmlns="http://www.w3.org/2000/svg" 
					width="16" 
					height="16"
					style={{ color: 'var(--interactive-accent)' }}
				>
					<path d="M752 848a16 16 0 0 1 16 16v64a16 16 0 0 1-16 16H288a16 16 0 0 1-16-16v-64a16 16 0 0 1 16-16h464zM896 96a64 64 0 0 1 63.936 60.8L960 160V704a64 64 0 0 1-60.8 63.936L896 768H144a64 64 0 0 1-63.936-60.8L80 704V160a64 64 0 0 1 60.8-63.936l3.2-0.064H896zM864 192H176v480H864V192zM448 320v240H352V320H448z m240 0v240h-96V320h96z" fill="currentColor" />
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
							transition: 'transform 0.2s ease',
							color: 'var(--interactive-accent)'
						}}
					>
						<path d="M7 10l5 5 5-5z"/>
					</svg>
				)}
			</button>

			{/* 展开的模板菜单 */}
			{isExpanded && enabledTemplates.length > 1 && !isProcessing && (
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
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
										<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
										<path d="M12 8v8m-4-4h8"/>
									</svg>
								)}
								{template.icon === 'edit' && (
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
										<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
										<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
									</svg>
								)}
								{template.icon === 'globe' && (
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
										<circle cx="12" cy="12" r="10"/>
										<line x1="2" y1="12" x2="22" y2="12"/>
										<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
									</svg>
								)}
								{template.icon === 'bot' && (
									<svg width="16" height="16" viewBox="0 0 1024 1024">
										<path d="M291.584 806.314667c-13.909333 0-25.6-11.690667-25.6-25.6v-145.92c0-135.68 110.336-246.016 246.016-246.016s246.016 110.336 246.016 246.016v145.92c0 13.909333-11.690667 25.6-25.6 25.6H291.584z" fill="currentColor" opacity="0.8" />
										<path d="M627.114667 626.517333c-18.773333 0-34.133333-15.36-34.133334-34.133333v-36.096c0-18.773333 15.36-34.133333 34.133334-34.133333s34.133333 15.36 34.133333 34.133333v36.096c0 18.773333-15.36 34.133333-34.133333 34.133333zM396.885333 626.517333c-18.773333 0-34.133333-15.36-34.133333-34.133333v-36.096c0-18.773333 15.36-34.133333 34.133333-34.133333s34.133333 15.36 34.133334 34.133333v36.096c0 18.773333-15.36 34.133333-34.133334 34.133333z" fill="currentColor" />
										<path d="M580.266667 794.88H443.733333c-18.773333 0-34.133333-15.36-34.133333-34.133333V759.466667c0-18.773333 15.36-34.133333 34.133333-34.133334h136.533334c18.773333 0 34.133333 15.36 34.133333 34.133334v1.28c0 18.773333-15.36 34.133333-34.133333 34.133333z" fill="currentColor" />
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