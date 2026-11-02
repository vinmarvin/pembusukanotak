// src/core/board/findMatches.js
// Pure match detection: finds horizontal and vertical runs of 3 or more.

export function findMatches(grid) {
  const rows = grid.length;
  if (rows === 0) return { matchedCells: [], runs: [], longestRun: 0 };
  const cols = grid[0].length;

  const matchedSet = new Set();
  const runs = [];
  let longestRun = 0;

  // Horizontal runs
  for (let r = 0; r < rows; r++) {
    let runType = -1;
    let runStart = 0;
    let runLen = 0;

    for (let c = 0; c <= cols; c++) {
      const type = c < cols && grid[r][c] ? grid[r][c].type : -1;
      if (type !== -1 && type === runType) {
        runLen++;
      } else {
        if (runLen >= 3) {
          const cells = [];
          for (let k = runStart; k < runStart + runLen; k++) {
            matchedSet.add(`${r},${k}`);
            cells.push({ r, c: k });
          }
          runs.push({ type: runType, orientation: 'h', cells, length: runLen });
          if (runLen > longestRun) longestRun = runLen;
        }
        runType = type;
        runStart = c;
        runLen = 1;
      }
    }
  }

  // Vertical runs
  for (let c = 0; c < cols; c++) {
    let runType = -1;
    let runStart = 0;
    let runLen = 0;

    for (let r = 0; r <= rows; r++) {
      const type = r < rows && grid[r][c] ? grid[r][c].type : -1;
      if (type !== -1 && type === runType) {
        runLen++;
      } else {
        if (runLen >= 3) {
          const cells = [];
          for (let k = runStart; k < runStart + runLen; k++) {
            matchedSet.add(`${k},${c}`);
            cells.push({ r: k, c });
          }
          runs.push({ type: runType, orientation: 'v', cells, length: runLen });
          if (runLen > longestRun) longestRun = runLen;
        }
        runType = type;
        runStart = r;
        runLen = 1;
      }
    }
  }

  const matchedCells = Array.from(matchedSet).map((key) => {
    const [r, c] = key.split(',').map(Number);
    return { r, c };
  });

  return { matchedCells, runs, longestRun };
}

