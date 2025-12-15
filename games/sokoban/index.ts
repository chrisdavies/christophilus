import { makeGamepad } from './gamepad';
import { h } from './h';

type Direction = 'up' | 'down' | 'left' | 'right';

interface Move {
  tile: GameTile;
  direction: Direction;
  x: number;
  y: number;
  next?: Move;
}

interface Level {
  width: number;
  height: number;
  tiles: GameTile[];
}

interface HistoricalMove {
  redo: Move;
  undo: Move;
}

interface History {
  moves: HistoricalMove[];
  index: number;
}

const levels = [
  '--.g;--.;--.b-.-.b-.g;.g-.-.b-.p;---.b;---.g',
  '.-.-.;.-.b-.p;.-.b-.b----.g;--.----.g;--.-.-.-.-.g;-.-.-.--.-.;-.-.-.',
  '-.-.;.-.p-.b;-.b-.;-.-.b-.;.g-.b-.-.;.g-.g-.gb-.g',
  '-.p.-.;-.-.b.-.-.;--.--.;.g.--.--.-.;.g.-.b.-.-.--.;.g.-.-.-.-.b.-.',
  '--.-.-.-.;--.b-.b-.b-.;.p-.-.b-.g-.g-.;.-.b-.g-.g-.g;---.',
  '--.-.-.p;.-.-.b-.g-.;.-.-.g-.b-.g-.;--.-.gb-.b-.;--.-.-.',
  '--.g-.g;--.-.g;-.-.-.b-.g;-.-.b-.-.;.-.--.b-.b-.;.-.p-.-.-.-.',
  '.-.--.-.-.;.-.b-.g-.g-.b-.;.p-.b-.g-.gb-.;.-.b-.g-.g-.b-.;.-.--.-.-.',
  '.-.-.-.;.-.b-.b-.b;.-.--.g-.g;-.-.-.g-.g-.b-.;-.-.p-.-.-.-.',
  '.g-.g-.b-.g-.g;.g-.g--.g-.g;.-.b-.b-.b-.;.-.-.b-.-.;.-.b-.b-.b-.;.-.--.p-.',
  '-.-.p-.;-.--.b-.-.;.-.gb-.g-.-.g-.;.-.-.b-.b-.;--.--.g;--.-.-.',
  '.-.-.-.;.-.b-.-.p;-.bg-.-.;.-.gb-.;.-.gb-.;.-.gb-.;.-.g-.',
  '--.-.;--.b-.;.-.-.gb-.-.p;.-.-.gb-.-.;.-.-.gb-.;--.gb-.;--.g',
  '.-.-.;.--.--.-.-.;.-.b-.-.-.-.b-.;.g-.g--.b--.b;.g-.p-.b-.-.-.;.g-.g-.-.',
  '-.-.-.-.;-.g---.b-.;.-.g-.g-.b-.-.;.-.--.b-.-.;.-.-.p-.',
];

const root = document.querySelector('main')!;
const directions = ['left', 'down', 'right', 'up'];

function mkhistory(): History {
  return {
    moves: [],
    index: -1,
  };
}

function pushHistory(hist: History, move: HistoricalMove) {
  hist.moves.splice(hist.index + 1, hist.moves.length, move);
  hist.index = hist.moves.length - 1;
}

function undo(hist: History) {
  const move = hist.moves[hist.index];
  hist.index = Math.max(0, hist.index - 1);
  return move?.undo;
}

function redo(hist: History) {
  hist.index = Math.min(hist.index + 1, hist.moves.length - 1);
  const move = hist.moves[hist.index];
  return move?.redo;
}

/**
 * Each level gets an instance of this. We use custom elements so we get
 * automatic cleanup when the board is removed from the DOM.
 */
class GameBoard extends HTMLElement {
  onDisconnect?: () => void;

  constructor() {
    super();
  }

