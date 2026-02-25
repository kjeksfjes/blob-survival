// Full-screen metaball threshold + glow post-process
// Reads the additive energy field texture and applies threshold + glow

@group(0) @binding(0) var inputTexture: texture_2d<f32>;
@group(0) @binding(1) var inputSampler: sampler;
struct PostParams {
  viewBounds: vec4<f32>,  // l, r, t, b in world space
  worldBounds: vec4<f32>, // minX, minY, maxX, maxY
  styleA: vec4<f32>,      // threshold, glowRadiusPx, glowStrength, auraStrength
  styleB: vec4<f32>,      // edgeStrength, unused...
}
@group(0) @binding(2) var<uniform> postParams: PostParams;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

// Full-screen triangle (3 vertices cover entire screen)
var<private> positions: array<vec2<f32>, 3> = array<vec2<f32>, 3>(
  vec2<f32>(-1.0, -1.0),
  vec2<f32>( 3.0, -1.0),
  vec2<f32>(-1.0,  3.0),
);

@vertex
fn vs_main(@builtin(vertex_index) idx: u32) -> VertexOutput {
  var out: VertexOutput;
  let pos = positions[idx];
  out.position = vec4<f32>(pos, 0.0, 1.0);
  // Map from clip space to UV [0,1]
  out.uv = pos * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5, 0.5);
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let texSize = vec2<f32>(textureDimensions(inputTexture));
  let pixelSize = 1.0 / texSize;

  // Sample center -- must happen before any non-uniform control flow
  let center = textureSample(inputTexture, inputSampler, in.uv);

  // Sample neighborhood for glow blur (8 directions)
  // Must also happen in uniform control flow (before branches)
  let threshold = postParams.styleA.x;
  let glowRadius = postParams.styleA.y;
  let glowStrength = postParams.styleA.z;
  let auraStrength = postParams.styleA.w;
  let edgeStrength = postParams.styleB.x;
  let s0 = textureSample(inputTexture, inputSampler, in.uv + vec2<f32>( 1.0,  0.0) * pixelSize * glowRadius);
  let s1 = textureSample(inputTexture, inputSampler, in.uv + vec2<f32>( 0.707,  0.707) * pixelSize * glowRadius);
  let s2 = textureSample(inputTexture, inputSampler, in.uv + vec2<f32>( 0.0,  1.0) * pixelSize * glowRadius);
  let s3 = textureSample(inputTexture, inputSampler, in.uv + vec2<f32>(-0.707,  0.707) * pixelSize * glowRadius);
  let s4 = textureSample(inputTexture, inputSampler, in.uv + vec2<f32>(-1.0,  0.0) * pixelSize * glowRadius);
  let s5 = textureSample(inputTexture, inputSampler, in.uv + vec2<f32>(-0.707, -0.707) * pixelSize * glowRadius);
  let s6 = textureSample(inputTexture, inputSampler, in.uv + vec2<f32>( 0.0, -1.0) * pixelSize * glowRadius);
  let s7 = textureSample(inputTexture, inputSampler, in.uv + vec2<f32>( 0.707, -0.707) * pixelSize * glowRadius);
  let glow = (s0.rgb + s1.rgb + s2.rgb + s3.rgb + s4.rgb + s5.rgb + s6.rgb + s7.rgb) / 8.0;

  let energy = center.a;
  let color = center.rgb;
  let worldX = mix(postParams.viewBounds.x, postParams.viewBounds.y, in.uv.x);
  let worldY = mix(postParams.viewBounds.z, postParams.viewBounds.w, in.uv.y);
  let insideWorld = (
    worldX >= postParams.worldBounds.x &&
    worldX <= postParams.worldBounds.z &&
    worldY >= postParams.worldBounds.y &&
    worldY <= postParams.worldBounds.w
  );
  let bgOutside = vec4<f32>(0.06, 0.06, 0.08, 1.0);
  let bgInside = vec4<f32>(0.0, 0.0, 0.0, 1.0);
  let bgColor = select(bgOutside, bgInside, insideWorld);

  // No energy at all: background
  if (energy < 0.005) {
    // Check if glow reaches here
    let glowEnergy = (s0.a + s1.a + s2.a + s3.a + s4.a + s5.a + s6.a + s7.a) / 8.0;
    if (glowEnergy < 0.005) {
      return bgColor;
    }
    let faintGlow = glow * glowEnergy * glowStrength;
    return vec4<f32>(faintGlow, 1.0);
  }

  if (energy > threshold) {
    // Inside metaball: solid organic surface
    let brightness = smoothstep(threshold, threshold + 0.4, energy);
    let surfaceColor = mix(color * 0.7, color * 1.3, brightness);
    // Edge highlight: brighter at the metaball boundary
    let edgeDist = (energy - threshold) / max(1.0 - threshold, 0.01);
    let edgeGlow = exp(-edgeDist * 2.5) * edgeStrength;
    let finalColor = surfaceColor + glow * glowStrength + vec3<f32>(edgeGlow);
    return vec4<f32>(finalColor, 1.0);
  } else {
    // Outside threshold but near: visible glow aura
    let aura = smoothstep(0.0, threshold, energy) * auraStrength;
    let glowColor = (color + glow) * 0.5 * aura;
    return vec4<f32>(glowColor, 1.0);
  }
}
