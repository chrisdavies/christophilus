// games/sokoban/gamepad.ts
function makeGamepad() {
  let destroyed = false;
  const result = {
    onKeydown: undefined,
    destroy() {
      destroyed = true;
    }
  };
  const buttons = {};
  function processButton(gamepad, index, key) {
    if (!result.onKeydown) {
      return;
    }
    const prev = buttons[key];
    const pressed = gamepad.buttons[index].pressed;
    if (!pressed) {
      buttons[key] = undefined;
      return;
    }
    const now = Date.now();
    if (!prev || now - prev.date > (prev?.delay ? 175 : 100)) {
      buttons[key] = { date: now, delay: !prev };
      result.onKeydown(key);
    }
  }
  function tick() {
    const gamepad = navigator.getGamepads().find((x) => x?.connected);
    if (!destroyed) {
      window.requestAnimationFrame(tick);
    }
    if (!gamepad || !result.onKeydown) {
      return;
    }
    processButton(gamepad, 12, "up");
    processButton(gamepad, 13, "down");
    processButton(gamepad, 14, "left");
    processButton(gamepad, 15, "right");
    processButton(gamepad, 0, "bd");
    processButton(gamepad, 2, "bl");
    processButton(gamepad, 1, "br");
    processButton(gamepad, 2, "bl");
  }
  window.requestAnimationFrame(tick);
  return result;
}

// games/sokoban/h.ts
function toNode(node) {
  return typeof node === "string" ? document.createTextNode(node) : node;
}
function h(tagAndClass, attrs, ...children) {
  const [tagName, ...classes] = tagAndClass.split(".");
  const el = document.createElement(tagName || "div");
  el.className = classes.join(" ");
  if (attrs instanceof HTMLElement || typeof attrs === "string") {
    el.append(toNode(attrs));
  } else if (attrs) {
    for (const k in attrs) {
      const v = attrs[k];
      if (typeof v === "function") {
        el[k] = v;
      } else {
        el.setAttribute(k, v);
      }
    }
  }
  for (const child of children) {
    if (child) {
      el.appendChild(toNode(child));
    }
  }
  return el;
}

// games/sokoban/index.ts
var levels = [
  "--.g;--.;--.b-.-.b-.g;.g-.-.b-.p;---.b;---.g",
  ".-.-.;.-.b-.p;.-.b-.b----.g;--.----.g;--.-.-.-.-.g;-.-.-.--.-.;-.-.-.",
  "-.-.;.-.p-.b;-.b-.;-.-.b-.;.g-.b-.-.;.g-.g-.gb-.g",
  "-.p.-.;-.-.b.-.-.;--.--.;.g.--.--.-.;.g.-.b.-.-.--.;.g.-.-.-.-.b.-.",
  "--.-.-.-.;--.b-.b-.b-.;.p-.-.b-.g-.g-.;.-.b-.g-.g-.g;---.",
  "--.-.-.p;.-.-.b-.g-.;.-.-.g-.b-.g-.;--.-.gb-.b-.;--.-.-.",
  "--.g-.g;--.-.g;-.-.-.b-.g;-.-.b-.-.;.-.--.b-.b-.;.-.p-.-.-.-.",
  ".-.--.-.-.;.-.b-.g-.g-.b-.;.p-.b-.g-.gb-.;.-.b-.g-.g-.b-.;.-.--.-.-.",
  ".-.-.-.;.-.b-.b-.b;.-.--.g-.g;-.-.-.g-.g-.b-.;-.-.p-.-.-.-.",
  ".g-.g-.b-.g-.g;.g-.g--.g-.g;.-.b-.b-.b-.;.-.-.b-.-.;.-.b-.b-.b-.;.-.--.p-.",
  "-.-.p-.;-.--.b-.-.;.-.gb-.g-.-.g-.;.-.-.b-.b-.;--.--.g;--.-.-.",
  ".-.-.-.;.-.b-.-.p;-.bg-.-.;.-.gb-.;.-.gb-.;.-.gb-.;.-.g-.",
  "--.-.;--.b-.;.-.-.gb-.-.p;.-.-.gb-.-.;.-.-.gb-.;--.gb-.;--.g",
  ".-.-.;.--.--.-.-.;.-.b-.-.-.-.b-.;.g-.g--.b--.b;.g-.p-.b-.-.-.;.g-.g-.-.",
  "-.-.-.-.;-.g---.b-.;.-.g-.g-.b-.-.;.-.--.b-.-.;.-.-.p-."
];
var root = document.querySelector("main");
var directions = ["left", "down", "right", "up"];
function mkhistory() {
  return {
    moves: [],
    index: -1
  };
}
function pushHistory(hist, move) {
  hist.moves.splice(hist.index + 1, hist.moves.length, move);
  hist.index = hist.moves.length - 1;
}
function undo(hist) {
  const move = hist.moves[hist.index];
  hist.index = Math.max(0, hist.index - 1);
  return move?.undo;
}
function redo(hist) {
  hist.index = Math.min(hist.index + 1, hist.moves.length - 1);
  const move = hist.moves[hist.index];
  return move?.redo;
}

