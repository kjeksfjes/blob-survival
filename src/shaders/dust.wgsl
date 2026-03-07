struct CameraUniform {
  projection: mat4x4<f32>,
};

struct DustStyleUniform {
  params: vec4<f32>, // intensity, timeSec, glintsEnabled, unused...
};

@group(0) @binding(0) var<uniform> camera: CameraUniform;
@group(1) @binding(0) var<uniform> dustStyle: DustStyleUniform;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) alpha: f32,
  @location(2) seed: f32,
  @location(3) tint: f32,
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
  @location(3) instSeed: f32,
  @location(4) instTint: f32,
) -> VertexOutput {
  var out: VertexOutput;
  let quad = quadPos[vertexIndex];
  let worldPos = instPos + quad * instRadius;
  out.position = camera.projection * vec4<f32>(worldPos, 0.0, 1.0);
  out.uv = quad;
  out.alpha = instAlpha;
  out.seed = instSeed;
  out.tint = instTint;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let dist = length(in.uv);
  if (dist > 1.0) {
    discard;
  }
  let intensity = dustStyle.params.x;
  let timeSec = dustStyle.params.y;
  let glintsEnabled = dustStyle.params.z;
  let alphaMask = 1.0 - smoothstep(0.82, 1.0, dist);
  let coreLift = (1.0 - smoothstep(0.0, 0.9, dist)) * 0.12;
  let rim = 1.0 - smoothstep(0.0, 0.2, 1.0 - dist);
  let cool = vec3<f32>(0.62, 1.0, 0.85);
  let warm = vec3<f32>(1.0, 0.96, 0.76);
  var rgb = mix(cool, warm, clamp(in.tint, 0.0, 1.0));
  rgb = rgb * (1.0 - rim * 0.30);
  rgb += vec3<f32>(coreLift, coreLift, coreLift);
  rgb *= intensity;

  let fadeNorm = clamp(in.alpha / 0.95, 0.0, 1.0);
  let lifeFrac = 1.0 - fadeNorm;
  // Glints should be present across lifetime, but intensify as particle approaches the end.
  let glintPresence = 0.30 + 0.70 * smoothstep(0.12, 1.0, lifeFrac);
  let blinkA = smoothstep(0.82, 0.995, 0.5 + 0.5 * sin(timeSec * (13.0 + in.seed * 5.0) + in.seed * 41.0));
  let blinkB = smoothstep(0.86, 0.997, 0.5 + 0.5 * sin(timeSec * (17.0 + in.seed * 7.0) + in.seed * 73.0));
  let blinkC = smoothstep(0.90, 0.999, 0.5 + 0.5 * sin(timeSec * (11.0 + in.seed * 3.0) + in.seed * 97.0));
  let blinkPulse = clamp((blinkA + blinkB + blinkC) * 0.75 * glintPresence * glintsEnabled, 0.0, 1.0);
  rgb = mix(rgb, vec3<f32>(1.0, 1.0, 1.0), blinkPulse);

  let baseAlpha = alphaMask * in.alpha;
  let blinkAlpha = alphaMask * blinkPulse * 0.88;
  let outAlpha = max(baseAlpha, blinkAlpha);
  if (outAlpha <= 0.001) {
    discard;
  }
  return vec4<f32>(rgb, outAlpha);
}
