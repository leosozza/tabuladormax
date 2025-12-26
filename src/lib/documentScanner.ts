/**
 * Document Scanner utilities for perspective correction
 * Uses canvas-based approach similar to CamScanner
 */

export interface Point {
  x: number;
  y: number;
}

export interface Corners {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
}

/**
 * Apply perspective transformation to crop and straighten a document
 */
export const applyPerspectiveTransform = (
  sourceCanvas: HTMLCanvasElement,
  corners: Corners,
  outputWidth: number = 1200,
  outputHeight: number = 1600
): HTMLCanvasElement => {
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = outputWidth;
  outputCanvas.height = outputHeight;
  const ctx = outputCanvas.getContext('2d');
  
  if (!ctx) throw new Error('Could not get canvas context');

  // Source corners
  const srcCorners = [
    corners.topLeft,
    corners.topRight,
    corners.bottomRight,
    corners.bottomLeft,
  ];

  // Destination corners (rectangle)
  const dstCorners = [
    { x: 0, y: 0 },
    { x: outputWidth, y: 0 },
    { x: outputWidth, y: outputHeight },
    { x: 0, y: outputHeight },
  ];

  // Use triangulation approach for perspective transform
  // Split quad into 2 triangles and apply affine transform to each
  
  // Triangle 1: topLeft, topRight, bottomRight
  drawTriangle(ctx, sourceCanvas, 
    [srcCorners[0], srcCorners[1], srcCorners[2]],
    [dstCorners[0], dstCorners[1], dstCorners[2]]
  );
  
  // Triangle 2: topLeft, bottomRight, bottomLeft
  drawTriangle(ctx, sourceCanvas,
    [srcCorners[0], srcCorners[2], srcCorners[3]],
    [dstCorners[0], dstCorners[2], dstCorners[3]]
  );

  return outputCanvas;
};

function drawTriangle(
  ctx: CanvasRenderingContext2D,
  img: HTMLCanvasElement,
  srcPts: Point[],
  dstPts: Point[]
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(dstPts[0].x, dstPts[0].y);
  ctx.lineTo(dstPts[1].x, dstPts[1].y);
  ctx.lineTo(dstPts[2].x, dstPts[2].y);
  ctx.closePath();
  ctx.clip();

  // Calculate affine transform matrix
  const srcMat = [
    [srcPts[0].x, srcPts[0].y, 1, 0, 0, 0],
    [0, 0, 0, srcPts[0].x, srcPts[0].y, 1],
    [srcPts[1].x, srcPts[1].y, 1, 0, 0, 0],
    [0, 0, 0, srcPts[1].x, srcPts[1].y, 1],
    [srcPts[2].x, srcPts[2].y, 1, 0, 0, 0],
    [0, 0, 0, srcPts[2].x, srcPts[2].y, 1],
  ];

  const dstVec = [dstPts[0].x, dstPts[0].y, dstPts[1].x, dstPts[1].y, dstPts[2].x, dstPts[2].y];
  
  try {
    const transform = solveLinearSystem(srcMat, dstVec);
    ctx.setTransform(transform[0], transform[3], transform[1], transform[4], transform[2], transform[5]);
    ctx.drawImage(img, 0, 0);
  } catch {
    // Fallback: simple draw without transform
    ctx.drawImage(img, 0, 0);
  }

  ctx.restore();
}

function solveLinearSystem(mat: number[][], vec: number[]): number[] {
  // Gaussian elimination
  const n = vec.length;
  const aug = mat.map((row, i) => [...row, vec[i]]);

  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
        maxRow = row;
      }
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    if (Math.abs(aug[col][col]) < 1e-10) continue;

    // Eliminate
    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / aug[col][col];
      for (let j = col; j <= n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  // Back substitution
  const solution = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = aug[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= aug[i][j] * solution[j];
    }
    solution[i] = Math.abs(aug[i][i]) > 1e-10 ? sum / aug[i][i] : 0;
  }

  return solution;
}

/**
 * Apply image enhancement filters
 */
export const enhanceDocument = (
  canvas: HTMLCanvasElement,
  options: {
    contrast?: number;
    brightness?: number;
    sharpen?: boolean;
  } = {}
): HTMLCanvasElement => {
  const { contrast = 1.2, brightness = 1.05 } = options;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    // Apply contrast and brightness
    data[i] = clamp(((data[i] - 128) * contrast + 128) * brightness);
    data[i + 1] = clamp(((data[i + 1] - 128) * contrast + 128) * brightness);
    data[i + 2] = clamp(((data[i + 2] - 128) * contrast + 128) * brightness);
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * Convert canvas to Blob for upload
 */
export const canvasToBlob = (canvas: HTMLCanvasElement, quality = 0.9): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      },
      'image/jpeg',
      quality
    );
  });
};

/**
 * Calculate default corners for a document based on image dimensions
 */
export const getDefaultCorners = (width: number, height: number, padding = 0.1): Corners => {
  const padX = width * padding;
  const padY = height * padding;
  
  return {
    topLeft: { x: padX, y: padY },
    topRight: { x: width - padX, y: padY },
    bottomLeft: { x: padX, y: height - padY },
    bottomRight: { x: width - padX, y: height - padY },
  };
};
