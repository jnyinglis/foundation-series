export const ATMO_VERT = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorldPos;
void main() {
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const ATMO_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uSunDir;
uniform vec3 uColor;
uniform float uScale;   // atmosphere radius / planet radius
uniform float uStrength;
uniform float uRadius;
varying vec3 vNormal;
varying vec3 vWorldPos;
void main() {
  vec3 n = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float d = dot(n, V);
  float limb = -sqrt(max(1.0 - 1.0 / (uScale * uScale), 0.0));
  // t = 1 at the planet limb, 0 at the outer edge of the shell
  float t = clamp(d / limb, 0.0, 1.0);
  float glow = pow(t, 3.5);
  float sun = smoothstep(-0.35, 0.35, dot(n, normalize(uSunDir)));
  vec3 warm = mix(uColor, vec3(1.0, 0.55, 0.3), pow(1.0 - sun, 2.0) * 0.6);
  float camR = length(cameraPosition) / uRadius;
  float fade = smoothstep(uScale, uScale + 0.35, camR);
  gl_FragColor = vec4(warm * glow * sun * uStrength * fade, glow * sun * fade);
}
`;

export const CLOUD_VERT = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vLocal;
void main() {
  vLocal = position;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;
