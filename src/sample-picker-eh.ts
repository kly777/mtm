import {
    Document,
    NodeIO,
    Accessor,
    Primitive,
    Material,
    vec3,
    Mat4,
} from "@gltf-transform/core";

export interface SamplingOptions {
    gridStep?: number;
    debug?: boolean;
    onProgress?: (progress: number) => void;
}

/**
 * 采样模型到三维颜色网格
 */
export async function sampleModelToGrid(
    file: File,
    options: SamplingOptions = {}
): Promise<([number, number, number] | null)[][][]> {
    const { debug = false, onProgress } = options;

    // 1. 加载文件
    const io = new NodeIO();
    const arrayBuffer = await file.arrayBuffer();
    const document = await io.readBinary(new Uint8Array(arrayBuffer));

    // 2. 计算边界盒
    const bbox = {
        min: new Float32Array(3),
        max: new Float32Array(3),
    };
    bbox.min.set([Infinity, Infinity, Infinity]);
    bbox.max.set([-Infinity, -Infinity, -Infinity]);

    // 遍历所有网格计算边界盒
    document
        .getRoot()
        .listMeshes()
        .forEach((mesh) => {
            mesh.listPrimitives().forEach((primitive: Primitive) => {
                const position = primitive.getAttribute("POSITION");
                if (!position) return;

                const target = new Float32Array(3);
                for (let i = 0; i < position.getCount(); i++) {
                    const vertex = position.getElement(i, target);
                    for (let j = 0; j < 3; j++) {
                        bbox.min[j] = Math.min(bbox.min[j], vertex[j]);
                        bbox.max[j] = Math.max(bbox.max[j], vertex[j]);
                    }
                }
            });
        });

    // 3. 计算网格参数
    const size = new Float32Array(3);
    for (let i = 0; i < 3; i++) {
        size[i] = bbox.max[i] - bbox.min[i];
    }

    const gridStep = options.gridStep || size[0] / 5;
    const gridSize = [
        Math.ceil(size[0] / gridStep) + 1,
        Math.ceil(size[1] / gridStep) + 1,
        Math.ceil(size[2] / gridStep) + 1,
    ];

    if (debug) {
        console.log({
            bbox: {
                min: Array.from(bbox.min),
                max: Array.from(bbox.max),
            },
            size: Array.from(size),
            gridSize,
            gridStep,
        });
    }

    // 4. 创建结果数组
    const result: ([number, number, number] | null)[][][] = Array(gridSize[2])
        .fill(null)
        .map(() =>
            Array(gridSize[1])
                .fill(null)
                .map(() => Array(gridSize[0]).fill(null))
        );

    // 5. 遍历网格采样颜色
    let completedWork = 0;
    const totalWork = gridSize[2] * gridSize[1] * gridSize[0];

    const point = new Float32Array(3);
    const target = new Float32Array(3);

    for (const mesh of document.getRoot().listMeshes()) {
        for (const primitive of mesh.listPrimitives()) {
            const position = primitive.getAttribute("POSITION");
            const colors = primitive.getAttribute("COLOR_0");
            const material = primitive.getMaterial();

            if (!position) continue;

            for (let z = 0; z < gridSize[2]; z++) {
                for (let y = 0; y < gridSize[1]; y++) {
                    for (let x = 0; x < gridSize[0]; x++) {
                        point.set([
                            bbox.min[0] + x * gridStep,
                            bbox.min[1] + y * gridStep,
                            bbox.min[2] + z * gridStep,
                        ]);

                        const color = getColorAtPoint(
                            point,
                            primitive,
                            position,
                            colors,
                            material,
                            target
                        );

                        if (color) {
                            result[z][y][x] = color;
                        }

                        completedWork++;
                        if (onProgress) {
                            onProgress(completedWork / totalWork);
                        }
                    }
                }
                await new Promise((resolve) => setTimeout(resolve, 0));
            }
        }
    }

    return result;
}

function getColorAtPoint(
    point: Float32Array,
    primitive: Primitive,
    position: Accessor,
    colors: Accessor | null,
    material: Material | undefined,
    target: Float32Array
): [number, number, number] | null {
    if (colors) {
        let minDist = Infinity;
        let closestColor: number[] | null = null;

        for (let i = 0; i < position.getCount(); i++) {
            const vertex = position.getElement(i, target);
            const dist = vec3.distance(point, target);

            if (dist < minDist) {
                minDist = dist;
                const colorTarget = new Float32Array(4);
                closestColor = Array.from(colors.getElement(i, colorTarget));
            }
        }

        if (closestColor && minDist < 0.01) {
            return [closestColor[0], closestColor[1], closestColor[2]];
        }
    }

    if (material) {
        const baseColor = material.getBaseColorFactor();
        if (baseColor) {
            return [baseColor[0], baseColor[1], baseColor[2]];
        }
    }

    return null;
}
