import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { Document } from "@gltf-transform/core";

@customElement("model-info-panel")
export class ModelInfoPanel extends LitElement {
    @property({ type: Object })
    model: Document | null = null;

    @state()
    private showDetails = {
        scene: true,
        nodes: false,
        meshes: false,
        materials: false,
        animations: false,
        metadata: true,
    };

    static styles = css`
        :host {
            display: block;
            padding: 1rem;
            font-family: Arial, sans-serif;
            max-height: 80vh;
            overflow-y: auto;
        }
        .section {
            margin-bottom: 1.5rem;
            border: 1px solid #eee;
            border-radius: 8px;
            padding: 0.5rem 1rem;
            background: #f9f9f9;
        }
        summary {
            font-weight: bold;
            cursor: pointer;
            padding: 0.5rem 0;
            display: block;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 0.5rem 0;
        }
        th,
        td {
            padding: 0.3rem 0.5rem;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f5f5f5;
        }
        .metadata {
            font-size: 0.9em;
            color: #555;
        }
    `;

    render() {
        if (!this.model) {
            return html`
                <div class="section">
                    <p>未加载模型</p>
                </div>
            `;
        }

        return html`
            <div>
                ${this.renderSceneInfo()} ${this.renderNodes()}
                ${this.renderMeshes()} ${this.renderMaterials()}
                ${this.renderAnimations()} ${this.renderMetadata()}
            </div>
        `;
    }

    private renderSceneInfo() {
        const scene = this.model?.getRoot().listScenes()[0];
        const nodesCount = scene?.listChildren().length || 0;

        return html`
            <div class="section">
                <details
                    @toggle="${() => this.toggleSection("scene")}"
                >
                    <summary>场景信息</summary>
                    <table>
                        <tr>
                            <th>属性</th>
                            <th>值</th>
                        </tr>
                        <tr>
                            <td>场景名称</td>
                            <td>${scene?.getName() || "N/A"}</td>
                        </tr>
                        <tr>
                            <td>节点数量</td>
                            <td>${nodesCount}</td>
                        </tr>
                        <tr>
                            <td>活动场景</td>
                            <td>
                                ${this.model?.getRoot().getDefaultScene()
                                    ? "是"
                                    : "否"}
                            </td>
                        </tr>
                    </table>
                </details>
            </div>
        `;
    }

    private renderNodes() {
        const nodes = this.model?.getRoot().listNodes() || [];

        return html`
            <div class="section">
                <details
                    ?open="${this.showDetails.nodes}"
                    @toggle="${() => this.toggleSection("nodes")}"
                >
                    <summary>节点信息 (${nodes.length} 个节点)</summary>
                    <table>
                        <tr>
                            <th>名称</th>
                            <th>类型</th>
                            <th>子节点</th>
                            <th>网格</th>
                        </tr>
                        ${nodes.map(
                            (node) => html`
                                <tr>
                                    <td>${node.getName() || "无名称"}</td>
                                    <td>
                                        ${node.getTranslation().length > 0
                                            ? "带变换"
                                            : "无变换"}
                                    </td>
                                    <td>${node.listChildren().length}</td>
                                    <td>${node.getMesh() ? "是" : "否"}</td>
                                </tr>
                            `
                        )}
                    </table>
                </details>
            </div>
        `;
    }

    private renderMeshes() {
        const meshes = this.model?.getRoot().listMeshes() || [];

        return html`
            <div class="section">
                <details
                    ?open="${this.showDetails.meshes}"
                    @toggle="${() => this.toggleSection("meshes")}"
                >
                    <summary>网格信息 (${meshes.length} 个网格)</summary>
                    <table>
                        <tr>
                            <th>名称</th>
                            <th>子网格数</th>
                            <th>顶点数</th>
                            <th>材质</th>
                        </tr>
                        ${meshes.map((mesh) => {
                            const primitives = mesh.listPrimitives();
                            const totalVertices = mesh
                                .listPrimitives()
                                .reduce((sum, prim) => {
                                    const position =
                                        prim.getAttribute("POSITION");
                                    return (
                                        sum +
                                        (position ? position.getCount() : 0)
                                    );
                                }, 0);

                            return html`
                                <tr>
                                    <td>${mesh.getName() || "无名称"}</td>
                                    <td>${primitives.length}</td>
                                    <td>${totalVertices}</td>
                                    <td>
                                        ${primitives
                                            .map(
                                                (p) =>
                                                    p
                                                        .getMaterial()
                                                        ?.getName() || "无材质"
                                            )
                                            .join(", ")}
                                    </td>
                                </tr>
                            `;
                        })}
                    </table>
                </details>
            </div>
        `;
    }

    private renderMaterials() {
        const materials = this.model?.getRoot().listMaterials() || [];

        return html`
            <div class="section">
                <details
                    ?open="${this.showDetails.materials}"
                    @toggle="${() => this.toggleSection("materials")}"
                >
                    <summary>材质信息 (${materials.length} 个材质)</summary>
                    <table>
                        <tr>
                            <th>名称</th>
                            <th>基础颜色</th>
                            <th>金属度/粗糙度</th>
                            <th>双面</th>
                        </tr>
                        ${materials.map((material) => {
                            const baseColor = material.getBaseColorFactor();
                            return html`
                                <tr>
                                    <td>${material.getName() || "无名称"}</td>
                                    <td>
                                        [${baseColor
                                            .map((c) => c.toFixed(2))
                                            .join(", ")}]
                                    </td>
                                    <td>
                                        ${material
                                            .getMetallicFactor()
                                            .toFixed(2)}
                                        /
                                        ${material
                                            .getRoughnessFactor()
                                            .toFixed(2)}
                                    </td>
                                    <td>
                                        ${material.getDoubleSided()
                                            ? "是"
                                            : "否"}
                                    </td>
                                </tr>
                            `;
                        })}
                    </table>
                </details>
            </div>
        `;
    }

    private renderAnimations() {
        const animations = this.model?.getRoot().listAnimations() || [];

        return html`
            <div class="section">
                <details
                    ?open="${this.showDetails.animations}"
                    @toggle="${() => this.toggleSection("animations")}"
                >
                    <summary>动画信息 (${animations.length} 个动画)</summary>
                    <table>
                        <tr>
                            <th>名称</th>
                            <th>通道数</th>
                            <th>时长</th>
                            <th>播放速度</th>
                        </tr>
                        ${animations.map((animation) => {
                            const channels = animation.listChannels();
                            return html`
                                <tr>
                                    <td>${animation.getName() || "无名称"}</td>
                                    <td>${channels.length}</td>
                                </tr>
                            `;
                        })}
                    </table>
                </details>
            </div>
        `;
    }

    private renderMetadata() {
        const root = this.model?.getRoot();

        return html`
            <div class="section metadata">
                <details
                    @toggle="${() => this.toggleSection("metadata")}"
                >
                    <summary>元数据</summary>
                    <div style="margin: 0.5rem 0;">
                        <div>访问器数量: ${root?.listAccessors().length}</div>
                        <div>
                            扩展:
                            ${Object.keys(
                                root?.listExtensionsUsed() || {}
                            ).join(", ") || "无"}
                        </div>
                    </div>
                </details>
            </div>
        `;
    }

    private toggleSection(section: keyof typeof this.showDetails) {
        this.showDetails = {
            ...this.showDetails,
            [section]: !this.showDetails[section],
        };
    }
}
