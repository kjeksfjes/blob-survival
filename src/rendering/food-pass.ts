import foodShaderSource from '../shaders/food.wgsl?raw';
import { FOOD_FLOATS } from '../types';
import { GpuBuffers } from './gpu-buffers';

export class FoodPass {
  private solidPipeline!: GPURenderPipeline;
  private markerPipeline!: GPURenderPipeline;
  private additivePipeline!: GPURenderPipeline;
  private cameraBindGroup!: GPUBindGroup;
  private styleBindGroup!: GPUBindGroup;
  private styleBuffer!: GPUBuffer;
  private readonly styleData = new Float32Array(4);

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
    const styleBindGroupLayout = device.createBindGroupLayout({
      label: 'food style bind group layout',
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
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
    this.styleBuffer = device.createBuffer({
      label: 'food style params',
      size: 4 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.styleBindGroup = device.createBindGroup({
      label: 'food style bind group',
      layout: styleBindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.styleBuffer } }],
    });

    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [cameraBindGroupLayout, styleBindGroupLayout],
    });

    const stride = FOOD_FLOATS * 4;

    this.solidPipeline = device.createRenderPipeline({
      label: 'food solid pipeline',
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

    this.markerPipeline = device.createRenderPipeline({
      label: 'food marker pipeline',
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

    this.additivePipeline = device.createRenderPipeline({
      label: 'food additive pipeline',
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

  updateVisualMode(device: GPUDevice, legacyMetaballMode: boolean): void {
    this.styleData[0] = legacyMetaballMode ? 1 : 0;
    this.styleData[1] = 0;
    this.styleData[2] = 0;
    this.styleData[3] = 0;
    device.queue.writeBuffer(this.styleBuffer, 0, this.styleData);
  }

  renderSolids(pass: GPURenderPassEncoder, buffers: GpuBuffers) {
    if (buffers.foodSolidCount === 0) return;
    pass.setBindGroup(0, this.cameraBindGroup);
    pass.setBindGroup(1, this.styleBindGroup);
    pass.setVertexBuffer(0, buffers.foodInstanceBuffer);
    pass.setPipeline(this.solidPipeline);
    pass.draw(6, buffers.foodSolidCount, 0, 0);
  }

  renderMarkers(pass: GPURenderPassEncoder, buffers: GpuBuffers) {
    if (buffers.foodMarkerCount === 0) return;
    pass.setBindGroup(0, this.cameraBindGroup);
    pass.setBindGroup(1, this.styleBindGroup);
    pass.setVertexBuffer(0, buffers.foodInstanceBuffer);
    pass.setPipeline(this.markerPipeline);
    pass.draw(6, buffers.foodMarkerCount, 0, buffers.foodSolidCount);
  }

  renderAdditiveAll(pass: GPURenderPassEncoder, buffers: GpuBuffers) {
    if (buffers.foodCount === 0) return;
    pass.setBindGroup(0, this.cameraBindGroup);
    pass.setBindGroup(1, this.styleBindGroup);
    pass.setVertexBuffer(0, buffers.foodInstanceBuffer);
    pass.setPipeline(this.additivePipeline);
    pass.draw(6, buffers.foodCount);
  }
}
