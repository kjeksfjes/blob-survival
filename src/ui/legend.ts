// Blob type indices must match BlobType const enum in types.ts
const TYPES: Array<{ name: string; desc: string }> = [
  /* 0 CORE   */ { name: 'Core',   desc: 'Central body' },
  /* 1 MOUTH  */ { name: 'Mouth',  desc: 'Eats food' },
  /* 2 SHIELD */ { name: 'Shield', desc: 'Absorbs damage' },
  /* 3 SENSOR */ { name: 'Sensor', desc: 'Extends detection' },
  /* 4 WEAPON */ { name: 'Weapon', desc: 'Attacks non-kin' },
  /* 5 REPRO  */ { name: 'Reproducer', desc: 'Enables reproduction' },
  /* 6 MOTOR  */ { name: 'Motor',  desc: 'Provides movement' },
  /* 7 FAT    */ { name: 'Fat',    desc: 'Extra energy storage' },
  /* 8 PHOTO  */ { name: 'Photo',  desc: 'Generates energy from light' },
  /* 9 ADHES  */ { name: 'Adhesion', desc: 'Bonds with kin' },
];

const REF_HUE = 0.55;

function hsl(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h * 6) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  const sector = Math.floor(h * 6) % 6;
  switch (sector) {
    case 0: r = c; g = x; break;
    case 1: r = x; g = c; break;
    case 2: g = c; b = x; break;
    case 3: g = x; b = c; break;
    case 4: r = x; b = c; break;
    case 5: r = c; b = x; break;
  }
  const to8 = (v: number) => Math.round((v + m) * 255);
  return `rgb(${to8(r)},${to8(g)},${to8(b)})`;
}

function colorForType(type: number): string {
  let h = REF_HUE, sat = 0.7, lit = 0.55;
  switch (type) {
    case 0: sat = 0.85; lit = 0.75; break;                // CORE
    case 1: h += 0.08; sat = 0.7; lit = 0.45; break;      // MOUTH
    case 2: h += 0.3; sat = 0.2; lit = 0.30; break;       // SHIELD
    case 3: sat = 0.3; lit = 0.90; break;                  // SENSOR
    case 4: h += 0.15; sat = 0.95; lit = 0.55; break;     // WEAPON
    case 5: h -= 0.15; sat = 0.7; lit = 0.65; break;      // REPRODUCER
    case 6: h += 0.08; sat = 0.5; lit = 0.50; break;      // MOTOR
    case 7: sat = 0.2; lit = 0.55; break;                  // FAT
    case 8: return hsl(0.33, 0.8, 0.55);                   // PHOTO (fixed green)
    case 9: h += 0.25; sat = 0.4; lit = 0.50; break;      // ADHESION
  }
  if (h < 0) h += 1;
  if (h > 1) h -= 1;
  return hsl(h, sat, lit);
}

export class Legend {
  private el: HTMLElement;

  constructor() {
    this.el = document.getElementById('legend')!;
    this.el.innerHTML = TYPES.map((t, i) =>
      `<div class="legend-row">` +
        `<span class="legend-dot" style="background:${colorForType(i)}"></span>` +
        `<span class="legend-name">${t.name}</span>` +
        `<span class="legend-desc">— ${t.desc}</span>` +
      `</div>`
    ).join('');
  }

  toggle() {
    this.el.classList.toggle('hidden');
  }
}
