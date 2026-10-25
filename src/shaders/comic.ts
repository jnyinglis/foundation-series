// A comic-book look for captured panels: posterised colour, ink edges from a
// Sobel filter on luminance, a rotated halftone in the shadows, and paper tint.
export const ComicShader = {
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    uNear: { value: 0.1 },
    uFar: { value: 1000.0 },
    uDepthEdge: { value: 0.03 },
    uResolution: { value: [1, 1] },
    uLevels: { value: 7.0 },
    uEdge: { value: 1.0 },
    uEdgeLo: { value: 0.22 },
    uEdgeHi: { value: 0.6 },
    uHalftone: { value: 0.45 },
    uDot: { value: 6.0 },
    uSaturation: { value: 1.15 },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse; uniform sampler2D tDepth; uniform vec2 uResolution; uniform float uLevels, uEdge, uEdgeLo, uEdgeHi, uHalftone, uDot, uSaturation, uNear, uFar, uDepthEdge;
    varying vec2 vUv;
    float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
    float L(vec2 o) { return luma(texture2D(tDiffuse, vUv + o * 1.5 / uResolution).rgb); }
    float D(vec2 o) { float z = texture2D(tDepth, vUv + o / uResolution).x; float n = uNear, f = uFar; return (2.0 * n) / (f + n - z * (f - n)); }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      // saturation, then posterise the brightness only so colour does not band
      float l = luma(c);
      c = mix(vec3(l), c, uSaturation);
      float ql = floor(l * uLevels + 0.5) / uLevels;
      c *= mix(1.0, ql / max(l, 0.001), 0.7);
      // split tone: steel blue shadows, amber highlights, a little more contrast
      float t = smoothstep(0.0, 1.0, l);
      c = mix(c, c * vec3(0.72, 0.86, 1.25), (1.0 - t) * 0.35);
      c = mix(c, c * vec3(1.12, 1.0, 0.8), t * 0.3);
      c = (c - 0.5) * 1.12 + 0.5;
      // sobel edges
      float gx = -L(vec2(-1.0, -1.0)) - 2.0 * L(vec2(-1.0, 0.0)) - L(vec2(-1.0, 1.0)) + L(vec2(1.0, -1.0)) + 2.0 * L(vec2(1.0, 0.0)) + L(vec2(1.0, 1.0));
      float gy = -L(vec2(-1.0, -1.0)) - 2.0 * L(vec2(0.0, -1.0)) - L(vec2(1.0, -1.0)) + L(vec2(-1.0, 1.0)) + 2.0 * L(vec2(0.0, 1.0)) + L(vec2(1.0, 1.0));
      float g = length(vec2(gx, gy));
      float edge = smoothstep(uEdgeLo, uEdgeHi, g) * 0.6;
      // depth edges: silhouettes and creases, scaled by distance so far walls stay clean
      float d0 = D(vec2(0.0));
      float dd = abs(D(vec2(1.5, 0.0)) - d0) + abs(D(vec2(-1.5, 0.0)) - d0) + abs(D(vec2(0.0, 1.5)) - d0) + abs(D(vec2(0.0, -1.5)) - d0);
      float dedge = smoothstep(uDepthEdge * 0.5, uDepthEdge * 2.0, dd / max(d0, 0.002));
      edge = max(edge, dedge) * uEdge;
      // halftone dots on a 45 degree grid, denser where it is dark
      vec2 p = gl_FragCoord.xy / uDot;
      vec2 r = vec2(p.x + p.y, p.y - p.x) * 0.7071;
      float d = length(fract(r) - 0.5);
      float shade = 1.0 - l;
      float dots = (1.0 - smoothstep(0.0, 0.08, d - (shade * 0.55 - 0.22))) * uHalftone;
      c = mix(c, c * 0.55, dots);
      c = mix(c, vec3(0.06, 0.05, 0.05), edge);
      c *= vec3(1.0, 0.975, 0.92);
      gl_FragColor = vec4(c, 1.0);
    }`,
};
