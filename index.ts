init();

function randint(max: number) {
  return Math.floor(Math.random() * max);
}

function genMoves(boardSize: number) {
  const tiles = new Array(boardSize * boardSize).fill(0).map((_, i) => i);
  return new Array(2 + randint(3))
    .fill(0)
    .map(() => tiles.splice(randint(tiles.length), 1)[0]!);
}

function makeBoard(boardSize: number) {
  const board = document.createElement("game-board");
  board.style.setProperty("--grid-size", `${boardSize}`);
  for (let r = 0; r < boardSize; ++r) {
    const row = document.createElement("game-row");
    board.append(row);
    for (let c = 0; c < boardSize; ++c) {
      const tile = document.createElement("game-tile");
      row.append(tile);
    }
  }
  return board;
}

function flip(cell: Element) {
  const row = cell.parentElement!;
  const index = Array.from(row.children).indexOf(cell);
  const flipX = (row: null | Element, index: number) => {
    if (!row) return;
    row.children[index]?.classList.toggle("flipped");
    row.children[index + 1]?.classList.toggle("flipped");
    row.children[index - 1]?.classList.toggle("flipped");
  };

  flipX(row, index);
  flipX(row.previousElementSibling, index);
  flipX(row.nextElementSibling, index);
}

function boardState(board: HTMLElement) {
  return Array.from(board.querySelectorAll("game-tile"))
    .map((x) => (x as HTMLElement).classList.contains("flipped"))
    .join("");
}

function makeGame(opts: { boardSize: number; moves: number[] }) {
  console.clear();
  console.log(`The cheat code is:`, opts.moves.toString());

  const main = document.querySelector("main")!;
  const board = makeBoard(opts.boardSize);
  const target = board.cloneNode(true) as HTMLElement;
  const tiles = target.querySelectorAll("game-tile");
  const title = document.querySelector("h1")!;
  const hist = { tiles: [] as Element[], index: -1 };
  const updateTitle = () => {
    const won = boardState(target) === boardState(board);
    const movesRemaining = Math.max(0, opts.moves.length - hist.index - 1);
    const lost = !movesRemaining;
    if (won) {
      title.className = "won";
      title.textContent = `You won!`;
      board.classList.add("green");
      target.classList.add("won");
      setTimeout(() => {
        board.classList.add("won");
        main.insertAdjacentHTML(
          "beforeend",
          `
          <game-dialog-wrapper>
            <game-dialog>
              <dialog-label>Level clear!</dialog-label>
              <h2>Let's go!</h2>
              <button class="js-next" data-shortcut="n" autofocus>Next Level →</button>
            </game-dialog>
          </game-dialog-wrapper>
        `,
        );
        main.querySelector<HTMLButtonElement>("button[autofocus]")?.focus();
      }, 300);
    } else if (lost) {
      title.className = "lost";
      title.textContent = `You lost :/`;
    } else {
      title.className = "";
      title.textContent = `Moves: ${movesRemaining}`;
    }
  };
  const actions: Record<string, () => void> = {
    u() {
      if (hist.index < 0) return;
      const tile = hist.tiles[hist.index];
      --hist.index;
      if (tile) flip(tile);
      updateTitle();
    },
    r() {
      if (hist.index >= hist.tiles.length) return;
      ++hist.index;
      const tile = hist.tiles[hist.index];
      if (tile) flip(tile);
      updateTitle();
    },
    n() {
      location.assign(genurl(opts.boardSize));
    },
    x() {
      makeGame(opts);
    },
  };
  opts.moves.forEach((x) => flip(tiles[x]!));
  board.classList.add("board");
  target.classList.add("target");
  board.addEventListener("click", (e) => {
    e.preventDefault();
    const tile = e.target as Element;
    if (!tile.matches("game-tile")) return;
    ++hist.index;
    hist.tiles[hist.index] = tile;
    hist.tiles.splice(hist.index + 1, hist.tiles.length);
    flip(tile);
    updateTitle();
  });

  document.onkeydown = (e: KeyboardEvent) => actions[e.key]?.();
  document.onclick = (e) => {
    const btn = (e.target as Element).closest?.("button");
    const action = btn?.dataset.shortcut;
    action && actions[action]?.();
  };

  updateTitle();

  const game = {
    moves: opts.moves,
    board,
    target,
  };

  main.replaceChildren(game.target, game.board);

  return game;
}

function genurl(boardSize: number) {
  const moves = genMoves(boardSize);
  return `#${moves.map((x) => (x + 32).toString(32)).join("-")}`;
}

function parseHash(hash: string) {
  return hash
    .slice(1)
    .split("-")
    .map((s) => parseInt(s, 32) - 32);
}

function urlmoves(boardSize: number) {
  const moves = parseHash(location.hash);
  if (moves.length && !moves.some((x) => isNaN(x))) {
    return moves;
  }
  const url = genurl(boardSize);
  history.pushState(moves, "", url);
  return parseHash(url);
}

function init() {
  const boardSize = 5;
  const onhashchange = () => {
    makeGame({ boardSize, moves: urlmoves(boardSize) });
  };
  window.addEventListener("hashchange", onhashchange);
  onhashchange();
}
