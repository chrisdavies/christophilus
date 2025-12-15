import {
  shapeDefs,
  ShapeDef,
  rotateRight,
  genBoard,
  clone,
  randomInt,
  Tiles,
  width as shapeWidth,
  height as shapeHeight,
} from './blockfit';

type Dimension = [number, number];
type Mode = 'easy' | 'med' | 'hard' | 'random';
const boardSizes: Record<Mode, () => Dimension> = {
  easy: () => [4, 6],
  med: () => [6, 7],
  hard: () => [6, 9],
  random: () => {
    const rand = Math.random();
    return rand < 0.33 ? boardSizes.easy() : rand < 0.66 ? boardSizes.med() : boardSizes.hard();
  },
};

let mode: Mode = (localStorage.getItem('blockfit.mode') || 'easy') as Mode;

function setMode(value: Mode) {
  mode = value;
  localStorage.setItem('blockfit.mode', value);
  location.hash = randomGame();
}

const main = document.querySelector('main')!;

function on<
  K extends keyof WindowEventMap,
  T extends Pick<typeof window, 'addEventListener' | 'removeEventListener'>,
>(
  window: T,
  type: K,
  fn: (this: T, ev: WindowEventMap[K]) => any,
  opts?: boolean | AddEventListenerOptions,
): () => unknown;
function on<
  K extends keyof HTMLElementEventMap,
  T extends Pick<Element, 'addEventListener' | 'removeEventListener'>,
>(
  el: T,
  type: K,
  fn: (this: T, ev: HTMLElementEventMap[K]) => any,
  opts?: boolean | AddEventListenerOptions,
): () => unknown {
  el.addEventListener(type, fn as any, opts);
  return () => el.removeEventListener(type, fn as any, opts);
}

class GameShape extends HTMLElement {
  tiles: ShapeDef['tiles'];
  index: number;
  #x = 0;
  #y = 0;
  get x() {
    return this.#x;
  }
  set x(val) {
    this.#x = val;
    this.style.setProperty('--x', `${val}`);
  }
  get y() {
    return this.#y;
  }
  set y(val) {
    this.#y = val;
    this.style.setProperty('--y', `${val}`);
  }

  constructor(index: number) {
    super();
    this.index = index;
    this.className = `block-${index}`;
    this.tiles = shapeDefs[index].tiles;
    this.tiles.forEach((col) =>
      col.forEach((ch) => {
        if (ch !== '.') {
          this.append(document.createElement('game-block'));
        }
      }),
    );
    this.rerrange();
  }

  rerrange() {
    let childIndex = 0;
    for (let y = 0; y < this.tiles.length; ++y) {
      const cols = this.tiles[y];
      for (let x = 0; x < cols.length; ++x) {
        if (cols[x] === '.') {
          continue;
        }
        const el = this.children[childIndex] as HTMLElement;
        el.style.setProperty('--x', `${x}`);
        el.style.setProperty('--y', `${y}`);
        ++childIndex;
      }
    }
  }

