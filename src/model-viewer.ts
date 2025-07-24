import { html, LitElement, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

@customElement("model-viewer")
export class ModelViewer extends LitElement {
    @property({ type: Object })
    model: THREE.Object3D | null = null;

    static styles = css`
        :host {
            display: block;
            width: 100%;
            height: 100%;
        }
        canvas {
            width: 100%;
            height: 100%;
            display: block;
        }
    `;

    private renderer?: THREE.WebGLRenderer;
    private camera?: THREE.PerspectiveCamera;
    private scene?: THREE.Scene;
    private controls?: OrbitControls;
    private animationId?: number;

    firstUpdated() {
        const canvas = this.renderRoot.querySelector(
            "canvas"
        ) as HTMLCanvasElement;
        const width = this.offsetWidth || 600;
        const height = this.offsetHeight || 400;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            60,
            width / height,
            0.1,
            1000
        );
        this.camera.position.set(0, 1, 2);

        this.renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
        });
        this.renderer.setSize(width, height);

        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(5, 10, 7.5);
        this.scene.add(light);

        const ambient = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambient);

        if (this.model) {
            this.scene.add(this.model);
        }

        this.controls = new OrbitControls(this.camera, canvas);
        this.controls.enableDamping = true;

        this.animate1();
    }

    updated(changedProps: Map<string, any>) {
        if (changedProps.has("model") && this.scene && this.model) {
            // 移除旧模型
            this.scene.clear();
            // 重新添加灯光
            const light = new THREE.DirectionalLight(0xffffff, 1);
            light.position.set(5, 10, 7.5);
            this.scene.add(light);
            const ambient = new THREE.AmbientLight(0xffffff, 0.5);
            this.scene.add(ambient);
            // 添加新模型
            this.scene.add(this.model);
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.controls?.dispose();
        this.renderer?.dispose();
    }

    animate1 = () => {
        this.animationId = requestAnimationFrame(this.animate1);
        this.controls?.update();
        this.renderer?.render(this.scene!, this.camera!);
    };

    render() {
        return html`<canvas></canvas>`;
    }
}
