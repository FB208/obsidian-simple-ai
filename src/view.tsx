import { App, ItemView, WorkspaceLeaf, Editor, TFile, TFolder, MarkdownView, Modal } from 'obsidian';
import { createRoot, Root } from 'react-dom/client';
import React, { useEffect, useMemo, useState } from 'react';
import { OpenAIAPI } from './api';
import SimpleAIPlugin from '../main';

export const VIEW_TYPE_SIMPLE_AI = 'simple-ai-view';

interface ChatMessageItem {
    role: 'user' | 'assistant';
    content: string;
}

const MAX_SELECTION_PREVIEW = 300;

const AIChatSidebar: React.FC<{
    app: App;
    api: OpenAIAPI;
    getEditor: () => Editor | null;
}> = ({ app, api, getEditor }) => {
    const [messages, setMessages] = useState<ChatMessageItem[]>([]);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<TFile[]>([]);
    const [selectionPreview, setSelectionPreview] = useState('');
    const [selectionFull, setSelectionFull] = useState('');
    const [rootFolder, setRootFolder] = useState<TFolder | null>(null);

    // 预载根目录用于文档选择弹窗
    useEffect(() => {
        setRootFolder(app.vault.getRoot());
    }, [app]);

    // 实时同步选中文本（简短预览）
    useEffect(() => {
        const updateSelection = () => {
            const editor = getEditor();
            if (!editor) {
                return; // 保留已有预览，避免切换侧边栏时清空
            }
            const sel = editor.getSelection();
            const trimmed = sel ? sel.toString().trim() : '';
            if (trimmed) {
                setSelectionFull(trimmed);
                const preview = trimmed.length > MAX_SELECTION_PREVIEW
                    ? trimmed.slice(0, MAX_SELECTION_PREVIEW) + '…'
                    : trimmed;
                setSelectionPreview(preview);
            }
        };

        updateSelection();
        const handler = () => updateSelection();
        document.addEventListener('selectionchange', handler);
        const intervalId = window.setInterval(updateSelection, 500);
        return () => {
            document.removeEventListener('selectionchange', handler);
            window.clearInterval(intervalId);
        };
    }, [getEditor]);

    const selectedFileNames = useMemo(
        () => selectedFiles.map(f => f.basename),
        [selectedFiles]
    );

    const clearSelectionPreview = () => { setSelectionPreview(''); setSelectionFull(''); };

    const openDocPicker = () => {
        if (!rootFolder) return;
        new DocPickerModal(app, rootFolder, selectedFiles, (files) => {
            setSelectedFiles(files);
        }).open();
    };

    const handleSend = async () => {
        const prompt = input.trim();
        if (!prompt) return;
        setIsSending(true);
        setMessages(prev => [...prev, { role: 'user', content: prompt }]);

        try {
            // 聚合上下文：选中文本 + 选中文档内容
            const contextParts: string[] = [];
            if (selectionFull) {
                contextParts.push(`【当前选中内容】\n${selectionFull}`);
            }
            if (selectedFiles.length > 0) {
                const docs = await Promise.all(
                    selectedFiles.map(async (f) => {
                        const content = await app.vault.read(f);
                        return `# ${f.basename}\n${content}`;
                    })
                );
                contextParts.push(`【选中文档】\n${docs.join('\n\n---\n\n')}`);
            }

            const contextText = contextParts.join('\n\n');
            const userMessage = contextText
                ? `请结合以下上下文回答：\n\n${contextText}\n\n【用户问题】\n${prompt}`
                : prompt;

            // 先插入一个空的assistant消息并流式填充
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

            await api.chatCompletionStream([
                { role: 'system', content: (api as any).settings.systemPrompt },
                { role: 'user', content: userMessage }
            ], (chunk) => {
                setMessages(prev => {
                    const next = [...prev];
                    const lastIndex = next.length - 1;
                    if (lastIndex >= 0 && next[lastIndex].role === 'assistant') {
                        next[lastIndex] = { role: 'assistant', content: (next[lastIndex] as any).content + chunk } as ChatMessageItem;
                    }
                    return next;
                });
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : '未知错误';
            setMessages(prev => [...prev, { role: 'assistant', content: `出错：${msg}` }]);
        } finally {
            setIsSending(false);
            setInput('');
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (_) {}
    };

    return (
        <div className="simple-ai-modal" style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="simple-ai-header">
                <h3>Simple AI 对话</h3>
            </div>
            {/* 对话区 */}
            <div className="simple-ai-content" style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minHeight: 0 }}>
                <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--background-modifier-border)', borderRadius: 6, padding: 12, minHeight: 0 }}>
                    {messages.length === 0 && (
                        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>开始对话吧，选择文档可作为上下文。</div>
                    )}
                    {messages.map((m, idx) => (
                        <div key={idx} style={{
                            display: 'flex',
                            justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                            margin: '8px 0'
                        }}>
                            <div style={{
                                maxWidth: '80%',
                                background: m.role === 'user' ? 'var(--interactive-accent)' : 'var(--background-primary-alt)',
                                color: m.role === 'user' ? 'var(--text-on-accent)' : 'var(--text-normal)',
                                padding: '8px 10px',
                                borderRadius: 8,
                                position: 'relative',
                                border: m.role === 'assistant' ? '1px solid var(--background-modifier-border)' : 'none'
                            }}>
                                <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'var(--font-monospace)', fontSize: 13 }}>{m.content}</pre>
                                {m.role === 'assistant' && (
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                                        <button
                                            className="simple-ai-result-btn"
                                            style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                            onClick={() => copyToClipboard(m.content)}
                                            title="复制"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* 上下文区（置于对话与输入之间） */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="simple-ai-input-section" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <button className="simple-ai-result-btn" onClick={openDocPicker}>选择文档</button>
                        {selectedFileNames.length > 0 && (
                            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>已选择：{selectedFileNames.join('，')}</div>
                        )}
                    </div>
                    <div className="simple-ai-input-section">
                        <label>当前文档选中内容（上下文）：</label>
                        <div style={{
                            border: '1px dashed var(--background-modifier-border)',
                            borderRadius: 6,
                            padding: 8,
                            minHeight: 40,
                            background: 'var(--background-primary)',
                            position: 'relative'
                        }}>
                            {selectionPreview || <span style={{ color: 'var(--text-muted)' }}>（暂无选中内容，切回编辑器选择文本）</span>}
                            {selectionPreview && (
                                <button className="simple-ai-result-btn" style={{ position: 'absolute', top: 6, right: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} onClick={clearSelectionPreview} title="清除">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="3 6 5 6 21 6"/>
                                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                        <path d="M10 11v6M14 11v6"/>
                                        <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* 输入区固定底部，按钮与输入整合视觉 */}
                <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: 8,
                        border: '1px solid var(--background-modifier-border)',
                        borderRadius: 8,
                        padding: 6,
                        background: 'var(--background-primary)',
                        width: '100%'
                    }}>
                        <textarea
                            className="simple-ai-textarea"
                            rows={3}
                            placeholder="输入消息..."
                            style={{ border: 'none', boxShadow: 'none', outline: 'none' }}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (!isSending && input.trim()) handleSend();
                                }
                            }}
                            disabled={isSending}
                        />
                        <button
                            className={`simple-ai-result-btn ${isSending ? 'loading' : 'primary'}`}
                            onClick={handleSend}
                            disabled={isSending || !input.trim()}
                            style={{ height: 36 }}
                        >
                            {isSending ? '发送中...' : '发送'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export class SimpleAIView extends ItemView {
    private plugin: SimpleAIPlugin;
    private root: Root | null = null;
    private api: OpenAIAPI;
    private editor: Editor | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: SimpleAIPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.api = new OpenAIAPI(plugin.settings);
    }

    getViewType(): string {
        return VIEW_TYPE_SIMPLE_AI;
    }

    getDisplayText(): string {
        return 'Simple AI';
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        // 让侧边栏内容充满叶子高度，避免底部空白
        this.containerEl.style.height = '100%';
        contentEl.style.height = '100%';

        // 同步最新设置
        this.api.updateSettings(this.plugin.settings);

        this.root = createRoot(contentEl);
        this.root.render(
            <AIChatSidebar
                app={this.app}
                api={this.api}
                getEditor={() => this.editor ?? this.app.workspace.getActiveViewOfType<any>(MarkdownView)?.editor ?? null}
            />
        );
    }

    async onClose() {
        if (this.root) {
            this.root.unmount();
            this.root = null;
        }
        const { contentEl } = this;
        contentEl.empty();
    }

    // 外部可设置当前编辑器
    setContext(editor: Editor, _initialText: string) {
        this.editor = editor;
    }
}

// 文档选择弹窗（多选 + 搜索）
class DocPickerModal extends Modal {
    private root: TFolder;
    private selected: Set<string>;
    private onConfirm: (files: TFile[]) => void;
    private query: string = '';
    private expanded: Set<string> = new Set();

    constructor(app: App, root: TFolder, preselected: TFile[], onConfirm: (files: TFile[]) => void) {
        super(app);
        this.root = root;
        this.onConfirm = onConfirm;
        this.selected = new Set(preselected.map(f => f.path));
        this.expanded.add(root.path);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h3', { text: '选择文档' });

        const search = contentEl.createEl('input', { type: 'text', attr: { placeholder: '搜索文档...' } });
        search.style.width = '100%';
        search.style.margin = '8px 0';
        search.addEventListener('input', () => {
            this.query = search.value.trim().toLowerCase();
            renderList();
        });

        const listContainer = contentEl.createDiv();
        listContainer.style.maxHeight = '50vh';
        listContainer.style.overflowY = 'auto';
        listContainer.style.border = '1px solid var(--background-modifier-border)';
        listContainer.style.borderRadius = '6px';
        listContainer.style.padding = '6px';

        const btnBar = contentEl.createDiv();
        btnBar.style.display = 'flex';
        btnBar.style.justifyContent = 'flex-end';
        btnBar.style.gap = '8px';
        btnBar.style.marginTop = '10px';

        const cancelBtn = btnBar.createEl('button', { text: '取消' });
        cancelBtn.onclick = () => this.close();
        const okBtn = btnBar.createEl('button', { text: '确定', cls: 'mod-cta' });
        okBtn.onclick = () => {
            const chosen: TFile[] = [];
            const collect = (folder: TFolder) => {
                folder.children.forEach((child: any) => {
                    if (child instanceof TFolder) collect(child);
                    else if (child instanceof TFile) {
                        if (this.selected.has(child.path)) chosen.push(child);
                    }
                });
            };
            collect(this.root);
            this.onConfirm(chosen);
            this.close();
        };

        const renderList = () => {
            listContainer.empty();

            const renderFolder = (folder: TFolder, depth: number) => {
                // 过滤：若有查询，仅保留名称或子树中包含匹配文件的文件夹
                const matchesFolder = folder.name.toLowerCase().includes(this.query);
                const matchingChildren = folder.children.filter((c: any) => {
                    if (c instanceof TFolder) return true; // 递归时判断
                    if (c instanceof TFile) return c.basename.toLowerCase().includes(this.query);
                    return false;
                });

                const header = listContainer.createDiv();
                header.style.display = 'flex';
                header.style.alignItems = 'center';
                header.style.gap = '6px';
                header.style.padding = '4px 2px';
                header.style.cursor = 'pointer';
                header.style.marginLeft = `${depth * 12}px`;
                header.style.color = 'var(--text-muted)';
                const caretWrapper = header.createDiv();
                caretWrapper.style.width = '14px';
                caretWrapper.style.height = '14px';
                const ns = 'http://www.w3.org/2000/svg';
                const caret = document.createElementNS(ns, 'svg');
                caret.setAttribute('width', '14');
                caret.setAttribute('height', '14');
                caret.setAttribute('viewBox', '0 0 24 24');
                const poly = document.createElementNS(ns, 'polyline');
                poly.setAttribute('points', '9 6 15 12 9 18');
                poly.setAttribute('fill', 'none');
                poly.setAttribute('stroke', 'currentColor');
                poly.setAttribute('stroke-width', '2');
                poly.setAttribute('stroke-linecap', 'round');
                poly.setAttribute('stroke-linejoin', 'round');
                caret.appendChild(poly);
                caret.style.transform = this.expanded.has(folder.path) ? 'rotate(90deg)' : 'none';
                caret.style.transformOrigin = '50% 50%';
                caretWrapper.appendChild(caret);
                header.createEl('strong', { text: folder.name || '/' });
                header.onclick = () => {
                    if (this.expanded.has(folder.path)) this.expanded.delete(folder.path); else this.expanded.add(folder.path);
                    renderList();
                };

                if (!this.expanded.has(folder.path)) return;

                folder.children.forEach((child: any) => {
                    if (child instanceof TFolder) {
                        // 如果有查询时，可选择仅在存在匹配后代时渲染
                        if (this.query) {
                            // 粗略渲染，子树是否含有匹配：递归检测（轻量实现：总是渲染，再由文件级过滤控制显示）
                        }
                        renderFolder(child, depth + 1);
                    } else if (child instanceof TFile) {
                        if (this.query && !child.basename.toLowerCase().includes(this.query)) return;
                        const row = listContainer.createDiv();
                        row.style.display = 'flex';
                        row.style.alignItems = 'center';
                        row.style.gap = '8px';
                        row.style.padding = '4px 2px';
                        row.style.marginLeft = `${(depth + 1) * 12}px`;
                        const cb = row.createEl('input', { type: 'checkbox' }) as HTMLInputElement;
                        cb.checked = this.selected.has(child.path);
                        cb.onchange = () => {
                            if (cb.checked) this.selected.add(child.path); else this.selected.delete(child.path);
                        };
                        row.createEl('span', { text: child.basename });
                    }
                });
            };

            renderFolder(this.root, 0);
        };

        renderList();
    }
}


