// Food particle instanced shader
// Each instance: posX, posY, radius, alpha, kind, rotNorm

struct CameraUniform {
  projection: mat4x4<f32>,
};

@group(0) @binding(0) var<uniform> camera: CameraUniform;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) alpha: f32,
  @location(2) kind: f32,
  @location(3) rotNorm: f32,
};

var<private> quadPos: array<vec2<f32>, 6> = array<vec2<f32>, 6>(
  vec2<f32>(-1.0, -1.0),
  vec2<f32>( 1.0, -1.0),
  vec2<f32>(-1.0,  1.0),
  vec2<f32>(-1.0,  1.0),
  vec2<f32>( 1.0, -1.0),
  vec2<f32>( 1.0,  1.0),
);

@vertex
fn vs_main(
  @builtin(vertex_index) vertexIndex: u32,
  @location(0) instPos: vec2<f32>,
  @location(1) instRadius: f32,
  @location(2) instAlpha: f32,
  @location(3) instKind: f32,
  @location(4) instRotNorm: f32,
) -> VertexOutput {
  var out: VertexOutput;
  let quad = quadPos[vertexIndex];
  let worldPos = instPos + quad * instRadius;
  out.position = camera.projection * vec4<f32>(worldPos, 0.0, 1.0);
  out.uv = quad;
  out.alpha = instAlpha;
  out.kind = instKind;
  out.rotNorm = instRotNorm;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let dist = length(in.uv);
  if (dist > 1.0) {
    discard;
  }

  let kind = i32(in.kind + 0.5);
  let isMeat = kind == 1;
  let isCarriedMeat = kind == 2;
  let isScoutMarker = kind == 3;
  let isLeaderMarker = kind == 4;
  let isOverlayMarker = isScoutMarker || isLeaderMarker;
  var field = exp(-dist * dist * 4.0);
  let plantColor = vec3<f32>(0.1, 0.3, 0.1);
  let meatFresh = vec3<f32>(0.42, 0.16, 0.12);
  let meatRot = vec3<f32>(0.28, 0.20, 0.14);
  let carriedFresh = vec3<f32>(0.92, 0.24, 0.20);
  let carriedRot = vec3<f32>(0.70, 0.22, 0.18);
  let scoutColor = vec3<f32>(1.0, 1.0, 1.0);
  let leaderColor = vec3<f32>(0.52, 0.06, 1.0);
  let meatColor = mix(meatFresh, meatRot, clamp(in.rotNorm, 0.0, 1.0));
  let carriedColor = mix(carriedFresh, carriedRot, clamp(in.rotNorm, 0.0, 1.0));
  var baseColor = plantColor;
  var alphaField = field * 0.4;
  if (isMeat) {
    field = exp(-dist * dist * 3.5);
    baseColor = meatColor;
    alphaField = field;
  }
  if (isCarriedMeat) {
    field = exp(-dist * dist * 3.5);
    baseColor = carriedColor;
    alphaField = field * 1.2;
  }
  if (isOverlayMarker) {
    // Much narrower gaussian band => much thinner social marker ring.
    let ring = exp(-((dist - 0.82) * (dist - 0.82)) * 420.0) * 1.9;
    let core = exp(-dist * dist * 1.8) * 0.08;
    alphaField = ring + core;
    field = ring + core;
    baseColor = select(scoutColor, leaderColor, isLeaderMarker);
  }
  let color = baseColor * field;
  return vec4<f32>(color * in.alpha, alphaField * in.alpha);
}
