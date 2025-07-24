import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import * as Three from 'three'
import { GLTFLoader } from "three/examples/jsm/Addons.js";


@customElement('model-importer')
export class ModelImporter extends LitElement {
  @property({ type: Object })
  model: Three.Object3D | null = null;

  private loader = new GLTFLoader();
  render() {
    return html`
      <input type="file" accept=".glb" @change=${this.handleFileUpload}>
      ${this.model ? html`<div>Model loaded successfully!</div>` : ''}
    `;
  }

  private handleFileUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      this.loadGLB(arrayBuffer);
    };

    reader.readAsArrayBuffer(file);
  }

  private loadGLB(arrayBuffer: ArrayBuffer) {
    this.loader.parse(
      arrayBuffer,
      '',
      (gltf) => {
        this.model = gltf.scene;
        this.dispatchEvent(new CustomEvent('model-loaded', {
          detail: { model: this.model }
        }));
      },
      (error) => {
        console.error('GLB loading failed:', error);
        this.dispatchEvent(new CustomEvent('load-error', {
          detail: { message: error.message }
        }));
      }
    );
  }
}