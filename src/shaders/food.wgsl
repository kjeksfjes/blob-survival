// Food particle instanced shader
// Each instance: posX, posY, radius, alpha

struct CameraUniform {
  projection: mat4x4<f32>,
};

@group(0) @binding(0) var<uniform> camera: CameraUniform;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) alpha: f32,
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
) -> VertexOutput {
  var out: VertexOutput;
  let quad = quadPos[vertexIndex];
  let worldPos = instPos + quad * instRadius;
  out.position = camera.projection * vec4<f32>(worldPos, 0.0, 1.0);
  out.uv = quad;
  out.alpha = instAlpha;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let dist = length(in.uv);
  if (dist > 1.0) {
    discard;
  }

  // Subtle dim dot
  let glow = exp(-dist * dist * 4.0);
  let color = vec3<f32>(0.1, 0.3, 0.1) * glow; // dim green speck
  return vec4<f32>(color * in.alpha, glow * in.alpha * 0.4);
}
