// Food particle instanced shader
// Each instance: posX, posY, radius, alpha, kind, rotNorm

struct CameraUniform {
  projection: mat4x4<f32>,
};
struct FoodStyleUniform {
  params: vec4<f32>, // legacyMetaballMode, unused...
};

@group(0) @binding(0) var<uniform> camera: CameraUniform;
@group(1) @binding(0) var<uniform> foodStyle: FoodStyleUniform;

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
  let legacyMetaballMode = foodStyle.params.x >= 0.5;
  let scoutColor = vec3<f32>(1.0, 1.0, 1.0);
  let leaderColor = vec3<f32>(0.52, 0.06, 1.0);
  if (isOverlayMarker) {
    var field = exp(-dist * dist * 4.0);
    var alphaField = field;
    // Much narrower gaussian band => much thinner social marker ring.
    let ring = exp(-((dist - 0.82) * (dist - 0.82)) * 420.0) * 1.9;
    let core = exp(-dist * dist * 1.8) * 0.08;
    alphaField = ring + core;
    field = ring + core;
    let baseColor = select(scoutColor, leaderColor, isLeaderMarker);
    let color = baseColor * field;
    return vec4<f32>(color * in.alpha, alphaField * in.alpha);
  }

  if (legacyMetaballMode) {
    var field = exp(-dist * dist * 4.0);
    var alphaField = field * 0.4;
    let plantColor = vec3<f32>(0.09, 0.32, 0.09);
    let meatFresh = vec3<f32>(0.42, 0.16, 0.12);
    let meatRot = vec3<f32>(0.28, 0.20, 0.14);
    let carriedFresh = vec3<f32>(0.92, 0.24, 0.20);
    let carriedRot = vec3<f32>(0.70, 0.22, 0.18);
    let meatColor = mix(meatFresh, meatRot, clamp(in.rotNorm, 0.0, 1.0));
    let carriedColor = mix(carriedFresh, carriedRot, clamp(in.rotNorm, 0.0, 1.0));
    var baseColor = plantColor;
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
    let color = baseColor * field;
    return vec4<f32>(color * in.alpha, alphaField * in.alpha);
  }

  let rot = clamp(in.rotNorm, 0.0, 1.0);
  let plantFresh = vec3<f32>(0.12, 0.58, 0.16);
  let plantStale = vec3<f32>(0.10, 0.41, 0.13);
  let meatFresh = vec3<f32>(0.72, 0.27, 0.21);
  let meatRot = vec3<f32>(0.43, 0.28, 0.21);
  let carriedFresh = vec3<f32>(0.86, 0.33, 0.28);
  let carriedRot = vec3<f32>(0.60, 0.28, 0.24);

  var baseColor = mix(plantFresh, plantStale, rot);
  if (isMeat) {
    baseColor = mix(meatFresh, meatRot, rot);
  }
  if (isCarriedMeat) {
    baseColor = mix(carriedFresh, carriedRot, rot);
  }

  let insideNorm = 1.0 - dist;
  let edgeMask = 1.0 - smoothstep(0.0, 0.22, insideNorm);
  let centerLift = (1.0 - smoothstep(0.0, 0.95, dist)) * 0.08;
  var rgb = baseColor * (1.0 - edgeMask * 0.36) + vec3<f32>(centerLift, centerLift, centerLift);
  let alphaMask = 1.0 - smoothstep(0.93, 1.0, dist);
  let outAlpha = alphaMask * in.alpha;
  if (outAlpha <= 0.001) {
    discard;
  }
  return vec4<f32>(rgb, outAlpha);
}
