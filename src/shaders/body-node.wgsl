struct CameraUniform {
  projection: mat4x4<f32>,
};

struct StyleUniform {
  params: vec4<f32>, // edgeWidthFrac, edgeDarkness, unused, unused
};

@group(0) @binding(0) var<uniform> camera: CameraUniform;
@group(1) @binding(0) var<uniform> style: StyleUniform;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) color: vec4<f32>,
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
  @location(2) instColor: vec3<f32>,
  @location(3) instAlpha: f32,
  @location(4) _instType: f32,
) -> VertexOutput {
  var out: VertexOutput;
  let quad = quadPos[vertexIndex];
  let worldPos = instPos + quad * instRadius;
  out.position = camera.projection * vec4<f32>(worldPos, 0.0, 1.0);
  out.uv = quad;
  out.color = vec4<f32>(instColor, instAlpha);
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let dist = length(in.uv);
  if (dist > 1.0) {
    discard;
  }

  let edgeWidthFrac = clamp(style.params.x, 0.02, 0.45);
  let edgeDarkness = clamp(style.params.y, 0.0, 0.8);
  let insideNorm = 1.0 - dist;
  let edgeMask = 1.0 - smoothstep(0.0, edgeWidthFrac, insideNorm);
  let darken = edgeMask * edgeDarkness;
  let rgb = in.color.rgb * (1.0 - darken);

  let alphaMask = 1.0 - smoothstep(0.93, 1.0, dist);
  let outAlpha = in.color.a * alphaMask;
  if (outAlpha <= 0.001) {
    discard;
  }
  return vec4<f32>(rgb, outAlpha);
}
