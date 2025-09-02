// AI模板接口
export interface AITemplate {
	id: string;
	name: string;
	prompt: string;
	icon: string;
	enabled: boolean;
}

// 插件设置接口
export interface SimpleAISettings {
	baseUrl: string;
	apiKey: string;
	model: string;
	temperature: number;
	maxTokens: number;
	systemPrompt: string;
	templates: AITemplate[];
}

// 默认AI模板
export const DEFAULT_TEMPLATES: AITemplate[] = [
	{
		id: 'expand',
		name: '扩写',
		prompt: '请扩展以下文本，添加更多细节、例子和解释，使内容更加丰富和完整：',
		icon: 'expand',
		enabled: true
	},
	{
		id: 'rewrite',
		name: '改写',
		prompt: '请改写以下文本，保持原意不变，但使用不同的表达方式，使语言更加流畅和优雅：',
		icon: 'edit',
		enabled: true
	},
	{
		id: 'translate',
		name: '翻译',
		prompt: '请将以下文本翻译成英语，保持原意和语气：',
		icon: 'globe',
		enabled: true
	}
];

// 默认设置
export const DEFAULT_SETTINGS: SimpleAISettings = {
	baseUrl: 'https://api.openai.com/v1',
	apiKey: '',
	model: 'gpt-3.5-turbo',
	temperature: 0.7,
	maxTokens: 2000,
	systemPrompt: '你是一个专业的文字编辑助手，帮助用户改进和编辑文本内容。请保持简洁、准确和有用。',
	templates: DEFAULT_TEMPLATES
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
// （已移除）AIAssistantModal 专用的操作类型与配置