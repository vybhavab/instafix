const MAX_WIDTH = 1080;

export function parseAspectRatio(ratio, customWidthValue, customHeightValue) {
  if (ratio === 'custom') {
    const width = parseFloat(customWidthValue) || 16;
    const height = parseFloat(customHeightValue) || 9;
    return width / height;
  }

  const [width, height] = ratio.split(':').map(Number);
  return width / height;
}

export function getDesqueezeValue(rawValue) {
  return Math.max(0.5, parseFloat(rawValue) || 1.33);
}

export function renderCropImage({ image, canvas, ctx, targetRatio }) {
  const imageRatio = image.width / image.height;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = image.width;
  let sourceHeight = image.height;

  if (imageRatio > targetRatio) {
    sourceWidth = image.height * targetRatio;
    sourceX = (image.width - sourceWidth) / 2;
  } else {
    sourceHeight = image.width / targetRatio;
    sourceY = (image.height - sourceHeight) / 2;
  }

  canvas.width = MAX_WIDTH;
  canvas.height = Math.round(MAX_WIDTH / targetRatio);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    image,
    sourceX, sourceY, sourceWidth, sourceHeight,
    0, 0, canvas.width, canvas.height
  );
}

export function renderPadImage({
  image,
  canvas,
  ctx,
  targetRatio,
  paddingPercent,
  selectedColor,
  customColor
}) {
  const imageRatio = image.width / image.height;
  let canvasWidth = MAX_WIDTH;
  let canvasHeight = Math.round(MAX_WIDTH / targetRatio);
  let imageWidth;
  let imageHeight;
  let x;
  let y;

  if (imageRatio > targetRatio) {
    imageWidth = MAX_WIDTH;
    imageHeight = MAX_WIDTH / imageRatio;
    x = 0;
    y = (canvasHeight - imageHeight) / 2;
  } else {
    imageHeight = canvasHeight;
    imageWidth = canvasHeight * imageRatio;

    if (imageWidth > canvasWidth) {
      imageWidth = canvasWidth;
      imageHeight = canvasWidth / imageRatio;
    }

    x = (canvasWidth - imageWidth) / 2;
    y = (canvasHeight - imageHeight) / 2;
  }

  const scale = 1 - paddingPercent;
  imageWidth *= scale;
  imageHeight *= scale;
  x = (canvasWidth - imageWidth) / 2;
  y = (canvasHeight - imageHeight) / 2;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (selectedColor === 'blur') {
    ctx.filter = 'blur(20px)';
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = selectedColor === 'custom' ? customColor : selectedColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(image, x, y, imageWidth, imageHeight);
}

export function renderDesqueezedImage({ image, canvas, ctx, desqueezeFactor }) {
  canvas.width = Math.max(1, Math.round(image.width * desqueezeFactor));
  canvas.height = image.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
}

export function renderImageToCanvas({
  image,
  canvas,
  workflow,
  mode,
  aspectRatio,
  customWidth,
  customHeight,
  paddingPercent,
  selectedColor,
  customColor,
  desqueezeFactor
}) {
  const ctx = canvas.getContext('2d');

  if (workflow === 'desqueeze') {
    renderDesqueezedImage({ image, canvas, ctx, desqueezeFactor });
    return;
  }

  const targetRatio = parseAspectRatio(aspectRatio, customWidth, customHeight);

  if (mode === 'crop') {
    renderCropImage({ image, canvas, ctx, targetRatio });
    return;
  }

  renderPadImage({
    image,
    canvas,
    ctx,
    targetRatio,
    paddingPercent,
    selectedColor,
    customColor
  });
}

export function canvasToBlob(canvas, format, qualityValue) {
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const quality = format === 'jpeg' ? qualityValue / 100 : undefined;

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error('Failed to generate image blob.'));
    }, mimeType, quality);
  });
}

export function getOutputExtension(format) {
  return format === 'jpeg' ? 'jpg' : 'png';
}

export function buildOutputFilename(sourceName, workflow, desqueezeFactor, format) {
  const baseName = sourceName.replace(/\.[^.]+$/, '') || 'instafix';
  const outputExtension = getOutputExtension(format);

  if (workflow === 'desqueeze') {
    const factorLabel = desqueezeFactor.toFixed(2).replace(/\.?0+$/, '');
    return `${baseName}-desqueezed-${factorLabel}x.${outputExtension}`;
  }

  return `${baseName}-instafix.${outputExtension}`;
}
