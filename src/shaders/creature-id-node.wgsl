struct CameraUniform {
  projection: mat4x4<f32>,
};

@group(0) @binding(0) var<uniform> camera: CameraUniform;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) alpha: f32,
  @location(2) creatureIdEncoded: f32,
};

var<private> quadPos: array<vec2<f32>, 6> = array<vec2<f32>, 6>(
  vec2<f32>(-1.0, -1.0),
  vec2<f32>( 1.0, -1.0),
  vec2<f32>(-1.0,  1.0),
  vec2<f32>(-1.0,  1.0),
  vec2<f32>( 1.0, -1.0),
  vec2<f32>( 1.0,  1.0),
);

fn encodeIdColor(idEncoded: f32) -> vec4<f32> {
  let id = u32(max(0.0, floor(idEncoded + 0.5)));
  let r = f32(id & 255u) / 255.0;
  let g = f32((id >> 8u) & 255u) / 255.0;
  let b = f32((id >> 16u) & 255u) / 255.0;
  return vec4<f32>(r, g, b, 1.0);
}

@vertex
fn vs_main(
  @builtin(vertex_index) vertexIndex: u32,
  @location(0) instPos: vec2<f32>,
  @location(1) instRadius: f32,
  @location(2) instAlpha: f32,
  @location(3) instCreatureId: f32,
) -> VertexOutput {
  var out: VertexOutput;
  let quad = quadPos[vertexIndex];
  let worldPos = instPos + quad * instRadius;
  out.position = camera.projection * vec4<f32>(worldPos, 0.0, 1.0);
  out.uv = quad;
  out.alpha = instAlpha;
  out.creatureIdEncoded = instCreatureId;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  if (in.alpha <= 0.001) {
    discard;
  }
  let dist = length(in.uv);
  if (dist > 1.0) {
    discard;
  }
  return encodeIdColor(in.creatureIdEncoded);
}
