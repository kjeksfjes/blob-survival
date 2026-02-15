import metaballShaderSource from '../shaders/metaball.wgsl?raw';

export class MetaballPass {
  private pipeline!: GPURenderPipeline;
  private bindGroup!: GPUBindGroup;
  private bindGroupLayout!: GPUBindGroupLayout;
  private sampler!: GPUSampler;
  private paramsBuffer!: GPUBuffer;
  private readonly paramsData = new Float32Array(8);

  init(device: GPUDevice, outputFormat: GPUTextureFormat) {
    const shaderModule = device.createShaderModule({
      label: 'metaball shader',
      code: metaballShaderSource,
    });

    this.sampler = device.createSampler({
      label: 'metaball sampler',
      magFilter: 'linear',
      minFilter: 'linear',
    });

    this.paramsBuffer = device.createBuffer({
      label: 'metaball params',
      size: 8 * 4, // 2 vec4<f32>
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
        { binding: 1, resource: this.sampler },
        { binding: 2, resource: { buffer: this.paramsBuffer } },
      ],
    });
  }

  updateParams(
    device: GPUDevice,
    l: number,
    r: number,
    t: number,
    b: number,
    worldSize: number,
  ) {
    this.paramsData[0] = l;
    this.paramsData[1] = r;
    this.paramsData[2] = t;
    this.paramsData[3] = b;
    this.paramsData[4] = 0;
    this.paramsData[5] = 0;
    this.paramsData[6] = worldSize;
    this.paramsData[7] = worldSize;
    device.queue.writeBuffer(this.paramsBuffer, 0, this.paramsData);
  }

  render(pass: GPURenderPassEncoder) {
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(3); // full-screen triangle
  }
}
