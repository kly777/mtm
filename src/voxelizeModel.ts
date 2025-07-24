import * as THREE from "three";

// 定义体素参数接口
export interface VoxelParams {
    gridSize: number;
    modelSize: number;
}

// 定义体素数据结构
export interface VoxelData {
    position: THREE.Vector3;
    color: THREE.Color;
}

/**
 * 将3D模型转换为体素数据
 * @param model - 要体素化的模型对象
 * @param params - 体素化参数
 * @returns 包含体素位置和颜色的数组
 */
export function voxelizeModel(
    model: THREE.Group,
    params: VoxelParams
): VoxelData[] {
    // 收集所有网格对象
    const importedMeshes: THREE.Mesh[] = [];
    model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            child.material.side = THREE.DoubleSide;
            importedMeshes.push(child);
        }
    });

    // 计算模型包围盒
    const boundingBox = new THREE.Box3().setFromObject(model);
    const size = boundingBox.getSize(new THREE.Vector3());

    // 计算缩放比例并调整模型位置
    const scaleFactor = params.modelSize / size.length();
    const center = boundingBox
        .getCenter(new THREE.Vector3())
        .multiplyScalar(-scaleFactor);

    // 应用缩放和居中变换
    model.scale.multiplyScalar(scaleFactor);
    model.position.copy(center);

    // 更新包围盒以反映变换后的尺寸
    const updatedBox = new THREE.Box3().setFromObject(model);
    updatedBox.min.y += 0.5 * params.gridSize; // 特殊处理Y轴

    // 体素数据数组
    const voxels: VoxelData[] = [];

    // 创建射线检测器
    const rayCaster = new THREE.Raycaster();
    const rayDirection = new THREE.Vector3(0, 0, 1);
    const rayOrigin = new THREE.Vector3();

    // 体素化过程
    for (let i = updatedBox.min.x; i < updatedBox.max.x; i += params.gridSize) {
        for (
            let j = updatedBox.min.y;
            j < updatedBox.max.y;
            j += params.gridSize
        ) {
            for (
                let k = updatedBox.min.z;
                k < updatedBox.max.z;
                k += params.gridSize
            ) {
                // 为每个网格检查当前点
                for (const mesh of importedMeshes) {
                    // 获取材质颜色并调整饱和度/亮度
                    const color = new THREE.Color();
                    let material: THREE.Material;

                    if (Array.isArray(mesh.material)) {
                        material = mesh.material[0];
                    } else {
                        material = mesh.material;
                    }

                    // 强制类型断言处理材质颜色
                    if ("color" in material && (material as any).color) {
                        const materialColor = (material as any)
                            .color as THREE.Color;
                        const hsl = { h: 0, s: 0, l: 0 };
                        materialColor.getHSL(hsl);
                        const { h, s, l } = hsl;
                        color.setHSL(h, s * 0.8, l * 0.8 + 0.2);
                    } else {
                        // 默认颜色处理
                        color.setRGB(1, 1, 1); // 白色默认
                    }

                    // 创建当前体素位置
                    const position = new THREE.Vector3(i, j, k);

                    // 使用射线检测判断点是否在网格内部
                    rayOrigin.copy(position);
                    rayCaster.set(rayOrigin, rayDirection);
                    const intersects = rayCaster.intersectObject(mesh, false);

                    // 如果检测到奇数次相交，表示点在模型内部
                    if (intersects.length % 2 === 1) {
                        voxels.push({ position, color });
                        break; // 找到后跳出循环
                    }
                }
            }
        }
    }

    return voxels;
}
