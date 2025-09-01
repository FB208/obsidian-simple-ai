import React, { useState, useEffect } from 'react';
import { Editor } from 'obsidian';
import { TypewriterDisplay } from './TypewriterDisplay';

interface InlineDiffProps {
	editor: Editor;
	originalText: string;
	aiResult: string;
	onAccept: () => void;
	onReject: () => void;
	onComplete?: () => void;
}

// 内联差异显示组件 - 类似VSCode Git diff
export const InlineDiff: React.FC<InlineDiffProps> = ({
	editor,
	originalText,
	aiResult,
	onAccept,
	onReject,
	onComplete
}) => {
	const [showTypewriter, setShowTypewriter] = useState(true);
	const [displayedResult, setDisplayedResult] = useState('');

	// 打字机效果完成后显示操作按钮
	const handleTypewriterComplete = () => {
		setShowTypewriter(false);
		setDisplayedResult(aiResult);
		if (onComplete) onComplete();
	};

	return (
		<div className="inline-diff-container">
			{/* 原文显示 */}
			<div className="diff-section original">
				<div className="diff-header">
					<span className="diff-marker">-</span>
					<span className="diff-label">原文</span>
				</div>
				<div className="diff-content original-content">
					<pre>{originalText}</pre>
				</div>
			</div>

			{/* AI建议显示 */}
			<div className="diff-section suggested">
				<div className="diff-header">
					<span className="diff-marker">+</span>
					<span className="diff-label">AI建议</span>
				</div>
				<div className="diff-content suggested-content">
					{showTypewriter ? (
						<TypewriterDisplay 
							content={aiResult}
							speed={15}
							onComplete={handleTypewriterComplete}
						/>
					) : (
						<pre>{displayedResult}</pre>
					)}
				</div>
			</div>

			{/* 操作按钮 */}
			{!showTypewriter && (
				<div className="diff-actions">
					<button 
						className="diff-action-btn reject-btn"
						onClick={onReject}
						title="拒绝此更改"
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
						拒绝
					</button>
					<button 
						className="diff-action-btn accept-btn"
						onClick={onAccept}
						title="接受此更改"
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<polyline points="20,6 9,17 4,12"></polyline>
						</svg>
						接受
					</button>
				</div>
			)}
		</div>
	);
};