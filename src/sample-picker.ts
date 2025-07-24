import * as Three from "three";

export interface SamplingOptions {
    gridStep?: number;
    useMultiDirections?: boolean;
    debug?: boolean;
    batchSize?: number;
    onProgress?: (progress: number) => void;
}

/**
 * 采样模型到三维颜色网格
 * @param model Three.js 模型对象
 * @param options 采样选项
 * @returns 三维数组，每个元素为颜色值(THREE.Color)或null
 */
export async function sampleModelToGrid(
    model: Three.Mesh,
    options: SamplingOptions = {}
): Promise<(Three.Color | null)[][][]> {
    // 1. 初始化参数
    const bbox = new Three.Box3().setFromObject(model);
    if (bbox.isEmpty()) {
        throw new Error("Invalid model: Empty bounding box");
    }

    const {
        gridStep = bbox.max.x / 5,
        useMultiDirections = true,
        debug = false,
        batchSize = 100,
        onProgress,
    } = options;

    const center = bbox.getCenter(new Three.Vector3());
    const size = bbox.getSize(new Three.Vector3());

    // 2. 计算网格尺寸
    const gridSize = [
        Math.ceil(size.x / gridStep) + 1,
        Math.ceil(size.y / gridStep) + 1,
        Math.ceil(size.z / gridStep) + 1,
    ];

    if (debug) {
        console.log({
            bbox,
            center,
            size,
            gridSize,
            gridStep,
        });
    }

    // 3. 准备射线方向
    const directions = useMultiDirections
        ? [
              new Three.Vector3(0, 1, 0), // 上
              new Three.Vector3(0, -1, 0), // 下
              new Three.Vector3(1, 0, 0), // 右
              new Three.Vector3(-1, 0, 0), // 左
              new Three.Vector3(0, 0, 1), // 前
              new Three.Vector3(0, 0, -1), // 后
          ]
        : [new Three.Vector3(0, 1, 0)];

    // 4. 初始化工具
    const raycaster = new Three.Raycaster();
    const position = new Three.Vector3();
    const result: (Three.Color | null)[][][] = Array(gridSize[2])
        .fill(null)
        .map(() =>
            Array(gridSize[1])
                .fill(null)
                .map(() => Array(gridSize[0]).fill(null))
        );

    // 5. 获取颜色函数
    function getColorFromMesh(
        intersection: Three.Intersection
    ): Three.Color | null {
        const mesh = intersection.object as Three.Mesh;

        // 尝试获取顶点颜色
        if (intersection.face) {
            const geometry = mesh.geometry;
            if (geometry instanceof Three.BufferGeometry) {
                const colorAttr = geometry.getAttribute("color");
                if (colorAttr) {
                    // 使用重心坐标插值获取更准确的颜色
                    const face = intersection.face;
                    const [a, b, c] = [face.a, face.b, face.c];
                    const colors = [
                        new Three.Color().fromBufferAttribute(colorAttr, a),
                        new Three.Color().fromBufferAttribute(colorAttr, b),
                        new Three.Color().fromBufferAttribute(colorAttr, c),
                    ];
                    const uvw = intersection.uv || { x: 1 / 3, y: 1 / 3 };

                    // 添加调试信息
                    if (debug) {
                        console.log("Vertex Colors:", {
                            a: colors[0].toArray(),
                            b: colors[1].toArray(),
                            c: colors[2].toArray(),
                            uv: uvw,
                        });
                    }

                    // 确保颜色值在正确范围内
                    const color = new Three.Color();
                    color
                        .copy(colors[0])
                        .multiplyScalar(uvw.x)
                        .add(colors[1].multiplyScalar(uvw.y))
                        .add(colors[2].multiplyScalar(1 - uvw.x - uvw.y));

                    // 规范化颜色值
                    color.r = Math.max(0, Math.min(1, color.r));
                    color.g = Math.max(0, Math.min(1, color.g));
                    color.b = Math.max(0, Math.min(1, color.b));

                    return color;
                }
            }
        }

        // 尝试获取材质颜色
        // 修改 getColorFromMesh 函数中获取材质颜色的部分
        if (mesh.material) {
            const material = Array.isArray(mesh.material)
                ? mesh.material[0]
                : mesh.material;

            // 处理不同类型的材质
            if (
                material instanceof Three.MeshStandardMaterial ||
                material instanceof Three.MeshPhongMaterial ||
                material instanceof Three.MeshBasicMaterial
            ) {
                // 优先使用 map 纹理的颜色
                if (material.map) {
                    const uv = intersection.uv;
                    if (uv) {
                        // 从纹理中获取颜色
                        const canvas = document.createElement("canvas");
                        const ctx = canvas.getContext("2d");
                        const image = material.map.image;

                        if (image && ctx) {
                            canvas.width = image.width;
                            canvas.height = image.height;
                            ctx.drawImage(image, 0, 0);

                            const pixel = ctx.getImageData(
                                Math.floor(uv.x * image.width),
                                Math.floor((1 - uv.y) * image.height),
                                1,
                                1
                            ).data;

                            return new Three.Color(
                                pixel[0] / 255,
                                pixel[1] / 255,
                                pixel[2] / 255
                            );
                        }
                    }
                }

                // 如果没有纹理，使用材质基础颜色
                if (material.color instanceof Three.Color) {
                    const color = material.color.clone();

                    // 应用材质的其他属性
                    if (
                        "emissive" in material &&
                        material.emissive instanceof Three.Color
                    ) {
                        color.add(material.emissive);
                    }

                    // 添加调试信息
                    if (debug) {
                        console.log("Material Properties:", {
                            type: material.type,
                            baseColor: material.color.toArray(),
                            finalColor: color.toArray(),
                            hasMap: !!material.map,
                            hasEmissive: "emissive" in material,
                        });
                    }

                    return color;
                }
            }
        }

        // 如果没有获取到颜色，返回默认颜色（白色）而不是 null
        return new Three.Color(1, 1, 1);
    }

    const totalWork = gridSize[2] * gridSize[1] * gridSize[0];
    let completedWork = 0;
    // 批处理函数
    async function processBatch(startZ: number, endZ: number): Promise<void> {
        for (let z = startZ; z < endZ; z++) {
            for (let y = 0; y < gridSize[1]; y++) {
                if (debug) {
                    console.log(
                        `Processing layer ${z}/${gridSize[2]}, row ${y}/${gridSize[1]}`
                    );
                }

                // 一次处理一行，避免过多的中断
                const row: (Three.Color | null)[] = [];
                for (let x = 0; x < gridSize[0]; x++) {
                    position.set(
                        center.x - size.x / 2 + x * gridStep,
                        center.y - size.y / 2 + y * gridStep,
                        center.z - size.z / 2 + z * gridStep
                    );

                    let closestIntersection: Three.Intersection | null = null;
                    let minDistance = Infinity;

                    for (const direction of directions) {
                        raycaster.set(position, direction);
                        const intersects = raycaster.intersectObject(
                            model,
                            true
                        );

                        if (
                            intersects.length > 0 &&
                            intersects[0].distance < minDistance
                        ) {
                            closestIntersection = intersects[0];
                            minDistance = intersects[0].distance;
                        }
                    }

                    row.push(
                        closestIntersection
                            ? getColorFromMesh(closestIntersection)
                            : null
                    );
                    completedWork++;
                }

                result[z][y] = row;

                // 每行完成后更新进度
                if (onProgress) {
                    onProgress(completedWork / totalWork);
                }
            }

            // 让出主线程
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
    }
    const batchCount = Math.ceil(gridSize[2] / batchSize);
    for (let i = 0; i < batchCount; i++) {
        const startZ = i * batchSize;
        const endZ = Math.min(startZ + batchSize, gridSize[2]);
        await processBatch(startZ, endZ);
    }

    return result;
}
