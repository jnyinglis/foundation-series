import { NOISE_GLSL } from './noise';

export const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  // centre the sky on the camera exactly, whatever the mesh position is
  vec4 mv = viewMatrix * vec4(position + cameraPosition, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_Position.z = gl_Position.w; // push to far plane
}
`;

// Baked once per system into a small cube map.
export const NEBULA_FRAG = /* glsl */ `
precision highp float;
${NOISE_GLSL}
uniform float uSeed;
uniform vec3 uNebulaA;
uniform vec3 uNebulaB;
uniform float uCoreDir;   // angle in radians toward the galactic core
uniform float uCoreStrength;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float band = exp(-pow(d.y * 4.5, 2.0));
  float core = smoothstep(-0.2, 1.0, dot(normalize(vec3(d.x, 0.0, d.z)), vec3(cos(uCoreDir), 0.0, sin(uCoreDir))));
  float milky = fbm(d * 5.0 + uSeed, 5) * 0.5 + 0.5;
  float milky2 = fbm(d * 12.0 - uSeed, 4) * 0.5 + 0.5;
  vec3 skyCol = vec3(0.0);
  float mw = band * (0.35 + 0.65 * milky) * (0.5 + 0.8 * core * uCoreStrength) * (0.5 + 0.5 * milky2);
  vec3 mwCol = mix(vec3(0.5, 0.55, 0.75), vec3(0.85, 0.72, 0.5), core * uCoreStrength * 0.5);
  skyCol += mwCol * mw * 0.11;
  float dust = smoothstep(0.45, 0.7, fbm(d * 9.0 + uSeed * 2.0, 4) * 0.5 + 0.5) * band;
  skyCol *= 1.0 - dust * 0.75;
  float nb = fbm(d * 3.0 + uSeed * 1.3, 5) * 0.5 + 0.5;
  float nbMask = smoothstep(0.55, 0.85, fbm(d * 1.6 + uSeed * 0.7, 3) * 0.5 + 0.5);
  float nb2 = fbm(d * 7.0 - uSeed * 0.9, 4) * 0.5 + 0.5;
  vec3 neb = mix(uNebulaA, uNebulaB, nb2) * pow(nb, 2.2) * nbMask * 0.9;
  skyCol += neb;
  gl_FragColor = vec4(skyCol, 1.0);
}
`;

// Rendered every frame: one cube map sample.
export const SKY_FRAG = /* glsl */ `
precision highp float;
uniform samplerCube uNebula;
varying vec3 vDir;
void main() {
  gl_FragColor = vec4(textureCube(uNebula, normalize(vDir)).rgb, 1.0);
}
`;

// Stars as a point cloud: crisp, stable, and nearly free.
export const STAR_POINTS_VERT = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
uniform float uPixelRatio;
varying vec3 vColor;
void main() {
  vColor = aColor;
  vec4 mv = viewMatrix * vec4(position + cameraPosition, 1.0);
  gl_PointSize = aSize * uPixelRatio;
  gl_Position = projectionMatrix * mv;
}
`;

export const STAR_POINTS_FRAG = /* glsl */ `
precision highp float;
varying vec3 vColor;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c) * 2.0;
  if (d > 1.0) discard;
  float a = exp(-d * d * 5.0);
  gl_FragColor = vec4(vColor * a, 1.0);
}
`;

// Motion dust near the ship: small, capped point sprites.
export const DUST_VERT = /* glsl */ `
uniform float uPixelRatio;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float dist = -mv.z;
  float size = clamp(900.0 / max(dist, 1.0), 1.0, 4.5);
  vAlpha = smoothstep(20.0, 120.0, dist) * (1.0 - smoothstep(600.0, 900.0, dist));
  gl_PointSize = size * uPixelRatio;
  gl_Position = projectionMatrix * mv;
}
`;
export const DUST_FRAG = /* glsl */ `
precision highp float;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c) * 2.0;
  if (d > 1.0) discard;
  float a = exp(-d * d * 4.0) * vAlpha * 0.5;
  gl_FragColor = vec4(vec3(0.62, 0.7, 0.8) * a, 1.0);
}
`;
