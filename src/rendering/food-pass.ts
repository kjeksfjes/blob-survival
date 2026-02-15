import foodShaderSource from '../shaders/food.wgsl?raw';
import { FOOD_FLOATS } from '../types';
import { GpuBuffers } from './gpu-buffers';

export class FoodPass {
  private pipeline!: GPURenderPipeline;
  private cameraBindGroup!: GPUBindGroup;

  init(device: GPUDevice, targetFormat: GPUTextureFormat, buffers: GpuBuffers) {
    const shaderModule = device.createShaderModule({
      label: 'food shader',
      code: foodShaderSource,
    });

    const cameraBindGroupLayout = device.createBindGroupLayout({
      label: 'food camera bind group layout',
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: 'uniform' },
      }],
    });

    this.cameraBindGroup = device.createBindGroup({
      label: 'food camera bind group',
      layout: cameraBindGroupLayout,
      entries: [{
        binding: 0,
        resource: { buffer: buffers.cameraUniformBuffer },
      }],
    });

    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [cameraBindGroupLayout],
    });

    const stride = FOOD_FLOATS * 4;

    this.pipeline = device.createRenderPipeline({
      label: 'food pipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: stride,
          stepMode: 'instance',
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x2' },  // pos
            { shaderLocation: 1, offset: 8, format: 'float32' },    // radius
            { shaderLocation: 2, offset: 12, format: 'float32' },   // alpha
            { shaderLocation: 3, offset: 16, format: 'float32' },   // kind
            { shaderLocation: 4, offset: 20, format: 'float32' },   // rotNorm
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
    if (buffers.foodCount === 0) return;
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.cameraBindGroup);
    pass.setVertexBuffer(0, buffers.foodInstanceBuffer);
    pass.draw(6, buffers.foodCount);
  }
}
