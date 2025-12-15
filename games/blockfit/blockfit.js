// games/blockfit/blockfit.ts
var shapeDefs = [
  {
    numRotations: 1,
    tiles: [
      ["a", "a"],
      ["a", "a"]
    ]
  },
  {
    numRotations: 2,
    tiles: [
      [".", "b", "."],
      [".", "b", "."],
      [".", "b", "."],
      [".", "b", "."]
    ]
  },
  {
    numRotations: 3,
    tiles: [
      ["c", "."],
      ["c", "c"],
      [".", "c"]
    ]
  },
  {
    numRotations: 3,
    tiles: [
      [".", "d"],
      ["d", "d"],
      ["d", "."]
    ]
  },
  {
    numRotations: 4,
    tiles: [
      ["e", "e", "."],
      [".", "e", "."],
      [".", "e", "."]
    ]
  },
  {
    numRotations: 4,
    tiles: [
      [".", "f", "f"],
      [".", "f", "."],
      [".", "f", "."]
    ]
  },
  {
    numRotations: 4,
    tiles: [
      [".", "g", "."],
      [".", "g", "g"],
      [".", "g", "."]
    ]
  }
];
var width = (tiles) => tiles[0].length;
var height = (tiles) => tiles.length;
var clone = (tiles) => tiles.map((a) => a.map((b) => b));
var mktiles = (w, h) => new Array(h).fill(null).map(() => new Array(w).fill("."));
var randomInt = (min, max) => Math.floor(Math.random() * (max - min)) + min;
var randomIndex = (arr) => randomInt(0, arr.length);
var trimTiles = (tiles) => {
  tiles = clone(tiles);
  while (tiles.every((row) => row[0] === ".")) {
    tiles = tiles.map((row) => row.slice(1));
  }
  while (tiles.every((row) => row[row.length - 1] === ".")) {
    tiles = tiles.map((row) => row.slice(0, -1));
  }
  return tiles;
};
function rotateRight(tiles) {
  const w = width(tiles);
  const h = height(tiles);
  const result = mktiles(h, w);
  for (let y = 0;y < h; ++y) {
    for (let x = 0;x < w; ++x) {
      result[x][y] = tiles[h - y - 1][x];
    }
  }
  return result;
}
function overhang(tiles) {
  const w = width(tiles);
  const h = height(tiles);
  let count = 0;
  for (let x = 0;x < w; ++x) {
    let isOverhang = false;
    for (let y = h - 1;y >= 0; --y) {
      const ch = tiles[y][x];
      if (isOverhang && ch === ".") {
        ++count;
      } else if (ch !== ".") {
        isOverhang = true;
      }
    }
  }
  return count;
}
function collides(left, top, shape, board) {
  const w = width(shape);
  const h = height(shape);
  for (let x = 0;x < w; ++x) {
    for (let y = 0;y < h; ++y) {
      if (shape[y][x] === ".") {
        continue;
      }
      if (board[y + top]?.[x + left] !== ".") {
        return true;
      }
    }
  }
  return false;
}
function slideLeft(left, top, shape, board) {
  if (collides(left, top, shape, board)) {
    return;
  }
  for (let x = left - 1;x >= 0; --x) {
    if (collides(x, top, shape, board)) {
      break;
    }
    left = x;
  }
  return { x: left, y: top };
}
function slideDown(left, top, tiles, board) {
  if (collides(left, top, tiles, board)) {
    return;
  }
  for (let y = top - 1;y >= 0; --y) {
    if (collides(left, y, tiles, board)) {
      break;
    }
    top = y;
  }
  return { x: left, y: top };
}
function placeTiles(left, top, tiles, oldBoard) {
  const board = clone(oldBoard);
  for (let x = 0;x < width(tiles); ++x) {
    for (let y = 0;y < height(tiles); ++y) {
      const ch = tiles[y][x];
      if (ch !== ".") {
        board[y + top][x + left] = ch;
      }
    }
  }
  return board;
}
function attemptPlacement(shapeIndex, board) {
  const w = width(board);
  const h = height(board);
  const def = shapeDefs[shapeIndex];
  let resultingBoard = board;
  let placed = false;
  let score = w * h;
  let tiles = trimTiles(def.tiles);
  for (let j = 0;j < def.numRotations; ++j) {
    const shapeWidth = width(tiles);
    const shapeHeight = height(tiles);
    for (let x = 0;x <= w - shapeWidth; ++x) {
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
function genBoard(w, h, shapeIndices = []) {
  let board = mktiles(w, h);
  if (!shapeIndices.length) {
    shapeIndices = new Array(w * (h - 2)).fill(0).map(() => randomIndex(shapeDefs));
  }
  const shapes = [];
  shapeIndices.forEach((i) => {
    const result = attemptPlacement(i, board);
    if (result) {
      board = result.board;
      shapes.push(result.shapeIndex);
    }
  });
  return { board, shapes: shapes.sort() };
}
export {
  width,
  shapeDefs,
  rotateRight,
  randomInt,
  height,
  genBoard,
  clone
};
