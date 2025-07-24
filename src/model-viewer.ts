import { html, LitElement, css } from "lit";
import { customElement, property, state, query } from "lit/decorators.js";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

@customElement("model-viewer")
export class ModelViewer extends LitElement {
    @property({ type: Object })
    model: THREE.Object3D | null = null;

    @state() private isLoading = false;
    @state() private error = "";

    @query("#viewer-container")
    private container!: HTMLDivElement;

    private renderer!: THREE.WebGLRenderer;
    private camera!: THREE.PerspectiveCamera;
    private scene!: THREE.Scene;
    private controls!: OrbitControls;
    private modelGroup: THREE.Group | null = null;

    static styles = css`
        :host {
            height: 100%;
            position: relative;
            min-height: 400px;
        }
        #viewer-container {
            width: 100%;
            height: 100%;
            min-height: 400px;
        }
        .loading-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10;
        }
    `;

    render() {
        return html`
            <div id="viewer-container"></div>
            ${this.isLoading
                ? html`
                      <div class="loading-overlay">
                          <div>模型加载中...</div>
                      </div>
                  `
                : ""}
            ${this.error
                ? html`
                      <div class="loading-overlay" style="background:#e74c3c">
                          <div>加载失败</div>
                          <div style="font-size:0.8em">${this.error}</div>
                      </div>
                  `
                : ""}
        `;
    }

    firstUpdated() {
        this.initThreeJS();
        this.handleModelChange();
    }

    updated(changedProperties: Map<string, any>) {
        console.log("changedProperties", changedProperties);
        if (changedProperties.has("model")) {
            this.handleModelChange();
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener("resize", this.onWindowResize);
        this.cleanup();
    }

    private initThreeJS() {
        // 初始化渲染器
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(
            this.container.clientWidth,
            this.container.clientHeight
        );
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // 初始化场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);

        // 初始化相机
        this.camera = new THREE.PerspectiveCamera(
            45,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(1, 1, 1);

        // 初始化控制器
        this.controls = new OrbitControls(
            this.camera,
            this.renderer.domElement
        );
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // 添加光源
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7.5);
        this.scene.add(directionalLight);

        // 事件监听
        window.addEventListener("resize", this.onWindowResize);

        // 启动渲染循环
        this.animate1();
    }

    private onWindowResize = () => {
        if (!this.container || !this.camera || !this.renderer) return;

        this.camera.aspect =
            this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(
            this.container.clientWidth,
            this.container.clientHeight
        );
    };

    private animate1 = () => {
        this.animationId = requestAnimationFrame(this.animate1);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    };

    private animationId: number = 0;

    private async handleModelChange() {
        if (!this.model) return;

        this.isLoading = true;
        this.error = "";

        try {
            // 清除旧模型
            this.clearModel();

            // 转换并加载模型
            this.modelGroup?.add(this.model); // ✅ 直接赋值
            this.scene.add(this.model);

            // 调整相机视角
            if (this.modelGroup) {
                this.adjustCameraToModel(this.modelGroup);
            }
        } catch (error) {
            this.error =
                error instanceof Error ? error.message : "模型加载失败";
            console.error("模型转换错误:", error);
        } finally {
            this.isLoading = false;
        }
    }

    private clearModel() {
        if (this.modelGroup) {
            this.scene.remove(this.modelGroup);
            this.modelGroup.traverse((object) => {
                if (object instanceof THREE.Mesh) {
                    object.geometry.dispose();
                    if (Array.isArray(object.material)) {
                        object.material.forEach((m) => m.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            this.modelGroup = null;
        }
    }

    private adjustCameraToModel(model: THREE.Group) {
        // 计算模型包围盒
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        // 调整相机位置
        this.camera.position.set(
            center.x + maxDim,
            center.y + maxDim * 0.5,
            center.z + maxDim
        );
        this.camera.lookAt(center);
        this.camera.updateProjectionMatrix();
        this.controls.update();
    }

    private cleanup() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.controls.dispose();
        this.renderer.dispose();
        this.clearModel();
    }
}
