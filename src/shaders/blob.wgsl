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

  // Per-type energy falloff shapes
  let t = i32(in.blobType + 0.5);
  var energy: f32;

  switch (t) {
    case 0: {
      // CORE: tight Gaussian — compact bright center
      energy = exp(-dist * dist * 3.5);
    }
    case 2: {
      // SHIELD: flat-top — hard-edged protective shell
      energy = smoothstep(1.0, 0.5, dist);
    }
    case 3: {
      // SENSOR: ring pattern — visible ring/antenna at tip
      let ring = exp(-((dist - 0.45) * (dist - 0.45)) * 20.0);
      let core = exp(-dist * dist * 4.0) * 0.5;
      energy = ring + core;
    }
    case 4: {
      // WEAPON: 3-spike angular modulation — spiky protrusion
      let angle = atan2(in.uv.y, in.uv.x);
      let spikes = 0.6 + 0.4 * pow(abs(cos(angle * 1.5)), 3.0);
      energy = exp(-dist * dist * 2.5) * spikes;
    }
    case 7: {
      // FAT: wide gentle falloff — big soft body extension
      energy = exp(-dist * dist * 1.0);
    }
    case 8: {
      // PHOTOSYNTHESIZER: 2-lobe angular pattern — leaf-like shape
      let angle = atan2(in.uv.y, in.uv.x);
      let lobes = 0.5 + 0.5 * abs(cos(angle));
      energy = exp(-dist * dist * 2.0) * lobes;
    }
    default: {
      // MOUTH(1), REPRODUCER(5), MOTOR(6), ADHESION(9): standard Gaussian
      energy = exp(-dist * dist * 2.0);
    }
  }

  // Return premultiplied alpha color with energy field value
  let col = in.color.rgb * energy;
  return vec4<f32>(col, energy * in.color.a);
}
