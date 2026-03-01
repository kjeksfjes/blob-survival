import { BACKGROUND_COLOR } from '../constants';
import { WORLD_SIZE } from '../constants';
import { Camera } from './camera';
import { GpuBuffers } from './gpu-buffers';
import { BlobPass } from './blob-pass';
import { BodyNodePass } from './body-node-pass';
import { BodyLinkPass } from './body-link-pass';
import { CreatureIdNodePass } from './creature-id-node-pass';
import { CreatureIdLinkPass } from './creature-id-link-pass';
import { OutlineCompositePass } from './outline-composite-pass';
import { FoodPass } from './food-pass';
import { MetaballPass, type MetaballStyleParams } from './metaball-pass';
import { clampBodyRenderSettings, type BodyRenderSettings } from './body-visuals';
import { DEFAULT_RENDER_STYLE, type RenderStyle } from './render-style';

export class Renderer {
  device!: GPUDevice;
  context!: GPUCanvasContext;
  format!: GPUTextureFormat;

  readonly camera = new Camera();
  readonly buffers = new GpuBuffers();

  // Render passes
  private blobPass = new BlobPass();
  private metaballPass = new MetaballPass();
  private bodyNodePass = new BodyNodePass();
  private bodyLinkPass = new BodyLinkPass();
  private creatureIdNodePass = new CreatureIdNodePass();
  private creatureIdLinkPass = new CreatureIdLinkPass();
  private outlineCompositePass = new OutlineCompositePass();
  private foodPass = new FoodPass();
  private bodyStyle = {
    edgeWidthFrac: 0.18,
    edgeDarkness: 0.32,
  };
  private creatureOutlineEnabled = true;
  private renderStyle: RenderStyle = DEFAULT_RENDER_STYLE;
  private metaballStyle: MetaballStyleParams = {
    threshold: 0.35,
    glowRadiusPx: 4.0,
    glowStrength: 0.4,
    auraStrength: 0.8,
    edgeStrength: 0.5,
  };
  private offscreenTexture!: GPUTexture;
  private offscreenView!: GPUTextureView;
  private creatureIdTexture!: GPUTexture;
  private creatureIdView!: GPUTextureView;
  private creatureIdWidth = 0;
  private creatureIdHeight = 0;
  private needsMetaballBindGroupUpdate = true;
  private needsOutlineBindGroupUpdate = true;

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

