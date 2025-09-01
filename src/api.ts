import { SimpleAISettings, ChatCompletionRequest, ChatCompletionResponse } from './types';

// OpenAI API 兼容接口类
export class OpenAIAPI {
	private settings: SimpleAISettings;

	constructor(settings: SimpleAISettings) {
		this.settings = settings;
	}

	// 更新设置
	updateSettings(settings: SimpleAISettings) {
		this.settings = settings;
	}

	// 发送聊天完成请求
	async chatCompletion(request: ChatCompletionRequest): Promise<string> {
		if (!this.settings.apiKey) {
			throw new Error('API密钥未设置');
		}

		const url = `${this.settings.baseUrl.replace(/\/$/, '')}/chat/completions`;
		
		const requestBody: ChatCompletionRequest = {
			model: this.settings.model,
			messages: request.messages,
			temperature: this.settings.temperature,
			max_tokens: this.settings.maxTokens,
			...request
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
				throw new Error(`API请求失败: ${response.status} ${response.statusText}\\n${errorText}`);
			}

			const data: ChatCompletionResponse = await response.json();
			
			if (!data.choices || data.choices.length === 0) {
				throw new Error('API返回数据格式错误');
			}

			return data.choices[0].message.content;
		} catch (error) {
			console.error('OpenAI API请求错误:', error);
			if (error instanceof Error) {
				throw error;
			} else {
				throw new Error('API请求失败: 未知错误');
			}
		}
	}

	// 改进文本
	async improveText(text: string, customPrompt?: string): Promise<string> {
		const prompt = customPrompt || '请改进以下文本，使其更加清晰、准确和流畅：';
		
		return this.chatCompletion({
			model: this.settings.model,
			messages: [
				{ role: 'system', content: this.settings.systemPrompt },
				{ role: 'user', content: `${prompt}\\n\\n${text}` }
			]
		});
	}

	// 缩短文本
	async shortenText(text: string): Promise<string> {
		return this.chatCompletion({
			model: this.settings.model,
			messages: [
				{ role: 'system', content: this.settings.systemPrompt },
				{ role: 'user', content: `请将以下文本缩短，保持主要信息和观点：\\n\\n${text}` }
			]
		});
	}

	// 扩展文本
	async expandText(text: string): Promise<string> {
		return this.chatCompletion({
			model: this.settings.model,
			messages: [
				{ role: 'system', content: this.settings.systemPrompt },
				{ role: 'user', content: `请扩展以下文本，添加更多细节和解释：\\n\\n${text}` }
			]
		});
	}

	// 翻译文本
	async translateText(text: string, targetLanguage: string = '英语'): Promise<string> {
		return this.chatCompletion({
			model: this.settings.model,
			messages: [
				{ role: 'system', content: this.settings.systemPrompt },
				{ role: 'user', content: `请将以下文本翻译成${targetLanguage}：\\n\\n${text}` }
			]
		});
	}

	// 总结文本
	async summarizeText(text: string): Promise<string> {
		return this.chatCompletion({
			model: this.settings.model,
			messages: [
				{ role: 'system', content: this.settings.systemPrompt },
				{ role: 'user', content: `请总结以下文本的主要内容：\\n\\n${text}` }
			]
		});
	}

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

	// 流式自定义处理
	async customProcessStream(text: string, instruction: string, onChunk: (chunk: string) => void): Promise<string> {
		if (!this.settings.apiKey) {
			throw new Error('API密钥未设置');
		}

		const url = `${this.settings.baseUrl.replace(/\/$/, '')}/chat/completions`;
		
		const requestBody = {
			model: this.settings.model,
			messages: [
				{ role: 'system', content: this.settings.systemPrompt },
				{ role: 'user', content: `${instruction}\\n\\n${text}` }
			],
			temperature: this.settings.temperature,
			max_tokens: this.settings.maxTokens,
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
				throw new Error(`API请求失败: ${response.status} ${response.statusText}\\n${errorText}`);
			}

			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error('无法获取响应流');
			}

			const decoder = new TextDecoder();
			let fullContent = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				const lines = chunk.split('\\n');

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						const data = line.slice(6).trim();
						
						if (data === '[DONE]') {
							return fullContent;
						}

						try {
							const json = JSON.parse(data);
							const content = json.choices?.[0]?.delta?.content;
							if (content) {
								fullContent += content;
								onChunk(content);
							}
						} catch (e) {
							// 忽略解析错误的行
						}
					}
				}
			}

			return fullContent;
		} catch (error) {
			console.error('流式API请求错误:', error);
			if (error instanceof Error) {
				throw error;
			} else {
				throw new Error('API请求失败: 未知错误');
			}
		}
	}
}