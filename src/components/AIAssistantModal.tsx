import React, { useState, useCallback } from 'react';
import { AIAction, AIActionConfig } from '../types';
import { OpenAIAPI } from '../api';

// AI操作按钮配置
const AI_ACTIONS: AIActionConfig[] = [
	{
		type: 'improve',
		label: '改进文本',
		prompt: '请改进以下文本，使其更加清晰、准确和流畅',
		icon: 'edit'
	},
	{
		type: 'shorten',
		label: '缩短内容',
		prompt: '请将以下文本缩短，保持主要信息和观点',
		icon: 'minimize'
	},
	{
		type: 'expand',
		label: '扩展内容',
		prompt: '请扩展以下文本，添加更多细节和解释',
		icon: 'maximize'
	},
	{
		type: 'translate',
		label: '翻译',
		prompt: '请将以下文本翻译成英语',
		icon: 'globe'
	},
	{
		type: 'summarize',
		label: '总结',
		prompt: '请总结以下文本的主要内容',
		icon: 'list'
	}
];

interface AIAssistantModalProps {
	initialText: string;
	api: OpenAIAPI;
	onTextChange: (text: string) => void;
	onClose: () => void;
}

// AI助手模态框组件
export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
	initialText,
	api,
	onTextChange,
	onClose
}) => {
	const [inputText, setInputText] = useState(initialText);
	const [outputText, setOutputText] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [selectedAction, setSelectedAction] = useState<AIAction | null>(null);
	const [customPrompt, setCustomPrompt] = useState('');
	const [showCustomPrompt, setShowCustomPrompt] = useState(false);

	// 处理AI操作
	const handleAIAction = useCallback(async (action: AIAction, customInstruction?: string) => {
		if (!inputText.trim()) {
			return;
		}

		setIsLoading(true);
		setSelectedAction(action);

		try {
			let result: string;

			switch (action) {
				case 'improve':
					result = await api.improveText(inputText, customInstruction);
					break;
				case 'shorten':
					result = await api.shortenText(inputText);
					break;
				case 'expand':
					result = await api.expandText(inputText);
					break;
				case 'translate':
					result = await api.translateText(inputText);
					break;
				case 'summarize':
					result = await api.summarizeText(inputText);
					break;
				case 'custom':
					result = await api.customProcess(inputText, customInstruction || '');
					break;
				default:
					result = await api.improveText(inputText);
			}

			setOutputText(result);
		} catch (error) {
			console.error('AI处理失败:', error);
			setOutputText('处理失败: ' + (error instanceof Error ? error.message : '未知错误'));
		} finally {
			setIsLoading(false);
			setSelectedAction(null);
		}
	}, [inputText, api]);

	// 处理自定义指令
	const handleCustomAction = useCallback(async () => {
		if (!customPrompt.trim()) {
			return;
		}
		await handleAIAction('custom', customPrompt);
		setCustomPrompt('');
		setShowCustomPrompt(false);
	}, [customPrompt, handleAIAction]);

	// 应用结果
	const applyResult = useCallback(() => {
		if (outputText) {
			onTextChange(outputText);
			onClose();
		}
	}, [outputText, onTextChange, onClose]);

	// 替换原文
	const replaceOriginal = useCallback(() => {
		if (outputText) {
			onTextChange(outputText);
			setInputText(outputText);
			setOutputText('');
		}
	}, [outputText, onTextChange]);

	return (
		<div className="simple-ai-modal">
			<div className="simple-ai-header">
				<h3>AI 助手</h3>
				<button 
					className="simple-ai-close-btn"
					onClick={onClose}
					aria-label="关闭"
				>
					×
				</button>
			</div>

			<div className="simple-ai-content">
				{/* 输入区域 */}
				<div className="simple-ai-input-section">
					<label>原文本:</label>
					<textarea
						className="simple-ai-textarea"
						value={inputText}
						onChange={(e) => setInputText(e.target.value)}
						placeholder="在这里输入或粘贴要处理的文本..."
						rows={6}
					/>
				</div>

				{/* 操作按钮 */}
				<div className="simple-ai-actions">
					{AI_ACTIONS.map((action) => (
						<button
							key={action.type}
							className={`simple-ai-action-btn ${selectedAction === action.type ? 'loading' : ''}`}
							onClick={() => handleAIAction(action.type)}
							disabled={isLoading || !inputText.trim()}
						>
							{selectedAction === action.type ? '处理中...' : action.label}
						</button>
					))}
					
					<button
						className="simple-ai-action-btn custom-btn"
						onClick={() => setShowCustomPrompt(!showCustomPrompt)}
						disabled={isLoading}
					>
						自定义指令
					</button>
				</div>

				{/* 自定义指令输入 */}
				{showCustomPrompt && (
					<div className="simple-ai-custom-section">
						<input
							type="text"
							className="simple-ai-custom-input"
							value={customPrompt}
							onChange={(e) => setCustomPrompt(e.target.value)}
							placeholder="输入自定义指令..."
							onKeyPress={(e) => e.key === 'Enter' && handleCustomAction()}
						/>
						<button
							className="simple-ai-custom-submit"
							onClick={handleCustomAction}
							disabled={!customPrompt.trim() || isLoading}
						>
							执行
						</button>
					</div>
				)}

				{/* 输出区域 */}
				{outputText && (
					<div className="simple-ai-output-section">
						<label>AI处理结果:</label>
						<div className="simple-ai-output">
							<textarea
								className="simple-ai-textarea"
								value={outputText}
								onChange={(e) => setOutputText(e.target.value)}
								rows={6}
							/>
						</div>
						
						{/* 结果操作按钮 */}
						<div className="simple-ai-result-actions">
							<button
								className="simple-ai-result-btn primary"
								onClick={applyResult}
							>
								应用到编辑器
							</button>
							<button
								className="simple-ai-result-btn"
								onClick={replaceOriginal}
							>
								替换原文
							</button>
							<button
								className="simple-ai-result-btn"
								onClick={() => setOutputText('')}
							>
								清除结果
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};