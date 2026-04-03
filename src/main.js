import {
  buildOutputFilename,
  canvasToBlob,
  getDesqueezeValue,
  getDistortionAmount,
  renderImageToCanvas
} from './image-processing.js';
import {
  canShareFiles,
  canUseShareSheet,
  loadImageFiles,
  triggerDownloads
} from './export-utils.js';
import {
  elements,
  getSelectedColor,
  getSelectedFormat,
  getSelectedMode,
  getWorkflow,
  isPadMode
} from './dom.js';
import { getLensProfile, getLensProfiles } from './lens-profiles.js';
import { loadSettings, saveSettings } from './settings.js';

const state = {
  loadedImages: [],
  currentImageIndex: 0
};

function getCurrentImageRecord() {
  return state.loadedImages[state.currentImageIndex] || null;
}

function populateLensProfileOptions() {
  const options = getLensProfiles().map((profile) => (
    `<option value="${profile.id}">${profile.label}</option>`
  ));
  elements.lensProfile.innerHTML = options.join('');
}

function getRenderOptions(image, canvas) {
  return {
    image,
    canvas,
    workflow: getWorkflow(),
    mode: getSelectedMode(),
    aspectRatio: elements.aspectRatioSelect.value,
    customWidth: elements.customWidth.value,
    customHeight: elements.customHeight.value,
    paddingPercent: parseInt(elements.paddingAmount.value, 10) / 100,
    selectedColor: getSelectedColor(),
    customColor: elements.customColor.value,
    desqueezeFactor: getDesqueezeValue(elements.desqueezeFactor.value),
    lensProfileId: elements.lensProfile.value,
    distortionAmount: getDistortionAmount(elements.distortionAmount.value)
  };
}

function toggleControlsEnabled(enabled) {
  elements.copyBtn.disabled = !enabled;
  elements.downloadBtn.disabled = !enabled;
  elements.resetBtn.disabled = !enabled;
}

function syncCustomRatioUI() {
  const isCustom = elements.aspectRatioSelect.value === 'custom';
  elements.customRatioInputs.classList.toggle('hidden', !isCustom);

  if (isCustom) {
    if (!elements.customWidth.value) elements.customWidth.value = 16;
    if (!elements.customHeight.value) elements.customHeight.value = 9;
  }
}

function updateExportActionText() {
  const exportingBatch = getWorkflow() === 'desqueeze' && state.loadedImages.length > 1;

  if (!state.loadedImages.length) {
    elements.downloadBtnText.textContent = canUseShareSheet() ? 'Save to Photos' : 'Download';
    elements.exportHint.textContent = '';
    return;
  }

  if (canUseShareSheet()) {
    elements.downloadBtnText.textContent = exportingBatch ? 'Save All to Photos' : 'Save to Photos';
    elements.exportHint.textContent = 'On iPhone this opens the share sheet so you can save directly into Photos.';
    return;
  }

  elements.downloadBtnText.textContent = exportingBatch ? 'Download All' : 'Download';
  elements.exportHint.textContent = exportingBatch
    ? 'Exports each processed image as a separate file.'
    : '';
}

function syncDistortionValueText() {
  elements.distortionValue.textContent = `${getDistortionAmount(elements.distortionAmount.value)}`;
}

function syncLensCorrectionUI() {
  const profile = getLensProfile(elements.lensProfile.value);
  const hasProfile = profile.id !== 'none';
  elements.distortionAmountControl.classList.toggle('hidden', !hasProfile);
  elements.lensProfileHelp.textContent = profile.helpText;
  syncDistortionValueText();
}

function syncWorkflowUI() {
  const showAspectControls = getWorkflow() === 'aspect';
  elements.aspectControls.classList.toggle('hidden', !showAspectControls);
  elements.desqueezeControls.classList.toggle('hidden', showAspectControls);
  elements.colorControls.style.display = showAspectControls && isPadMode() ? 'block' : 'none';
  elements.paddingAmountControl.style.display = showAspectControls && isPadMode() ? 'block' : 'none';
  syncLensCorrectionUI();
  updateExportActionText();
}

function collectSettings() {
  return {
    workflow: getWorkflow(),
    aspectRatio: elements.aspectRatioSelect.value,
    customWidth: elements.customWidth.value,
    customHeight: elements.customHeight.value,
    mode: getSelectedMode(),
    color: getSelectedColor(),
    customColor: elements.customColor.value,
    paddingAmount: elements.paddingAmount.value,
    format: getSelectedFormat(),
    jpegQuality: elements.jpegQuality.value,
    desqueezeFactor: elements.desqueezeFactor.value,
    lensProfile: elements.lensProfile.value,
    distortionAmount: elements.distortionAmount.value
  };
}

