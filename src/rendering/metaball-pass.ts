import metaballShaderSource from '../shaders/metaball.wgsl?raw';

export type MetaballStyleParams = {
  threshold: number;
  glowRadiusPx: number;
  glowStrength: number;
  auraStrength: number;
  edgeStrength: number;
};

export class MetaballPass {
  private pipeline!: GPURenderPipeline;
  private bindGroup!: GPUBindGroup;
  private bindGroupLayout!: GPUBindGroupLayout;
  private linearSampler!: GPUSampler;
  private nearestSampler!: GPUSampler;
  private useNearestSampler = false;
  private paramsBuffer!: GPUBuffer;
  private readonly paramsData = new Float32Array(16);

  init(device: GPUDevice, outputFormat: GPUTextureFormat) {
    const shaderModule = device.createShaderModule({
      label: 'metaball shader',
      code: metaballShaderSource,
    });

    this.linearSampler = device.createSampler({
      label: 'metaball sampler linear',
      magFilter: 'linear',
      minFilter: 'linear',
    });
    this.nearestSampler = device.createSampler({
      label: 'metaball sampler nearest',
      magFilter: 'nearest',
      minFilter: 'nearest',
    });

    this.paramsBuffer = device.createBuffer({
      label: 'metaball params',
      size: 16 * 4, // 4 vec4<f32>
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.bindGroupLayout = device.createBindGroupLayout({
      label: 'metaball bind group layout',
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [this.bindGroupLayout],
    });

    this.pipeline = device.createRenderPipeline({
      label: 'metaball pipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [{ format: outputFormat }],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });
  }

  updateBindGroup(device: GPUDevice, inputTextureView: GPUTextureView) {
    this.bindGroup = device.createBindGroup({
      label: 'metaball bind group',
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: inputTextureView },
        { binding: 1, resource: this.useNearestSampler ? this.nearestSampler : this.linearSampler },
        { binding: 2, resource: { buffer: this.paramsBuffer } },
      ],
    });
  }

  setUseNearestSampler(nextUseNearest: boolean): boolean {
    if (this.useNearestSampler === nextUseNearest) return false;
    this.useNearestSampler = nextUseNearest;
    return true;
  }

  updateParams(
    device: GPUDevice,
    l: number,
    r: number,
    t: number,
    b: number,
    worldSize: number,
    style: MetaballStyleParams,
  ) {
    this.paramsData[0] = l;
    this.paramsData[1] = r;
    this.paramsData[2] = t;
    this.paramsData[3] = b;
    this.paramsData[4] = 0;
    this.paramsData[5] = 0;
    this.paramsData[6] = worldSize;
    this.paramsData[7] = worldSize;
    this.paramsData[8] = style.threshold;
    this.paramsData[9] = style.glowRadiusPx;
    this.paramsData[10] = style.glowStrength;
    this.paramsData[11] = style.auraStrength;
    this.paramsData[12] = style.edgeStrength;
    this.paramsData[13] = 0;
    this.paramsData[14] = 0;
    this.paramsData[15] = 0;
    device.queue.writeBuffer(this.paramsBuffer, 0, this.paramsData);
  }

  render(pass: GPURenderPassEncoder) {
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(3); // full-screen triangle
  }
}
