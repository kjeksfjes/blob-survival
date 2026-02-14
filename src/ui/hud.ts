import { World } from '../simulation/world';

export class Hud {
  private el: HTMLElement;
  private fps = 0;
  private lastTime = performance.now();
  private frameCount = 0;

  constructor() {
    this.el = document.getElementById('hud')!;
  }

  tick() {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastTime = now;
    }
  }

  update(world: World, speed: number) {
    this.el.innerHTML = [
      `FPS: ${this.fps}`,
      `Tick: ${world.tick}`,
      `Speed: ${speed}x`,
      ``,
      `Creatures: ${world.creatureCount}`,
      `Blobs: ${world.blobCount}`,
      `Food: ${world.foodCount}`,
      ``,
      `Births: ${world.totalBirths}`,
      `Deaths: ${world.totalDeaths}`,
    ].join('<br>');
  }
}
