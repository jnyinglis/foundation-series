import { NOISE_GLSL } from './noise';

// Full-screen quad used for baking equirectangular maps.
export const QUAD_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// Equirectangular sampling with wrapped derivatives so the seam has no mip artifact.
export const EQUIRECT_GLSL = /* glsl */ `
vec2 equirect(vec3 p) {
  return vec2(atan(p.z, p.x) / 6.28318530718 + 0.5, asin(clamp(p.y, -1.0, 1.0)) / 3.14159265359 + 0.5);
}
vec4 sampleEq(sampler2D s, vec2 uv, vec2 dx, vec2 dy) {
  return textureGrad(s, uv, dx, dy);
}
vec2 wrapGrad(vec2 g) {
  if (g.x > 0.5) g.x -= 1.0;
  if (g.x < -0.5) g.x += 1.0;
  return g;
}
`;

// uType: 0 terrestrial, 1 desert, 2 ice, 3 ocean, 4 metal, 5 barren, 6 lush
// uPass 0 writes albedo (rgb) + water mask (a). uPass 1 writes emissive (rgb) + height (a).
export const PLANET_BAKE_FRAG = /* glsl */ `
precision highp float;
${NOISE_GLSL}
uniform float uSeed;
uniform int uType;
uniform int uPass;
uniform float uLightsDensity;
varying vec2 vUv;

vec3 palette(int t, float h, float lat, float moist) {
  if (t == 1) {
    vec3 low = vec3(0.62, 0.42, 0.22);
    vec3 high = vec3(0.86, 0.72, 0.50);
    vec3 rock = vec3(0.40, 0.26, 0.18);
    vec3 c = mix(low, high, smoothstep(0.0, 0.6, h));
    return mix(c, rock, smoothstep(0.65, 0.9, h));
  }
  if (t == 2) {
    vec3 ice = vec3(0.85, 0.90, 0.97);
    vec3 rock = vec3(0.35, 0.36, 0.40);
    vec3 tundra = vec3(0.45, 0.42, 0.32);
    vec3 c = mix(tundra, ice, smoothstep(0.1, 0.5, h + lat * 0.5));
    return mix(c, rock, smoothstep(0.7, 0.95, h));
  }
  if (t == 5) {
    return mix(vec3(0.30, 0.27, 0.25), vec3(0.55, 0.48, 0.42), smoothstep(0.0, 1.0, h));
  }
  if (t == 6) {
    vec3 beach = vec3(0.75, 0.70, 0.45);
    vec3 forest = vec3(0.07, 0.30, 0.10);
    vec3 jungle = vec3(0.12, 0.42, 0.14);
    vec3 peak = vec3(0.55, 0.52, 0.48);
    vec3 c = mix(beach, jungle, smoothstep(0.0, 0.12, h));
    c = mix(c, forest, smoothstep(0.2, 0.5, h));
    return mix(c, peak, smoothstep(0.75, 0.95, h));
  }
  vec3 beach = vec3(0.70, 0.65, 0.45);
  vec3 plain = mix(vec3(0.45, 0.42, 0.25), vec3(0.15, 0.38, 0.12), moist);
  vec3 hill = mix(vec3(0.40, 0.32, 0.20), vec3(0.10, 0.28, 0.10), moist);
  vec3 rock = vec3(0.42, 0.38, 0.35);
  vec3 snow = vec3(0.95, 0.96, 0.98);
  vec3 c = mix(beach, plain, smoothstep(0.0, 0.08, h));
  c = mix(c, hill, smoothstep(0.25, 0.5, h));
  c = mix(c, rock, smoothstep(0.55, 0.8, h));
  float snowLine = 0.75 - lat * 0.6;
  return mix(c, snow, smoothstep(snowLine, snowLine + 0.12, h + lat * 0.2));
}

void main() {
  float lon = (vUv.x - 0.5) * 6.28318530718;
  float lat = (vUv.y - 0.5) * 3.14159265359;
  vec3 p = vec3(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon));
  float alat = abs(p.y);
  vec3 sp = p * 2.2 + vec3(uSeed * 0.37, uSeed * 0.11, uSeed * 0.73);
  vec3 color = vec3(0.0);
  vec3 emissive = vec3(0.0);
  float water = 0.0;
  float height = 0.0;

  if (uType == 4) {
    // Trantor: one world-city of steel.
    vec2 uv = vUv;
    float cellsN = 220.0;
    vec2 cell = floor(uv * vec2(cellsN * 2.0, cellsN));
    float ch = hash13(vec3(cell, uSeed));
    float big = fbm(sp * 1.5, 4);
    float district = smoothstep(0.1, 0.5, big);
    float sector = fbm(sp * 0.6 + 7.0, 3);
    vec3 steel = vec3(0.20, 0.22, 0.26);
    vec3 dark = vec3(0.07, 0.08, 0.10);
    vec3 dome = vec3(0.42, 0.44, 0.50);
    vec3 bronze = vec3(0.30, 0.24, 0.16);
    color = mix(dark, steel, ch);
    color = mix(color, bronze, smoothstep(0.2, 0.6, sector) * 0.5);
    float domes = district * smoothstep(0.7, 0.95, ch);
    color = mix(color, dome, domes);
    vec2 g = abs(fract(uv * vec2(cellsN * 2.0, cellsN)) - 0.5);
    float line = smoothstep(0.42, 0.5, max(g.x, g.y));
    color = mix(color, dark * 0.6, line * 0.7);
    float avenue = smoothstep(0.96, 1.0, abs(sin(uv.x * 160.0 + big * 4.0))) + smoothstep(0.96, 1.0, abs(sin(uv.y * 90.0 + sector * 3.0)));
    color = mix(color, vec3(0.5, 0.52, 0.58), avenue * 0.5);
    float lit = smoothstep(0.35, 0.9, ch) * (0.6 + 0.4 * district);
    vec3 amber = vec3(1.0, 0.72, 0.35);
    vec3 cyan = vec3(0.45, 0.85, 1.0);
    emissive = mix(amber, cyan, smoothstep(0.6, 0.9, big)) * lit;
    height = 0.15 * ch * (1.0 - line) + 0.25 * domes + 0.1 * district;
    water = 0.0;
  } else {
    float e = fbm(sp, 7);
    float r = ridged(sp * 1.3, 5);
    float elev = e * 0.6 + (r - 0.5) * 0.6;
    float sea = 0.02;
    if (uType == 3) sea = 0.28;
    if (uType == 1 || uType == 5) sea = -1.0;
    if (uType == 2) sea = -0.05;
    if (uType == 6) sea = 0.08;
    float moist = smoothstep(-0.4, 0.5, fbm(sp * 0.7 + 50.0, 3));
    if (elev < sea) {
      float depth = clamp((sea - elev) * 3.0, 0.0, 1.0);
      vec3 shallow = vec3(0.10, 0.40, 0.55);
      vec3 deep = vec3(0.02, 0.08, 0.25);
      if (uType == 2) { shallow = vec3(0.55, 0.70, 0.85); deep = vec3(0.20, 0.35, 0.55); }
      if (uType == 6) { shallow = vec3(0.10, 0.50, 0.50); deep = vec3(0.02, 0.15, 0.25); }
      color = mix(shallow, deep, depth);
      water = 1.0;
      float iceCap = smoothstep(0.78 - fbm(sp * 3.0, 2) * 0.06, 0.86, alat);
      if (uType == 2) iceCap = smoothstep(0.25, 0.5, alat + fbm(sp * 2.0, 3) * 0.2);
      color = mix(color, vec3(0.92, 0.95, 0.98), iceCap);
      water *= 1.0 - iceCap;
      height = iceCap * 0.03;
    } else {
      float h = clamp((elev - sea) / (0.9 - sea), 0.0, 1.0);
      color = palette(uType, h, alat, moist);
      float d = fbm(sp * 12.0, 3);
      color *= 0.9 + 0.2 * d;
      height = h + d * 0.04;
      if (uLightsDensity > 0.0 && (uType == 0 || uType == 6 || uType == 1 || uType == 3)) {
        float c = fbm(sp * 6.0 + 20.0, 3);
        float lowland = 1.0 - smoothstep(0.0, 0.5, h);
        float lights = smoothstep(0.55 - uLightsDensity * 0.3, 0.75, c) * lowland * (1.0 - smoothstep(0.5, 0.8, alat));
        float spark = smoothstep(0.6, 1.0, snoise(sp * 90.0));
        emissive = vec3(1.0, 0.78, 0.45) * lights * (0.4 + spark);
      }
    }
  }
  if (uPass == 0) gl_FragColor = vec4(clamp(color, 0.0, 1.0), water);
  else gl_FragColor = vec4(clamp(emissive, 0.0, 1.0), height);
}
`;

