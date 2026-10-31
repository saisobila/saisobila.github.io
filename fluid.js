// An original, lightweight WebGL dye field inspired by cursor-driven fluid art.
// The canvas is decorative and never intercepts links or controls.
export function startFluid(hero, canvas) {
  if (!hero || !canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false, antialias: false, depth: false, stencil: false });
  if (!gl) return startFallback(hero, canvas);
  canvas.dataset.fluidMode = 'webgl2';

  const vertexSource = `#version 300 es
    precision highp float;
    out vec2 vUv;
    void main() {
      vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
      vUv = p;
      gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
    }`;
  const simulationSource = `#version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 fragColor;
    uniform sampler2D uPrev;
    uniform vec2 uPoint;
    uniform vec2 uMove;
    uniform vec3 uColor;
    uniform float uInject;
    uniform float uTime;
    uniform float uAspect;
    void main() {
      vec2 uv = vUv;
      vec2 d = (uv - uPoint) * vec2(uAspect, 1.0);
      float local = exp(-dot(d, d) * 15.0);
      vec2 turn = vec2(-d.y, d.x) * local * 0.006;
      vec2 push = uMove * local * 0.022;
      vec2 drift = vec2(sin(uv.y * 13.0 + uTime * 0.8), cos(uv.x * 11.0 - uTime * 0.6)) * 0.0006;
      vec4 old = texture(uPrev, clamp(uv - turn - push - drift, vec2(0.0), vec2(1.0)));
      float distanceFromPointer = dot(d, d);
      float core = exp(-distanceFromPointer * 150.0) * uInject;
      float halo = exp(-distanceFromPointer * 42.0) * uInject * 0.19;
      float splat = core + halo;
      vec3 color = min(old.rgb * 0.984 + uColor * splat, vec3(1.0));
      float alpha = clamp(old.a * 0.972 + splat * 0.65, 0.0, 1.0);
      fragColor = vec4(color, alpha);
    }`;
  const displaySource = `#version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 fragColor;
    uniform sampler2D uDye;
    uniform vec2 uPixel;
    void main() {
      vec4 c = texture(uDye, vUv);
      vec4 n = texture(uDye, vUv + vec2(uPixel.x * 5.0, 0.0));
      vec4 s = texture(uDye, vUv - vec2(uPixel.x * 5.0, 0.0));
      vec4 e = texture(uDye, vUv + vec2(0.0, uPixel.y * 5.0));
      vec4 w = texture(uDye, vUv - vec2(0.0, uPixel.y * 5.0));
      vec4 glow = (n + s + e + w) * 0.25;
      vec3 color = mix(glow.rgb, c.rgb, 0.8);
      float alpha = clamp(c.a * 0.78 + glow.a * 0.16, 0.0, 0.82);
      fragColor = vec4(color, alpha);
    }`;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  function program(fragment) {
    const value = gl.createProgram();
    gl.attachShader(value, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(value, compile(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(value);
    if (!gl.getProgramParameter(value, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(value));
    return value;
  }

  let simulation;
  let display;
  try {
    simulation = program(simulationSource);
    display = program(displaySource);
  } catch (error) {
    console.warn('Fluid shader unavailable:', error);
    return startFallback(hero, canvas);
  }

  const sim = {
    prev: gl.getUniformLocation(simulation, 'uPrev'),
    point: gl.getUniformLocation(simulation, 'uPoint'),
    move: gl.getUniformLocation(simulation, 'uMove'),
    color: gl.getUniformLocation(simulation, 'uColor'),
    inject: gl.getUniformLocation(simulation, 'uInject'),
    time: gl.getUniformLocation(simulation, 'uTime'),
    aspect: gl.getUniformLocation(simulation, 'uAspect'),
  };
  const show = { dye: gl.getUniformLocation(display, 'uDye'), pixel: gl.getUniformLocation(display, 'uPixel') };
  const colors = [[0.12, 0.75, 0.63], [1, 0.94, 0.72], [0.96, 0.15, 0.67], [1, 0.81, 0.17]];
  const pointer = { x: -2, y: -2, dx: 0, dy: 0, inject: 0, color: colors[0] };
  let colorIndex = 0;
  let frameNumber = 0;
  let read = 0;
  let textures = [];
  let buffers = [];
  let inView = true;

  function makeTarget(width, height) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const buffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    return { texture, buffer };
  }

  function resize() {
    const rect = hero.getBoundingClientRect();
    const scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.72;
    const width = Math.max(1, Math.round(rect.width * scale));
    const height = Math.max(1, Math.round(rect.height * scale));
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    textures.forEach((texture) => gl.deleteTexture(texture));
    buffers.forEach((buffer) => gl.deleteFramebuffer(buffer));
    const a = makeTarget(width, height);
    const b = makeTarget(width, height);
    textures = [a.texture, b.texture];
    buffers = [a.buffer, b.buffer];
    for (const buffer of buffers) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    read = 0;
  }

  function updatePointer(event, click = false) {
    const rect = hero.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
    const x = (event.clientX - rect.left) / rect.width;
    const y = 1 - (event.clientY - rect.top) / rect.height;
    pointer.dx = pointer.x < 0 ? 0 : Math.max(-0.08, Math.min(0.08, x - pointer.x));
    pointer.dy = pointer.y < 0 ? 0 : Math.max(-0.08, Math.min(0.08, y - pointer.y));
    pointer.x = x;
    pointer.y = y;
    pointer.inject = click ? 1.6 : Math.min(1.1, 0.42 + (Math.abs(pointer.dx) + Math.abs(pointer.dy)) * 4);
    if (click || frameNumber % 18 === 0) pointer.color = colors[colorIndex++ % colors.length];
  }

  hero.addEventListener('pointermove', (event) => updatePointer(event));
  hero.addEventListener('pointerdown', (event) => updatePointer(event, true));
  hero.addEventListener('pointerleave', () => { pointer.x = -2; pointer.y = -2; });
  new ResizeObserver(resize).observe(hero);
  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; }, { threshold: 0 }).observe(hero);
  resize();

  const started = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    if (!inView || document.hidden || !textures.length) return;
    frameNumber += 1;
    const write = 1 - read;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, buffers[write]);
    gl.useProgram(simulation);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[read]);
    gl.uniform1i(sim.prev, 0);
    gl.uniform2f(sim.point, pointer.x, pointer.y);
    gl.uniform2f(sim.move, pointer.dx, pointer.dy);
    gl.uniform3fv(sim.color, pointer.color);
    gl.uniform1f(sim.inject, pointer.inject);
    gl.uniform1f(sim.time, (now - started) / 1000);
    gl.uniform1f(sim.aspect, canvas.width / canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(display);
    gl.bindTexture(gl.TEXTURE_2D, textures[write]);
    gl.uniform1i(show.dye, 0);
    gl.uniform2f(show.pixel, 1 / canvas.width, 1 / canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    read = write;
    pointer.inject *= 0.42;
    pointer.dx *= 0.84;
    pointer.dy *= 0.84;
  }
  requestAnimationFrame(frame);
}

