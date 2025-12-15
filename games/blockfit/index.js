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

// games/blockfit/index.ts
var boardSizes = {
  easy: () => [4, 6],
  med: () => [6, 7],
  hard: () => [6, 9],
  random: () => {
    const rand = Math.random();
    return rand < 0.33 ? boardSizes.easy() : rand < 0.66 ? boardSizes.med() : boardSizes.hard();
  }
};
var mode = localStorage.getItem("blockfit.mode") || "easy";
function setMode(value) {
  mode = value;
  localStorage.setItem("blockfit.mode", value);
  location.hash = randomGame();
}
var main = document.querySelector("main");
function on(el, type, fn, opts) {
  el.addEventListener(type, fn, opts);
  return () => el.removeEventListener(type, fn, opts);
}

class GameShape extends HTMLElement {
  tiles;
  index;
  #x = 0;
  #y = 0;
  get x() {
    return this.#x;
  }
  set x(val) {
    this.#x = val;
    this.style.setProperty("--x", `${val}`);
  }
  get y() {
    return this.#y;
  }
  set y(val) {
    this.#y = val;
    this.style.setProperty("--y", `${val}`);
  }
  constructor(index) {
    super();
    this.index = index;
    this.className = `block-${index}`;
    this.tiles = shapeDefs[index].tiles;
    this.tiles.forEach((col) => col.forEach((ch) => {
      if (ch !== ".") {
        this.append(document.createElement("game-block"));
      }
    }));
    this.rerrange();
  }
  rerrange() {
    let childIndex = 0;
    for (let y = 0;y < this.tiles.length; ++y) {
      const cols = this.tiles[y];
      for (let x = 0;x < cols.length; ++x) {
        if (cols[x] === ".") {
          continue;
        }
        const el = this.children[childIndex];
        el.style.setProperty("--x", `${x}`);
        el.style.setProperty("--y", `${y}`);
        ++childIndex;
      }
    }
  }
  move(x, y) {
    this.x = x;
    this.y = y;
  }
  rotateRight(clientX, clientY, blockSize) {
    this.tiles = rotateRight(this.tiles);
    this.rerrange();
    const adjustment = Array.from(this.children).map((child) => {
      const bounds = child.getBoundingClientRect();
      return {
        deltaX: bounds.x - clientX,
        deltaY: bounds.y - clientY
      };
    }).reduce((a, b) => Math.max(a.deltaX, a.deltaY) < Math.max(b.deltaX, b.deltaY) ? a : b);
    const x = this.x - Math.ceil(adjustment.deltaX / blockSize);
    const y = this.y - Math.ceil(adjustment.deltaY / blockSize);
    this.move(x, y);
  }
}
customElements.define("game-shape", GameShape);
function getBlockSize() {
  const block = document.createElement("game-block");
  block.style.visibility = "hidden";
  document.body.append(block);
  const blockSize = block.getBoundingClientRect();
  block.remove();
  return blockSize;
}
function resetDrawPilePositions(board, drawPile) {
  const h = height(board);
  const w = width(board);
  const ys = [0, 0];
  let xs = [-4, w + 1];
  drawPile.forEach((shape, i) => {
    const coordIndex = i % ys.length;
    shape.move(xs[coordIndex], ys[coordIndex]);
    ys[coordIndex] += height(shape.tiles) + 1;
    if (ys[coordIndex] > h + 6) {
      ys[coordIndex] = h + 1;
      xs = [0, w - width(shape.tiles)];
    }
  });
  return drawPile;
}
function createDrawPile({ shapes, board }) {
  return resetDrawPilePositions(board, shapes.map((shapeIndex) => {
    const shape = new GameShape(shapeIndex);
    return shape;
  }));
}
function createBoardEl(board) {
  const boardEl = document.createElement("game-board");
  boardEl.style.setProperty("--height", `${board.length}`);
  boardEl.style.setProperty("--width", `${board[0].length}`);
  board.forEach((row, y) => {
    row.forEach((ch, x) => {
      if (ch === ".") {
        return;
      }
      const tile = document.createElement("game-slot");
      tile.style.setProperty("--x", `${x}`);
      tile.style.setProperty("--y", `${y}`);
      boardEl.append(tile);
    });
  });
  return boardEl;
}
function collides2(shape, shapes) {
  const tiles = shape.tiles;
  const w = width(tiles);
  const h = height(tiles);
  const left = shape.x;
  const top = shape.y;
  return shapes.some((shape2) => {
    if (shape2 === shape) {
      return false;
    }
    for (let x = 0;x < w; ++x) {
      for (let y = 0;y < h; ++y) {
        if (tiles[y][x] === ".") {
          continue;
        }
        const targetX = x + left - shape2.x;
        const targetY = y + top - shape2.y;
        const hit = shape2.tiles[targetY]?.[targetX];
        if (hit && hit !== ".") {
          return true;
        }
      }
    }
  });
}
function checkForWin(board, shapes) {
  const tiles = clone(board.tiles);
  return shapes.every((shape) => {
    const h = height(shape.tiles);
    const w = width(shape.tiles);
    for (let y = 0;y < h; ++y) {
      for (let x = 0;x < w; ++x) {
        const ch = shape.tiles[y][x];
        if (ch === ".") {
          continue;
        }
        const boardX = x + shape.x;
        const boardY = y + shape.y;
        const boardChar = tiles[boardY]?.[boardX];
        if (boardChar !== ".") {
          return false;
        }
        tiles[boardY][boardX] = ch;
      }
    }
    return true;
  });
}
function randomGame() {
  const [minBoardSize, maxBoardSize] = boardSizes[mode]();
  const { board, shapes } = genBoard(randomInt(minBoardSize, maxBoardSize), randomInt(minBoardSize, maxBoardSize));
  return `${shapes.join("-")}/${board.map((row) => row.join("")).join("-")}`;
}
function newGame({ board, shapes }) {
  const cleanup = [];
  const boardShape = {
    tiles: board.map((row) => row.map((ch) => ch === "." ? "x" : ".")),
    x: 0,
    y: 0
  };
  const boardEl = createBoardEl(board);
  const blockSize = getBlockSize().width;
  let moveState;
  const drawPile = createDrawPile({ shapes, board });
  const collisionShapes = [boardShape, ...drawPile];
  const deactivate = () => {
    moveState = undefined;
    document.querySelectorAll(".active").forEach((el) => el.classList.remove("active"));
  };
  const checkCollision = (activeShape) => {
    const checkShapeCollides = (shape) => {
      const hasCollision = collides2(shape, collisionShapes);
      shape.classList.toggle("illegal", hasCollision);
    };
    document.querySelectorAll(".illegal").forEach(checkShapeCollides);
    checkShapeCollides(activeShape);
  };
  boardEl.addEventListener("mousedown", (e) => {
    e.preventDefault();
  });
  cleanup.push(on(document, "mouseup", (e) => {
    if (moveState && !moveState.moved) {
      moveState.shape.rotateRight(e.clientX, e.clientY, blockSize);
      checkCollision(moveState.shape);
    }
    deactivate();
    if (checkForWin(boardShape, drawPile)) {
      main.classList.add("win");
    }
  }));
  cleanup.push(on(document, "mousemove", (e) => {
    e.preventDefault();
    if (!moveState) {
      return;
    }
    const boardBounds = boardEl.getBoundingClientRect();
    const x = Math.round((e.clientX + moveState.offsetX - boardBounds.x) / blockSize);
    const y = Math.round((e.clientY + moveState.offsetY - boardBounds.y) / blockSize);
    if (x !== moveState.shape.x || y !== moveState.shape.y) {
      moveState.moved = true;
      moveState.shape.move(x, y);
      checkCollision(moveState.shape);
    }
  }));
  cleanup.push(on(document, "mousedown", (e) => {
    const block = e.target?.closest("game-block");
    const shape = block?.closest("game-shape");
    if (!block || !(shape instanceof GameShape)) {
      return;
    }
    deactivate();
    const bounds = shape.getBoundingClientRect();
    shape.classList.add("active");
    moveState = {
      offsetX: bounds.x - e.clientX,
      offsetY: bounds.y - e.clientY,
      moved: false,
      shape,
      block
    };
  }));
  const header = document.createElement("game-header");
  const btnReset = document.createElement("button");
  btnReset.textContent = "↩ Reset";
  btnReset.addEventListener("click", () => {
    resetDrawPilePositions(board, drawPile);
    main.classList.remove("win");
  });
  const selMode = document.createElement("select");
  selMode.innerHTML = `
    <option value="easy">Easy</option>
    <option value="med">Medium</option>
    <option value="hard">Hard</option>
    <option value="random">Random</option>
  `;
  selMode.addEventListener("change", () => {
    setMode(selMode.value);
  });
  selMode.value = mode;
  const btnNext = document.createElement("a");
  btnNext.classList.add("btn-next");
  btnNext.textContent = "Next ↪";
  btnNext.href = `#${randomGame()}`;
  header.append(btnReset, selMode, btnNext);
  boardEl.append(...drawPile);
  main.classList.remove("win");
  main.replaceChildren(header, boardEl);
  return {
    dispose() {
      cleanup.forEach((f) => f());
    }
  };
}
function init() {
  let game;
  const initFromUrl = () => {
    let hash = location.hash.slice(1) || randomGame();
    if (!location.hash) {
      location.replace("#" + hash);
    }
    const [shapesStr, boardStr] = hash.split("/");
    game?.dispose();
    console.log(boardStr.replaceAll("-", `
`));
    game = newGame({
      shapes: shapesStr.split("-").map((x) => parseInt(x)),
      board: boardStr.split("-").map((row) => row.split(""))
    });
  };
  on(window, "hashchange", initFromUrl);
  initFromUrl();
}
init();
