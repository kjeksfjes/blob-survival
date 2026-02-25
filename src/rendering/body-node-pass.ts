import bodyNodeShaderSource from '../shaders/body-node.wgsl?raw';
import { BLOB_FLOATS } from '../types';
import { GpuBuffers } from './gpu-buffers';

export class BodyNodePass {
  private pipeline!: GPURenderPipeline;
  private cameraBindGroup!: GPUBindGroup;
  private styleBindGroup!: GPUBindGroup;
  private styleBuffer!: GPUBuffer;
  private readonly styleData = new Float32Array(4);

  init(device: GPUDevice, targetFormat: GPUTextureFormat, buffers: GpuBuffers) {
    const shaderModule = device.createShaderModule({
      label: 'body node shader',
      code: bodyNodeShaderSource,
    });

    const cameraBindGroupLayout = device.createBindGroupLayout({
      label: 'body node camera bind group layout',
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: 'uniform' },
      }],
    });

    const styleBindGroupLayout = device.createBindGroupLayout({
      label: 'body node style bind group layout',
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      }],
    });

    this.cameraBindGroup = device.createBindGroup({
      label: 'body node camera bind group',
      layout: cameraBindGroupLayout,
      entries: [{
        binding: 0,
        resource: { buffer: buffers.cameraUniformBuffer },
      }],
    });

    this.styleBuffer = device.createBuffer({
      label: 'body node style params',
      size: 4 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.styleBindGroup = device.createBindGroup({
      label: 'body node style bind group',
      layout: styleBindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.styleBuffer } }],
    });

    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [cameraBindGroupLayout, styleBindGroupLayout],
    });

    const stride = BLOB_FLOATS * 4;
    this.pipeline = device.createRenderPipeline({
      label: 'body node pipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: stride,
          stepMode: 'instance',
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x2' },
            { shaderLocation: 1, offset: 8, format: 'float32' },
            { shaderLocation: 2, offset: 12, format: 'float32x3' },
            { shaderLocation: 3, offset: 24, format: 'float32' },
            { shaderLocation: 4, offset: 28, format: 'float32' },
            { shaderLocation: 5, offset: 32, format: 'float32' },
          ],
        }],
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [{
          format: targetFormat,
          blend: {
            color: {
              srcFactor: 'src-alpha',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
            alpha: {
              srcFactor: 'one',
              dstFactor: 'one-minus-src-alpha',
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

  updateStyle(device: GPUDevice, edgeWidthFrac: number, edgeDarkness: number): void {
    this.styleData[0] = edgeWidthFrac;
    this.styleData[1] = edgeDarkness;
    this.styleData[2] = 0;
    this.styleData[3] = 0;
    device.queue.writeBuffer(this.styleBuffer, 0, this.styleData);
  }

  render(pass: GPURenderPassEncoder, buffers: GpuBuffers): void {
    if (buffers.blobCount === 0) return;
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.cameraBindGroup);
    pass.setBindGroup(1, this.styleBindGroup);
    pass.setVertexBuffer(0, buffers.blobInstanceBuffer);
    pass.draw(6, buffers.blobCount);
  }
}
