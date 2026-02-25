struct CameraUniform {
  projection: mat4x4<f32>,
};

@group(0) @binding(0) var<uniform> camera: CameraUniform;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) local: vec2<f32>,
  @location(1) halfSeg: f32,
  @location(2) radius: f32,
  @location(3) alpha: f32,
  @location(4) creatureIdEncoded: f32,
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
  @location(0) instA: vec2<f32>,
  @location(1) instB: vec2<f32>,
  @location(2) instThickness: f32,
  @location(3) instAlpha: f32,
  @location(4) instCreatureId: f32,
) -> VertexOutput {
  var out: VertexOutput;
  let quad = quadPos[vertexIndex];

  let center = (instA + instB) * 0.5;
  let delta = instB - instA;
  let segLen = max(length(delta), 0.001);
  let dir = delta / segLen;
  let normal = vec2<f32>(-dir.y, dir.x);
  let halfSeg = segLen * 0.5;
  let radius = max(instThickness, 0.001);
  let halfLenWithCaps = halfSeg + radius;

  let local = vec2<f32>(quad.x * halfLenWithCaps, quad.y * radius);
  let worldPos = center + dir * local.x + normal * local.y;

  out.position = camera.projection * vec4<f32>(worldPos, 0.0, 1.0);
  out.local = local;
  out.halfSeg = halfSeg;
  out.radius = radius;
  out.alpha = instAlpha;
  out.creatureIdEncoded = instCreatureId;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  if (in.alpha <= 0.001) {
    discard;
  }

  let dx = abs(in.local.x) - in.halfSeg;
  let dy = abs(in.local.y);
  var dist: f32;
  if (dx > 0.0) {
    dist = length(vec2<f32>(dx, dy)) - in.radius;
  } else {
    dist = dy - in.radius;
  }
  if (dist > 0.0) {
    discard;
  }

  return encodeIdColor(in.creatureIdEncoded);
}
