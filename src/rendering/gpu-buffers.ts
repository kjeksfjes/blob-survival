import { MAX_BLOBS, MAX_FOOD } from '../constants';
import { BLOB_FLOATS, FOOD_FLOATS } from '../types';

export class GpuBuffers {
  // Instance data packed for GPU upload
  readonly blobData: Float32Array;
  readonly foodData: Float32Array;

  // GPU buffers
  blobInstanceBuffer!: GPUBuffer;
  foodInstanceBuffer!: GPUBuffer;
  cameraUniformBuffer!: GPUBuffer;

  blobCount = 0;
  foodCount = 0;

  constructor() {
    this.blobData = new Float32Array(MAX_BLOBS * BLOB_FLOATS);
    this.foodData = new Float32Array(MAX_FOOD * FOOD_FLOATS);
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

  uploadCamera(device: GPUDevice, matrix: Float32Array) {
    device.queue.writeBuffer(this.cameraUniformBuffer, 0, matrix as Float32Array<ArrayBuffer>);
  }
}
