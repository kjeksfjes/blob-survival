struct CameraUniform {
  projection: mat4x4<f32>,
};

struct DustStyleUniform {
  params: vec4<f32>, // intensity, unused...
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
  let alphaMask = 1.0 - smoothstep(0.82, 1.0, dist);
  let coreLift = (1.0 - smoothstep(0.0, 0.9, dist)) * 0.12;
  let rim = 1.0 - smoothstep(0.0, 0.2, 1.0 - dist);
  let cool = vec3<f32>(0.62, 1.0, 0.85);
  let warm = vec3<f32>(1.0, 0.96, 0.76);
  var rgb = mix(cool, warm, clamp(in.tint, 0.0, 1.0));
  rgb = rgb * (1.0 - rim * 0.30);
  rgb += vec3<f32>(coreLift, coreLift, coreLift);
  rgb *= intensity;
  let outAlpha = alphaMask * in.alpha;
  if (outAlpha <= 0.001) {
    discard;
  }
  return vec4<f32>(rgb, outAlpha);
}
