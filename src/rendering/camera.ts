export class Camera {
  x = 0;
  y = 0;
  zoom = 1;
  private canvasWidth = 1;
  private canvasHeight = 1;

  resize(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  /** Returns a 4x4 orthographic projection matrix as Float32Array */
  getProjectionMatrix(): Float32Array {
    const hw = (this.canvasWidth / 2) / this.zoom;
    const hh = (this.canvasHeight / 2) / this.zoom;
    const l = this.x - hw;
    const r = this.x + hw;
    const b = this.y + hh; // y-down
    const t = this.y - hh;

    // Column-major 4x4 orthographic matrix
    const m = new Float32Array(16);
    m[0] = 2 / (r - l);
    m[5] = 2 / (t - b);
    m[10] = 1;
    m[12] = -(r + l) / (r - l);
    m[13] = -(t + b) / (t - b);
    m[15] = 1;
    return m;
  }

  pan(dx: number, dy: number) {
    this.x -= dx / this.zoom;
    this.y -= dy / this.zoom;
  }

  zoomBy(factor: number, pivotX?: number, pivotY?: number) {
    const oldZoom = this.zoom;
    this.zoom = Math.max(0.1, Math.min(10, this.zoom * factor));
    // Zoom toward pivot point (screen coords)
    if (pivotX !== undefined && pivotY !== undefined) {
      const worldPivotX = this.x + (pivotX - this.canvasWidth / 2) / oldZoom;
      const worldPivotY = this.y + (pivotY - this.canvasHeight / 2) / oldZoom;
      this.x = worldPivotX - (pivotX - this.canvasWidth / 2) / this.zoom;
      this.y = worldPivotY - (pivotY - this.canvasHeight / 2) / this.zoom;
    }
  }

  centerOn(worldX: number, worldY: number) {
    this.x = worldX;
    this.y = worldY;
  }
}