function persistSettings() {
  saveSettings(collectSettings());
}

function applyLoadedSettings() {
  const settings = loadSettings();

  if (settings.workflow) {
    const input = document.querySelector(`input[name="workflow"][value="${settings.workflow}"]`);
    if (input) input.checked = true;
  }

  if (settings.aspectRatio) {
    elements.aspectRatioSelect.value = settings.aspectRatio;
  }

  if (settings.customWidth) {
    elements.customWidth.value = settings.customWidth;
  }

  if (settings.customHeight) {
    elements.customHeight.value = settings.customHeight;
  }

  if (settings.mode) {
    const input = document.querySelector(`input[name="mode"][value="${settings.mode}"]`);
    if (input) input.checked = true;
  }

  if (settings.color) {
    const input = document.querySelector(`input[name="color"][value="${settings.color}"]`);
    if (input) input.checked = true;
  }

  if (settings.customColor) {
    elements.customColor.value = settings.customColor;
  }

  if (settings.paddingAmount !== undefined) {
    elements.paddingAmount.value = settings.paddingAmount;
    elements.paddingValue.textContent = `${settings.paddingAmount}%`;
  }

  if (settings.format) {
    const input = document.querySelector(`input[name="format"][value="${settings.format}"]`);
    if (input) input.checked = true;
  }

  if (settings.jpegQuality !== undefined) {
    elements.jpegQuality.value = settings.jpegQuality;
    elements.qualityValue.textContent = `${settings.jpegQuality}%`;
  }

  if (settings.desqueezeFactor !== undefined) {
    elements.desqueezeFactor.value = settings.desqueezeFactor;
  }

  if (settings.lensProfile) {
    elements.lensProfile.value = settings.lensProfile;
  }

  const lensProfile = getLensProfile(elements.lensProfile.value);

  if (settings.desqueezeFactor === undefined && lensProfile.id !== 'none') {
    elements.desqueezeFactor.value = lensProfile.defaultDesqueezeFactor.toFixed(2);
  }

  if (settings.distortionAmount !== undefined) {
    elements.distortionAmount.value = settings.distortionAmount;
  } else if (lensProfile.id !== 'none') {
    elements.distortionAmount.value = `${lensProfile.defaultDistortionAmount}`;
  }

  elements.jpegQualityControl.style.display = getSelectedFormat() === 'jpeg' ? 'block' : 'none';
  syncDistortionValueText();
  syncCustomRatioUI();
  syncWorkflowUI();
}

function updatePreview() {
  const imageRecord = getCurrentImageRecord();
  if (!imageRecord) return;
  renderImageToCanvas(getRenderOptions(imageRecord.image, elements.canvas));
}

function updateBatchNavigation() {
  const hasImages = state.loadedImages.length > 0;
  elements.previewMeta.classList.toggle('hidden', !hasImages);

  if (!hasImages) {
    elements.batchStatus.textContent = '';
    elements.activeFileName.textContent = '';
    elements.prevImageBtn.disabled = true;
    elements.nextImageBtn.disabled = true;
    updateExportActionText();
    return;
  }

  const imageCount = state.loadedImages.length;
  elements.batchStatus.textContent = imageCount > 1
    ? `${imageCount} images loaded • ${state.currentImageIndex + 1} of ${imageCount}`
    : '1 image loaded';
  elements.activeFileName.textContent = getCurrentImageRecord().name;
  elements.prevImageBtn.disabled = imageCount <= 1;
  elements.nextImageBtn.disabled = imageCount <= 1;
  updateExportActionText();
}

function setActiveImage(index) {
  if (!state.loadedImages.length) return;
  state.currentImageIndex = Math.min(Math.max(index, 0), state.loadedImages.length - 1);
  updateBatchNavigation();
  updatePreview();
}

function showLoadedImages(images) {
  state.loadedImages = images;
  state.currentImageIndex = 0;
  elements.uploadArea.classList.add('hidden');
  elements.imagePreview.classList.remove('hidden');
  toggleControlsEnabled(true);
  setActiveImage(0);
}

async function handleFiles(fileList) {
  const { images, skippedCount } = await loadImageFiles(fileList);

  if (!images.length) {
    alert('None of those files could be loaded.');
    return;
  }

  if (skippedCount > 0) {
    alert('Some files could not be loaded and were skipped.');
  }

  showLoadedImages(images);
}

