import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";


import "./glb-file-importer"; // 导入新组件
import "./model-info-panel";
import "./neo-model-viewer";
import "./model-viewer";

import type { Document } from "@gltf-transform/core";
import { simplifyDocument } from "./simplifyDoc";
import { docToVoxels } from "./docToBlock";
import { voxelsToObject } from "./rgbToObj";

import * as THREE from "three";


@customElement("neo-main-page")
export class MainComponent extends LitElement {
    @state()
    currentDoc: Document | null = null;

    @state()
    private simplifyDocument: Document | null = null;

    @state()
    private object3D: THREE.Object3D | null = null;

    private ratio: number = 0;
    render() {
        return html`
            <h1>3D Model Viewer</h1>
            <button @click=${this.simplify}>simplify Model</button>
            <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value="0"
                id="simplify-ratio"
                @input=${this.changeSimplifyRatio}
            />
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
                <div style="width: 50%;">
                    ${html`<model-viewer
                        .model=${this.object3D}
                    ></model-viewer>`}

                </div>
            </div>
        `;
    }

    static styles = css`
        :host {
            height: 100vh;
        }
        #model-viewer-container {
            display: flex;
            flex-direction: row;
            gap: 20px;
            align-items: flex-start;
            justify-content: center;
            height: 100%;
            overflow: scroll;
        }
    `;

    private changeSimplifyRatio(e: InputEvent) {
        this.ratio = (e.target as HTMLInputElement).valueAsNumber;
    }

    private async simplify() {
        if (!this.currentDoc) {
            alert("请选择模型");
        } else {
            console.log("开始简化模型");
            try {
                this.simplifyDocument = await simplifyDocument(
                    this.currentDoc,
                    { ratio: this.ratio }
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
                // 应用数据处理函数
                const voxels = await docToVoxels(this.currentDoc, { resolution: 32 });
                console.log("模型转换为体素数据:", voxels);
                const object3D = voxelsToObject(voxels, 1.0);
                this.object3D = object3D;
                console.log("模型处理完成", this.object3D);
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
