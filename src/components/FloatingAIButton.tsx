import React, { useState, useEffect, useRef } from 'react';
import { Editor, setIcon } from 'obsidian';
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
	const LucideIcon: React.FC<{ name: string; size?: number }> = ({ name, size = 16 }) => {
		const ref = useRef<HTMLSpanElement | null>(null);
		useEffect(() => {
			if (ref.current) {
				setIcon(ref.current, name);
			}
		}, [name]);
		return (
			<span
				ref={ref}
				style={{
					display: 'inline-flex',
					width: `${size}px`,
					height: `${size}px`,
					alignItems: 'center',
					justifyContent: 'center'
				}}
			/>
		);
	};

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
		const enabledTemplates = templates.filter(t => t.enabled);
		if (enabledTemplates.length === 1) {
			// 如果仅一个启用模板，直接执行
			onTemplateSelect(enabledTemplates[0], selectedText);
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
								<LucideIcon name={template.icon || 'bot'} size={16} />
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