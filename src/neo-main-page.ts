import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import "./glb-file-importer"; // 导入新组件
import "./model-info-panel";
import "./neo-model-viewer";
import type { Document } from "@gltf-transform/core";
import { simplifyDocument } from "./simplifyDoc";

@customElement("neo-main-page")
export class MainComponent extends LitElement {
    @state()
    currentDoc: Document | null = null;

    @state()
    private simplifyDocument: Document | null = null;

    private ratio: number = 0.5;
    render() {
        return html`
            <h1>3D Model Viewer</h1>
            <button @click=${this.simplify}>simplify Model</button>
            <input type="range" min="0" max="1" step="0.01" value="0" id="simplify-ratio" @input=${this.changeSimplifyRatio}/>
            <!-- 模型导入组件 -->
            <glb-file-importer
                @model-loaded=${this.handleModelLoaded}
                @load-error=${this.handleLoadError}
            ></glb-file-importer>

            <!-- 模型展示组件 -->
            <div id="model-viewer-container">
                <div style="width: 50%;">
                    ${html`<neo-model-viewer
                        .model=${this.currentDoc}
                    ></neo-model-viewer>`}
                    <h2>模型信息</h2>
                    <model-info-panel
                        .model=${this.currentDoc}
                    ></model-info-panel>
                </div>
                <div style="width: 50%;">
                    ${html`<neo-model-viewer
                        .model=${this.simplifyDocument}
                    ></neo-model-viewer>`}
                    <h2>模型信息</h2>
                    <model-info-panel
                        .model=${this.simplifyDocument}
                    ></model-info-panel>
                </div>
            </div>
        `;
    }


    static styles = css`
        :host {
            height: 100vh;
        }
        model-viewer {
            width: 50%;
        }
        #model-viewer-container {
            display: flex;
            flex-direction: row;
            align-items: flex-start;
            justify-content: center;
            height: 100%;
        }
    `;

    private changeSimplifyRatio(e: InputEvent) {
      this.ratio= (e.target as HTMLInputElement).valueAsNumber;
    }

    private async simplify() {
        if (!this.currentDoc) {
            alert("请选择模型");
        } else {
            console.log("开始简化模型");
            try {
                this.simplifyDocument = await simplifyDocument(
                    this.currentDoc,
                    this.ratio
                );
            } catch (error) {
                console.error("模型处理过程中出错:", error);
            }

            console.log("模型简化完成");
        }
    }

    private async handleModelLoaded(e: CustomEvent) {
        this.currentDoc = e.detail.model as Document;
        if (this.currentDoc) {
            console.log("模型加载成功:", this.currentDoc);
            try {
            } catch (error) {
                console.error("模型处理过程中出错:", error);
                alert("模型处理失败: " + (error as Error).message);
            }
        }
    }

    private handleLoadError(e: CustomEvent) {
        console.error("Model load error:", e.detail.message);
        alert(`Failed to load model: ${e.detail.message}`);
    }
}
