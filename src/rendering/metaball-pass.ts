import metaballShaderSource from '../shaders/metaball.wgsl?raw';

export class MetaballPass {
  private pipeline!: GPURenderPipeline;
  private bindGroup!: GPUBindGroup;
  private bindGroupLayout!: GPUBindGroupLayout;
  private sampler!: GPUSampler;

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

    this.bindGroupLayout = device.createBindGroupLayout({
      label: 'metaball bind group layout',
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
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
      ],
    });
  }

  render(pass: GPURenderPassEncoder) {
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(3); // full-screen triangle
  }
}