function showFullImage() {
  const modalCtx = elements.modalCanvas.getContext('2d');
  elements.modalCanvas.width = elements.canvas.width;
  elements.modalCanvas.height = elements.canvas.height;
  modalCtx.clearRect(0, 0, elements.modalCanvas.width, elements.modalCanvas.height);
  modalCtx.drawImage(elements.canvas, 0, 0);
  elements.imageModal.classList.add('active');
}

function getExportTargets() {
  if (!state.loadedImages.length) {
    return [];
  }

  if (getWorkflow() === 'desqueeze' && state.loadedImages.length > 1) {
    return state.loadedImages;
  }

  return [getCurrentImageRecord()];
}

async function buildOutputFiles() {
  const format = getSelectedFormat();
  const desqueezeFactor = getDesqueezeValue(elements.desqueezeFactor.value);
  const lensProfileId = elements.lensProfile.value;
  const distortionAmount = getDistortionAmount(elements.distortionAmount.value);
  const targets = getExportTargets();
  const files = [];

  for (const imageRecord of targets) {
    const outputCanvas = document.createElement('canvas');
    renderImageToCanvas(getRenderOptions(imageRecord.image, outputCanvas));
    const blob = await canvasToBlob(outputCanvas, format, parseFloat(elements.jpegQuality.value));
    const fileName = buildOutputFilename(
      imageRecord.name,
      getWorkflow(),
      desqueezeFactor,
      format,
      lensProfileId,
      distortionAmount
    );
    files.push(new File([blob], fileName, { type: blob.type }));
  }

  return files;
}

async function exportImages() {
  if (!state.loadedImages.length) return;

  elements.downloadBtn.disabled = true;

  try {
    const files = await buildOutputFiles();

    if (canUseShareSheet() && canShareFiles(files)) {
      await navigator.share({
        files,
        title: files.length > 1 ? `${files.length} processed images` : files[0].name
      });
      return;
    }

    triggerDownloads(files);
  } catch (error) {
    if (error?.name !== 'AbortError') {
      console.error('Export failed:', error);
      alert('Could not export those images.');
    }
  } finally {
    elements.downloadBtn.disabled = false;
    updateExportActionText();
  }
}

async function copyToClipboard() {
  try {
    const blob = await canvasToBlob(
      elements.canvas,
      getSelectedFormat(),
      parseFloat(elements.jpegQuality.value)
    );

    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob })
    ]);

    const originalText = elements.copyBtnText.textContent;
    elements.copyBtnText.textContent = 'Copied!';
    window.setTimeout(() => {
      elements.copyBtnText.textContent = originalText;
    }, 2000);
  } catch (error) {
    console.error('Failed to copy:', error);
    alert('Failed to copy to clipboard. Try exporting instead.');
  }
}

function reset() {
  state.loadedImages = [];
  state.currentImageIndex = 0;
  elements.uploadArea.classList.remove('hidden');
  elements.imagePreview.classList.add('hidden');
  elements.previewMeta.classList.add('hidden');
  toggleControlsEnabled(false);
  elements.fileInput.value = '';
  elements.paddingAmount.value = 0;
  elements.paddingValue.textContent = '0%';
  elements.canvas.getContext('2d').clearRect(0, 0, elements.canvas.width, elements.canvas.height);
  updateBatchNavigation();
}

