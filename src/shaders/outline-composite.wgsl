@group(0) @binding(0) var idTexture: texture_2d<f32>;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

var<private> positions: array<vec2<f32>, 3> = array<vec2<f32>, 3>(
  vec2<f32>(-1.0, -1.0),
  vec2<f32>( 3.0, -1.0),
  vec2<f32>(-1.0,  3.0),
);

@vertex
fn vs_main(@builtin(vertex_index) idx: u32) -> VertexOutput {
  var out: VertexOutput;
  let pos = positions[idx];
  out.position = vec4<f32>(pos, 0.0, 1.0);
  out.uv = pos * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5, 0.5);
  return out;
}

fn decodeId(rgba: vec4<f32>) -> u32 {
  let r = u32(round(clamp(rgba.r, 0.0, 1.0) * 255.0));
  let g = u32(round(clamp(rgba.g, 0.0, 1.0) * 255.0));
  let b = u32(round(clamp(rgba.b, 0.0, 1.0) * 255.0));
  return r | (g << 8u) | (b << 16u);
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let texSizeU = textureDimensions(idTexture);
  let texSize = vec2<i32>(i32(texSizeU.x), i32(texSizeU.y));
  if (texSize.x <= 0 || texSize.y <= 0) {
    return vec4<f32>(0.0);
  }

  let uv = clamp(in.uv, vec2<f32>(0.0, 0.0), vec2<f32>(0.999999, 0.999999));
  let coordF = uv * vec2<f32>(f32(texSize.x), f32(texSize.y));
  let coord = vec2<i32>(i32(floor(coordF.x)), i32(floor(coordF.y)));

  let center = decodeId(textureLoad(idTexture, coord, 0));
  if (center == 0u) {
    return vec4<f32>(0.0);
  }

  let right = decodeId(textureLoad(idTexture, vec2<i32>(min(texSize.x - 1, coord.x + 1), coord.y), 0));
  let left = decodeId(textureLoad(idTexture, vec2<i32>(max(0, coord.x - 1), coord.y), 0));
  let down = decodeId(textureLoad(idTexture, vec2<i32>(coord.x, min(texSize.y - 1, coord.y + 1)), 0));
  let up = decodeId(textureLoad(idTexture, vec2<i32>(coord.x, max(0, coord.y - 1)), 0));

  let isEdge = right != center || left != center || down != center || up != center;
  if (!isEdge) {
    return vec4<f32>(0.0);
  }
  return vec4<f32>(0.0, 0.0, 0.0, 0.92);
}
