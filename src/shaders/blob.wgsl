// Instanced blob quad shader
// Each instance: posX, posY, radius, r, g, b, alpha, type
// The radius here is the RENDER radius (larger than physics radius)
// to create overlapping energy fields for metaball merging.

struct CameraUniform {
  projection: mat4x4<f32>,
};

@group(0) @binding(0) var<uniform> camera: CameraUniform;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) color: vec4<f32>,
  @location(2) blobType: f32,
};

// Unit quad: 2 triangles forming a [-1,1] square
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
  // Per-instance attributes
  @location(0) instPos: vec2<f32>,     // posX, posY
  @location(1) instRadius: f32,        // render radius
  @location(2) instColor: vec3<f32>,   // r, g, b
  @location(3) instAlpha: f32,         // alpha
  @location(4) instType: f32,          // blobType
) -> VertexOutput {
  var out: VertexOutput;

  let quad = quadPos[vertexIndex];
  // Scale quad by render radius, offset by instance position
  let worldPos = instPos + quad * instRadius;
  out.position = camera.projection * vec4<f32>(worldPos, 0.0, 1.0);
  out.uv = quad;
  out.color = vec4<f32>(instColor, instAlpha);
  out.blobType = instType;

  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let dist = length(in.uv);

  // Discard outside unit circle
  if (dist > 1.0) {
    discard;
  }

  // Smooth radial energy falloff: Gaussian-like
  // At dist=0: energy=1.0, dist=0.5: ~0.6, dist=1.0: ~0.14
  let energy = exp(-dist * dist * 2.0);

  // Return premultiplied alpha color with energy field value
  let col = in.color.rgb * energy;
  return vec4<f32>(col, energy * in.color.a);
}
