import creatureIdLinkShaderSource from '../shaders/creature-id-link.wgsl?raw';
import { LINK_FLOATS } from '../types';
import { GpuBuffers } from './gpu-buffers';

export class CreatureIdLinkPass {
  private pipeline!: GPURenderPipeline;
  private cameraBindGroup!: GPUBindGroup;

  init(device: GPUDevice, targetFormat: GPUTextureFormat, buffers: GpuBuffers): void {
    const shaderModule = device.createShaderModule({
      label: 'creature id link shader',
      code: creatureIdLinkShaderSource,
    });

    const cameraBindGroupLayout = device.createBindGroupLayout({
      label: 'creature id link camera bind group layout',
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: 'uniform' },
      }],
    });

    this.cameraBindGroup = device.createBindGroup({
      label: 'creature id link camera bind group',
      layout: cameraBindGroupLayout,
      entries: [{
        binding: 0,
        resource: { buffer: buffers.cameraUniformBuffer },
      }],
    });

    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [cameraBindGroupLayout],
    });

    const stride = LINK_FLOATS * 4;
    this.pipeline = device.createRenderPipeline({
      label: 'creature id link pipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: stride,
          stepMode: 'instance',
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x2' },   // a
            { shaderLocation: 1, offset: 8, format: 'float32x2' },   // b
            { shaderLocation: 2, offset: 16, format: 'float32' },    // thickness
            { shaderLocation: 3, offset: 32, format: 'float32' },    // alpha
            { shaderLocation: 4, offset: 36, format: 'float32' },    // creatureIdEncoded
          ],
        }],
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [{ format: targetFormat }],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });
  }

  render(pass: GPURenderPassEncoder, buffers: GpuBuffers): void {
    if (buffers.linkCount === 0) return;
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.cameraBindGroup);
    pass.setVertexBuffer(0, buffers.linkInstanceBuffer);
    pass.draw(6, buffers.linkCount);
  }
}