  connectedCallback() {
    const player = this.querySelector('.player') as GameTile;
    let timeout: any;

    // Attach the random blink behavior to the player tile.
    async function blink() {
      await new Promise((r) => setTimeout(r, Math.random() * 3000 + 500));
      player.classList.add('blink');
      await new Promise((r) => setTimeout(r, 100));
      player.classList.remove('blink');
      setTimeout(blink);
    }
    blink();

    // Handle keydown globally, but dispatch locally, and clean up on
    // detach from the DOM.
    const onkeydown = (e: KeyboardEvent) => {
      this.dispatchEvent(new KeyboardEvent('keydown', { key: e.key }));
    };
    document.addEventListener('keydown', onkeydown);

    this.onDisconnect = () => {
      clearTimeout(timeout);
      document.removeEventListener('keydown', onkeydown);
    };
  }

  disconnectedCallback() {
    this.onDisconnect?.();
  }
}

customElements.define('game-board', GameBoard);

class GameTile extends HTMLElement {
  _x = 0;
  _y = 0;
  _direction: Direction = 'left';

  get x() {
    return this._x;
  }
  set x(val) {
    this._x = val;
    this.style.setProperty('--x', val.toString());
  }

  get y() {
    return this._y;
  }
  set y(val) {
    this._y = val;
    this.style.setProperty('--y', val.toString());
  }

  get direction() {
    return this._direction;
  }
  set direction(val) {
    this._direction = val;
    this.classList.remove(...directions);
    this.classList.add(val);
  }

  get type() {
    return this.dataset.type || '';
  }
  set type(val: string) {
    this.dataset.type = val;
  }

  constructor() {
    super();
  }

  getMove(): Move {
    return {
      tile: this,
      x: this.x,
      y: this.y,
      direction: this.direction,
    };
  }
}

customElements.define('game-tile', GameTile);

/**
 * Map tile type to a single character for serialization purposes.
 */
const typeToChar: Record<string, string> = {
  player: 'p',
  barrel: 'b',
  goal: 'g',
  floor: '.',
};

/**
 * Map a single character to tile type for deserialization purposes.
 */
const charToType = Object.keys(typeToChar).reduce(
  (acc, k) => {
    acc[typeToChar[k]] = k;
    return acc;
  },
  {} as Record<string, string>,
);

/**
 * Make and position tile element.
 */
function mktile({ type, x, y }: { type: string; x: number; y: number }) {
  const tile = h('game-tile', { class: type, 'data-type': type }) as GameTile;
  tile.x = x;
  tile.y = y;
  return tile;
}

/**
 * Convert a serialized level into an array of HTMLElements.
 */
function deserialize(s: string): Level {
  const rows = s.split(';');
  const tiles = rows
    .flatMap((row, y) => {
      return row.split('-').flatMap((chars, x) => {
        return chars.split('').map((ch) => {
          const type = charToType[ch] || '';
          return { type, x, y };
        });
      });
    })
    .filter((x) => !!x.type)
    .flatMap((x) => {
      if (x.type === 'floor') {
        return mktile(x);
      }
      return [mktile(x), mktile({ ...x, type: 'floor' })];
    });

  const result: Level = { tiles, width: 0, height: 0 };

  // Add rounding to edge floor tiles
  const floorTiles = tiles.filter((tile) => tile.type === 'floor');
  const floorByCoord = floorTiles.reduce<Record<string, GameTile>>((acc, tile) => {
    acc[`${tile.x},${tile.y}`] = tile;
    return acc;
  }, {});
  floorTiles.forEach((tile) => {
    const l = floorByCoord[`${tile.x - 1},${tile.y}`];
    const r = floorByCoord[`${tile.x + 1},${tile.y}`];
    const t = floorByCoord[`${tile.x},${tile.y - 1}`];
    const b = floorByCoord[`${tile.x},${tile.y + 1}`];
    if (!t && !r) {
      tile.classList.add('r-tr');
    }
    if (!t && !l) {
      tile.classList.add('r-tl');
    }
    if (!b && !l) {
      tile.classList.add('r-bl');
    }
    if (!b && !r) {
      tile.classList.add('r-br');
    }
  });

  return tiles.reduce((acc, tile) => {
    acc.width = Math.max(acc.width, tile.x);
    acc.height = Math.max(acc.height, tile.y);
    return acc;
  }, result);
}

