const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = (a_position + 1.0) * 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `
precision mediump float;

varying vec2 v_uv;

uniform sampler2D u_image;
uniform float u_aspect;
uniform float u_distortionK1;

void main() {
  vec2 centered = (v_uv * 2.0) - 1.0;

  float normalization = sqrt((u_aspect * u_aspect) + 1.0);
  vec2 radial = vec2(centered.x * u_aspect, centered.y) / normalization;
  float r2 = dot(radial, radial);

  vec2 distortedRadial = radial * (1.0 + (u_distortionK1 * r2));
  vec2 distortedCentered = vec2(
    (distortedRadial.x * normalization) / u_aspect,
    distortedRadial.y * normalization
  );

  vec2 sampleUv = vec2(
    0.5 + (distortedCentered.x * 0.5),
    0.5 + (distortedCentered.y * 0.5)
  );

  if (
    sampleUv.x < 0.0 || sampleUv.x > 1.0 ||
    sampleUv.y < 0.0 || sampleUv.y > 1.0
  ) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    return;
  }

  gl_FragColor = texture2D(u_image, sampleUv);
}
`;

let renderer = null;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    return shader;
  }

  const error = gl.getShaderInfoLog(shader);
  gl.deleteShader(shader);
  throw new Error(`WebGL shader compilation failed: ${error}`);
}

function createProgram(gl) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
  const program = gl.createProgram();

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
    return program;
  }

  const error = gl.getProgramInfoLog(program);
  gl.deleteProgram(program);
  throw new Error(`WebGL program linking failed: ${error}`);
}

function getRenderer() {
  if (renderer) {
    return renderer;
  }

  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
    stencil: false
  });

  if (!gl) {
    return null;
  }

  const program = createProgram(gl);
  const positionBuffer = gl.createBuffer();
  const texture = gl.createTexture();
  const positionLocation = gl.getAttribLocation(program, 'a_position');

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      -1, 1,
      1, -1,
      1, 1
    ]),
    gl.STATIC_DRAW
  );

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  renderer = {
    canvas,
    gl,
    program,
    positionBuffer,
    positionLocation,
    texture,
    imageLocation: gl.getUniformLocation(program, 'u_image'),
    aspectLocation: gl.getUniformLocation(program, 'u_aspect'),
    distortionK1Location: gl.getUniformLocation(program, 'u_distortionK1')
  };

  return renderer;
}

function distortionAmountToK1(distortionAmount) {
  return -Math.max(0, distortionAmount) / 250;
}

export function renderLensCorrectedImage({
  image,
  canvas,
  ctx,
  outputWidth,
  outputHeight,
  distortionAmount
}) {
  const activeRenderer = getRenderer();

  if (!activeRenderer) {
    return false;
  }

  const { gl } = activeRenderer;
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

  if (
    image.width > maxTextureSize ||
    image.height > maxTextureSize ||
    outputWidth > maxTextureSize ||
    outputHeight > maxTextureSize
  ) {
    return false;
  }

  activeRenderer.canvas.width = outputWidth;
  activeRenderer.canvas.height = outputHeight;
  gl.viewport(0, 0, outputWidth, outputHeight);
  gl.useProgram(activeRenderer.program);

  gl.bindBuffer(gl.ARRAY_BUFFER, activeRenderer.positionBuffer);
  gl.enableVertexAttribArray(activeRenderer.positionLocation);
  gl.vertexAttribPointer(activeRenderer.positionLocation, 2, gl.FLOAT, false, 0, 0);

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, activeRenderer.texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  gl.uniform1i(activeRenderer.imageLocation, 0);
  gl.uniform1f(activeRenderer.aspectLocation, outputWidth / outputHeight);
  gl.uniform1f(activeRenderer.distortionK1Location, distortionAmountToK1(distortionAmount));

  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  canvas.width = outputWidth;
  canvas.height = outputHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(activeRenderer.canvas, 0, 0);
  return true;
}
