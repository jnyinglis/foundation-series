import { NOISE_GLSL } from './noise';

export const SUN_VERT = /* glsl */ `
varying vec3 vLocal;
varying vec3 vNormal;
varying vec3 vWorldPos;
void main() {
  vLocal = position;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const SUN_FRAG = /* glsl */ `
precision highp float;
${NOISE_GLSL}
uniform vec3 uColor;
uniform float uTime;
varying vec3 vLocal;
varying vec3 vNormal;
varying vec3 vWorldPos;
void main() {
  vec3 p = normalize(vLocal);
  float t = uTime * 0.05;
  float g = fbm(p * 6.0 + vec3(t, -t * 0.7, t * 0.3), 5);
  float g2 = ridged(p * 14.0 + vec3(-t * 0.5, t, 0.0), 3);
  float gran = 0.75 + 0.35 * g + 0.25 * g2;
  vec3 V = normalize(cameraPosition - vWorldPos);
  float limb = pow(max(dot(normalize(vNormal), V), 0.0), 0.6);
  vec3 col = uColor * gran * (0.55 + 0.45 * limb) * 4.0;
  // hot spots
  col += vec3(1.0, 0.9, 0.7) * smoothstep(0.75, 1.0, g2) * 1.5;
  gl_FragColor = vec4(col, 1.0);
}
`;
