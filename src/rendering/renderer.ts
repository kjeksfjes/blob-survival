import { BACKGROUND_COLOR } from '../constants';
import { Camera } from './camera';
import { GpuBuffers } from './gpu-buffers';
import { BodyNodePass } from './body-node-pass';
import { BodyLinkPass } from './body-link-pass';
import { FoodPass } from './food-pass';
import { clampBodyRenderSettings, type BodyRenderSettings } from './body-visuals';

export class Renderer {
  device!: GPUDevice;
  context!: GPUCanvasContext;
  format!: GPUTextureFormat;

  readonly camera = new Camera();
  readonly buffers = new GpuBuffers();

  // Render passes
  private bodyNodePass = new BodyNodePass();
  private bodyLinkPass = new BodyLinkPass();
  private foodPass = new FoodPass();
  private bodyStyle = {
    edgeWidthFrac: 0.18,
    edgeDarkness: 0.32,
  };

  private canvasWidth = 0;
  private canvasHeight = 0;

  async init(canvas: HTMLCanvasElement): Promise<boolean> {
    if (!navigator.gpu) return false;

    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance',
    });
    if (!adapter) return false;

    this.device = await adapter.requestDevice();

    // Log GPU errors to console for debugging
    this.device.onuncapturederror = (e) => {
      console.error('WebGPU error:', e.error);
    };

    this.context = canvas.getContext('webgpu') as GPUCanvasContext;
    this.format = navigator.gpu.getPreferredCanvasFormat();

    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'opaque',
    });

    this.buffers.init(this.device);
    this.resize(canvas);

    this.bodyLinkPass.init(this.device, this.format, this.buffers);
    this.bodyNodePass.init(this.device, this.format, this.buffers);
    this.foodPass.init(this.device, this.format, this.buffers);

    return true;
  }

  resize(canvas: HTMLCanvasElement) {
    const dpr = window.devicePixelRatio || 1;
    const width = Math.floor(canvas.clientWidth * dpr);
    const height = Math.floor(canvas.clientHeight * dpr);

    if (width === this.canvasWidth && height === this.canvasHeight) return;

    canvas.width = width;
    canvas.height = height;
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.camera.resize(width, height);
  }

  setBodyRenderSettings(settings: BodyRenderSettings): void {
    const clamped = clampBodyRenderSettings(settings);
    this.bodyStyle.edgeWidthFrac = clamped.edgeWidthFrac;
    this.bodyStyle.edgeDarkness = clamped.edgeDarkness;
  }

  render() {
    // Upload data
    this.buffers.uploadCamera(this.device, this.camera.getProjectionMatrix());
    this.buffers.uploadBlobs(this.device);
    this.buffers.uploadLinks(this.device);
    this.buffers.uploadFood(this.device);
    this.bodyLinkPass.updateStyle(this.device, this.bodyStyle.edgeWidthFrac, this.bodyStyle.edgeDarkness);
    this.bodyNodePass.updateStyle(this.device, this.bodyStyle.edgeWidthFrac, this.bodyStyle.edgeDarkness);

    const commandEncoder = this.device.createCommandEncoder();

    // Direct render: links -> nodes -> food
    {
      const textureView = this.context.getCurrentTexture().createView();
      const pass = commandEncoder.beginRenderPass({
        colorAttachments: [{
          view: textureView,
          clearValue: { r: BACKGROUND_COLOR[0], g: BACKGROUND_COLOR[1], b: BACKGROUND_COLOR[2], a: BACKGROUND_COLOR[3] },
          loadOp: 'clear',
          storeOp: 'store',
        }],
      });
      this.bodyLinkPass.render(pass, this.buffers);
      this.bodyNodePass.render(pass, this.buffers);
      this.foodPass.render(pass, this.buffers);
      pass.end();
    }

    this.device.queue.submit([commandEncoder.finish()]);
  }
}
