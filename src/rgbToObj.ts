import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

interface VoxelData {
    position: [number, number, number];
    color: [number, number, number];
}

/**
 * 将体素数据转换为Three.js的Object3D对象
 * @param voxels 体素数据数组 [x][y][z] -> [r,g,b] | null
 * @param voxelSize 体素大小（默认为1）
 * @returns Three.js的Object3D对象
 */
export function voxelsToObject(
    voxels: ([number, number, number] | null)[][][],
    voxelSize: number = 1
): THREE.Object3D {
    const group = new THREE.Group();
    const geometries: THREE.BoxGeometry[] = [];
    const colors: number[] = [];

    // 创建基础立方体几何体
    const baseGeometry = new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize);

    // 遍历体素数组
    voxels.forEach((yz, x) => {
        yz.forEach((zRow, y) => {
            zRow.forEach((color, z) => {
                if (color !== null) {
                    // 创建几何体实例
                    const geometry = baseGeometry.clone();

                    // 设置位置
                    geometry.translate(
                        x * voxelSize,
                        y * voxelSize,
                        z * voxelSize
                    );

                    // 存储颜色和几何体
                    geometries.push(geometry);
                    const [r, g, b] = color;
                    // 每个顶点都需要颜色值
                    for (let i = 0; i < 24; i++) {
                        // BoxGeometry有24个顶点
                        colors.push(r / 255, g / 255, b / 255);
                    }
                }
            });
        });
    });

    if (geometries.length > 0) {
        // 合并所有几何体
        const mergedGeometry = mergeGeometries(geometries);

        // 添加颜色属性
        mergedGeometry.setAttribute(
            "color",
            new THREE.Float32BufferAttribute(colors, 3)
        );

        // 创建材质
        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.5,
            metalness: 0.5,
        });

        // 创建网格
        const mesh = new THREE.Mesh(mergedGeometry, material);
        group.add(mesh);
    }

    // 居中模型
    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    group.position.sub(center);

    return group;
}

// 使用示例：
/*
const voxels = [[[null, [255,0,0]], [[0,255,0], null]]];
const object3D = voxelsToObject(voxels, 1.0);
scene.add(object3D);
*/
