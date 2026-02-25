import outlineCompositeShaderSource from '../shaders/outline-composite.wgsl?raw';

export class OutlineCompositePass {
  private pipeline!: GPURenderPipeline;
  private bindGroup!: GPUBindGroup;
  private bindGroupLayout!: GPUBindGroupLayout;

  init(device: GPUDevice, outputFormat: GPUTextureFormat): void {
    const shaderModule = device.createShaderModule({
      label: 'outline composite shader',
      code: outlineCompositeShaderSource,
    });

    this.bindGroupLayout = device.createBindGroupLayout({
      label: 'outline composite bind group layout',
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
      ],
    });

    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [this.bindGroupLayout],
    });

    this.pipeline = device.createRenderPipeline({
      label: 'outline composite pipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [{
          format: outputFormat,
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

  updateBindGroup(device: GPUDevice, idTextureView: GPUTextureView): void {
    this.bindGroup = device.createBindGroup({
      label: 'outline composite bind group',
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: idTextureView },
      ],
    });
  }

  render(pass: GPURenderPassEncoder): void {
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(3);
  }
}
