import blobShaderSource from '../shaders/blob.wgsl?raw';
import { BLOB_FLOATS } from '../types';
import { GpuBuffers } from './gpu-buffers';

export class BlobPass {
  private pipeline!: GPURenderPipeline;
  private cameraBindGroup!: GPUBindGroup;

  init(device: GPUDevice, targetFormat: GPUTextureFormat, buffers: GpuBuffers) {
    const shaderModule = device.createShaderModule({
      label: 'blob shader',
      code: blobShaderSource,
    });

    const cameraBindGroupLayout = device.createBindGroupLayout({
      label: 'camera bind group layout',
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: 'uniform' },
      }],
    });

    this.cameraBindGroup = device.createBindGroup({
      label: 'camera bind group',
      layout: cameraBindGroupLayout,
      entries: [{
        binding: 0,
        resource: { buffer: buffers.cameraUniformBuffer },
      }],
    });

    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [cameraBindGroupLayout],
    });

    // Instance buffer layout: 8 floats per instance
    // posX, posY, radius, r, g, b, alpha, type
    const stride = BLOB_FLOATS * 4; // bytes

    this.pipeline = device.createRenderPipeline({
      label: 'blob pipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: stride,
          stepMode: 'instance',
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x2' },   // pos
            { shaderLocation: 1, offset: 8, format: 'float32' },     // radius
            { shaderLocation: 2, offset: 12, format: 'float32x3' },  // color
            { shaderLocation: 3, offset: 24, format: 'float32' },    // alpha
            { shaderLocation: 4, offset: 28, format: 'float32' },    // type
          ],
        }],
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [{
          format: targetFormat,
          blend: {
            // Additive blending for energy field accumulation
            color: {
              srcFactor: 'one',
              dstFactor: 'one',
              operation: 'add',
            },
            alpha: {
              srcFactor: 'one',
              dstFactor: 'one',
              operation: 'add',
            },
          },
        }],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });
  }

  render(pass: GPURenderPassEncoder, buffers: GpuBuffers) {
    if (buffers.blobCount === 0) return;
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.cameraBindGroup);
    pass.setVertexBuffer(0, buffers.blobInstanceBuffer);
    pass.draw(6, buffers.blobCount); // 6 vertices per quad, N instances
  }
}
