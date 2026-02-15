import { BACKGROUND_COLOR } from '../constants';
import { WORLD_SIZE } from '../constants';
import { Camera } from './camera';
import { GpuBuffers } from './gpu-buffers';
import { BlobPass } from './blob-pass';
import { MetaballPass } from './metaball-pass';
import { FoodPass } from './food-pass';

export class Renderer {
  device!: GPUDevice;
  context!: GPUCanvasContext;
  format!: GPUTextureFormat;

  readonly camera = new Camera();
  readonly buffers = new GpuBuffers();

  // Render passes
  private blobPass = new BlobPass();
  private metaballPass = new MetaballPass();
  private foodPass = new FoodPass();

  // Offscreen texture for metaball accumulation
  private offscreenTexture!: GPUTexture;
  private offscreenView!: GPUTextureView;
  private needsBindGroupUpdate = true;

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

    // Init passes -- blob and food render to offscreen (additive), metaball reads it
    this.blobPass.init(this.device, this.format, this.buffers);
    this.foodPass.init(this.device, this.format, this.buffers);
    this.metaballPass.init(this.device, this.format);

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

    this.createOffscreenTexture();
  }

  private createOffscreenTexture() {
    if (this.offscreenTexture) this.offscreenTexture.destroy();
    this.offscreenTexture = this.device.createTexture({
      label: 'offscreen metaball',
      size: { width: this.canvasWidth, height: this.canvasHeight },
      format: this.format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
    this.offscreenView = this.offscreenTexture.createView();
    this.needsBindGroupUpdate = true;
  }

  render() {
    // Upload data
    this.buffers.uploadCamera(this.device, this.camera.getProjectionMatrix());
    this.buffers.uploadBlobs(this.device);
    this.buffers.uploadFood(this.device);

    // Update bind group if offscreen texture changed
    if (this.needsBindGroupUpdate) {
      this.metaballPass.updateBindGroup(this.device, this.offscreenView);
      this.needsBindGroupUpdate = false;
    }

    const commandEncoder = this.device.createCommandEncoder();

    // Pass 1: Render blobs + food to offscreen texture (additive blend)
    {
      const pass = commandEncoder.beginRenderPass({
        colorAttachments: [{
          view: this.offscreenView,
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'store',
        }],
      });
      this.blobPass.render(pass, this.buffers);
      this.foodPass.render(pass, this.buffers);
      pass.end();
    }

    // Pass 2: Full-screen metaball threshold + glow -> canvas
    {
      const hw = (this.canvasWidth / 2) / this.camera.zoom;
      const hh = (this.canvasHeight / 2) / this.camera.zoom;
      const l = this.camera.x - hw;
      const r = this.camera.x + hw;
      const t = this.camera.y - hh;
      const b = this.camera.y + hh;
      this.metaballPass.updateParams(this.device, l, r, t, b, WORLD_SIZE);

      const textureView = this.context.getCurrentTexture().createView();
      const pass = commandEncoder.beginRenderPass({
        colorAttachments: [{
          view: textureView,
          clearValue: { r: BACKGROUND_COLOR[0], g: BACKGROUND_COLOR[1], b: BACKGROUND_COLOR[2], a: BACKGROUND_COLOR[3] },
          loadOp: 'clear',
          storeOp: 'store',
        }],
      });
      this.metaballPass.render(pass);
      pass.end();
    }

    this.device.queue.submit([commandEncoder.finish()]);
  }
}