class GameBoard extends HTMLElement {
  onDisconnect;
  constructor() {
    super();
  }
  connectedCallback() {
    const player = this.querySelector(".player");
    let timeout;
    async function blink() {
      await new Promise((r) => setTimeout(r, Math.random() * 3000 + 500));
      player.classList.add("blink");
      await new Promise((r) => setTimeout(r, 100));
      player.classList.remove("blink");
      setTimeout(blink);
    }
    blink();
    const onkeydown = (e) => {
      this.dispatchEvent(new KeyboardEvent("keydown", { key: e.key }));
    };
    document.addEventListener("keydown", onkeydown);
    this.onDisconnect = () => {
      clearTimeout(timeout);
      document.removeEventListener("keydown", onkeydown);
    };
  }
  disconnectedCallback() {
    this.onDisconnect?.();
  }
}
customElements.define("game-board", GameBoard);

class GameTile extends HTMLElement {
  _x = 0;
  _y = 0;
  _direction = "left";
  get x() {
    return this._x;
  }
  set x(val) {
    this._x = val;
    this.style.setProperty("--x", val.toString());
  }
  get y() {
    return this._y;
  }
  set y(val) {
    this._y = val;
    this.style.setProperty("--y", val.toString());
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
    return this.dataset.type || "";
  }
  set type(val) {
    this.dataset.type = val;
  }
  constructor() {
    super();
  }
  getMove() {
    return {
      tile: this,
      x: this.x,
      y: this.y,
      direction: this.direction
    };
  }
}
customElements.define("game-tile", GameTile);
var typeToChar = {
  player: "p",
  barrel: "b",
  goal: "g",
  floor: "."
};
var charToType = Object.keys(typeToChar).reduce((acc, k) => {
  acc[typeToChar[k]] = k;
  return acc;
}, {});
function mktile({ type, x, y }) {
  const tile = h("game-tile", { class: type, "data-type": type });
  tile.x = x;
  tile.y = y;
  return tile;
}
function deserialize(s) {
  const rows = s.split(";");
  const tiles = rows.flatMap((row, y) => {
    return row.split("-").flatMap((chars, x) => {
      return chars.split("").map((ch) => {
        const type = charToType[ch] || "";
        return { type, x, y };
      });
    });
  }).filter((x) => !!x.type).flatMap((x) => {
    if (x.type === "floor") {
      return mktile(x);
    }
    return [mktile(x), mktile({ ...x, type: "floor" })];
  });
  const result = { tiles, width: 0, height: 0 };
  const floorTiles = tiles.filter((tile) => tile.type === "floor");
  const floorByCoord = floorTiles.reduce((acc, tile) => {
    acc[`${tile.x},${tile.y}`] = tile;
    return acc;
  }, {});
  floorTiles.forEach((tile) => {
    const l = floorByCoord[`${tile.x - 1},${tile.y}`];
    const r = floorByCoord[`${tile.x + 1},${tile.y}`];
    const t = floorByCoord[`${tile.x},${tile.y - 1}`];
    const b = floorByCoord[`${tile.x},${tile.y + 1}`];
    if (!t && !r) {
      tile.classList.add("r-tr");
    }
    if (!t && !l) {
      tile.classList.add("r-tl");
    }
    if (!b && !l) {
      tile.classList.add("r-bl");
    }
    if (!b && !r) {
      tile.classList.add("r-br");
    }
  });
  return tiles.reduce((acc, tile) => {
    acc.width = Math.max(acc.width, tile.x);
    acc.height = Math.max(acc.height, tile.y);
    return acc;
  }, result);
}
function serialize(board) {
  const tiles = board.querySelectorAll("game-tile:not(.blank)");
  let rows = [];
  tiles.forEach((tile) => {
    const arr = rows[tile.y] || [];
    rows[tile.y] = arr;
    arr[tile.x] = (arr[tile.x] || "") + typeToChar[tile.type];
  });
  rows = rows.filter((x) => x.length);
  const left = rows.reduce((acc, cols) => {
    const [k] = Object.keys(cols);
    return Math.min(acc, parseInt(k));
  }, 100);
  return rows.map((cols) => cols.slice(left).join("-")).join(";");
}
function initEditor(level) {
  root.innerHTML = "";
  const width = 10;
  const height = 20;
  const attrs = {
    onmousedown(e) {
      document.querySelectorAll(".selected").forEach((x) => x.classList.remove("selected"));
      e.target.classList.add("selected");
    }
  };
  const setHref = (e) => {
    e.target.href = "#play=" + serialize(board);
  };
  const permalink = h("a.next-link", {
    href: "#",
    onmouseover: setHref,
    onfocus: setHref
  }, h("span", "Play It"), h("b", "➜"));
  const editor = h("game-editor", h("game-editor-header", permalink), h("game-editor-workspace", h("game-editor-palette", h("game-tile.player", { ...attrs, "data-type": "player" }), h("game-tile.barrel", { ...attrs, "data-type": "barrel" }), h("game-tile.goal", { ...attrs, "data-type": "goal" }), h("game-tile.floor.selected", { ...attrs, "data-type": "floor" })), h("game-editor-board", {})));
  const board = editor.querySelector("game-editor-board");
  board.style.setProperty("--width", width.toString());
  board.style.setProperty("--height", height.toString());
  const selectedNode = () => {
    return editor.querySelector(".selected");
  };
  const placeTile = (target) => {
    if (!(target instanceof GameTile)) {
      return;
    }
    const selected = selectedNode();
    const existing = Array.from(board.querySelectorAll("game-tile")).find((tile) => {
      return tile.type === selected.type && tile.x === target.x && tile.y === target.y;
    });
    if (existing) {
      existing.remove();
    } else {
      board.append(mktile({
        type: selected.type,
        y: target.y,
        x: target.x
      }));
    }
  };
  const placeTileHandler = (e) => {
    placeTile(e.target);
  };
  for (let y = 0;y < height; ++y) {
    for (let x = 0;x < width; ++x) {
      board.append(mktile({ type: "blank", x, y }));
    }
  }
  board.addEventListener("mousedown", placeTileHandler);
  board.append(...level.tiles);
  root.append(editor);
}
function initGame(level, levelIndex, gamepad) {
  root.innerHTML = "";
  const board = h("game-board");
  board.style.setProperty("--width", level.width.toString());
  board.style.setProperty("--height", level.height.toString());
  board.append(...level.tiles);
  const player = board.querySelector(".player");
  root.append(board);
  const hist = mkhistory();
  function showWinModal() {
    const nextLevel = levelIndex + 1;
    const isEndGame = isNaN(nextLevel) || nextLevel >= levels.length;
    root.append(h("win-modal", h("win-modal-body", h("b.icon.win-icon", "\uD83D\uDC25"), isEndGame && h("p", "You won it all!"), h("a.next-link", { href: isEndGame ? `#edit=` : `#play=${levelIndex + 1}` }, h("span", isEndGame ? "Make Your Own Level" : "Next Level"), h("b", "➜")))));
    root.querySelector(".next-link")?.focus();
  }
  function checkIfWon() {
    const tileCoords = (tile) => `${tile.x},${tile.y}`;
    const barrels = new Set(level.tiles.filter((tile) => tile.type === "barrel").map(tileCoords));
    const goals = level.tiles.filter((tile) => tile.type === "goal");
    if (goals.every((tile) => barrels.has(tileCoords(tile)))) {
      showWinModal();
    }
  }
  function computeMove(item, direction) {
    const x = direction === "left" ? -1 : direction === "right" ? 1 : 0;
    const y = direction === "up" ? -1 : direction === "down" ? 1 : 0;
    const nextX = parseInt(item.style.getPropertyValue("--x")) + x;
    const nextY = parseInt(item.style.getPropertyValue("--y")) + y;
    const floor = level.tiles.find((tile) => {
      return tile.type === "floor" && tile.x === nextX && tile.y === nextY;
    });
    item.direction = direction;
    if (!floor) {
      return;
    }
    const barrel = level.tiles.find((tile) => {
      return tile.type === "barrel" && tile.x === nextX && tile.y === nextY;
    });
    if (barrel && item.type !== "player") {
      return;
    }
    const barrelMove = barrel && computeMove(barrel, direction);
    if (barrel && !barrelMove) {
      return;
    }
    if (item.type === "player") {
      checkIfWon();
    }
    return {
      direction,
      x: nextX,
      y: nextY,
      tile: item,
      next: barrelMove
    };
  }
  function applyMove(move) {
    while (move) {
      move.tile.direction = move.direction;
      move.tile.x = move.x;
      move.tile.y = move.y;
      move = move.next;
    }
  }
  function newMove(direction) {
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
      redo: move
    });
    checkIfWon();
  }
  gamepad.onKeydown = (key) => {
    switch (key) {
      case "up":
      case "down":
      case "left":
      case "right":
        return newMove(key);
      case "bl":
        return applyMove(undo(hist));
      case "bd":
        return applyMove(redo(hist));
      case "br":
        document.querySelector(".next-link")?.click();
    }
  };
  board.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowUp":
      case "k":
        return newMove("up");
      case "ArrowDown":
      case "j":
        return newMove("down");
      case "ArrowLeft":
      case "h":
        return newMove("left");
      case "ArrowRight":
      case "l":
        return newMove("right");
      case "u":
      case "z":
        return applyMove(undo(hist));
      case "r":
        return applyMove(redo(hist));
    }
  });
}
(function init() {
  const gamepad = makeGamepad();
  const loadFromHash = () => {
    const hash = location.hash.slice(1);
    const [mode = "play", serializedMap = "0"] = hash.split("=");
    const levelIndex = parseInt(serializedMap, 10);
    const levelMap = isNaN(levelIndex) ? serializedMap : levels[levelIndex];
    const map = deserialize(levelMap || "");
    if (mode === "edit") {
      initEditor(map);
    } else {
      initGame(map, levelIndex, gamepad);
    }
  };
  loadFromHash();
  window.addEventListener("hashchange", loadFromHash);
})();
