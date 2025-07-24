import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { type VoxelData } from "./voxelizeModel";

/**
 * 从体素数据创建3D模型
 * @param voxels 体素数据数组
 * @param voxelSize 体素基础尺寸
 * @param roundness 体素圆角
 * @returns 包含体素模型的Three.js Group
 */
export function createModelFromVoxels(
    voxels: VoxelData[],
    voxelSize: number = 0.24,
    roundness: number = 0.03
): THREE.Group {
    const group = new THREE.Group();

    // 创建共享几何体
    const geometry = new RoundedBoxGeometry(
        voxelSize,
        voxelSize,
        voxelSize,
        2,
        roundness
    );

    // 创建共享材质
    const material = new THREE.MeshLambertMaterial({
        vertexColors: true, // 启用顶点颜色
    });

    // 创建InstancedMesh
    const instancedMesh = new THREE.InstancedMesh(
        geometry,
        material,
        voxels.length
    );

    // 创建临时对象用于矩阵计算
    const dummy = new THREE.Object3D();

    // 为每个体素设置位置和颜色
    voxels.forEach((voxel, i) => {
        // 设置位置
        dummy.position.copy(voxel.position);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);

        // 设置颜色
        instancedMesh.setColorAt(i, voxel.color);
    });

    // 提交更新
    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) {
        instancedMesh.instanceColor.needsUpdate = true;
    }

    // 添加到场景
    group.add(instancedMesh);

    return group;
}
