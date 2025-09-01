// 插件设置接口
export interface SimpleAISettings {
	baseUrl: string;
	apiKey: string;
	model: string;
	temperature: number;
	maxTokens: number;
	systemPrompt: string;
}

// 默认设置
export const DEFAULT_SETTINGS: SimpleAISettings = {
	baseUrl: 'https://api.openai.com/v1',
	apiKey: '',
	model: 'gpt-3.5-turbo',
	temperature: 0.7,
	maxTokens: 2000,
	systemPrompt: '你是一个专业的文字编辑助手，帮助用户改进和编辑文本内容。请保持简洁、准确和有用。'
};

// API请求接口
export interface ChatMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface ChatCompletionRequest {
	model: string;
	messages: ChatMessage[];
	temperature?: number;
	max_tokens?: number;
	stream?: boolean;
}

export interface ChatCompletionResponse {
	choices: Array<{
		message: {
			content: string;
		};
		finish_reason: string;
	}>;
}

// AI操作类型
export type AIAction = 
	| 'improve' 
	| 'shorten' 
	| 'expand' 
	| 'translate' 
	| 'summarize' 
	| 'custom';

// AI操作配置
export interface AIActionConfig {
	type: AIAction;
	label: string;
	prompt: string;
	icon: string;
}