import { Figure } from './figure';
import { Application, DisplayObject, FederatedPointerEvent, Graphics } from 'pixi.js';
import { grid64, makeShapes, randomShape } from './utils';

console.log('Game JS loading.');

/**
 * Check for any horizontal/vertical line completions,
 * and handle whatever happens
 * TODO: Not working
 * @returns 
 */
const checkLineCompletion = () => {
  if (figures.length < 3) return;

  const rows: number[] = Array(10).fill(0);
  const cols: number[] = Array(10).fill(0);

  // For each figure, ...
  figures.forEach((figure) => {
    // For each rect in figure, ...
    figure.nodes.forEach((node) => {
      const bounds = node.getBounds();
      // Get row and col number of rect, for counting
      grid64.forEach((b64, i) => {
        const xDiff = Math.abs((bounds.x - xpadding) - b64);
        const yDiff = Math.abs((bounds.y - ypadding) - b64);
        if (xDiff < 15) cols[i]++;
        if (yDiff < 15) rows[i]++;
      });
    });
  });

  const completeRows: number[] = [];
  rows.forEach((row: number, i: number) => {
    if (row === 10) completeRows.push(i);
  });

  // Remove complete rows
  if (completeRows.length > 0) {
    console.log('complete row');

    // For each complete row
    completeRows.forEach((row) => {
      const gridPx = grid64[row];

      // For each figure
      figures.forEach((figure) => {

        /**
         * "search" for rectangle coordinates that are within the row grid number.
         * If found, add to nodesToDestroy array. 
         * @param node 
         */
        const searchAndDestroy = (
          node: DisplayObject,
          inverse?:boolean
        ): DisplayObject | undefined  => {
          const bounds = node.getBounds();
          let axis = bounds.y - ypadding;
          if (inverse) axis = bounds.x - xpadding;

          const diff = Math.abs(axis - gridPx);
          if (diff < 15) return node;
        }

        // For each node in figure, ...
        // check if the node is witin a complete row,
        // then delete that node
        const nodes = figure.container.children;
        const yNodes = nodes.map(node => searchAndDestroy(node));
        const xNodes = nodes.map(node => searchAndDestroy(node, true));
        const nodesToDestroy = yNodes.concat(xNodes);
        nodesToDestroy.forEach((node) => (
          (node) && figure.container.removeChild(node)
        ));
      });
    });
  }
}

/**
 * Generate new figure to start with
 */
const newFigure = (startpos:{x:number,y:number}) => {
  const { x, y } = startpos;
  const shape = randomShape();
  const setter = setDragTarget;
  const figure = new Figure(shape, setter, app, cellSize, sidepadding, shapes);
  // Position it below grid (pluss padding)
  figure.setPos(x,y);
  figures.push(figure);
}

/**
 * Render a black line grid for user experience.
 */
const renderGrid = (
  gridsize: number,
  cellsize: number,
  sidepadding: number,
) => {
  const grid = new Graphics();
  grid.lineStyle(2, 0x000000, 1);
  for (let i = 0; i < numCells + 1; i++) {
    grid.moveTo(i * cellsize + sidepadding, sidepadding);
    grid.lineTo(i * cellsize + sidepadding, gridsize + sidepadding);
    grid.moveTo(sidepadding, i * cellsize + sidepadding);
    grid.lineTo(gridsize + sidepadding, i * cellsize + sidepadding);
  }
  app.stage.addChild(grid);
};

const incrementScore = (element: HTMLSpanElement, n:number): void => {
  const val = Number(element.innerText);
  const total: number = val + n;
  element.innerText = String(total);
};

/* ---------------------------------------------------------------- */
/* RUNTIME STUFFS                                                   */
/* ---------------------------------------------------------------- */

const gameContainer = document.getElementById('game') as HTMLDivElement;
const scoreCounter = document.getElementById('score') as HTMLSpanElement;

let width = gameContainer.clientWidth;
const height = gameContainer.clientHeight;

// Make sure height is up to the task of 150% width.
if (height < width*1.5) {
  width = height / 1.5;
}

const sidepadding = (width / 100) * 5; // 5% on both sides
const dynamicCellSize = (width - (sidepadding*2)) / 10;

const app = new Application({
  background: '#333333',
  resizeTo: window
});
app.stage.eventMode = 'static';
app.stage.hitArea = app.screen;

const numCells = 10;
const cellSize = dynamicCellSize;
const gridSize = numCells * cellSize;
const figureStartPos = {
  x: sidepadding, // TODO more dynamic x pos i guess
  y:(cellSize*10)+(sidepadding*2)
};

let widthDiff = window.innerWidth - gridSize;
let xpadding = widthDiff / 2;
let ypadding = 200;

const shapes = makeShapes(cellSize);

// Target getter and setter for mouse event. Only one at a time on global scope.
// Setter supplied to Figure constructor for container onclick target switching.
let dragTarget: Figure | undefined; 
const setDragTarget = (target: Figure) => dragTarget = target;

app.stage.on('pointermove', (e: FederatedPointerEvent) => {
  if (dragTarget) {
    dragTarget.move(e);
  }
});

/* Clear dragTarget whenever mousebutton is released in app. */
app.stage.on('pointerup', () => {
  if (dragTarget) {
    const moved = dragTarget.stopMoving(figures, cellSize, sidepadding, figureStartPos);
    dragTarget = undefined;
    if (moved) {
      checkLineCompletion();
      newFigure(figureStartPos);
      incrementScore(scoreCounter, 1);
    }
  }
});

// TODO: Resize
renderGrid(
  gridSize,
  cellSize,
  sidepadding
);

const figures = Array<Figure>();

newFigure(figureStartPos);

gameContainer.appendChild(app.view as HTMLCanvasElement);

console.log('Game JS loaded.');