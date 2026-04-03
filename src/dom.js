export const elements = {
  fileInput: document.getElementById('fileInput'),
  uploadArea: document.getElementById('uploadArea'),
  dropZone: document.getElementById('dropZone'),
  imagePreview: document.getElementById('imagePreview'),
  previewMeta: document.getElementById('previewMeta'),
  batchStatus: document.getElementById('batchStatus'),
  activeFileName: document.getElementById('activeFileName'),
  prevImageBtn: document.getElementById('prevImageBtn'),
  nextImageBtn: document.getElementById('nextImageBtn'),
  controls: document.getElementById('controls'),
  canvas: document.getElementById('canvas'),
  canvasWrapper: document.getElementById('canvasWrapper'),
  workflowInputs: document.querySelectorAll('input[name="workflow"]'),
  aspectControls: document.getElementById('aspectControls'),
  desqueezeControls: document.getElementById('desqueezeControls'),
  desqueezeFactor: document.getElementById('desqueezeFactor'),
  desqueezePresets: document.querySelectorAll('.desqueeze-preset'),
  aspectRatioSelect: document.getElementById('aspectRatio'),
  customRatioInputs: document.getElementById('customRatioInputs'),
  customWidth: document.getElementById('customWidth'),
  customHeight: document.getElementById('customHeight'),
  downloadBtn: document.getElementById('downloadBtn'),
  downloadBtnText: document.getElementById('downloadBtnText'),
  exportHint: document.getElementById('exportHint'),
  copyBtn: document.getElementById('copyBtn'),
  copyBtnText: document.getElementById('copyBtnText'),
  resetBtn: document.getElementById('resetBtn'),
  colorControls: document.getElementById('colorControls'),
  paddingAmountControl: document.getElementById('paddingAmountControl'),
  paddingAmount: document.getElementById('paddingAmount'),
  paddingValue: document.getElementById('paddingValue'),
  customColor: document.getElementById('customColor'),
  customColorRadio: document.getElementById('customColorRadio'),
  jpegQualityControl: document.getElementById('jpegQualityControl'),
  jpegQuality: document.getElementById('jpegQuality'),
  qualityValue: document.getElementById('qualityValue'),
  imageModal: document.getElementById('imageModal'),
  modalCanvas: document.getElementById('modalCanvas'),
  closeModal: document.getElementById('closeModal')
};

export function getCheckedValue(name) {
  return document.querySelector(`input[name="${name}"]:checked`).value;
}

export function getWorkflow() {
  return getCheckedValue('workflow');
}

export function getSelectedFormat() {
  return getCheckedValue('format');
}

export function getSelectedMode() {
  return getCheckedValue('mode');
}

export function getSelectedColor() {
  return getCheckedValue('color');
}

export function isPadMode() {
  return getSelectedMode() === 'pad';
}
