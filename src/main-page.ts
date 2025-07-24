import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import * as Three from "three";

import "./model-importer"; // 导入新组件
import { sampleModelToGrid } from "./sample-picker";
import "./model-viewer";

@customElement("main-page")
export class MainComponent extends LitElement {
    @property({ type: Object })
    currentModel: Three.Object3D | null = null;

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
        if (this.currentModel) {
            // 添加调试日志并正确处理Promise
            console.log("Starting model sampling...");

            const result = await sampleModelToGrid(this.currentModel, {
                gridStep: 0.1,
                debug: true,
                batchSize: 100,
                onProgress: (progress) => {
                    console.log(`采样进度: ${Math.round(progress * 100)}%`);
                },
            });
            console.log(result);
        }
    }

    private handleLoadError(e: CustomEvent) {
        console.error("Model load error:", e.detail.message);
        alert(`Failed to load model: ${e.detail.message}`);
    }
}