function startFallback(hero, canvas) {
  canvas.dataset.fluidMode = 'canvas2d';
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const clouds = [];
  function resize() {
    canvas.width = Math.round(hero.clientWidth * Math.min(devicePixelRatio || 1, 1.5));
    canvas.height = Math.round(hero.clientHeight * Math.min(devicePixelRatio || 1, 1.5));
  }
  new ResizeObserver(resize).observe(hero);
  resize();
  hero.addEventListener('pointermove', (event) => {
    const rect = hero.getBoundingClientRect();
    clouds.push({ x: (event.clientX - rect.left) / rect.width * canvas.width, y: (event.clientY - rect.top) / rect.height * canvas.height, life: 1, r: 30 + Math.random() * 25 });
    if (clouds.length > 80) clouds.shift();
  });
  function frame() {
    requestAnimationFrame(frame);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const cloud of clouds) {
      cloud.life *= 0.963;
      cloud.r += 0.35;
      const g = ctx.createRadialGradient(cloud.x, cloud.y, 0, cloud.x, cloud.y, cloud.r);
      g.addColorStop(0, `rgba(255,244,228,${cloud.life * 0.35})`);
      g.addColorStop(0.6, `rgba(253,205,42,${cloud.life * 0.2})`);
      g.addColorStop(1, 'rgba(253,205,42,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cloud.x - cloud.r, cloud.y - cloud.r, cloud.r * 2, cloud.r * 2);
    }
    while (clouds.length && clouds[0].life < 0.01) clouds.shift();
  }
  requestAnimationFrame(frame);
}
