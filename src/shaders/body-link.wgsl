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
  @location(0) local: vec2<f32>,
  @location(1) halfSeg: f32,
  @location(2) radius: f32,
  @location(3) color: vec4<f32>,
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
  @location(0) instA: vec2<f32>,
  @location(1) instB: vec2<f32>,
  @location(2) instThickness: f32,
  @location(3) instColor: vec3<f32>,
  @location(4) instAlpha: f32,
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
  out.color = vec4<f32>(instColor, instAlpha);
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
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

  let edgeWidthFrac = clamp(style.params.x, 0.02, 0.45);
  let edgeDarkness = clamp(style.params.y, 0.0, 0.8);
  let inside = -dist;
  let edgeWidth = max(0.001, edgeWidthFrac * in.radius);
  let edgeMask = 1.0 - smoothstep(0.0, edgeWidth, inside);
  let darken = edgeMask * edgeDarkness;
  let rgb = in.color.rgb * (1.0 - darken);

  let alphaMask = 1.0 - smoothstep(-0.65, 0.12, dist);
  let outAlpha = in.color.a * alphaMask;
  if (outAlpha <= 0.001) {
    discard;
  }
  return vec4<f32>(rgb, outAlpha);
}
