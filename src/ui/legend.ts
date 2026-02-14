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
  // Fixed-hue types: always the same color regardless of creature
  switch (type) {
    case 1: return hsl(0.07, 0.85, 0.50);  // MOUTH — orange
    case 2: return hsl(0.58, 0.12, 0.35);  // SHIELD — dark steel gray
    case 3: return hsl(0.15, 0.50, 0.80);  // SENSOR — pale yellow
    case 4: return hsl(0.00, 0.90, 0.45);  // WEAPON — red
    case 5: return hsl(0.88, 0.70, 0.60);  // REPRODUCER — pink
    case 8: return hsl(0.33, 0.80, 0.55);  // PHOTO — green
    case 9: return hsl(0.50, 0.60, 0.50);  // ADHESION — teal/cyan
  }
  // Relative-hue types: use reference hue
  switch (type) {
    case 0: return hsl(REF_HUE, 0.85, 0.70);  // CORE
    case 6: return hsl(REF_HUE, 0.35, 0.40);  // MOTOR
    case 7: return hsl(REF_HUE, 0.15, 0.55);  // FAT
    default: return hsl(REF_HUE, 0.70, 0.55);
  }
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
