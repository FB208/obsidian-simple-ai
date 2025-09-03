import {
  App,
  ItemView,
  WorkspaceLeaf,
  Editor,
  TFile,
  TFolder,
  MarkdownView,
  Modal,
  TAbstractFile,
} from "obsidian";
import { createRoot, Root } from "react-dom/client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { OpenAIAPI } from "./api";
import SimpleAIPlugin from "../main";
import { SimpleAISettings, ChatMessage } from "./types";

export const VIEW_TYPE_SIMPLE_AI = "simple-ai-view";

interface ChatMessageItem {
  role: "user" | "assistant";
  content: string;
}

const MAX_SELECTION_PREVIEW = 120;

interface AIChatSidebarProps {
  app: App;
  api: OpenAIAPI;
  getEditor: () => Editor | null;
  settings: SimpleAISettings;
}

const AIChatSidebar: React.FC<AIChatSidebarProps> = ({ app, api, getEditor, settings }) => {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [summary, setSummary] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summarizedRounds, setSummarizedRounds] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const messagesBottomRef = useRef<HTMLDivElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<TFile[]>([]);
  const [selectionPreview, setSelectionPreview] = useState("");
  const [selectionFull, setSelectionFull] = useState("");
  const [rootFolder, setRootFolder] = useState<TFolder | null>(null);
  const [currentFile, setCurrentFile] = useState<TFile | null>(null);

  // 预载根目录用于文档选择弹窗
  useEffect(() => {
    setRootFolder(app.vault.getRoot());
  }, [app]);

  // 监听当前活动文档变化
  useEffect(() => {
    const updateCurrentFile = () => {
      const activeView = app.workspace.getActiveViewOfType(MarkdownView);
      if (activeView && activeView.file) {
        setCurrentFile(activeView.file);
      }
      // 注意：这里不设置为null，保持之前的文档状态
      // 只有在真正有新的MarkdownView文档时才更新
    };

    // 初始化当前文档
    updateCurrentFile();

    // 监听叶子变化，但需要区分是文档切换还是焦点切换
    const handleLeafChange = (leaf: any) => {
      // 只有当新叶子是MarkdownView且有文件时才更新
      if (leaf && leaf.view instanceof MarkdownView && leaf.view.file) {
        setCurrentFile(leaf.view.file);
      }
      // 如果切换到其他类型的叶子（如侧边栏），不清空currentFile
    };

    // 监听文件打开事件
    const handleFileOpen = (file: any) => {
      if (file) {
        setCurrentFile(file);
      }
    };

    app.workspace.on('active-leaf-change', handleLeafChange);
    app.workspace.on('file-open', handleFileOpen);

    return () => {
      app.workspace.off('active-leaf-change', handleLeafChange);
      app.workspace.off('file-open', handleFileOpen);
    };
  }, [app]);

  // 对话更新时自动滚动到底部（用户发送 + AI 流式）
  useEffect(() => {
    const el = messagesScrollRef.current;
    const bottom = messagesBottomRef.current;
    if (!el) return;
    const doScroll = () => {
      // 直接设置容器滚动位置
      el.scrollTop = el.scrollHeight;
      // 同时使用底部锚点，兼容某些环境的滚动行为
      if (bottom) bottom.scrollIntoView({ behavior: "auto", block: "end" });
    };
    // 双 rAF，确保布局与高度变更已完成
    requestAnimationFrame(() => {
      doScroll();
      requestAnimationFrame(doScroll);
    });
  }, [messages]);

  // 实时同步选中文本（简短预览）
  useEffect(() => {
    const updateSelection = () => {
      const editor = getEditor();
      if (!editor) {
        return; // 保留已有预览，避免切换侧边栏时清空
      }
      const sel = editor.getSelection();
      const trimmed = sel ? sel.toString().trim() : "";
      if (trimmed) {
        setSelectionFull(trimmed);
        const preview =
          trimmed.length > MAX_SELECTION_PREVIEW
            ? trimmed.slice(0, MAX_SELECTION_PREVIEW) + "…"
            : trimmed;
        setSelectionPreview(preview);
      }
    };

    updateSelection();
    const handler = () => updateSelection();
    document.addEventListener("selectionchange", handler);
    const intervalId = window.setInterval(updateSelection, 500);
    return () => {
      document.removeEventListener("selectionchange", handler);
      window.clearInterval(intervalId);
    };
  }, [getEditor]);

  // 获取显示的文件列表（当前文档 + 选中文档，去重）
  const displayFiles = useMemo(() => {
    const files = [];
    
    // 第一个位置显示当前活动文档
    if (currentFile) {
      files.push(currentFile);
    }
    
    // 添加其他选中文档（排除当前文档）
    const otherFiles = selectedFiles.filter(f => !currentFile || f.path !== currentFile.path);
    files.push(...otherFiles);
    
    return files;
  }, [currentFile, selectedFiles]);

  const selectedFileNames = useMemo(
    () => displayFiles.map((f) => f.basename),
    [displayFiles]
  );

  const removeSelectedFile = (fileToRemove: TFile) => {
    setSelectedFiles(prev => prev.filter(f => f.path !== fileToRemove.path));
  };

  const clearSelectionPreview = () => {
    setSelectionPreview("");
    setSelectionFull("");
  };

  const openDocPicker = () => {
    if (!rootFolder) return;
    new DocPickerModal(app, rootFolder, selectedFiles, (files) => {
      setSelectedFiles(files);
    }).open();
  };

  const handleClear = () => {
    setMessages([]);
    setSummary("");
    setSummarizedRounds(0);
  };

  const handleSend = async () => {
    const prompt = input.trim();
    if (!prompt) return;
    setIsSending(true);
    setMessages((prev) => [...prev, { role: "user", content: prompt }]);
    // 发送后立即清空并保持焦点
    setInput("");
    if (inputRef.current) inputRef.current.focus();

    try {
      // 捕获发送前的历史快照（不包含随后插入的assistant占位）
      const prevMessages = messages;

      // 聚合上下文：选中文本 + 选中文档内容
      const contextParts: string[] = [];
      if (selectionFull) {
        contextParts.push(`【当前选中内容】\n${selectionFull}`);
      }
      if (displayFiles.length > 0) {
        const docs = await Promise.all(
          displayFiles.map(async (f) => {
            const content = await app.vault.read(f);
            return `# ${f.basename}\n${content}`;
          })
        );
        contextParts.push(`【选中文档】\n${docs.join("\n\n---\n\n")}`);
      }

      const contextText = contextParts.join("\n\n");
      const userMessage = contextText
        ? `请结合以下上下文回答：\n\n${contextText}\n\n【用户问题】\n${prompt}`
        : prompt;

      // 先插入一个空的assistant消息并流式填充
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      // 构建携带历史的消息（包含可选摘要）。若已存在摘要，仅携带“未入摘要”的最近对话。
      const summarizedMessageCount = summarizedRounds * 2; // 每轮2条（user+assistant）
      const unsummarizedMessages = prevMessages
        .slice(summarizedMessageCount)
        .map((m) => ({ role: m.role, content: m.content }));
      const historyPayload = summary
        ? unsummarizedMessages
        : prevMessages.map((m) => ({ role: m.role, content: m.content }));
      const systemContent = summary
        ? `${settings.systemPrompt}\n\n【此前对话摘要】\n${summary}`
        : settings.systemPrompt;
      const sendMessages = [
        { role: "system", content: systemContent },
        ...historyPayload,
        { role: "user", content: userMessage },
      ];

      await api.chatCompletionStream(sendMessages as ChatMessage[], (chunk) => {
        setMessages((prev) => {
          const next = [...prev];
          const lastIndex = next.length - 1;
          if (lastIndex >= 0 && next[lastIndex].role === "assistant") {
            next[lastIndex] = {
              role: "assistant",
              content: next[lastIndex].content + chunk,
            };
          }
          return next;
        });
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "未知错误";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `出错：${msg}` },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // 每完成5轮（user+assistant为一轮）对话后，将这5轮汇总入摘要
  useEffect(() => {
    const completedRounds = Math.floor(messages.length / 2);
    const pendingRounds = completedRounds - summarizedRounds;
    if (!isSending && pendingRounds >= 5 && !isSummarizing) {
      setIsSummarizing(true);
      (async () => {
        try {
          const startIdx = summarizedRounds * 2;
          const endIdx = startIdx + 5 * 2; // 5轮 = 10条消息
          const chunk = messages.slice(startIdx, endIdx);
          const convoText = chunk
            .map((m) => (m.role === "user" ? "用户：" : "助手：") + m.content)
            .join("\n");
          const summarizeInstruction =
            "你将维护一个持续更新的对话摘要。若提供了“此前摘要”，请在其基础上增量更新并去重；否则直接从对话生成摘要。要求：简洁、覆盖主题/关键结论/行动项/未解决问题；100-200字；直接输出摘要内容（简体中文），不要添加任何前缀或标题。";
          const sys = settings.systemPrompt || "";
          const previousSummary = summary ? `【此前摘要】\n${summary}\n\n` : "";
          const result = await api.chatCompletion({
            model: settings.model,
            messages: [
              { role: "system", content: `${sys}\n\n${summarizeInstruction}` },
              {
                role: "user",
                content: `${previousSummary}【对话全文】\n${convoText}\n\n【任务】请输出更新后的摘要。`,
              },
            ],
          });
          if (typeof result === "string") {
            setSummary(result.trim());
            setSummarizedRounds((r) => r + 5);
          }
        } catch (e) {
          console.error("对话摘要失败:", e);
        } finally {
          setIsSummarizing(false);
        }
      })();
    }
  }, [messages, isSending, summarizedRounds, summary]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {}
  };

  return (
    <div
      className="simple-ai-modal"
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="simple-ai-header">
        <h3>简单AI</h3>
      </div>
      {/* 对话区 */}
      <div
        className="simple-ai-content"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          flex: 1,
          minHeight: 0,
        }}
      >
        <div
          ref={messagesScrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            border: "1px solid var(--background-modifier-border)",
            borderRadius: 6,
            padding: 12,
            minHeight: 0,
          }}
        >
          {messages.length === 0 && (
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
              开始对话吧，选择文档可作为上下文。
            </div>
          )}
          {messages.map((m, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                margin: "8px 0",
              }}
            >
              <div
                style={{
                  maxWidth: "80%",
                  background:
                    m.role === "user"
                      ? "var(--interactive-accent)"
                      : "var(--background-primary-alt)",
                  color:
                    m.role === "user"
                      ? "var(--text-on-accent)"
                      : "var(--text-normal)",
                  padding: "8px 10px",
                  borderRadius: 8,
                  position: "relative",
                  border:
                    m.role === "assistant"
                      ? "1px solid var(--background-modifier-border)"
                      : "none",
                }}
              >
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    margin: 0,
                    fontFamily: "var(--font-monospace)",
                    fontSize: 13,
                  }}
                >
                  {m.content}
                </pre>
                {m.role === "assistant" && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginTop: 6,
                    }}
                  >
                    <button
                      className="simple-ai-result-btn"
                      style={{
                        width: 28,
                        height: 28,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                      }}
                      onClick={() => copyToClipboard(m.content)}
                      title="复制"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect
                          x="9"
                          y="9"
                          width="13"
                          height="13"
                          rx="2"
                          ry="2"
                        ></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesBottomRef} />
        </div>

        {/* 上下文区（置于对话与输入之间） */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="simple-ai-input-section">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <button className="simple-ai-result-btn" onClick={openDocPicker}>
                选择文档
              </button>
              {displayFiles.length > 0 && (
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  ({displayFiles.length} 个文档{currentFile ? '，包含当前文档' : ''})
                </span>
              )}
            </div>
            {displayFiles.length > 0 && (
              <div className="doc-tags-container">
                {displayFiles.map((file, index) => {
                  const isCurrentFile = currentFile && file.path === currentFile.path;
                  return (
                    <div key={file.path} className={`doc-tag ${isCurrentFile ? 'current-doc' : ''}`}>
                      <span className="doc-tag-name" title={file.path}>
                        {isCurrentFile ? '📝 ' : ''}{file.basename}
                      </span>
                      <button
                        className="doc-tag-remove"
                        onClick={() => {
                          if (isCurrentFile) {
                            // 当前文档不能移除，只能关闭文档
                            return;
                          }
                          removeSelectedFile(file);
                        }}
                        title={isCurrentFile ? '当前文档不能移除' : `移除 ${file.basename}`}
                        style={{
                          opacity: isCurrentFile ? 0.5 : 1,
                          cursor: isCurrentFile ? 'not-allowed' : 'pointer'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="simple-ai-input-section">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <label>当前文档选中内容（上下文）：</label>
              {selectionFull && (
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  共 {selectionFull.length} 个字符
                </span>
              )}
            </div>
            <div
              style={{
                border: "1px dashed var(--background-modifier-border)",
                borderRadius: 6,
                padding: 8,
                minHeight: 40,
                background: "var(--background-primary)",
                position: "relative",
              }}
            >
              {selectionPreview || (
                <span style={{ color: "var(--text-muted)" }}>
                  （暂无选中内容，切回编辑器选择文本）
                </span>
              )}
              {selectionPreview && (
                <button
                  className="simple-ai-result-btn"
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    width: 28,
                    height: 28,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  }}
                  onClick={clearSelectionPreview}
                  title="清除"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 输入区固定底部，按钮与输入整合视觉 */}
        <div style={{ display: "flex", gap: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              border: "1px solid var(--background-modifier-border)",
              borderRadius: 8,
              padding: 6,
              background: "var(--background-primary)",
              width: "100%",
            }}
          >
            <textarea
              className="simple-ai-textarea"
              rows={3}
              placeholder="输入消息..."
              style={{ border: "none", boxShadow: "none", outline: "none" }}
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!isSending && input.trim()) handleSend();
                }
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button
                className="simple-ai-result-btn"
                onClick={handleClear}
                disabled={isSending || messages.length === 0}
                style={{ height: 36 }}
              >
                清空
              </button>
              <button
                className={`simple-ai-result-btn ${
                  isSending ? "loading" : "primary"
                }`}
                onClick={handleSend}
                disabled={isSending || !input.trim()}
                style={{ height: 36 }}
              >
                {isSending ? "发送中..." : "发送"}
              </button>
            </div>
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
    return "Simple AI";
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    // 让侧边栏内容充满叶子高度，避免底部空白
    this.containerEl.style.height = "100%";
    contentEl.style.height = "100%";

    // 同步最新设置
    this.api.updateSettings(this.plugin.settings);

    this.root = createRoot(contentEl);
    this.root.render(
      <AIChatSidebar
        app={this.app}
        api={this.api}
        getEditor={() =>
          this.editor ??
          this.app.workspace.getActiveViewOfType(MarkdownView)?.editor ??
          null
        }
        settings={this.plugin.settings}
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
  private query: string = "";
  private expanded: Set<string> = new Set();

  constructor(
    app: App,
    root: TFolder,
    preselected: TFile[],
    onConfirm: (files: TFile[]) => void
  ) {
    super(app);
    this.root = root;
    this.onConfirm = onConfirm;
    this.selected = new Set(preselected.map((f) => f.path));
    this.expanded.add(root.path);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "选择文档" });

    const search = contentEl.createEl("input", {
      type: "text",
      attr: { placeholder: "搜索文档..." },
    });
    search.style.width = "100%";
    search.style.margin = "8px 0";
    search.addEventListener("input", () => {
      this.query = search.value.trim().toLowerCase();
      renderList();
    });

    const listContainer = contentEl.createDiv();
    listContainer.style.maxHeight = "50vh";
    listContainer.style.overflowY = "auto";
    listContainer.style.border = "1px solid var(--background-modifier-border)";
    listContainer.style.borderRadius = "6px";
    listContainer.style.padding = "6px";

    const btnBar = contentEl.createDiv();
    btnBar.style.display = "flex";
    btnBar.style.justifyContent = "flex-end";
    btnBar.style.gap = "8px";
    btnBar.style.marginTop = "10px";

    const cancelBtn = btnBar.createEl("button", { text: "取消" });
    cancelBtn.onclick = () => this.close();
    const okBtn = btnBar.createEl("button", { text: "确定", cls: "mod-cta" });
    okBtn.onclick = () => {
      const chosen: TFile[] = [];
      const collect = (folder: TFolder) => {
        folder.children.forEach((child: TAbstractFile) => {
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
        const matchingChildren = folder.children.filter((c: TAbstractFile) => {
          if (c instanceof TFolder) return true; // 递归时判断
          if (c instanceof TFile)
            return c.basename.toLowerCase().includes(this.query);
          return false;
        });

        const header = listContainer.createDiv();
        header.style.display = "flex";
        header.style.alignItems = "center";
        header.style.gap = "6px";
        header.style.padding = "4px 2px";
        header.style.cursor = "pointer";
        header.style.marginLeft = `${depth * 12}px`;
        header.style.color = "var(--text-muted)";
        const caretWrapper = header.createDiv();
        caretWrapper.style.width = "14px";
        caretWrapper.style.height = "14px";
        const ns = "http://www.w3.org/2000/svg";
        const caret = document.createElementNS(ns, "svg");
        caret.setAttribute("width", "14");
        caret.setAttribute("height", "14");
        caret.setAttribute("viewBox", "0 0 24 24");
        const poly = document.createElementNS(ns, "polyline");
        poly.setAttribute("points", "9 6 15 12 9 18");
        poly.setAttribute("fill", "none");
        poly.setAttribute("stroke", "currentColor");
        poly.setAttribute("stroke-width", "2");
        poly.setAttribute("stroke-linecap", "round");
        poly.setAttribute("stroke-linejoin", "round");
        caret.appendChild(poly);
        caret.style.transform = this.expanded.has(folder.path)
          ? "rotate(90deg)"
          : "none";
        caret.style.transformOrigin = "50% 50%";
        caretWrapper.appendChild(caret);
        header.createEl("strong", { text: folder.name || "/" });
        header.onclick = () => {
          if (this.expanded.has(folder.path)) this.expanded.delete(folder.path);
          else this.expanded.add(folder.path);
          renderList();
        };

        if (!this.expanded.has(folder.path)) return;

        folder.children.forEach((child: TAbstractFile) => {
          if (child instanceof TFolder) {
            // 如果有查询时，可选择仅在存在匹配后代时渲染
            if (this.query) {
              // 粗略渲染，子树是否含有匹配：递归检测（轻量实现：总是渲染，再由文件级过滤控制显示）
            }
            renderFolder(child, depth + 1);
          } else if (child instanceof TFile) {
            if (
              this.query &&
              !child.basename.toLowerCase().includes(this.query)
            )
              return;
            const row = listContainer.createDiv();
            row.style.display = "flex";
            row.style.alignItems = "center";
            row.style.gap = "8px";
            row.style.padding = "4px 2px";
            row.style.marginLeft = `${(depth + 1) * 12}px`;
            const cb = row.createEl("input", {
              type: "checkbox",
            }) as HTMLInputElement;
            cb.checked = this.selected.has(child.path);
            cb.onchange = () => {
              if (cb.checked) this.selected.add(child.path);
              else this.selected.delete(child.path);
            };
            row.createEl("span", { text: child.basename });
          }
        });
      };

      renderFolder(this.root, 0);
    };

    renderList();
  }
}
