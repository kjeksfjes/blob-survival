import { MAX_BLOBS, MAX_CREATURES, MAX_FOOD, FOOD_DUST_PARTICLE_MAX } from '../constants';
import { BLOB_FLOATS, FOOD_FLOATS, LINK_FLOATS, DUST_FLOATS } from '../types';

const MAX_LINKS = MAX_CREATURES * 30;

export class GpuBuffers {
  // Instance data packed for GPU upload
  readonly blobData: Float32Array;
  readonly linkData: Float32Array;
  readonly foodData: Float32Array;
  readonly dustData: Float32Array;

  // GPU buffers
  blobInstanceBuffer!: GPUBuffer;
  linkInstanceBuffer!: GPUBuffer;
  foodInstanceBuffer!: GPUBuffer;
  dustInstanceBuffer!: GPUBuffer;
  cameraUniformBuffer!: GPUBuffer;

  blobCount = 0;
  linkCount = 0;
  foodCount = 0;
  foodSolidCount = 0;
  foodMarkerCount = 0;
  dustCount = 0;

  constructor() {
    this.blobData = new Float32Array(MAX_BLOBS * BLOB_FLOATS);
    this.linkData = new Float32Array(MAX_LINKS * LINK_FLOATS);
    this.foodData = new Float32Array(MAX_FOOD * FOOD_FLOATS);
    this.dustData = new Float32Array(FOOD_DUST_PARTICLE_MAX * DUST_FLOATS);
  }

  init(device: GPUDevice) {
    this.blobInstanceBuffer = device.createBuffer({
      label: 'blob instances',
      size: this.blobData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.foodInstanceBuffer = device.createBuffer({
      label: 'food instances',
      size: this.foodData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.linkInstanceBuffer = device.createBuffer({
      label: 'link instances',
      size: this.linkData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.dustInstanceBuffer = device.createBuffer({
      label: 'dust instances',
      size: this.dustData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.cameraUniformBuffer = device.createBuffer({
      label: 'camera uniform',
      size: 64, // 4x4 matrix = 16 floats = 64 bytes
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  uploadBlobs(device: GPUDevice) {
    if (this.blobCount > 0) {
      device.queue.writeBuffer(
        this.blobInstanceBuffer,
        0,
        this.blobData.buffer,
        0,
        this.blobCount * BLOB_FLOATS * 4,
      );
    }
  }

  uploadFood(device: GPUDevice) {
    if (this.foodCount > 0) {
      device.queue.writeBuffer(
        this.foodInstanceBuffer,
        0,
        this.foodData.buffer,
        0,
        this.foodCount * FOOD_FLOATS * 4,
      );
    }
  }

  uploadLinks(device: GPUDevice) {
    if (this.linkCount > 0) {
      device.queue.writeBuffer(
        this.linkInstanceBuffer,
        0,
        this.linkData.buffer,
        0,
        this.linkCount * LINK_FLOATS * 4,
      );
    }
  }

  uploadDust(device: GPUDevice) {
    if (this.dustCount > 0) {
      device.queue.writeBuffer(
        this.dustInstanceBuffer,
        0,
        this.dustData.buffer,
        0,
        this.dustCount * DUST_FLOATS * 4,
      );
    }
  }

  uploadCamera(device: GPUDevice, matrix: Float32Array) {
    device.queue.writeBuffer(this.cameraUniformBuffer, 0, matrix as Float32Array<ArrayBuffer>);
  }
}
