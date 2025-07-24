import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import * as Three from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";

@customElement("model-importer")
export class ModelImporter extends LitElement {
    @property({ type: Object })
    model: Three.Mesh | null = null;
    @property({ type: Object })
    glbFile: File | null = null;

    private loader = new GLTFLoader();
    render() {
        return html`
            <input type="file" accept=".glb" @change=${this.handleFileUpload} />
            ${this.model ? html`<div>Model loaded successfully!</div>` : ""}
        `;
    }

    private handleFileUpload(e: Event) {
        const input = e.target as HTMLInputElement;
        if (!input.files?.length) return;

        this.glbFile = input.files[0];
        const reader = new FileReader();

        reader.onload = (event) => {
            const arrayBuffer = event.target?.result as ArrayBuffer;
            this.loadGLB(arrayBuffer);
        };

        reader.readAsArrayBuffer(this.glbFile);
    }

    private loadGLB(arrayBuffer: ArrayBuffer) {
        this.loader.parse(
            arrayBuffer,
            "",
            (gltf) => {
                // 查找第一个 Mesh
                let mesh: Three.Mesh | null = null;
                gltf.scene.traverse((child) => {
                    if (child instanceof Three.Mesh && !mesh) {
                        mesh = child;
                    }
                });

                if (!mesh) {
                    this.dispatchEvent(
                        new CustomEvent("load-error", {
                            detail: { message: "模型中未找到有效的网格" },
                        })
                    );
                    return;
                }

                this.model = mesh;
                this.dispatchEvent(
                    new CustomEvent("model-loaded", {
                        detail: {
                            model: mesh,
                            glbFile: this.glbFile,
                        },
                    })
                );
            },
            (error) => {
                console.error("GLB loading failed:", error);
                this.dispatchEvent(
                    new CustomEvent("load-error", {
                        detail: { message: error.message },
                    })
                );
            }
        );
    }
}