    this.blobPass.init(this.device, this.format, this.buffers);
    this.metaballPass.init(this.device, this.format);
    this.bodyLinkPass.init(this.device, this.format, this.buffers);
    this.bodyNodePass.init(this.device, this.format, this.buffers);
    this.creatureIdLinkPass.init(this.device, 'rgba8unorm', this.buffers);
    this.creatureIdNodePass.init(this.device, 'rgba8unorm', this.buffers);
    this.outlineCompositePass.init(this.device, this.format);
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
    this.createOffscreenTexture();
    this.createCreatureIdTexture();
  }

  setBodyRenderSettings(settings: BodyRenderSettings): void {
    const clamped = clampBodyRenderSettings(settings);
    this.bodyStyle.edgeWidthFrac = clamped.edgeWidthFrac;
    this.bodyStyle.edgeDarkness = clamped.edgeDarkness;
    this.creatureOutlineEnabled = clamped.creatureOutline;
  }

  setRenderStyle(style: RenderStyle): void {
    this.renderStyle = style;
  }

  getRenderStyle(): RenderStyle {
    return this.renderStyle;
  }

  private createOffscreenTexture(): void {
    if (!this.device || this.canvasWidth <= 0 || this.canvasHeight <= 0) return;
    if (this.offscreenTexture) this.offscreenTexture.destroy();
    this.offscreenTexture = this.device.createTexture({
      label: 'offscreen metaball',
      size: { width: this.canvasWidth, height: this.canvasHeight },
      format: this.format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
    this.offscreenView = this.offscreenTexture.createView();
    this.needsMetaballBindGroupUpdate = true;
  }

  private createCreatureIdTexture(): void {
    if (!this.device || this.canvasWidth <= 0 || this.canvasHeight <= 0) return;
    const idWidth = Math.max(1, Math.floor(this.canvasWidth * 0.5));
    const idHeight = Math.max(1, Math.floor(this.canvasHeight * 0.5));
    if (this.creatureIdTexture) this.creatureIdTexture.destroy();
    this.creatureIdWidth = idWidth;
    this.creatureIdHeight = idHeight;
    this.creatureIdTexture = this.device.createTexture({
      label: 'creature id buffer',
      size: { width: idWidth, height: idHeight },
      format: 'rgba8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
    this.creatureIdView = this.creatureIdTexture.createView();
    this.needsOutlineBindGroupUpdate = true;
  }

  render() {
    // Upload data
    this.buffers.uploadCamera(this.device, this.camera.getProjectionMatrix());
    this.buffers.uploadBlobs(this.device);
    this.buffers.uploadFood(this.device);

    const commandEncoder = this.device.createCommandEncoder();

    if (this.renderStyle === 'Metaball') {
      this.foodPass.updateVisualMode(this.device, true);

      if (this.needsMetaballBindGroupUpdate) {
        this.metaballPass.updateBindGroup(this.device, this.offscreenView);
        this.needsMetaballBindGroupUpdate = false;
      }

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
        this.foodPass.renderAdditiveAll(pass, this.buffers);
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
        this.metaballPass.updateParams(this.device, l, r, t, b, WORLD_SIZE, this.metaballStyle);

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
    } else {
      this.foodPass.updateVisualMode(this.device, false);
      this.buffers.uploadLinks(this.device);
      this.bodyLinkPass.updateStyle(this.device, this.bodyStyle.edgeWidthFrac, this.bodyStyle.edgeDarkness);
      this.bodyNodePass.updateStyle(this.device, this.bodyStyle.edgeWidthFrac, this.bodyStyle.edgeDarkness);

      const textureView = this.context.getCurrentTexture().createView();

      // Pass 1: food solids + connected body fills
      {
        const pass = commandEncoder.beginRenderPass({
          colorAttachments: [{
            view: textureView,
            clearValue: {
              r: BACKGROUND_COLOR[0],
              g: BACKGROUND_COLOR[1],
              b: BACKGROUND_COLOR[2],
              a: BACKGROUND_COLOR[3],
            },
            loadOp: 'clear',
            storeOp: 'store',
          }],
        });
        this.foodPass.renderSolids(pass, this.buffers);
        this.bodyLinkPass.render(pass, this.buffers);
        this.bodyNodePass.render(pass, this.buffers);
        pass.end();
      }

      if (this.creatureOutlineEnabled && this.creatureIdWidth > 0 && this.creatureIdHeight > 0) {
        if (this.needsOutlineBindGroupUpdate) {
          this.outlineCompositePass.updateBindGroup(this.device, this.creatureIdView);
          this.needsOutlineBindGroupUpdate = false;
        }

        // Pass 2: creature IDs at half resolution
        {
          const pass = commandEncoder.beginRenderPass({
            colorAttachments: [{
              view: this.creatureIdView,
              clearValue: { r: 0, g: 0, b: 0, a: 0 },
              loadOp: 'clear',
              storeOp: 'store',
            }],
          });
          this.creatureIdLinkPass.render(pass, this.buffers);
          this.creatureIdNodePass.render(pass, this.buffers);
          pass.end();
        }

        // Pass 3: composite black outline over scene
        {
          const pass = commandEncoder.beginRenderPass({
            colorAttachments: [{
              view: textureView,
              loadOp: 'load',
              storeOp: 'store',
            }],
          });
          this.outlineCompositePass.render(pass);
          pass.end();
        }
      }

      // Final pass: role/hover markers always on top.
      {
        const pass = commandEncoder.beginRenderPass({
          colorAttachments: [{
            view: textureView,
            loadOp: 'load',
            storeOp: 'store',
          }],
        });
        this.foodPass.renderMarkers(pass, this.buffers);
        pass.end();
      }
    }

    this.device.queue.submit([commandEncoder.finish()]);
  }
}
