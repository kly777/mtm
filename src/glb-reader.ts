import { NodeIO } from "@gltf-transform/core";

interface GLBInfo {
    // 基本信息
    scenes: Array<{
        name: string;
        nodeCount: number;
    }>;
    // 网格信息
    meshes: Array<{
        name: string;
        primitiveCount: number;
        vertexCount: number;
        triangleCount: number;
        hasVertexColors: boolean;
        materials: string[];
    }>;
    // 材质信息
    materials: Array<{
        name: string;
        baseColor: [number, number, number, number];
        hasTexture: boolean;
        textureSize?: Uint8Array<ArrayBufferLike> | null | undefined;
    }>;
    // 动画信息
    animations: Array<{
        name: string;
        channels: string[];
    }>;
    // 总体统计
    stats: {
        totalVertices: number;
        totalTriangles: number;
        totalTextures: number;
        boundingBox: {
            min: [number, number, number];
            max: [number, number, number];
        };
    };
}

/**
 * 分析GLB文件并返回详细信息
 * @param file GLB文件对象
 * @returns GLB文件的详细信息
 */
export async function analyzeGLB(file: File): Promise<GLBInfo> {
    const io = new NodeIO();
    const arrayBuffer = await file.arrayBuffer();
    const document = await io.readBinary(new Uint8Array(arrayBuffer));
    const result: GLBInfo = {
        scenes: [],
        meshes: [],
        materials: [],
        animations: [],
        stats: {
            totalVertices: 0,
            totalTriangles: 0,
            totalTextures: 0,
            boundingBox: {
                min: [Infinity, Infinity, Infinity],
                max: [-Infinity, -Infinity, -Infinity],
            },
        },
    };

    // 分析场景
    document
        .getRoot()
        .listScenes()
        .forEach((scene) => {
            result.scenes.push({
                name: scene.getName() || "未命名场景",
                nodeCount: scene.listChildren().length,
            });
        });

    // 分析网格
    document
        .getRoot()
        .listMeshes()
        .forEach((mesh) => {
            let vertexCount = 0;
            let triangleCount = 0;
            let hasVertexColors = false;
            const materials = new Set<string>();

            mesh.listPrimitives().forEach((primitive) => {
                const position = primitive.getAttribute("POSITION");
                const indices = primitive.getIndices();
                const colors = primitive.getAttribute("COLOR_0");
                const material = primitive.getMaterial();

                if (position) {
                    vertexCount += position.getCount();
                    // 更新边界盒
                    for (let i = 0; i < position.getCount(); i++) {
                        const vertex = [0, 0, 0];
                        position.getElement(i, vertex);
                        for (let j = 0; j < 3; j++) {
                            result.stats.boundingBox.min[j] = Math.min(
                                result.stats.boundingBox.min[j],
                                vertex[j]
                            );
                            result.stats.boundingBox.max[j] = Math.max(
                                result.stats.boundingBox.max[j],
                                vertex[j]
                            );
                        }
                    }
                }

                if (indices) {
                    triangleCount += indices.getCount() / 3;
                }

                if (colors) hasVertexColors = true;
                if (material) materials.add(material.getName() || "未命名材质");
            });

            result.meshes.push({
                name: mesh.getName() || "未命名网格",
                primitiveCount: mesh.listPrimitives().length,
                vertexCount,
                triangleCount,
                hasVertexColors,
                materials: Array.from(materials),
            });

            result.stats.totalVertices += vertexCount;
            result.stats.totalTriangles += triangleCount;
        });

    // 分析材质
    document
        .getRoot()
        .listMaterials()
        .forEach((material) => {
            const baseColorTexture = material.getBaseColorTexture();
            result.materials.push({
                name: material.getName() || "未命名材质",
                baseColor: material.getBaseColorFactor() || [1, 1, 1, 1],
                hasTexture: !!baseColorTexture,
                textureSize: baseColorTexture
                    ? baseColorTexture.getImage()
                    : undefined,
            });
        });

    // 分析动画
    document
        .getRoot()
        .listAnimations()
        .forEach((animation) => {
            const channels = animation.listChannels().map((channel) => {
                const targetNode = channel.getTargetNode();
                return `${
                    targetNode?.getName() || "未命名节点"
                }.${channel.getTargetPath()}`;
            });

            result.animations.push({
                name: animation.getName() || "未命名动画",
                channels,
            });
        });

    result.stats.totalTextures = document.getRoot().listTextures().length;

    return result;
}

// 使用示例
export async function printGLBInfo(file: File) {
    try {
        const info = await analyzeGLB(file);
        console.group("GLB文件分析结果");

        console.group("场景信息");
        info.scenes.forEach((scene, i) => {
            console.log(
                `场景 ${i + 1}: ${scene.name} (${scene.nodeCount} 个节点)`
            );
        });
        console.groupEnd();

        console.group("网格统计");
        info.meshes.forEach((mesh, i) => {
            console.log(`网格 ${i + 1}: ${mesh.name}`);
            console.log(`  - 顶点数: ${mesh.vertexCount}`);
            console.log(`  - 三角形数: ${mesh.triangleCount}`);
            console.log(`  - 是否有顶点颜色: ${mesh.hasVertexColors}`);
            console.log(`  - 使用的材质: ${mesh.materials.join(", ")}`);
        });
        console.groupEnd();

        console.group("总体统计");
        console.log(`总顶点数: ${info.stats.totalVertices}`);
        console.log(`总三角形数: ${info.stats.totalTriangles}`);
        console.log(`总纹理数: ${info.stats.totalTextures}`);
        console.log("包围盒:", {
            min: info.stats.boundingBox.min,
            max: info.stats.boundingBox.max,
        });
        console.groupEnd();

        console.groupEnd();
        return info;
    } catch (error) {
        console.error("分析GLB文件时出错:", error);
        throw error;
    }
}
