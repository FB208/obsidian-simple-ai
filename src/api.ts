import { SimpleAISettings, ChatCompletionRequest, ChatCompletionResponse, ChatMessage } from './types';

// OpenAI API 兼容接口类
export class OpenAIAPI {
	private settings: SimpleAISettings;

	constructor(settings: SimpleAISettings) {
		this.settings = settings;
	}

	// 聊天流式输出（委托到统一 chatCompletion）
	async chatCompletionStream(messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<string> {
		return this.chatCompletion({
			model: this.settings.model,
			messages,
			temperature: this.settings.temperature,
			max_tokens: this.settings.maxTokens,
			stream: true
		}, onChunk);
	}

	// 更新设置
	updateSettings(settings: SimpleAISettings) {
		this.settings = settings;
	}

	// 发送聊天完成请求（统一流式，支持 onChunk；不提供 onChunk 也会聚合返回）
	async chatCompletion(request: ChatCompletionRequest, onChunk?: (chunk: string) => void): Promise<string> {
		if (!this.settings.apiKey) {
			throw new Error('API密钥未设置');
		}

		const url = `${this.settings.baseUrl.replace(/\/$/, '')}/chat/completions`;

		const requestBody = {
			model: request.model || this.settings.model,
			messages: request.messages,
			temperature: request.temperature ?? this.settings.temperature,
			max_tokens: request.max_tokens ?? this.settings.maxTokens,
			stream: true
		};

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${this.settings.apiKey}`
				},
				body: JSON.stringify(requestBody)
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`API请求失败: ${response.status} ${response.statusText}\n${errorText}`);
			}

			// 优先尝试按SSE读取
			const reader = response.body?.getReader();
			if (reader) {
				const decoder = new TextDecoder();
				let fullContent = '';
				let buffer = '';

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });

					while (true) {
						const newlineIndex = buffer.indexOf('\n');
						if (newlineIndex < 0) break;
						const line = buffer.slice(0, newlineIndex).trim();
						buffer = buffer.slice(newlineIndex + 1);

						if (!line.startsWith('data:')) continue;
						const payload = line.slice(5).trim();
						if (!payload) continue;

						if (payload === '[DONE]') {
							return fullContent;
						}

						try {
							const json = JSON.parse(payload);
							const content = json.choices?.[0]?.delta?.content;
							if (content) {
								fullContent += content;
								if (onChunk) onChunk(content);
							}
						} catch (_) {
							// 忽略非JSON行
						}
					}
				}

				return fullContent;
			}

			// 回退为一次性JSON
			const data: ChatCompletionResponse = await response.json();
			if (!data.choices || data.choices.length === 0) {
				throw new Error('API返回数据格式错误');
			}
			const content = data.choices[0]?.message?.content || '';
			if (onChunk && content) onChunk(content);
			return content;
		} catch (error) {
			console.error('OpenAI API请求错误:', error);
			if (error instanceof Error) {
				throw error;
			} else {
				throw new Error('API请求失败: 未知错误');
			}
		}
	}

	// （保留）自定义与流式方法；其他便捷方法已移除，统一通过模板/自定义指令调用

	// 自定义处理
	async customProcess(text: string, instruction: string): Promise<string> {
		return this.chatCompletion({
			model: this.settings.model,
			messages: [
				{ role: 'system', content: this.settings.systemPrompt },
				{ role: 'user', content: `${instruction}\\n\\n${text}` }
			]
		});
	}

	// 流式自定义处理（委托到统一 chatCompletion）
	async customProcessStream(text: string, instruction: string, onChunk: (chunk: string) => void): Promise<string> {
		return this.chatCompletion({
			model: this.settings.model,
			messages: [
				{ role: 'system', content: this.settings.systemPrompt },
				{ role: 'user', content: `${instruction}\n\n${text}` }
			]
		}, onChunk);
	}
}