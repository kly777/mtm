import {
    simplify,
    weld,
    dedup,
    prune,
    resample,
    textureCompress,
    draco,
    instance,
} from "@gltf-transform/functions";
import { type Document } from "@gltf-transform/core";
import { MeshoptSimplifier } from "meshoptimizer";
import { WebIO } from "@gltf-transform/core";

const io = new WebIO();

/**
 * 深拷贝一个 Document 对象
 */
async function deepCloneDocument(doc: Document): Promise<Document> {
    // 1. 将 Document 序列化为 GLB 二进制
    const glbData = await io.writeBinary(doc);

    // 2. 重新解析为新 Document 对象
    return io.readBinary(glbData);
}

export interface SimplifyOptions {
    ratio: number; // 简化比例 (0-1)
    error?: number; // 简化误差
    enableWeld?: boolean; // 是否启用顶点焊接
    enableDedup?: boolean; // 是否启用重复数据删除
    enablePrune?: boolean; // 是否启用未使用数据清理
    enableResample?: boolean; // 是否启用重采样
    enableDraco?: boolean; // 是否启用 Draco 压缩
    enableInstance?: boolean; // 是否启用实例化
    targetSize?: number; // 目标文件大小(bytes)
}

export async function simplifyDocument(
    doc: Document,
    options: SimplifyOptions
): Promise<Document> {
    const {
        ratio,
        error = 0.01,
        enableWeld = true,
        enableDedup = true,
        enablePrune = true,
        enableResample = true,
        enableDraco = true,
        enableInstance = true,
    } = options;

    const transforms = [];

    // 1. 数据清理和合并阶段
    if (enablePrune) {
        // 首先清理未使用的数据
        transforms.push(prune());
    }

    if (enableDedup) {
        // 然后删除重复数据
        transforms.push(dedup());
    }

    if (enableWeld) {
        transforms.push(weld({}));
    }

    // 2. 几何处理阶段
    transforms.push(
        simplify({
            simplifier: MeshoptSimplifier,
            ratio,
            error,
            lockBorder: true,
        })
    );

    if (enableResample) {
        transforms.push(resample());
    }

    // 3. 最终优化阶段
    if (enableInstance) {
        // 实例化处理
        transforms.push(instance());
    }

    if (enableDraco) {
        // Draco压缩放在最后
        transforms.push(
            draco({
                quantizePosition: 14, // 位置量化位数
                quantizeNormal: 10, // 法线量化位数
                quantizeTexcoord: 12, // UV坐标量化位数
            })
        );
    }

    // 执行所有转换
    return await (await deepCloneDocument(doc)).transform(...transforms);
}