/**
 * Serialize a board to string. The format is like so:
 *
 * * asterisk indicates an empty space
 * . indicates a floor tile
 * p indicates the player
 * b indicates a barrel
 * g indicates a goal
 *
 * ; Is the row delimiter
 * - Is the col delimiter a cell can have multiple tiles (e.g. a floor and
 *   a goal and a barrel).
 */
function serialize(board: HTMLElement) {
  const tiles = board.querySelectorAll<GameTile>('game-tile:not(.blank)');
  let rows: Array<string[]> = [];
  tiles.forEach((tile) => {
    const arr = rows[tile.y] || [];
    rows[tile.y] = arr;
    arr[tile.x] = (arr[tile.x] || '') + typeToChar[tile.type];
  });

  rows = rows.filter((x) => x.length);

  // Get the smallest index into any of the collumn arrays. This is
  // the leftmost column in the level. We'll ignore any array positions
  // left of this.
  const left = rows.reduce((acc, cols) => {
    const [k] = Object.keys(cols);
    return Math.min(acc, parseInt(k));
  }, 100);

  return rows.map((cols) => cols.slice(left).join('-')).join(';');
}

function initEditor(level: Level) {
  root.innerHTML = '';
  const width = 10;
  const height = 20;
  const attrs = {
    onmousedown(e: any) {
      document.querySelectorAll('.selected').forEach((x) => x.classList.remove('selected'));
      e.target.classList.add('selected');
    },
  };
  const setHref = (e: any) => {
    e.target.href = '#play=' + serialize(board);
  };
  const permalink = h(
    'a.next-link',
    {
      href: '#',
      onmouseover: setHref,
      onfocus: setHref,
    },
    h('span', 'Play It'),
    h('b', '➜'),
  );

  const editor = h(
    'game-editor',
    h('game-editor-header', permalink),
    h(
      'game-editor-workspace',
      h(
        'game-editor-palette',
        h('game-tile.player', { ...attrs, 'data-type': 'player' }),
        h('game-tile.barrel', { ...attrs, 'data-type': 'barrel' }),
        h('game-tile.goal', { ...attrs, 'data-type': 'goal' }),
        h('game-tile.floor.selected', { ...attrs, 'data-type': 'floor' }),
      ),
      h('game-editor-board', {}),
    ),
  );

  const board = editor.querySelector<HTMLElement>('game-editor-board')!;

  board.style.setProperty('--width', width.toString());
  board.style.setProperty('--height', height.toString());

  const selectedNode = () => {
    return editor.querySelector('.selected')! as GameTile;
  };

  const placeTile = (target: GameTile) => {
    if (!(target instanceof GameTile)) {
      return;
    }
    const selected = selectedNode();
    const existing = Array.from(board.querySelectorAll<GameTile>('game-tile')).find((tile) => {
      return tile.type === selected.type && tile.x === target.x && tile.y === target.y;
    });

    if (existing) {
      existing.remove();
    } else {
      board.append(
        mktile({
          type: selected.type,
          y: target.y,
          x: target.x,
        }),
      );
    }
  };

  const placeTileHandler = (e: any) => {
    placeTile(e.target);
  };

  for (let y = 0; y < height; ++y) {
    for (let x = 0; x < width; ++x) {
      board.append(mktile({ type: 'blank', x, y }));
    }
  }

  board.addEventListener('mousedown', placeTileHandler);

  board.append(...level.tiles);
  root.append(editor);
}

