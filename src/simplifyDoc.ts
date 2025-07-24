import { simplify, weld } from "@gltf-transform/functions";
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
export async function simplifyDocument(doc: Document, ratio: number) {
    return await (await deepCloneDocument(doc)).transform(
        weld({}),
        simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.01 })
    );
}
