import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import * as Three from "three";

import "./model-importer"; // 导入新组件
import { sampleModelToGrid } from "./sample-picker";
import "./model-viewer";


@customElement("main-page")
export class MainComponent extends LitElement {
    @property({ type: Object })
    currentModel: Three.Mesh | null = null;
    currentGLBFile: File | null = null;

    render() {
        return html`
            <h1>3D Model Viewer</h1>

            <!-- 模型导入组件 -->
            <model-importer
                @model-loaded=${this.handleModelLoaded}
                @load-error=${this.handleLoadError}
            ></model-importer>

            <!-- 模型展示组件 -->
            ${html`<model-viewer .model=${this.currentModel}></model-viewer>`}
        `;
    }

    static styles = css`
        :host {
            height: 100vh;
        }
        model-viewer {
            width: 50%;
        }
    `;

    private async handleModelLoaded(e: CustomEvent) {
        this.currentModel = e.detail.model;
        this.currentGLBFile = e.detail.glbFile;
        if (this.currentModel) {
            // 简化模型
            console.log("模型加载成功:", this.currentModel);
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
