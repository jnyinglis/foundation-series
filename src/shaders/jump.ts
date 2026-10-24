import { NOISE_GLSL } from './noise';

// Full-screen hyperspace pass. uProgress goes 0 -> 1 over the jump.
export const JumpShader = {
  uniforms: {
    tDiffuse: { value: null as unknown },
    uProgress: { value: 0.0 },
    uTime: { value: 0.0 },
    uAspect: { value: 1.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    ${NOISE_GLSL}
    uniform sampler2D tDiffuse;
    uniform float uProgress;
    uniform float uTime;
    uniform float uAspect;
    varying vec2 vUv;
    void main() {
      float p = uProgress;
      if (p <= 0.0) { gl_FragColor = texture2D(tDiffuse, vUv); return; }
      // envelope: ramp up, hold, ramp down
      float env = smoothstep(0.0, 0.25, p) * (1.0 - smoothstep(0.7, 1.0, p));
      vec2 c = vUv - 0.5;
      c.x *= uAspect;
      float r = length(c);
      float a = atan(c.y, c.x);
      // zoom blur of the scene
      vec3 scene = vec3(0.0);
      float zoom = env * 0.25;
      for (int i = 0; i < 8; i++) {
        float k = 1.0 - zoom * float(i) / 8.0;
        vec2 uv = (vUv - 0.5) * k + 0.5;
        scene += texture2D(tDiffuse, uv).rgb;
      }
      scene /= 8.0;
      // tunnel streaks
      float speed = uTime * 3.0 + p * 20.0;
      float streak = fbm(vec3(a * 6.0, r * 2.0 - speed, uTime * 0.5), 4);
      float streak2 = snoise(vec3(a * 24.0, r * 8.0 - speed * 2.0, 3.0));
      float lines = smoothstep(0.6, 1.05, streak + 0.3) + smoothstep(0.78, 1.0, streak2) * 0.5;
      float radial = smoothstep(0.0, 0.6, r);
      vec3 tunnelCol = mix(vec3(0.2, 0.5, 1.0), vec3(1.0, 0.85, 0.6), smoothstep(0.3, 0.9, streak2 * 0.5 + 0.5));
      vec3 tunnel = tunnelCol * lines * radial * 1.2 * env;
      // chromatic shift
      vec2 dir = normalize(c + 1e-5) / vec2(uAspect, 1.0);
      float ca = env * 0.02 * r;
      float rr = texture2D(tDiffuse, vUv + dir * ca).r;
      float bb = texture2D(tDiffuse, vUv - dir * ca).b;
      vec3 col = mix(scene, vec3(rr, scene.g, bb), env * 0.6);
      // white flash at the mid point
      float flash = exp(-pow((p - 0.5) * 9.0, 2.0));
      col = mix(col, vec3(0.02, 0.04, 0.10), env * 0.85) + tunnel;
      col += vec3(0.9, 0.95, 1.0) * flash * 1.2;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};