function attachEvents() {
  elements.uploadArea.addEventListener('click', () => elements.fileInput.click());

  elements.uploadArea.addEventListener('dragover', (event) => {
    event.preventDefault();
    elements.dropZone.classList.add('border-gray-400', 'bg-gray-50');
  });

  elements.uploadArea.addEventListener('dragleave', () => {
    elements.dropZone.classList.remove('border-gray-400', 'bg-gray-50');
  });

  elements.uploadArea.addEventListener('drop', async (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove('border-gray-400', 'bg-gray-50');
    await handleFiles(event.dataTransfer.files);
  });

  elements.fileInput.addEventListener('change', async (event) => {
    if (event.target.files.length) {
      await handleFiles(event.target.files);
    }
  });

  elements.prevImageBtn.addEventListener('click', () => {
    if (state.loadedImages.length > 1) {
      const nextIndex = state.currentImageIndex === 0 ? state.loadedImages.length - 1 : state.currentImageIndex - 1;
      setActiveImage(nextIndex);
    }
  });

  elements.nextImageBtn.addEventListener('click', () => {
    if (state.loadedImages.length > 1) {
      const nextIndex = state.currentImageIndex === state.loadedImages.length - 1 ? 0 : state.currentImageIndex + 1;
      setActiveImage(nextIndex);
    }
  });

  elements.customColor.addEventListener('click', (event) => {
    event.stopPropagation();
    elements.customColorRadio.checked = true;
    if (getCurrentImageRecord()) updatePreview();
  });

  elements.customColor.addEventListener('input', () => {
    elements.customColorRadio.checked = true;
    if (getCurrentImageRecord()) updatePreview();
    persistSettings();
  });

  elements.workflowInputs.forEach((input) => {
    input.addEventListener('change', () => {
      syncWorkflowUI();
      if (getCurrentImageRecord()) updatePreview();
      persistSettings();
    });
  });

  elements.aspectRatioSelect.addEventListener('change', () => {
    syncCustomRatioUI();
    if (getCurrentImageRecord()) updatePreview();
    persistSettings();
  });

  elements.customWidth.addEventListener('input', () => {
    if (getCurrentImageRecord() && elements.aspectRatioSelect.value === 'custom') updatePreview();
    persistSettings();
  });

  elements.customHeight.addEventListener('input', () => {
    if (getCurrentImageRecord() && elements.aspectRatioSelect.value === 'custom') updatePreview();
    persistSettings();
  });

  document.querySelectorAll('input[name="mode"]').forEach((input) => {
    input.addEventListener('change', () => {
      syncWorkflowUI();
      if (getCurrentImageRecord()) updatePreview();
      persistSettings();
    });
  });

  document.querySelectorAll('input[name="color"]').forEach((input) => {
    input.addEventListener('change', () => {
      if (getCurrentImageRecord()) updatePreview();
      persistSettings();
    });
  });

  elements.paddingAmount.addEventListener('input', () => {
    elements.paddingValue.textContent = `${elements.paddingAmount.value}%`;
    if (getCurrentImageRecord()) updatePreview();
    persistSettings();
  });

  elements.desqueezeFactor.addEventListener('input', () => {
    if (getCurrentImageRecord() && getWorkflow() === 'desqueeze') updatePreview();
    persistSettings();
  });

  elements.desqueezePresets.forEach((button) => {
    button.addEventListener('click', () => {
      elements.desqueezeFactor.value = button.dataset.desqueezeFactor;
      if (getCurrentImageRecord() && getWorkflow() === 'desqueeze') updatePreview();
      persistSettings();
    });
  });

  elements.lensProfile.addEventListener('change', () => {
    const profile = getLensProfile(elements.lensProfile.value);

    if (profile.id !== 'none') {
      elements.desqueezeFactor.value = profile.defaultDesqueezeFactor.toFixed(2);
      elements.distortionAmount.value = `${profile.defaultDistortionAmount}`;
      syncDistortionValueText();
    }

    syncLensCorrectionUI();
    if (getCurrentImageRecord() && getWorkflow() === 'desqueeze') updatePreview();
    persistSettings();
  });

  elements.distortionAmount.addEventListener('input', () => {
    syncDistortionValueText();
    if (getCurrentImageRecord() && getWorkflow() === 'desqueeze') updatePreview();
    persistSettings();
  });

  document.querySelectorAll('input[name="format"]').forEach((input) => {
    input.addEventListener('change', (event) => {
      elements.jpegQualityControl.style.display = event.target.value === 'jpeg' ? 'block' : 'none';
      persistSettings();
    });
  });

  elements.jpegQuality.addEventListener('input', () => {
    elements.qualityValue.textContent = `${elements.jpegQuality.value}%`;
    persistSettings();
  });

  elements.canvasWrapper.addEventListener('click', () => {
    if (getCurrentImageRecord()) {
      showFullImage();
    }
  });

  elements.closeModal.addEventListener('click', () => {
    elements.imageModal.classList.remove('active');
  });

  elements.imageModal.addEventListener('click', (event) => {
    if (event.target === elements.imageModal) {
      elements.imageModal.classList.remove('active');
    }
  });

  elements.downloadBtn.addEventListener('click', exportImages);
  elements.copyBtn.addEventListener('click', copyToClipboard);
  elements.resetBtn.addEventListener('click', reset);
}

populateLensProfileOptions();
applyLoadedSettings();
toggleControlsEnabled(false);
attachEvents();
updateExportActionText();
