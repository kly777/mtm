import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { WebIO } from "@gltf-transform/core";

@customElement("glb-file-importer")
export class GlbFileImporter extends LitElement {
    // 公共属性
    @property({ type: Boolean }) allowMultiFile = false;
    @property({ type: Number }) minFileSize = 0; // KB
    @property({ type: Number }) maxFileSize = 1024 * 100; // 默认100MB

    // 响应式状态
    @state() private isLoading = false;
    @state() private progress = 0;
    @state() private error = "";
    @state() private fileName = "";

    // gltfTransform加载器实例
    private io = new WebIO();

    static styles = css`
        :host {
            display: block;
            padding: 1rem;
            border: 2px dashed #ccc;
            border-radius: 8px;
            transition: all 0.3s ease;
        }
        .uploader {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 2rem;
            cursor: pointer;
        }
        input[type="file"] {
            display: none;
        }
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #eee;
            margin-top: 1rem;
            border-radius: 4px;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            width: 0%;
            background: #4caf50;
            transition: width 0.3s ease;
        }
        .error {
            color: #e74c3c;
            margin-top: 1rem;
        }
    `;

    render() {
        return html`
            <div
                class="uploader"
                @click=${() => this.fileInput?.click()}
                ?disabled=${this.isLoading}
            >
                <input
                    type="file"
                    accept=".glb"
                    ?multiple=${this.allowMultiFile}
                    @change=${this.handleFileSelect}
                    hidden
                    id="file-input"
                />
                <label for="file-input">
                    ${this.isLoading
                        ? "正在加载..."
                        : this.fileName || "点击选择GLB文件"}
                </label>

                <div class="progress-bar">
                    <div
                        class="progress-fill"
                        style="width: ${this.progress}%"
                    ></div>
                </div>

                ${this.error
                    ? html` <div class="error">${this.error}</div> `
                    : ""}
            </div>
        `;
    }

    // 获取文件输入元素
    private get fileInput() {
        return this.renderRoot?.querySelector(
            "#file-input"
        ) as HTMLInputElement | null;
    }

    // 文件选择处理
    private handleFileSelect(e: Event) {
        const input = e.target as HTMLInputElement;
        if (!input.files?.length) return;

        const files = Array.from(input.files);

        // 重置状态
        this.error = "";
        this.progress = 0;

        // 验证文件
        const validFiles = files.filter((file) => {
            if (file.size < this.minFileSize * 1024) {
                this.error = `文件太小（最小 ${this.minFileSize}KB）`;
                return false;
            }
            if (file.size > this.maxFileSize * 1024) {
                this.error = `文件太大（最大 ${this.maxFileSize}KB）`;
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) return;

        // 处理第一个文件（单文件模式）
        const file = validFiles[0];
        this.fileName = file.name;

        // 创建文件阅读器
        const reader = new FileReader();
        reader.onload = (event) => {
            const arrayBuffer = event.target?.result as ArrayBuffer;
            this.loadGLB(arrayBuffer);
        };
        reader.onprogress = (e) => {
            if (e.lengthComputable) {
                this.progress = (e.loaded / e.total) * 100;
            }
        };
        reader.readAsArrayBuffer(file);
    }

    // 加载GLB文件
    private async loadGLB(arrayBuffer: ArrayBuffer) {
        this.isLoading = true;
        this.progress = 0;

        try {
            const document = await this.io.readBinary(
                new Uint8Array(arrayBuffer)
            );
            this.isLoading = false;
            this.progress = 100;

            const scene = document.getRoot().listScenes()[0];
            if (!scene) {
                throw new Error("模型中未找到有效场景");
            }
            this.dispatchEvent(
                new CustomEvent("model-loaded", {
                    detail: {
                        model: document,
                        glbFile: this.fileName,
                    },
                })
            );
        } catch (error) {
            this.isLoading = false;
            this.error =
                error instanceof Error ? error.message : "模型加载失败";
            console.error("GLB加载错误:", error);

            this.dispatchEvent(
                new CustomEvent("load-error", {
                    detail: {
                        message: this.error,
                        error,
                    },
                })
            );
        }
    }
}
