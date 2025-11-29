import { GameState, Player, Camera, Arena, Element } from '../types';
import { ImageLoader } from './imageLoader';

interface TerritoryAnimation {
  startTime: number;
  cells: Set<string>; // Set of cell keys "row:col"
  ownerId: string;
}

interface TrailAnimation {
  startTime: number;
  cellKey: string; // "row:col:ownerId"
  targetColor: string;
}

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private cellSize: number;
  private playerSize: number;
  private imageLoader: ImageLoader;
  private dirtIndexCache: Map<string, number> = new Map();
  private randomSeed: number;
  private previousGameState: GameState | null = null;
  private territoryAnimations: Map<string, TerritoryAnimation> = new Map(); // Key: ownerId
  private trailAnimations: Map<string, TrailAnimation> = new Map(); // Key: "row:col:ownerId"
  private readonly FADE_DURATION = 900; // milliseconds - time for fade-in effect
  private readonly TRAIL_COLOR_TRANSITION_DURATION = 400; // milliseconds - time for trail color transition

  constructor(
    ctx: CanvasRenderingContext2D,
    cellSize: number,
    playerSize: number,
    imageLoader: ImageLoader
  ) {
    this.ctx = ctx;
    this.cellSize = cellSize;
    this.playerSize = playerSize;
    this.imageLoader = imageLoader;
    
    // Initialize random seed in constructor to avoid initialization order issues
    const timestamp = Date.now();
    const random = Math.random() * 0xFFFFFFFF;
    const perfNow = typeof performance !== 'undefined' && performance.now ? performance.now() : 0;
    // Combine multiple sources for better randomness
    this.randomSeed = ((timestamp ^ (random >>> 0)) ^ (perfNow * 1000)) >>> 0;
  }

  render(gameState: GameState, camera: Camera, arena: Arena) {
    // Clear canvas with a visible color to test if rendering works
    this.ctx.fillStyle = '#0B1324';
    this.ctx.fillRect(0, 0, camera.width, camera.height);

    // Detect newly captured cells and start animations
    this.detectNewlyCapturedCells(gameState);
    // Detect newly created trail cells and start color transition
    this.detectNewTrailCells(gameState);

    // Draw background dirt tiles (always draw, even if no players)
    this.drawBackgroundDirt(camera, gameState, arena);

    // Draw grid lines (always draw, but skip lines inside trail)
    this.drawGridLines(camera, gameState, arena);

    // Draw claimed cells
    if (gameState.cells && Array.isArray(gameState.cells) && gameState.cells.length > 0) {
      this.drawClaimedCells(camera, gameState, arena);
    }

    // Draw players
    if (gameState.players && Object.keys(gameState.players).length > 0) {
      Object.values(gameState.players).forEach(player => {
        this.drawPlayer(player, camera);
      });
    }

    // Update previous game state
    this.previousGameState = this.deepCloneGameState(gameState);
  }

  private updateCamera(camera: Camera, gameState: GameState, arena: Arena) {
    // Camera update logic is handled by the game client
  }

  private drawBackgroundDirt(camera: Camera, gameState: GameState, arena: Arena) {
    // Draw dirt for entire viewport (no limit) to avoid empty spaces
    // Game logic will handle movement restrictions
    const startCol = Math.max(0, Math.floor(camera.x / this.cellSize));
    const endCol = Math.ceil((camera.x + camera.width) / this.cellSize);
    const startRow = Math.max(0, Math.floor(camera.y / this.cellSize));
    const endRow = Math.ceil((camera.y + camera.height) / this.cellSize);

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        // Skip cells that are claimed (including animating ones - they'll draw their own background)
        if (this.isCellClaimedForBackground(row, col, gameState)) continue;

        // Try to use image if available
        if (this.imageLoader.dirtImages.length > 0) {
          const dirtIndex = this.getDirtIndexForCell(row, col);
          const dirtImg = this.imageLoader.dirtImages[dirtIndex];

          if (dirtImg && dirtImg.complete) {
            const x = Math.round(col * this.cellSize - camera.x);
            const y = Math.round(row * this.cellSize - camera.y);
            this.ctx.drawImage(dirtImg, x, y, this.cellSize, this.cellSize);
          } else {
            // Fallback: draw colored rectangle
            const x = Math.round(col * this.cellSize - camera.x);
            const y = Math.round(row * this.cellSize - camera.y);
            this.ctx.fillStyle = '#3a3a2a';
            this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
          }
        } else {
          // No images loaded yet, draw fallback color
          const x = Math.round(col * this.cellSize - camera.x);
          const y = Math.round(row * this.cellSize - camera.y);
          this.ctx.fillStyle = '#3a3a2a';
          this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
        }
      }
    }
  }

  private drawGridLines(camera: Camera, gameState: GameState, arena: Arena) {
    // Draw grid lines for entire viewport (no limit) to avoid empty spaces
    // Game logic will handle movement restrictions
    const startCol = Math.max(0, Math.floor(camera.x / this.cellSize));
    const endCol = Math.ceil((camera.x + camera.width) / this.cellSize);
    const startRow = Math.max(0, Math.floor(camera.y / this.cellSize));
    const endRow = Math.ceil((camera.y + camera.height) / this.cellSize);

    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 1;
    this.ctx.lineCap = 'butt';
    this.ctx.lineJoin = 'miter';

    // Helper to check if a cell is a trail cell
    const isTrailCell = (r: number, c: number) => {
      if (!Array.isArray(gameState.cells) || gameState.cells.length === 0) return false;
      if (r < 0 || c < 0 || r >= gameState.cells.length) return false;
      const rowData = gameState.cells[r];
      if (!rowData) return false;
      const cell = rowData[c];
      return cell && cell.isTrail;
    };

    // Draw vertical lines, but skip segments that are between trail cells
    for (let col = startCol; col <= endCol; col++) {
      const x = Math.round(col * this.cellSize - camera.x);
      if (x >= 0 && x <= camera.width) {
        this.ctx.beginPath();
        let pathStarted = false;

        for (let row = startRow; row < endRow; row++) {
          const y = Math.round(row * this.cellSize - camera.y);
          const nextY = Math.round((row + 1) * this.cellSize - camera.y);
          
          // Check if both cells on either side of this vertical line are trail cells
          const leftCellIsTrail = isTrailCell(row, col - 1);
          const rightCellIsTrail = isTrailCell(row, col);
          
          // Skip this segment if both cells are trail cells
          if (leftCellIsTrail && rightCellIsTrail) {
            if (pathStarted) {
              this.ctx.stroke();
              this.ctx.beginPath();
              pathStarted = false;
            }
            continue;
          }
          
          // Draw this segment
          if (!pathStarted) {
            this.ctx.moveTo(x, y);
            pathStarted = true;
          }
          this.ctx.lineTo(x, nextY);
        }
        
        if (pathStarted) {
          this.ctx.stroke();
        }
      }
    }

    // Draw horizontal lines, but skip segments that are between trail cells
    for (let row = startRow; row <= endRow; row++) {
      const y = Math.round(row * this.cellSize - camera.y);
      if (y >= 0 && y <= camera.height) {
        this.ctx.beginPath();
        let pathStarted = false;

        for (let col = startCol; col < endCol; col++) {
          const x = Math.round(col * this.cellSize - camera.x);
          const nextX = Math.round((col + 1) * this.cellSize - camera.x);
          
          // Check if both cells on either side of this horizontal line are trail cells
          const topCellIsTrail = isTrailCell(row - 1, col);
          const bottomCellIsTrail = isTrailCell(row, col);
          
          // Skip this segment if both cells are trail cells
          if (topCellIsTrail && bottomCellIsTrail) {
            if (pathStarted) {
              this.ctx.stroke();
              this.ctx.beginPath();
              pathStarted = false;
            }
            continue;
          }
          
          // Draw this segment
          if (!pathStarted) {
            this.ctx.moveTo(x, y);
            pathStarted = true;
          }
          this.ctx.lineTo(nextX, y);
        }
        
        if (pathStarted) {
          this.ctx.stroke();
        }
      }
    }

    // Draw darker segments at intersections, but skip if cell is a trail
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2;
    const segmentLength = 3;

    // Helper to check if a cell is a trail cell
    const isTrailCellForIntersection = (r: number, c: number) => {
      if (!Array.isArray(gameState.cells) || gameState.cells.length === 0) return false;
      if (r < 0 || c < 0 || r >= gameState.cells.length) return false;
      const rowData = gameState.cells[r];
      if (!rowData) return false;
      const cell = rowData[c];
      return cell && cell.isTrail;
    };

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        // Skip if this cell is a trail cell
        if (isTrailCellForIntersection(row, col)) continue;

        const x = Math.round(col * this.cellSize - camera.x);
        const y = Math.round(row * this.cellSize - camera.y);

        if (x >= 0 && x <= camera.width && y >= 0 && y <= camera.height) {
          if (y - segmentLength >= 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x, y - segmentLength);
            this.ctx.stroke();
          }
          if (y + segmentLength <= camera.height) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x, y + segmentLength);
            this.ctx.stroke();
          }
          if (x - segmentLength >= 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x - segmentLength, y);
            this.ctx.stroke();
          }
          if (x + segmentLength <= camera.width) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x + segmentLength, y);
            this.ctx.stroke();
          }
        }
      }
    }

    this.ctx.lineWidth = 1;
  }

  private drawClaimedCells(camera: Camera, gameState: GameState) {
    if (!Array.isArray(gameState.cells) || gameState.cells.length === 0) return;

    const startCol = Math.max(0, Math.floor(camera.x / this.cellSize));
    const endCol = Math.min(
      gameState.cells[0].length,
      Math.ceil((camera.x + camera.width) / this.cellSize)
    );
    const startRow = Math.max(0, Math.floor(camera.y / this.cellSize));
    const endRow = Math.min(
      gameState.cells.length,
      Math.ceil((camera.y + camera.height) / this.cellSize)
    );

    for (let row = startRow; row < endRow; row++) {
      const rowData = gameState.cells[row];
      if (!rowData) continue;

      for (let col = startCol; col < endCol; col++) {
        const cell = rowData[col];
        if (!cell) continue;

        const x = Math.round(col * this.cellSize - camera.x);
        const y = Math.round(row * this.cellSize - camera.y);
        this.drawCellWithStyle(cell, x, y, row, col, gameState);
      }
    }
  }

  private drawCellWithStyle(
    cell: any,
    x: number,
    y: number,
    row: number,
    col: number,
    gameState: GameState
  ) {
    const player = gameState.players[cell.ownerId];
    let img: HTMLImageElement | null = null;

    if (player && player.element) {
      const elementData = this.imageLoader.elementImages[player.element];
      if (Array.isArray(elementData) && elementData.length > 0) {
        const hash = this.simpleHash(row, col, `${cell.ownerId}_${this.randomSeed}`);
        const imageIndex = hash % elementData.length;
        const finalIndex = imageIndex < 0 ? (imageIndex + elementData.length) : imageIndex;
        img = elementData[finalIndex];
      }
    }

    // Calculate animation alpha for newly captured territory
    let alpha = 1;
    let isAnimating = false;
    if (!cell.isTrail) {
      const animation = this.territoryAnimations.get(cell.ownerId);
      if (animation) {
        const cellKey = `${row}:${col}`;
        // Check if this cell belongs to the animating territory
        if (animation.cells.has(cellKey)) {
          isAnimating = true;
          const elapsed = performance.now() - animation.startTime;
          const fadeProgress = Math.max(0, Math.min(1, elapsed / this.FADE_DURATION));
          
          // Apply ease-in-out easing for smoother fade
          alpha = this.easeInOut(fadeProgress);
          
          // Remove animation after it completes
          if (elapsed > this.FADE_DURATION) {
            animation.cells.delete(cellKey);
            // Remove animation if all cells are done
            if (animation.cells.size === 0) {
              this.territoryAnimations.delete(cell.ownerId);
            }
          }
        }
      }
    }

    // If animating, draw background dirt first to maintain default appearance
    if (isAnimating && alpha < 1) {
      this.drawBackgroundDirtForCell(row, col, x, y);
    }

    if (img && !cell.isTrail) {
      this.ctx.globalAlpha = alpha;
      this.ctx.drawImage(img, x, y, this.cellSize, this.cellSize);
    } else {
      // Handle trail color transition
      let fillColor = cell.color;
      if (cell.isTrail) {
        const trailKey = `${row}:${col}:${cell.ownerId}`;
        const trailAnimation = this.trailAnimations.get(trailKey);
        if (trailAnimation) {
          const elapsed = performance.now() - trailAnimation.startTime;
          const progress = Math.max(0, Math.min(1, elapsed / this.TRAIL_COLOR_TRANSITION_DURATION));
          const easedProgress = this.easeInOut(progress);
          
          // Interpolate from white to target color
          fillColor = this.interpolateColor('#ffffff', trailAnimation.targetColor, easedProgress);
          
          // Remove animation after it completes
          if (elapsed > this.TRAIL_COLOR_TRANSITION_DURATION) {
            this.trailAnimations.delete(trailKey);
          }
        }
      }
      
      this.ctx.fillStyle = fillColor;
      this.ctx.globalAlpha = cell.isTrail ? 0.5 : alpha;
      this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
    }
    this.ctx.globalAlpha = 1;

    if (!cell.isTrail) {
      // Draw border with same alpha
      this.ctx.globalAlpha = alpha;
      this.drawTerritoryBorder(cell, x, y, row, col, gameState);
      this.ctx.globalAlpha = 1;
    }

    if (cell.isTrail) {
      // Draw stroke only on outer edges (not on edges connected to other trail cells)
      this.drawTrailBorder(cell, x, y, row, col, gameState);
      
      // Draw dashed white line in the middle of the trail
      this.drawTrailDashedLine(cell, x, y, row, col, gameState);
    }
  }

  private drawTerritoryBorder(
    cell: any,
    x: number,
    y: number,
    row: number,
    col: number,
    gameState: GameState
  ) {
    if (!cell || cell.isTrail) return;
    if (!Array.isArray(gameState.cells) || gameState.cells.length === 0) return;

    const cells = gameState.cells;
    const ownerId = cell.ownerId;
    if (!ownerId) return;

    const rows = cells.length;
    const cols = cells[0]?.length || 0;

    const isDifferentOwner = (r: number, c: number) => {
      if (r < 0 || c < 0 || r >= rows || c >= cols) return true;
      const nRow = cells[r];
      if (!nRow) return true;
      const nCell = nRow[c];
      if (!nCell) return true;
      return nCell.ownerId !== ownerId || nCell.isTrail;
    };

    const topDifferent = isDifferentOwner(row - 1, col);
    const bottomDifferent = isDifferentOwner(row + 1, col);
    const leftDifferent = isDifferentOwner(row, col - 1);
    const rightDifferent = isDifferentOwner(row, col + 1);

    if (!topDifferent && !bottomDifferent && !leftDifferent && !rightDifferent) return;

    const prevStrokeStyle = this.ctx.strokeStyle;
    const prevLineWidth = this.ctx.lineWidth;
    const prevAlpha = this.ctx.globalAlpha;
    const prevLineCap = this.ctx.lineCap;
    const prevLineJoin = this.ctx.lineJoin;

    let borderColor = cell.color || '#ffffff';
    const ownerPlayer = gameState.players[ownerId];
    if (ownerPlayer && ownerPlayer.element) {
      switch (ownerPlayer.element) {
        case 'dog':
          borderColor = '#2BBAA5';
          break;
        case 'duck':
          borderColor = '#FAECB6';
          break;
        case 'whale':
          borderColor = '#1D2A62';
          break;
        case 'penguin':
          borderColor = '#F5F3D8';
          break;
      }
    }

    this.ctx.strokeStyle = borderColor;
    this.ctx.lineWidth = 4;
    this.ctx.globalAlpha = 1.0;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    const inset = this.ctx.lineWidth / 2;
    const innerX = x + inset;
    const innerY = y + inset;
    const innerSize = this.cellSize - inset * 2;

    this.ctx.beginPath();

    if (topDifferent) {
      this.ctx.moveTo(innerX, innerY);
      this.ctx.lineTo(innerX + innerSize, innerY);
    }

    if (bottomDifferent) {
      const by = innerY + innerSize;
      this.ctx.moveTo(innerX, by);
      this.ctx.lineTo(innerX + innerSize, by);
    }

    if (leftDifferent) {
      this.ctx.moveTo(innerX, innerY);
      this.ctx.lineTo(innerX, innerY + innerSize);
    }

    if (rightDifferent) {
      const rx = innerX + innerSize;
      this.ctx.moveTo(rx, innerY);
      this.ctx.lineTo(rx, innerY + innerSize);
    }

    this.ctx.stroke();

    this.ctx.strokeStyle = prevStrokeStyle;
    this.ctx.lineWidth = prevLineWidth;
    this.ctx.globalAlpha = prevAlpha;
    this.ctx.lineCap = prevLineCap;
    this.ctx.lineJoin = prevLineJoin;
  }

  /**
   * Draw border stroke only on outer edges of trail cells
   * Skip edges that are connected to other trail cells
   */
  private drawTrailBorder(
    cell: any,
    x: number,
    y: number,
    row: number,
    col: number,
    gameState: GameState
  ) {
    if (!Array.isArray(gameState.cells) || gameState.cells.length === 0) return;
    
    const cells = gameState.cells;
    const ownerId = cell.ownerId;
    if (!ownerId) return;

    const rows = cells.length;
    const cols = cells[0]?.length || 0;

    // Check if adjacent cell is a trail cell of the same owner
    const isTrailCell = (r: number, c: number) => {
      if (r < 0 || c < 0 || r >= rows || c >= cols) return false;
      const nRow = cells[r];
      if (!nRow) return false;
      const nCell = nRow[c];
      return nCell && nCell.isTrail && nCell.ownerId === ownerId;
    };

    const hasTopTrail = isTrailCell(row - 1, col);
    const hasBottomTrail = isTrailCell(row + 1, col);
    const hasLeftTrail = isTrailCell(row, col - 1);
    const hasRightTrail = isTrailCell(row, col + 1);

    // Save context state
    const prevStrokeStyle = this.ctx.strokeStyle;
    const prevLineWidth = this.ctx.lineWidth;
    const prevLineCap = this.ctx.lineCap;

    // Set up stroke style
    this.ctx.strokeStyle = '#ffffff55';
    this.ctx.lineWidth = 1;
    this.ctx.lineCap = 'butt';

    const inset = 2;
    const innerX = x + inset;
    const innerY = y + inset;
    const innerSize = this.cellSize - inset * 2;

    this.ctx.beginPath();

    // Only draw edges that don't have adjacent trail cells
    if (!hasTopTrail) {
      // Top edge
      this.ctx.moveTo(innerX, innerY);
      this.ctx.lineTo(innerX + innerSize, innerY);
    }

    if (!hasBottomTrail) {
      // Bottom edge
      this.ctx.moveTo(innerX, innerY + innerSize);
      this.ctx.lineTo(innerX + innerSize, innerY + innerSize);
    }

    if (!hasLeftTrail) {
      // Left edge
      this.ctx.moveTo(innerX, innerY);
      this.ctx.lineTo(innerX, innerY + innerSize);
    }

    if (!hasRightTrail) {
      // Right edge
      this.ctx.moveTo(innerX + innerSize, innerY);
      this.ctx.lineTo(innerX + innerSize, innerY + innerSize);
    }

    this.ctx.stroke();

    // Restore context state
    this.ctx.strokeStyle = prevStrokeStyle;
    this.ctx.lineWidth = prevLineWidth;
    this.ctx.lineCap = prevLineCap;
  }

  /**
   * Draw dashed white line in the middle of trail cells
   * Lines are drawn continuously across multiple cells
   */
  private drawTrailDashedLine(
    cell: any,
    x: number,
    y: number,
    row: number,
    col: number,
    gameState: GameState
  ) {
    if (!Array.isArray(gameState.cells) || gameState.cells.length === 0) return;
    
    const cells = gameState.cells;
    const ownerId = cell.ownerId;
    if (!ownerId) return;

    const rows = cells.length;
    const cols = cells[0]?.length || 0;

    // Check adjacent trail cells to determine direction
    const isTrailCell = (r: number, c: number) => {
      if (r < 0 || c < 0 || r >= rows || c >= cols) return false;
      const nRow = cells[r];
      if (!nRow) return false;
      const nCell = nRow[c];
      return nCell && nCell.isTrail && nCell.ownerId === ownerId;
    };

    const hasTopTrail = isTrailCell(row - 1, col);
    const hasBottomTrail = isTrailCell(row + 1, col);
    const hasLeftTrail = isTrailCell(row, col - 1);
    const hasRightTrail = isTrailCell(row, col + 1);

    // Count trails in each direction
    const horizontalCount = (hasLeftTrail ? 1 : 0) + (hasRightTrail ? 1 : 0);
    const verticalCount = (hasTopTrail ? 1 : 0) + (hasBottomTrail ? 1 : 0);

    const isHorizontal = horizontalCount > 0;
    const isVertical = verticalCount > 0;
    const isCorner = isHorizontal && isVertical;

    // Only draw if this cell is part of a continuous line
    // Don't draw if it's an endpoint (only one direction)
    if (!isHorizontal && !isVertical) {
      // Endpoint - draw a small dot
      const centerX = x + this.cellSize / 2;
      const centerY = y + this.cellSize / 2;
      
      const prevStrokeStyle = this.ctx.strokeStyle;
      const prevLineWidth = this.ctx.lineWidth;
      
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
      this.ctx.stroke();
      
      this.ctx.strokeStyle = prevStrokeStyle;
      this.ctx.lineWidth = prevLineWidth;
      return;
    }

    // Save context state
    const prevStrokeStyle = this.ctx.strokeStyle;
    const prevLineWidth = this.ctx.lineWidth;
    const prevLineCap = this.ctx.lineCap;
    const prevLineJoin = this.ctx.lineJoin;
    const prevLineDash = this.ctx.getLineDash();

    // Set up solid line style (no dashes)
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 4; // Increased line width
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    // Use solid line (no dash pattern)
    this.ctx.setLineDash([]);
    
    const centerX = x + this.cellSize / 2;
    const centerY = y + this.cellSize / 2;

    this.ctx.beginPath();

    if (isCorner) {
      // Draw L-shaped corner to connect the two directions
      // Draw full length to ensure continuity and consistent dash alignment
      if (hasTopTrail && hasLeftTrail) {
        // Top-left corner: from top edge to center, then to left edge
        this.ctx.moveTo(centerX, y);
        this.ctx.lineTo(centerX, centerY);
        this.ctx.lineTo(x, centerY);
      } else if (hasTopTrail && hasRightTrail) {
        // Top-right corner: from top edge to center, then to right edge
        this.ctx.moveTo(centerX, y);
        this.ctx.lineTo(centerX, centerY);
        this.ctx.lineTo(x + this.cellSize, centerY);
      } else if (hasBottomTrail && hasLeftTrail) {
        // Bottom-left corner: from bottom edge to center, then to left edge
        this.ctx.moveTo(centerX, y + this.cellSize);
        this.ctx.lineTo(centerX, centerY);
        this.ctx.lineTo(x, centerY);
      } else if (hasBottomTrail && hasRightTrail) {
        // Bottom-right corner: from bottom edge to center, then to right edge
        this.ctx.moveTo(centerX, y + this.cellSize);
        this.ctx.lineTo(centerX, centerY);
        this.ctx.lineTo(x + this.cellSize, centerY);
      } else {
        // Fallback: draw based on primary direction
        if (horizontalCount >= verticalCount) {
          this.ctx.moveTo(x, centerY);
          this.ctx.lineTo(x + this.cellSize, centerY);
        } else {
          this.ctx.moveTo(centerX, y);
          this.ctx.lineTo(centerX, y + this.cellSize);
        }
      }
    } else if (isHorizontal) {
      // Draw horizontal line full width to ensure continuity
      this.ctx.moveTo(x, centerY);
      this.ctx.lineTo(x + this.cellSize, centerY);
    } else if (isVertical) {
      // Draw vertical line full height to ensure continuity
      this.ctx.moveTo(centerX, y);
      this.ctx.lineTo(centerX, y + this.cellSize);
    }

    this.ctx.stroke();

    // Restore context state
    this.ctx.strokeStyle = prevStrokeStyle;
    this.ctx.lineWidth = prevLineWidth;
    this.ctx.lineCap = prevLineCap;
    this.ctx.lineJoin = prevLineJoin || 'miter';
    this.ctx.setLineDash(prevLineDash);
  }

  private drawPlayer(player: Player, camera: Camera) {
    // Use sub-pixel rendering for smoother movement (don't round immediately)
    const screenX = player.x - camera.x;
    const screenY = player.y - camera.y;

    if (
      screenX + this.playerSize < 0 ||
      screenX > camera.width ||
      screenY + this.playerSize < 0 ||
      screenY > camera.height
    ) {
      return;
    }

    // Round only when actually drawing for sub-pixel smoothness
    const drawX = Math.round(screenX);
    const drawY = Math.round(screenY);

    const avatarImg = player.element ? this.imageLoader.avatarImages[player.element] : null;
    const shadowImg = player.element ? this.imageLoader.shadowImages[player.element] : null;

    // Draw shadow
    if (shadowImg && avatarImg) {
      const baseWidth = avatarImg.width;
      const baseHeight = avatarImg.height;
      const shWidth = shadowImg.width;
      const shHeight = shadowImg.height;

      if (baseWidth > 0 && baseHeight > 0 && shWidth > 0 && shHeight > 0) {
        const scale = this.playerSize / baseWidth;
        const scaledShadowWidth = shWidth * scale;
        const scaledShadowHeight = shHeight * scale;

        const drawShadowX = Math.round(screenX + (this.playerSize - scaledShadowWidth) / 2);
        const drawShadowY = Math.round(screenY);

        this.ctx.drawImage(shadowImg, drawShadowX, drawShadowY, scaledShadowWidth, scaledShadowHeight);
      }
    }

    // Draw avatar
    if (avatarImg) {
      this.ctx.drawImage(avatarImg, drawX, drawY, this.playerSize, this.playerSize);
    } else {
      this.ctx.fillStyle = player.color;
      this.ctx.fillRect(drawX, drawY, this.playerSize, this.playerSize);
    }

    // Draw mask
    if (player.element && this.imageLoader.maskImages[player.element] && avatarImg) {
      const maskImg = this.imageLoader.maskImages[player.element];
      const baseWidth = avatarImg.width;
      const baseHeight = avatarImg.height;
      const maskWidth = maskImg.width;
      const maskHeight = maskImg.height;

      if (baseWidth > 0 && baseHeight > 0 && maskWidth > 0 && maskHeight > 0) {
        const scale = this.playerSize / baseWidth;
        const scaledMaskWidth = maskWidth * scale;
        const scaledMaskHeight = maskHeight * scale;

        let maskDrawX: number;
        let maskDrawY: number;

        if (player.element === 'duck') {
          maskDrawX = Math.round(screenX + (this.playerSize - scaledMaskWidth) / 2);
          maskDrawY = Math.round(screenY);
        } else if (player.element === 'whale') {
          const baseBottomY = screenY + this.playerSize;
          maskDrawX = Math.round(screenX);
          maskDrawY = Math.round(baseBottomY - scaledMaskHeight);
        } else {
          const baseBottomY = screenY + this.playerSize;
          maskDrawX = Math.round(screenX + (this.playerSize - scaledMaskWidth) / 2);
          maskDrawY = Math.round(baseBottomY - scaledMaskHeight);
        }

        this.ctx.drawImage(maskImg, maskDrawX, maskDrawY, scaledMaskWidth, scaledMaskHeight);
      }
    }
  }

  private isCellClaimed(row: number, col: number, gameState: GameState): boolean {
    if (!Array.isArray(gameState.cells) || gameState.cells.length === 0) return false;
    const rowData = gameState.cells[row];
    if (!rowData) return false;
    const cell = rowData[col];
    return cell !== null && cell !== undefined;
  }

  /**
   * Check if cell is claimed for background drawing purposes
   * Returns false for animating cells so they draw their own background
   */
  private isCellClaimedForBackground(row: number, col: number, gameState: GameState): boolean {
    if (!Array.isArray(gameState.cells) || gameState.cells.length === 0) return false;
    const rowData = gameState.cells[row];
    if (!rowData) return false;
    const cell = rowData[col];
    if (!cell) return false;
    
    // If cell is animating, don't draw background here (it will be drawn in drawCellWithStyle)
    if (!cell.isTrail) {
      const animation = this.territoryAnimations.get(cell.ownerId);
      if (animation) {
        const cellKey = `${row}:${col}`;
        if (animation.cells.has(cellKey)) {
          const elapsed = performance.now() - animation.startTime;
          const fadeProgress = Math.max(0, Math.min(1, elapsed / this.FADE_DURATION));
          if (fadeProgress < 1) {
            return true; // Still animating, skip in background drawing (will be drawn in drawCellWithStyle)
          }
        }
      }
    }
    
    return true;
  }

  /**
   * Draw background dirt for a single cell (used during animation)
   */
  private drawBackgroundDirtForCell(row: number, col: number, x: number, y: number) {
    if (this.imageLoader.dirtImages.length > 0) {
      const dirtIndex = this.getDirtIndexForCell(row, col);
      const dirtImg = this.imageLoader.dirtImages[dirtIndex];

      if (dirtImg && dirtImg.complete) {
        this.ctx.drawImage(dirtImg, x, y, this.cellSize, this.cellSize);
      } else {
        // Fallback: draw colored rectangle
        this.ctx.fillStyle = '#3a3a2a';
        this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
      }
    } else {
      // No images loaded yet, draw fallback color
      this.ctx.fillStyle = '#3a3a2a';
      this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
    }
  }

  private getDirtIndexForCell(row: number, col: number): number {
    if (this.imageLoader.dirtImages.length === 0) {
      return 0;
    }

    const key = `${row}_${col}_${this.randomSeed}`;

    // Check cache first (include seed in key to avoid stale cache)
    if (this.dirtIndexCache.has(key)) {
      const cachedIndex = this.dirtIndexCache.get(key)!;
      if (cachedIndex >= 0 && cachedIndex < this.imageLoader.dirtImages.length) {
        return cachedIndex;
      }
    }

    // Calculate hash - each cell should get different value
    const hash = this.simpleHash(row, col, `default_${this.randomSeed}`);
    const dirtIndex = hash % this.imageLoader.dirtImages.length;

    // Ensure index is positive and valid
    const finalIndex = dirtIndex < 0 ? (dirtIndex + this.imageLoader.dirtImages.length) : dirtIndex;

    // Cache the result
    this.dirtIndexCache.set(key, finalIndex);
    return finalIndex;
  }

  /**
   * Detect newly captured territory and start animation for the entire region
   */
  private detectNewlyCapturedCells(gameState: GameState) {
    if (!this.previousGameState || !gameState.cells || !Array.isArray(gameState.cells)) {
      return;
    }

    const now = performance.now();
    const rows = gameState.cells.length;
    const cols = gameState.cells[0]?.length || 0;

    // Group newly captured cells by owner
    const newlyCapturedByOwner = new Map<string, Set<string>>();
    
    for (let row = 0; row < rows; row++) {
      const rowData = gameState.cells[row];
      if (!rowData) continue;
      
      for (let col = 0; col < cols; col++) {
        const currentCell = rowData[col];
        if (!currentCell || currentCell.isTrail) continue;

        const prevRow = this.previousGameState.cells[row];
        const prevCell = prevRow ? prevRow[col] : null;
        
        // Check if this cell is newly captured (wasn't owned by this player before)
        if (!prevCell || prevCell.ownerId !== currentCell.ownerId || prevCell.isTrail) {
          const ownerId = currentCell.ownerId;
          if (!newlyCapturedByOwner.has(ownerId)) {
            newlyCapturedByOwner.set(ownerId, new Set());
          }
          newlyCapturedByOwner.get(ownerId)!.add(`${row}:${col}`);
        }
      }
    }

    // Start animation for each newly captured territory
    newlyCapturedByOwner.forEach((cells, ownerId) => {
      // Check if there's already an animation for this owner
      const existingAnimation = this.territoryAnimations.get(ownerId);
      if (existingAnimation) {
        // Add new cells to existing animation
        cells.forEach(cellKey => existingAnimation.cells.add(cellKey));
      } else {
        // Create new animation for this territory
        this.territoryAnimations.set(ownerId, {
          startTime: now,
          cells: new Set(cells),
          ownerId: ownerId
        });
      }
    });
  }

  /**
   * Calculate distance from border for each cell using BFS
   * Border = cells that are adjacent to non-owned cells or trail cells
   */
  private calculateDistancesFromBorder(
    cells: Array<{ row: number; col: number }>,
    gameState: GameState,
    ownerId: string
  ): Map<string, number> {
    const distances = new Map<string, number>();
    const rows = gameState.cells.length;
    const cols = gameState.cells[0]?.length || 0;

    // Find border cells (cells adjacent to non-owned or trail cells)
    const borderCells = new Set<string>();
    const cellSet = new Set(cells.map(c => `${c.row}:${c.col}`));

    cells.forEach(({ row, col }) => {
      // Check if this cell is on the border
      const isBorder = this.isBorderCell(row, col, gameState, ownerId, rows, cols);
      if (isBorder) {
        borderCells.add(`${row}:${col}`);
        distances.set(`${row}:${col}`, 0);
      }
    });

    // BFS from border cells to calculate distances
    const queue: Array<{ row: number; col: number; distance: number }> = [];
    borderCells.forEach(key => {
      const [r, c] = key.split(':').map(Number);
      queue.push({ row: r, col: c, distance: 0 });
    });

    const visited = new Set<string>();
    borderCells.forEach(key => visited.add(key));

    while (queue.length > 0) {
      const { row, col, distance } = queue.shift()!;
      const neighbors = [
        { row: row - 1, col },
        { row: row + 1, col },
        { row, col: col - 1 },
        { row, col: col + 1 }
      ];

      neighbors.forEach(({ row: nr, col: nc }) => {
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) return;
        
        const key = `${nr}:${nc}`;
        if (!cellSet.has(key)) return;
        if (visited.has(key)) return;

        visited.add(key);
        const newDistance = distance + 1;
        distances.set(key, newDistance);
        queue.push({ row: nr, col: nc, distance: newDistance });
      });
    }

    // Set distance 0 for cells not reached (they are border cells)
    cells.forEach(({ row, col }) => {
      const key = `${row}:${col}`;
      if (!distances.has(key)) {
        distances.set(key, 0);
      }
    });

    return distances;
  }

  /**
   * Check if a cell is on the border (adjacent to non-owned or trail cells)
   */
  private isBorderCell(
    row: number,
    col: number,
    gameState: GameState,
    ownerId: string,
    rows: number,
    cols: number
  ): boolean {
    const neighbors = [
      { row: row - 1, col },
      { row: row + 1, col },
      { row, col: col - 1 },
      { row, col: col + 1 }
    ];

    for (const { row: nr, col: nc } of neighbors) {
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) return true;
      
      const nRow = gameState.cells[nr];
      if (!nRow) return true;
      
      const nCell = nRow[nc];
      if (!nCell || nCell.ownerId !== ownerId || nCell.isTrail) {
        return true;
      }
    }

    return false;
  }

  /**
   * Deep clone game state for comparison
   */
  private deepCloneGameState(gameState: GameState): GameState {
    return {
      players: { ...gameState.players },
      cells: gameState.cells.map(row => row ? row.map(cell => cell ? { ...cell } : null) : []),
      timeRemaining: gameState.timeRemaining,
      gameOver: gameState.gameOver,
      winnerName: gameState.winnerName
    };
  }

  /**
   * Easing function for smooth fade-in animation (ease-in-out)
   * Returns a value between 0 and 1
   */
  private easeInOut(t: number): number {
    // Ease-in-out cubic function for smooth animation
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Interpolate between two hex colors
   */
  private interpolateColor(color1: string, color2: string, factor: number): string {
    // Parse hex colors to RGB
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');
    
    const r1 = parseInt(hex1.substring(0, 2), 16);
    const g1 = parseInt(hex1.substring(2, 4), 16);
    const b1 = parseInt(hex1.substring(4, 6), 16);
    
    const r2 = parseInt(hex2.substring(0, 2), 16);
    const g2 = parseInt(hex2.substring(2, 4), 16);
    const b2 = parseInt(hex2.substring(4, 6), 16);
    
    // Interpolate
    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);
    
    // Convert back to hex
    return `#${[r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('')}`;
  }

  /**
   * Detect newly created trail cells and start color transition animation
   */
  private detectNewTrailCells(gameState: GameState) {
    if (!this.previousGameState || !gameState.cells || !Array.isArray(gameState.cells)) {
      return;
    }

    const now = performance.now();
    const rows = gameState.cells.length;
    const cols = gameState.cells[0]?.length || 0;

    for (let row = 0; row < rows; row++) {
      const rowData = gameState.cells[row];
      if (!rowData) continue;
      
      for (let col = 0; col < cols; col++) {
        const currentCell = rowData[col];
        if (!currentCell || !currentCell.isTrail) continue;

        const prevRow = this.previousGameState.cells[row];
        const prevCell = prevRow ? prevRow[col] : null;
        
        // Check if this is a newly created trail cell
        if (!prevCell || !prevCell.isTrail || prevCell.ownerId !== currentCell.ownerId) {
          const trailKey = `${row}:${col}:${currentCell.ownerId}`;
          // Only start animation if not already animating
          if (!this.trailAnimations.has(trailKey)) {
            this.trailAnimations.set(trailKey, {
              startTime: now,
              cellKey: trailKey,
              targetColor: currentCell.color
            });
          }
        }
      }
    }
  }

  /**
   * Hash function for consistent randomization based on position and owner
   * Ensures each cell gets a unique hash value
   */
  private simpleHash(row: number, col: number, ownerId: string): number {
    // Create a unique hash by combining row, col, and ownerId
    // Use different operations to ensure variety
    
    // Start with row and col using large primes
    let hash = (row * 73856093) ^ (col * 19349663);
    
    // Mix in ownerId string character by character
    for (let i = 0; i < ownerId.length; i++) {
      hash = ((hash << 5) - hash) + ownerId.charCodeAt(i);
      hash = hash | 0; // Convert to 32-bit integer
    }
    
    // Additional mixing steps for better distribution
    hash = hash ^ (hash >>> 16);
    hash = hash * 2246822507;
    hash = hash ^ (hash >>> 13);
    hash = hash * 3266489917;
    hash = hash ^ (hash >>> 16);
    
    // Ensure positive result
    const result = hash | 0;
    return result < 0 ? -result : result;
  }
}

