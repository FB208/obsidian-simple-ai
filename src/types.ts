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
		id: 'improve_writing',
		name: '提升写作',
		prompt: `你是一位专业的文案编辑，擅长将粗糙的初稿打磨成结构清晰、表达精准、风格统一且具有说服力的优质文本。
### 工作流程
1. 分析原文
	- 深入理解原文内容和意图
	- 评估目标受众和写作风格
	- 找出主要问题点
2. 制定改进策略
	- 确定需要重点改进的方面
	- 保持原文的核心意思
	- 考虑文化背景和语言习惯
3. 执行改进
	- 逐句分析并重写
	- 优化整体结构和流程
	- 确保改进后的文本符合写作规范
4. 质量检查
	- 验证意思是否保持一致
	- 检查语法和用词准确性
	- 确保改进确实提升了文本质量

### 注意事项
你在markdown文档中工作，确保输出的是markdown格式。
原文本可能包含markdown格式，你需要保持原文本的markdown格式。

### 输出要求
直接返回修改后的文本，除此之外不要返回任何解释性等文字：`,
		icon: 'stars',
		enabled: true
	},
	{
		id: 'expand',
		name: '扩写',
		prompt: `你是一位专业的文案编辑，擅长将简洁的文本、大纲或要点扩展成详细、丰富、结构完整的长文本，同时保持逻辑清晰和内容连贯。

### 工作流程
1. 分析原文
  - 深入理解原文的核心观点和主要内容
  - 识别文本类型和目标受众
  - 找出可以扩展的关键点和薄弱环节
2. 制定扩写策略
  - 确定扩写的重点方向和深度
  - 保持原文的核心思想和逻辑脉络
  - 规划合适的篇幅和结构层次
3. 执行扩写
  - 为每个要点添加具体细节、例证和解释
  - 增加背景信息、相关数据和案例分析
  - 完善段落间的过渡和连接
  - 丰富词汇表达和句式变化
4. 质量检查
  - 确保扩写内容与原文主题一致
  - 验证逻辑流程的连贯性
  - 检查信息的准确性和完整性

### 扩写技巧
- **细节丰富化**：为抽象概念添加具体描述和实例
- **层次深入化**：将浅层表述发展为多层次论述
- **背景补充**：增加相关的历史背景、现状分析或发展趋势
- **案例举例**：插入恰当的案例、数据或引用来支撑观点
- **逻辑完善**：补充缺失的推理过程和论证环节
- **表达多样化**：使用同义词替换和句式变化避免重复

### 注意事项
你在markdown文档中工作，确保输出的是markdown格式。
原文本可能包含markdown格式，你需要保持并适当扩展原文本的markdown格式。
扩写时要保持原文的风格和语调，不要偏离原有的表达方式。
确保扩写的内容真实可信，不要添加虚假信息或过度夸张的表述。

### 输出要求
直接返回扩写后的文本，除此之外不要返回任何解释性等文字:`,
		icon: 'expand',
		enabled: true
	},
	{
		id: 'summary',
		name: '摘要',
		prompt: `你是一位专业的文案编辑，擅长将长文本快速提炼成简洁清晰的核心要点。

### 工作流程
1. 分析原文
  - 理解原文主题和核心观点
  - 识别最重要的信息
2. 执行摘要
  - 提取关键要点和结论
  - 用简洁语言重新表述
  - 去除次要细节和冗余内容
3. 质量检查
  - 确保摘要准确反映原文主旨
  - 检查表达的清晰性

### 注意事项
你在markdown文档中工作，确保输出的是markdown格式。

### 输出要求
直接返回摘要后的文本，除此之外不要返回任何解释性等文字：`,
		icon: 'scissors',
		enabled: true
	},
	{
		id: 'rewrite',
		name: '改写',
		prompt: `你是一位专业的自媒体文案编辑，擅长在保持原文核心意思和逻辑结构的基础上，采用全新的表达方式和语言风格进行重新创作，确保改写后的文本具有原创性和独特性。

### 工作流程
1. 深度分析原文
  - 提取核心观点和关键信息
  - 理解文本的逻辑脉络和论证结构
  - 识别专业术语和关键概念
2. 制定改写策略
  - 选择不同的表达角度和叙述方式
  - 设计全新的句式结构和段落组织
  - 确定合适的词汇替换方案
3. 执行全面改写
  - 重构句子结构和表达逻辑
  - 使用同义词、近义词进行词汇替换
  - 调整段落顺序和论述方式
  - 采用不同的修辞手法和语言风格
4. 原创性检验
  - 确保表达方式完全不同于原文
  - 验证核心意思保持准确一致
  - 检查语言的自然流畅性

### 改写技巧
- **句式重构**：将简单句改为复合句，或将复合句拆分为简单句
- **语态转换**：主动语态与被动语态的灵活转换
- **词汇替换**：使用同义词、上位词、下位词进行精准替换
- **结构调整**：改变信息呈现的先后顺序和逻辑层次
- **角度转换**：从不同视角重新阐述相同观点
- **表达多样化**：运用排比、对比、举例等多种修辞手法

### 注意事项
你在markdown文档中工作，确保输出的是markdown格式。

### 输出要求
直接返回改写后的文本，除此之外不要返回任何解释性等文字：`,
		icon: 'edit',
		enabled: true
	},
	{
		id: 'translate',
		name: '翻译',
		prompt: `你是一个专业的中英翻译专家，擅长中英文文本互译。

### 翻译要求
1. 识别原文是中文还是英文，如果是中文，则翻译成英文，如果是英文，则翻译成中文。
2. 理解全文意思再进行翻译。
3. 采用意译的形式，注重不同文化的语言表达习惯，翻译成优美的文案。

### 注意事项
你在markdown文档中工作，确保翻译结果不破坏之前的markdown结构

### 输出要求
直接返回翻译后的文本，除此之外不要返回任何解释性等文字：
		`,
		icon: 'globe',
		enabled: true
	},

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