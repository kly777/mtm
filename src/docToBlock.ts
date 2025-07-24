import { Document, Scene } from "@gltf-transform/core";
import { vec3, mat4 } from "gl-matrix";

interface Voxel {
    color: [number, number, number] | null; // RGB颜色值或null表示空
    position: [number, number, number]; // 体素位置
}

interface VoxelizeOptions {
    resolution: number; // 体素化分辨率
    boundsPadding?: number; // 边界填充
}

/**
 * 将3D模型转换为体素数组
 * @param doc GLTF文档
 * @param options 体素化选项
 * @returns 三维数组，每个元素为RGB颜色值或null
 */
export async function docToVoxels(
    doc: Document,
    options: VoxelizeOptions
): Promise<([number, number, number] | null)[][][]> {
    const { resolution, boundsPadding = 0.1 } = options;

    // 1. 计算模型包围盒
    const bounds = calculateBounds(doc);
    const size = vec3.create();
    vec3.subtract(size, bounds.max, bounds.min);

    // 2. 初始化体素网格
    const grid: ([number, number, number] | null)[][][] = Array(resolution)
        .fill(null)
        .map(() =>
            Array(resolution)
                .fill(null)
                .map(() => Array(resolution).fill(null))
        );

    // 计算体素大小
    const voxelSize = Math.max(size[0], size[1], size[2]) / resolution;

    // 3. 遍历场景中的所有网格
    const scene = doc.getRoot().listScenes()[0];
    scene.traverse((node) => {
        const mesh = node.getMesh();
        if (!mesh) return;

        const primitives = mesh.listPrimitives();
        primitives.forEach((primitive) => {
            // 获取顶点位置
            const position = primitive.getAttribute("POSITION");
            // 获取顶点颜色
            const colors = primitive.getAttribute("COLOR_0");
            // 获取材质颜色
            const material = primitive.getMaterial();

            if (position) {
                const count = position.getCount();
                const vertex = vec3.create();
                const worldMatrix = node.getWorldMatrix();

                for (let i = 0; i < count; i++) {
                    // 获取顶点位置
                    position.getElement(i, [vertex[0], vertex[1], vertex[2]]);
                    // 应用世界变换
                    vec3.transformMat4(vertex, vertex, worldMatrix);

                    // 计算对应的体素坐标
                    const vx = Math.floor(
                        (vertex[0] - bounds.min[0]) / voxelSize
                    );
                    const vy = Math.floor(
                        (vertex[1] - bounds.min[1]) / voxelSize
                    );
                    const vz = Math.floor(
                        (vertex[2] - bounds.min[2]) / voxelSize
                    );

                    if (
                        vx >= 0 &&
                        vx < resolution &&
                        vy >= 0 &&
                        vy < resolution &&
                        vz >= 0 &&
                        vz < resolution
                    ) {
                        // 获取颜色信息
                        let color: [number, number, number] = [255, 255, 255];

                        if (colors) {
                            // 使用顶点颜色
                            colors.getElement(i, color);
                            color = color.map((c) => Math.round(c * 255)) as [
                                number,
                                number,
                                number
                            ];
                        } else if (material) {
                            // 使用材质基础颜色
                            const baseColor = material.getBaseColorFactor();
                            color = [
                                Math.round(baseColor[0] * 255),
                                Math.round(baseColor[1] * 255),
                                Math.round(baseColor[2] * 255),
                            ];
                        }

                        grid[vx][vy][vz] = color;
                    }
                }
            }
        });
    });

    return grid;
}

/**
 * 计算模型包围盒
 */
function calculateBounds(doc: Document) {
    const bounds = {
        min: vec3.fromValues(Infinity, Infinity, Infinity),
        max: vec3.fromValues(-Infinity, -Infinity, -Infinity),
    };

    const scene = doc.getRoot().listScenes()[0];
    scene.traverse((node) => {
        const mesh = node.getMesh();
        if (mesh) {
            const primitives = mesh.listPrimitives();
            primitives.forEach((primitive) => {
                const position = primitive.getAttribute("POSITION");
                if (position) {
                    const count = position.getCount();
                    const vertex = vec3.create();

                    for (let i = 0; i < count; i++) {
                        position.getElement(i, [
                            vertex[0],
                            vertex[1],
                            vertex[2],
                        ]);
                        vec3.min(bounds.min, bounds.min, vertex);
                        vec3.max(bounds.max, bounds.max, vertex);
                    }
                }
            });
        }
    });

    return bounds;
}
