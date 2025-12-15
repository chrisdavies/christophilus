/**
 * Logic for generating the board, rotating blocks, detecting collisions /
 * legal placements, etc.
 */

export type Tiles = string[][];

export interface ShapeDef {
  /**
   * The number of unique rotations.
   */
  numRotations: number;
  /**
   * The tile placement.
   */
  tiles: Tiles;
}

export const shapeDefs: ShapeDef[] = [
  {
    numRotations: 1,
    tiles: [
      ['a', 'a'],
      ['a', 'a'],
    ],
  },
  {
    numRotations: 2,
    tiles: [
      ['.', 'b', '.'],
      ['.', 'b', '.'],
      ['.', 'b', '.'],
      ['.', 'b', '.'],
    ],
  },
  {
    numRotations: 3,
    tiles: [
      ['c', '.'],
      ['c', 'c'],
      ['.', 'c'],
    ],
  },
  {
    numRotations: 3,
    tiles: [
      ['.', 'd'],
      ['d', 'd'],
      ['d', '.'],
    ],
  },
  {
    numRotations: 4,
    tiles: [
      ['e', 'e', '.'],
      ['.', 'e', '.'],
      ['.', 'e', '.'],
    ],
  },
  {
    numRotations: 4,
    tiles: [
      ['.', 'f', 'f'],
      ['.', 'f', '.'],
      ['.', 'f', '.'],
    ],
  },
  {
    numRotations: 4,
    tiles: [
      ['.', 'g', '.'],
      ['.', 'g', 'g'],
      ['.', 'g', '.'],
    ],
  },
];

export const width = (tiles: Tiles) => tiles[0].length;

export const height = (tiles: Tiles) => tiles.length;

export const clone = (tiles: Tiles) => tiles.map((a) => a.map((b) => b));

const mktiles = (w: number, h: number): Tiles =>
  new Array(h).fill(null).map(() => new Array(w).fill('.'));

export const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min)) + min;

const randomIndex = (arr: any[]) => randomInt(0, arr.length);

const trimTiles = (tiles: Tiles) => {
  tiles = clone(tiles);
  while (tiles.every((row) => row[0] === '.')) {
    tiles = tiles.map((row) => row.slice(1));
  }
  while (tiles.every((row) => row[row.length - 1] === '.')) {
    tiles = tiles.map((row) => row.slice(0, -1));
  }
  return tiles;
};

export function rotateRight(tiles: Tiles) {
  const w = width(tiles);
  const h = height(tiles);
  const result = mktiles(h, w);
  for (let y = 0; y < h; ++y) {
    for (let x = 0; x < w; ++x) {
      result[x][y] = tiles[h - y - 1][x];
    }
  }
  return result;
}

/**
 * Count how many empty spaces are located beneath a non-empty space on the
 * y-axis.
 */
function overhang(tiles: Tiles) {
  const w = width(tiles);
  const h = height(tiles);
  let count = 0;
  for (let x = 0; x < w; ++x) {
    let isOverhang = false;
    for (let y = h - 1; y >= 0; --y) {
      const ch = tiles[y][x];
      if (isOverhang && ch === '.') {
        ++count;
      } else if (ch !== '.') {
        isOverhang = true;
      }
    }
  }
  return count;
}

/**
 * Determine if the specified shape collides if placed at x=top, y=left
 */
function collides(left: number, top: number, shape: Tiles, board: Tiles) {
  const w = width(shape);
  const h = height(shape);
  for (let x = 0; x < w; ++x) {
    for (let y = 0; y < h; ++y) {
      if (shape[y][x] === '.') {
        continue;
      }
      if (board[y + top]?.[x + left] !== '.') {
        return true;
      }
    }
  }
  return false;
}

/**
 * Given the specified shape being placed with its top left at the specified
 * location, slide it left on the board until it hits something. Return the
 * leftmost non-colliding coordinates, if there are any.
 */
function slideLeft(left: number, top: number, shape: Tiles, board: Tiles) {
  if (collides(left, top, shape, board)) {
    return;
  }
  for (let x = left - 1; x >= 0; --x) {
    if (collides(x, top, shape, board)) {
      break;
    }
    left = x;
  }
  return { x: left, y: top };
}

function slideDown(left: number, top: number, tiles: Tiles, board: Tiles) {
  if (collides(left, top, tiles, board)) {
    return;
  }
  for (let y = top - 1; y >= 0; --y) {
    if (collides(left, y, tiles, board)) {
      break;
    }
    top = y;
  }
  return { x: left, y: top };
}

function placeTiles(left: number, top: number, tiles: Tiles, oldBoard: Tiles) {
  const board = clone(oldBoard);
  for (let x = 0; x < width(tiles); ++x) {
    for (let y = 0; y < height(tiles); ++y) {
      const ch = tiles[y][x];
      if (ch !== '.') {
        board[y + top][x + left] = ch;
      }
    }
  }
  return board;
}

function attemptPlacement(shapeIndex: number, board: Tiles) {
  const w = width(board);
  const h = height(board);
  const def = shapeDefs[shapeIndex];
  let resultingBoard = board;
  let placed = false;
  let score = w * h;
  let tiles = trimTiles(def.tiles);

  for (let j = 0; j < def.numRotations; ++j) {
    const shapeWidth = width(tiles);
    const shapeHeight = height(tiles);
    for (let x = 0; x <= w - shapeWidth; ++x) {
      let coords = slideDown(x, h - shapeHeight, tiles, board);
      if (!coords) {
        continue;
      }
      coords = slideLeft(coords.x, coords.y, tiles, board);
      if (!coords) {
        continue;
      }
      const newBoard = placeTiles(coords.x, coords.y, tiles, board);
      const newScore = overhang(newBoard);
      if (newScore < score) {
        score = newScore;
        resultingBoard = newBoard;
        placed = true;
      }
    }

    tiles = rotateRight(tiles);
  }
  return placed ? { board: resultingBoard, shapeIndex } : undefined;
}

export function genBoard(w: number, h: number, shapeIndices: number[] = []) {
  let board = mktiles(w, h);
  if (!shapeIndices.length) {
    shapeIndices = new Array(w * (h - 2))
      .fill(0)
      .map(() => randomIndex(shapeDefs));
  }

  const shapes: number[] = [];
  shapeIndices.forEach((i) => {
    const result = attemptPlacement(i, board);
    if (result) {
      board = result.board;
      shapes.push(result.shapeIndex);
    }
  });

  return { board, shapes: shapes.sort() };
}
