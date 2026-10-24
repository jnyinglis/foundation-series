import { NOISE_GLSL } from './noise';
import { EQUIRECT_GLSL } from './planet';

// Baked once per system: cloud coverage in the red channel.
export const CLOUD_BAKE_FRAG = /* glsl */ `
precision highp float;
${NOISE_GLSL}
uniform float uSeed;
uniform float uCover;
varying vec2 vUv;
void main() {
  float lon = (vUv.x - 0.5) * 6.28318530718;
  float lat = (vUv.y - 0.5) * 3.14159265359;
  vec3 p = vec3(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon));
  vec3 q = p * 3.0 + vec3(uSeed * 0.5, 0.0, 0.0);
  float big = fbm(q, 4);
  float detail = fbm(q * 4.0, 4);
  float c = big * 0.7 + detail * 0.4;
  float cover = smoothstep(0.66 - uCover * 0.25, 0.95 - uCover * 0.2, c + 0.5);
  float c2 = fbm(q * 2.5 + 31.0, 4) * 0.7 + fbm(q * 9.0 + 7.0, 3) * 0.4;
  float cover2 = smoothstep(0.7 - uCover * 0.25, 0.98 - uCover * 0.2, c2 + 0.5);
  gl_FragColor = vec4(cover, cover2, 0.0, 1.0);
}
`;

export const CLOUD_FRAG = /* glsl */ `
precision highp float;
${EQUIRECT_GLSL}
uniform sampler2D uClouds;
uniform vec3 uSunDir;
uniform float uTime;
uniform vec3 uTint;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vLocal;
void main() {
  vec3 n = normalize(vNormal);
  vec3 p = normalize(vLocal);
  vec2 uv = equirect(p);
  vec2 dx = wrapGrad(dFdx(uv));
  vec2 dy = wrapGrad(dFdy(uv));
  float c1 = sampleEq(uClouds, uv + vec2(uTime * 0.00025, 0.0), dx, dy).r;
  float c2 = sampleEq(uClouds, uv + vec2(0.31 - uTime * 0.00012, 0.0), dx, dy).g;
  float cover = clamp(c1 + c2 * 0.6 - c1 * c2 * 0.4, 0.0, 1.0);
  vec3 L = normalize(uSunDir);
  float NdotL = dot(n, L);
  float day = smoothstep(-0.1, 0.3, NdotL);
  float diffuse = max(NdotL, 0.0);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float fres = pow(1.0 - max(dot(n, V), 0.0), 2.0);
  vec3 col = uTint * (diffuse * 0.95 + 0.02) + vec3(1.0, 0.6, 0.3) * fres * 0.25 * day;
  gl_FragColor = vec4(col, cover * 0.95);
}
`;