export const PLANET_VERT = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vLocal;
varying vec3 vEast;
varying vec3 vNorth;
void main() {
  vLocal = position;
  vec3 p = normalize(position);
  vec3 east = normalize(vec3(-p.z, 0.0, p.x));
  vec3 north = cross(east, p);
  mat3 m = mat3(modelMatrix);
  vNormal = normalize(m * normal);
  vEast = normalize(m * east);
  vNorth = normalize(m * north);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const PLANET_FRAG = /* glsl */ `
precision highp float;
${NOISE_GLSL}
${EQUIRECT_GLSL}
uniform sampler2D uAlbedo;
uniform sampler2D uData;
uniform vec2 uDataTexel;
uniform vec3 uSunDir;
uniform float uSeed;
uniform int uType;
uniform int uLod;
uniform vec3 uAtmoColor;
uniform float uRelief;
uniform float uEmissiveScale;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vLocal;
varying vec3 vEast;
varying vec3 vNorth;

void main() {
  vec3 p = normalize(vLocal);
  vec2 uv = equirect(p);
  vec2 dx = wrapGrad(dFdx(uv));
  vec2 dy = wrapGrad(dFdy(uv));
  vec4 alb = sampleEq(uAlbedo, uv, dx, dy);
  vec4 dat = sampleEq(uData, uv, dx, dy);
  float hx = sampleEq(uData, uv + vec2(uDataTexel.x, 0.0), dx, dy).a;
  float hy = sampleEq(uData, uv + vec2(0.0, uDataTexel.y), dx, dy).a;
  float h0 = dat.a;
  // latitude stretch: one texel of longitude covers less ground near the poles
  float stretch = max(cos((uv.y - 0.5) * 3.14159265359), 0.05);
  vec3 n = normalize(normalize(vNormal) - vEast * (hx - h0) * uRelief / stretch - vNorth * (hy - h0) * uRelief);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(uSunDir);

  vec3 color = alb.rgb;
  float water = alb.a;
  if (uLod > 0) {
    vec3 sp = p * 2.2 + vec3(uSeed * 0.37, uSeed * 0.11, uSeed * 0.73);
    float d = fbm(sp * 40.0, 2);
    color *= 0.93 + 0.14 * d * (1.0 - water);
  }
  color = pow(color, vec3(2.2));
  vec3 emissive = pow(dat.rgb, vec3(1.6)) * uEmissiveScale;

  float NdotL = dot(n, L);
  float geoNdotL = dot(normalize(vNormal), L);
  float day = smoothstep(-0.08, 0.25, geoNdotL);
  float diffuse = max(NdotL, 0.0) * smoothstep(-0.05, 0.1, geoNdotL);
  float spec = 0.0;
  if (uType == 4) {
    spec = pow(max(dot(reflect(-L, n), V), 0.0), 18.0) * 0.6;
  } else {
    vec3 H = normalize(L + V);
    spec = pow(max(dot(n, H), 0.0), 120.0) * 0.9 * water;
  }

  vec3 sunCol = vec3(1.0, 0.97, 0.92);
  vec3 lit = color * (diffuse * sunCol + vec3(0.012, 0.014, 0.02));
  lit += sunCol * spec * diffuse;
  float fres = pow(1.0 - max(dot(normalize(vNormal), V), 0.0), 2.5);
  float rimLight = smoothstep(-0.2, 0.5, geoNdotL);
  lit += uAtmoColor * fres * rimLight * 0.5;
  float term = smoothstep(0.0, 0.25, geoNdotL) * (1.0 - smoothstep(0.25, 0.6, geoNdotL));
  lit += color * vec3(0.6, 0.3, 0.1) * term * 0.25;
  lit += emissive * (1.0 - day);
  gl_FragColor = vec4(lit, 1.0);
}
`;
