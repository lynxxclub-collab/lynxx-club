import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js to always download models
env.allowLocalModels = false;
env.useBrowserCache = true;

const MAX_IMAGE_DIMENSION = 512;

let segmenter: any = null;
let isLoading = false;

export async function loadSegmentationModel(): Promise<boolean> {
  if (segmenter) return true;
  if (isLoading) {
    // Wait for existing load
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return !!segmenter;
  }

  try {
    isLoading = true;
    console.log('Loading segmentation model...');
    segmenter = await pipeline('image-segmentation', 'Xenova/segformer-b0-finetuned-ade-512-512', {
      device: 'webgpu',
    });
    console.log('Segmentation model loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading segmentation model:', error);
    // Fallback to CPU if WebGPU not available
    try {
      segmenter = await pipeline('image-segmentation', 'Xenova/segformer-b0-finetuned-ade-512-512');
      console.log('Segmentation model loaded (CPU fallback)');
      return true;
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      return false;
    }
  } finally {
    isLoading = false;
  }
}

function resizeImageIfNeeded(
  canvas: HTMLCanvasElement, 
  ctx: CanvasRenderingContext2D, 
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): boolean {
  let width = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
  let height = source instanceof HTMLVideoElement ? source.videoHeight : source.height;

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    if (width > height) {
      height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
      width = MAX_IMAGE_DIMENSION;
    } else {
      width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
      height = MAX_IMAGE_DIMENSION;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(source, 0, 0, width, height);
    return true;
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(source, 0, 0);
  return false;
}

export interface BackgroundEffect {
  type: 'none' | 'blur' | 'color' | 'image';
  value?: string; // Color hex or image URL
  blurAmount?: number;
}

export async function processFrameWithBackground(
  videoElement: HTMLVideoElement,
  outputCanvas: HTMLCanvasElement,
  effect: BackgroundEffect
): Promise<void> {
  if (!segmenter || effect.type === 'none') {
    // No processing needed, just draw the video
    const ctx = outputCanvas.getContext('2d');
    if (ctx) {
      outputCanvas.width = videoElement.videoWidth;
      outputCanvas.height = videoElement.videoHeight;
      ctx.drawImage(videoElement, 0, 0);
    }
    return;
  }

  const ctx = outputCanvas.getContext('2d');
  if (!ctx) return;

  // Create temporary canvas for processing
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;

  resizeImageIfNeeded(tempCanvas, tempCtx, videoElement);

  try {
    const imageData = tempCanvas.toDataURL('image/jpeg', 0.7);
    const result = await segmenter(imageData);

    if (!result || !Array.isArray(result) || result.length === 0 || !result[0].mask) {
      // Segmentation failed, draw original
      outputCanvas.width = videoElement.videoWidth;
      outputCanvas.height = videoElement.videoHeight;
      ctx.drawImage(videoElement, 0, 0);
      return;
    }

    // Set output canvas size
    outputCanvas.width = tempCanvas.width;
    outputCanvas.height = tempCanvas.height;

    // Draw background first
    if (effect.type === 'blur') {
      ctx.filter = `blur(${effect.blurAmount || 15}px)`;
      ctx.drawImage(videoElement, 0, 0, outputCanvas.width, outputCanvas.height);
      ctx.filter = 'none';
    } else if (effect.type === 'color' && effect.value) {
      ctx.fillStyle = effect.value;
      ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
    } else if (effect.type === 'image' && effect.value) {
      const bgImage = new Image();
      bgImage.src = effect.value;
      ctx.drawImage(bgImage, 0, 0, outputCanvas.width, outputCanvas.height);
    }

    // Draw the original frame
    const frameImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

    // Apply inverted mask to show only the person
    for (let i = 0; i < result[0].mask.data.length; i++) {
      // Invert mask: 1 - value to keep person instead of background
      const alpha = Math.round((1 - result[0].mask.data[i]) * 255);
      frameImageData.data[i * 4 + 3] = alpha;
    }

    // Create temporary canvas with masked person
    const personCanvas = document.createElement('canvas');
    personCanvas.width = tempCanvas.width;
    personCanvas.height = tempCanvas.height;
    const personCtx = personCanvas.getContext('2d');
    if (personCtx) {
      personCtx.putImageData(frameImageData, 0, 0);
      // Composite person over background
      ctx.drawImage(personCanvas, 0, 0);
    }
  } catch (error) {
    console.error('Error processing frame:', error);
    // Fallback to original
    outputCanvas.width = videoElement.videoWidth;
    outputCanvas.height = videoElement.videoHeight;
    ctx.drawImage(videoElement, 0, 0);
  }
}

export function isModelLoaded(): boolean {
  return !!segmenter;
}