  move(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  rotateRight(clientX: number, clientY: number, blockSize: number) {
    this.tiles = rotateRight(this.tiles);
    this.rerrange();

    // Ensure the mouse is still over a tile
    const adjustment = Array.from(this.children)
      .map((child) => {
        const bounds = child.getBoundingClientRect();
        return {
          deltaX: bounds.x - clientX,
          deltaY: bounds.y - clientY,
        };
      })
      .reduce((a, b) => (Math.max(a.deltaX, a.deltaY) < Math.max(b.deltaX, b.deltaY) ? a : b));

    const x = this.x - Math.ceil(adjustment.deltaX / blockSize);
    const y = this.y - Math.ceil(adjustment.deltaY / blockSize);

    this.move(x, y);
  }
}

customElements.define('game-shape', GameShape);

function getBlockSize() {
  const block = document.createElement('game-block');
  block.style.visibility = 'hidden';
  document.body.append(block);
  const blockSize = block.getBoundingClientRect();
  block.remove();
  return blockSize;
}

function resetDrawPilePositions(board: Tiles, drawPile: GameShape[]) {
  const h = shapeHeight(board);
  const w = shapeWidth(board);
  const ys = [0, 0];
  let xs = [-4, w + 1];
  drawPile.forEach((shape, i) => {
    const coordIndex = i % ys.length;
    shape.move(xs[coordIndex], ys[coordIndex]);
    ys[coordIndex] += shapeHeight(shape.tiles) + 1;
    if (ys[coordIndex] > h + 6) {
      ys[coordIndex] = h + 1;
      xs = [0, w - shapeWidth(shape.tiles)];
    }
  });
  return drawPile;
}

function createDrawPile({ shapes, board }: { shapes: number[]; board: Tiles }) {
  return resetDrawPilePositions(
    board,
    shapes.map((shapeIndex) => {
      const shape = new GameShape(shapeIndex);
      return shape;
    }),
  );
}

interface MoveState {
  offsetX: number;
  offsetY: number;
  moved: boolean;
  shape: GameShape;
  block: HTMLElement;
}

function createBoardEl(board: Tiles) {
  const boardEl = document.createElement('game-board');
  boardEl.style.setProperty('--height', `${board.length}`);
  boardEl.style.setProperty('--width', `${board[0].length}`);
  board.forEach((row, y) => {
    row.forEach((ch, x) => {
      if (ch === '.') {
        return;
      }
      const tile = document.createElement('game-slot');
      tile.style.setProperty('--x', `${x}`);
      tile.style.setProperty('--y', `${y}`);
      boardEl.append(tile);
    });
  });

  return boardEl;
}

interface BaseShape {
  x: number;
  y: number;
  tiles: Tiles;
}

function collides(shape: BaseShape, shapes: BaseShape[]) {
  const tiles = shape.tiles;
  const w = shapeWidth(tiles);
  const h = shapeHeight(tiles);
  const left = shape.x;
  const top = shape.y;
  return shapes.some((shape2) => {
    if (shape2 === shape) {
      return false;
    }
    for (let x = 0; x < w; ++x) {
      for (let y = 0; y < h; ++y) {
        if (tiles[y][x] === '.') {
          continue;
        }
        const targetX = x + left - shape2.x;
        const targetY = y + top - shape2.y;
        const hit = shape2.tiles[targetY]?.[targetX];
        if (hit && hit !== '.') {
          return true;
        }
      }
    }
  });
}

function checkForWin(board: BaseShape, shapes: BaseShape[]) {
  const tiles = clone(board.tiles);
  return shapes.every((shape) => {
    const h = shapeHeight(shape.tiles);
    const w = shapeWidth(shape.tiles);

    for (let y = 0; y < h; ++y) {
      for (let x = 0; x < w; ++x) {
        const ch = shape.tiles[y][x];
        if (ch === '.') {
          continue;
        }
        const boardX = x + shape.x;
        const boardY = y + shape.y;
        const boardChar = tiles[boardY]?.[boardX];

        if (boardChar !== '.') {
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
  const { board, shapes } = genBoard(
    randomInt(minBoardSize, maxBoardSize),
    randomInt(minBoardSize, maxBoardSize),
  );
  return `${shapes.join('-')}/${board.map((row) => row.join('')).join('-')}`;
}

function newGame({ board, shapes }: { board: Tiles; shapes: number[] }) {
  const cleanup: Array<() => void> = [];
  const boardShape = {
    // We invert the board, because in the case of the generated board, a .
    // means a place a tile was not placed during generation, so it is an
    // illegal space.
    tiles: board.map((row) => row.map((ch) => (ch === '.' ? 'x' : '.'))),
    x: 0,
    y: 0,
  };
  const boardEl = createBoardEl(board);
  const blockSize = getBlockSize().width;
  let moveState: MoveState | undefined;
  const drawPile = createDrawPile({ shapes, board });
  const collisionShapes = [boardShape, ...drawPile];

  const deactivate = () => {
    moveState = undefined;
    document.querySelectorAll('.active').forEach((el) => el.classList.remove('active'));
  };

  const checkCollision = (activeShape: GameShape) => {
    const checkShapeCollides = (shape: GameShape) => {
      const hasCollision = collides(shape, collisionShapes);
      shape.classList.toggle('illegal', hasCollision);
    };

    document.querySelectorAll<GameShape>('.illegal').forEach(checkShapeCollides);
    checkShapeCollides(activeShape);
  };

  // Prevent the board from drag / dropping.
  boardEl.addEventListener('mousedown', (e) => {
    e.preventDefault();
  });

  cleanup.push(
    on(document, 'mouseup', (e) => {
      if (moveState && !moveState.moved) {
        moveState.shape.rotateRight(e.clientX, e.clientY, blockSize);
        checkCollision(moveState.shape);
      }
      deactivate();
      if (checkForWin(boardShape, drawPile)) {
        main.classList.add('win');
      }
    }),
  );

  cleanup.push(
    on(document, 'mousemove', (e) => {
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
    }),
  );

  cleanup.push(
    on(document, 'mousedown', (e) => {
      const block = (e.target as HTMLElement)?.closest<HTMLElement>('game-block');
      const shape = block?.closest('game-shape');
      if (!block || !(shape instanceof GameShape)) {
        return;
      }

      deactivate();
      const bounds = shape.getBoundingClientRect();
      shape.classList.add('active');

      moveState = {
        offsetX: bounds.x - e.clientX,
        offsetY: bounds.y - e.clientY,
        moved: false,
        shape,
        block,
      };
    }),
  );

  const header = document.createElement('game-header');
  const btnReset = document.createElement('button');
  btnReset.textContent = '↩ Reset';
  btnReset.addEventListener('click', () => {
    resetDrawPilePositions(board, drawPile);
    main.classList.remove('win');
  });

  const selMode = document.createElement('select');
  selMode.innerHTML = `
    <option value="easy">Easy</option>
    <option value="med">Medium</option>
    <option value="hard">Hard</option>
    <option value="random">Random</option>
  `;
  selMode.addEventListener('change', () => {
    setMode(selMode.value as Mode);
  });
  selMode.value = mode;

  const btnNext = document.createElement('a');
  btnNext.classList.add('btn-next');
  btnNext.textContent = 'Next ↪';
  btnNext.href = `#${randomGame()}`;

  header.append(btnReset, selMode, btnNext);

  boardEl.append(...drawPile);

  main.classList.remove('win');
  main.replaceChildren(header, boardEl);

  return {
    dispose() {
      cleanup.forEach((f) => f());
    },
  };
}

function init() {
  let game: undefined | { dispose(): void };
  const initFromUrl = () => {
    let hash = location.hash.slice(1) || randomGame();
    if (!location.hash) {
      location.replace('#' + hash);
    }
    const [shapesStr, boardStr] = hash.split('/');
    game?.dispose();

    console.log(boardStr.replaceAll('-', '\n'));

    game = newGame({
      shapes: shapesStr.split('-').map((x) => parseInt(x)),
      board: boardStr.split('-').map((row) => row.split('')),
    });
  };

  on(window, 'hashchange', initFromUrl);
  initFromUrl();
}

init();
