import { LitElement, html, css } from "lit";
import { property, state } from "lit/decorators.js";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export class VoxelModelViewer extends LitElement {
    @property({ type: Object })
    model: THREE.Group | null = null;

    @state() private _initialized = false;

    private container: HTMLElement | null = null;
    private renderer: THREE.WebGLRenderer | null = null;
    private scene: THREE.Scene | null = null;
    private camera: THREE.PerspectiveCamera | null = null;
    private controls: OrbitControls | null = null;

    static styles = css`
        :host {
            display: block;
            width: 100%;
            height: 100%;
            position: relative;
        }
        canvas {
            display: block;
            width: 100%;
            height: 100%;
        }
    `;

    connectedCallback() {
        super.connectedCallback();
        this._initializeThreeJS();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._disposeThreeJS();
    }

    private _initializeThreeJS() {
        if (this._initialized) return;

        // 创建场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xeeeeee);

        // 创建相机
        const container = this.renderRoot.querySelector(
            "#container"
        ) as HTMLElement;
        const width = container.clientWidth;
        const height = container.clientHeight;

        this.camera = new THREE.PerspectiveCamera(
            45,
            width / height,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 10);

        // 创建渲染器
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.renderRoot.querySelector(
                "canvas"
            ) as HTMLCanvasElement,
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        // 创建轨道控制器
        this.controls = new OrbitControls(
            this.camera,
            this.renderer.domElement
        );
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 20;

        // 添加灯光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1).normalize();
        this.scene.add(directionalLight);

        // 添加地面
        const gridHelper = new THREE.GridHelper(10, 10);
        this.scene.add(gridHelper);

        this._initialized = true;
        this._animate();
    }

    private _disposeThreeJS() {
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }
        if (this.scene) {
            this.scene.clear();
            this.scene = null;
        }
        if (this.controls) {
            this.controls.dispose();
            this.controls = null;
        }
        this.camera = null;
    }

    willUpdate(changedProperties: Map<string, any>) {
        super.willUpdate(changedProperties);

        if (
            changedProperties.has("model") &&
            this.model &&
            this.scene &&
            this.renderer
        ) {
            // 移除旧模型
            this.scene.children.forEach((child) => {
                if (
                    child instanceof THREE.Group &&
                    child !== this.scene?.children[0]
                ) {
                    this.scene!.remove(child);
                }
            });

            // 添加新模型
            this.scene.add(this.model);
        }
    }

    private _animate() {
        requestAnimationFrame(this._animate.bind(this));

        if (this.controls && this.renderer && this.scene && this.camera) {
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
        }
    }

    protected render() {
        return html`
            <div id="container" style="width: 100%; height: 100%;">
                <canvas style="width: 100%; height: 100%;"></canvas>
            </div>
        `;
    }
}

customElements.define("voxel-model-viewer", VoxelModelViewer);