function initGame(
  level: ReturnType<typeof deserialize>,
  levelIndex: number,
  gamepad: ReturnType<typeof makeGamepad>,
) {
  root.innerHTML = '';
  const board = h('game-board') as GameBoard;

  board.style.setProperty('--width', level.width.toString());
  board.style.setProperty('--height', level.height.toString());

  board.append(...level.tiles);

  const player = board.querySelector<GameTile>('.player')!;
  root.append(board);

  const hist = mkhistory();

  function showWinModal() {
    const nextLevel = levelIndex + 1;
    const isEndGame = isNaN(nextLevel) || nextLevel >= levels.length;
    root.append(
      h(
        'win-modal',
        h(
          'win-modal-body',
          h('b.icon.win-icon', '🐥'),
          isEndGame && h('p', 'You won it all!'),
          h(
            'a.next-link',
            { href: isEndGame ? `#edit=` : `#play=${levelIndex + 1}` },
            h('span', isEndGame ? 'Make Your Own Level' : 'Next Level'),
            h('b', '➜'),
          ),
        ),
      ),
    );
    root.querySelector<HTMLAnchorElement>('.next-link')?.focus();
  }

  function checkIfWon() {
    const tileCoords = (tile: GameTile) => `${tile.x},${tile.y}`;
    const barrels = new Set(level.tiles.filter((tile) => tile.type === 'barrel').map(tileCoords));
    const goals = level.tiles.filter((tile) => tile.type === 'goal');
    if (goals.every((tile) => barrels.has(tileCoords(tile)))) {
      showWinModal();
    }
  }

  function computeMove(item: GameTile, direction: Direction): undefined | Move {
    const x = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
    const y = direction === 'up' ? -1 : direction === 'down' ? 1 : 0;
    const nextX = parseInt(item.style.getPropertyValue('--x')) + x;
    const nextY = parseInt(item.style.getPropertyValue('--y')) + y;
    const floor = level.tiles.find((tile) => {
      return tile.type === 'floor' && tile.x === nextX && tile.y === nextY;
    });

    item.direction = direction;

    if (!floor) {
      return;
    }

    const barrel = level.tiles.find((tile) => {
      return tile.type === 'barrel' && tile.x === nextX && tile.y === nextY;
    });

    if (barrel && item.type !== 'player') {
      return;
    }

    const barrelMove = barrel && computeMove(barrel, direction);
    if (barrel && !barrelMove) {
      return;
    }

    if (item.type === 'player') {
      checkIfWon();
    }

    return {
      direction,
      x: nextX,
      y: nextY,
      tile: item,
      next: barrelMove,
    };
  }

  function applyMove(move?: Move) {
    while (move) {
      move.tile.direction = move.direction;
      move.tile.x = move.x;
      move.tile.y = move.y;
      move = move.next;
    }
  }

  function newMove(direction: Direction) {
    const undoMove = player.getMove();
    const move = computeMove(player, direction);
    if (!move) {
      return;
    }
    if (move.next) {
      undoMove.next = move.next.tile.getMove();
    }
    applyMove(move);
    pushHistory(hist, {
      undo: undoMove,
      redo: move,
    });
    checkIfWon();
  }

  gamepad.onKeydown = (key) => {
    switch (key) {
      case 'up':
      case 'down':
      case 'left':
      case 'right':
        return newMove(key);
      case 'bl':
        return applyMove(undo(hist));
      case 'bd':
        return applyMove(redo(hist));
      case 'br':
        document.querySelector<HTMLAnchorElement>('.next-link')?.click();
    }
  };

  board.addEventListener('keydown', (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
      case 'k':
        return newMove('up');
      case 'ArrowDown':
      case 'j':
        return newMove('down');
      case 'ArrowLeft':
      case 'h':
        return newMove('left');
      case 'ArrowRight':
      case 'l':
        return newMove('right');
      case 'u':
      case 'z':
        return applyMove(undo(hist));
      case 'r':
        return applyMove(redo(hist));
    }
  });
}

/**
 * Initialize the game from the URL's hash.
 */
(function init() {
  const gamepad = makeGamepad();
  const loadFromHash = () => {
    const hash = location.hash.slice(1);
    const [mode = 'play', serializedMap = '0'] = hash.split('=');
    const levelIndex = parseInt(serializedMap, 10);
    const levelMap = isNaN(levelIndex) ? serializedMap : levels[levelIndex];
    const map = deserialize(levelMap || '');
    if (mode === 'edit') {
      initEditor(map);
    } else {
      initGame(map, levelIndex, gamepad);
    }
  };
  loadFromHash();
  window.addEventListener('hashchange', loadFromHash);
})();
