export function isIPhoneLikeDevice() {
  const platform = navigator.platform || '';
  const userAgent = navigator.userAgent || '';
  return /iPhone|iPad|iPod/.test(userAgent) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function canUseShareSheet() {
  return isIPhoneLikeDevice() && typeof navigator.share === 'function';
}

export function canShareFiles(files) {
  if (typeof navigator.share !== 'function') {
    return false;
  }

  if (typeof navigator.canShare === 'function') {
    try {
      return navigator.canShare({ files });
    } catch (error) {
      return false;
    }
  }

  return files.length === 1;
}

export function triggerDownloads(files) {
  files.forEach((file, index) => {
    window.setTimeout(() => {
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, index * 150);
  });
}

export function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error(`Unsupported file type for ${file.name}`));
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      const image = new Image();

      image.onload = () => {
        resolve({
          file,
          image,
          name: file.name
        });
      };

      image.onerror = () => reject(new Error(`Failed to decode ${file.name}`));
      image.src = event.target.result;
    };

    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export async function loadImageFiles(fileList) {
  const files = Array.from(fileList).filter((file) => file.type.startsWith('image/'));

  if (!files.length) {
    return {
      images: [],
      skippedCount: 0
    };
  }

  const results = await Promise.allSettled(files.map(readImageFile));
  const images = results
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value);

  return {
    images,
    skippedCount: files.length - images.length
  };
}
