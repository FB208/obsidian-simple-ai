import React, { useState, useEffect } from 'react';

interface TypewriterDisplayProps {
	content: string;
	speed?: number; // 打字速度 (字符/毫秒)
	onComplete?: () => void;
}

// 打字机效果组件
export const TypewriterDisplay: React.FC<TypewriterDisplayProps> = ({
	content,
	speed = 30,
	onComplete
}) => {
	const [displayedText, setDisplayedText] = useState('');
	const [currentIndex, setCurrentIndex] = useState(0);

	useEffect(() => {
		if (currentIndex < content.length) {
			const timer = setTimeout(() => {
				setDisplayedText(prev => prev + content[currentIndex]);
				setCurrentIndex(prev => prev + 1);
			}, speed);

			return () => clearTimeout(timer);
		} else if (currentIndex === content.length && onComplete) {
			onComplete();
		}
	}, [currentIndex, content, speed, onComplete]);

	// 重置组件当内容改变时
	useEffect(() => {
		setDisplayedText('');
		setCurrentIndex(0);
	}, [content]);

	return (
		<div className="typewriter-display">
			<pre style={{ 
				whiteSpace: 'pre-wrap',
				fontFamily: 'var(--font-monospace)',
				fontSize: '14px',
				lineHeight: '1.5',
				margin: 0
			}}>
				{displayedText}
				{currentIndex < content.length && (
					<span 
						className="typewriter-cursor"
						style={{
							opacity: 1,
							animation: 'blink 1s infinite',
							backgroundColor: 'var(--text-accent)',
							width: '2px',
							display: 'inline-block',
							height: '1.2em',
							marginLeft: '1px'
						}}
					/>
				)}
			</pre>
		</div>
	);
};