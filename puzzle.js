export const SIDE = 12;
const DIRS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
export function createBoard(side = SIDE) {
  const cells = [], edges = [], vertices = [], cellMap = new Map(), vertexMap = new Map(), edgeMap = new Map();
  for (let q = 1 - side; q < side; q++) for (let r = 1 - side; r < side; r++) {
    if (Math.abs(q + r) >= side) continue;
    const cell = { id: cells.length, q, r, x: Math.sqrt(3) * (q + r / 2), y: 1.5 * r, edges: [], neighbors: [] };
    cellMap.set(`${q},${r}`, cell.id); cells.push(cell);
    const corners = Array.from({ length: 6 }, (_, k) => {
      const a = (60 * k - 30) * Math.PI / 180;
      const x = cell.x + Math.cos(a), y = cell.y + Math.sin(a), key = `${Math.round(x*1e5)},${Math.round(y*1e5)}`;
      if (!vertexMap.has(key)) { vertexMap.set(key, vertices.length); vertices.push({ x, y, edges: [] }); }
      return vertexMap.get(key);
    });
    for (let k = 0; k < 6; k++) {
      const a = corners[k], b = corners[(k + 1) % 6], key = [a, b].sort((a,b) => a-b).join(':');
      if (!edgeMap.has(key)) {
        edgeMap.set(key, edges.length); const id = edges.length;
        edges.push({ id, a, b, cells: [] }); vertices[a].edges.push(id); vertices[b].edges.push(id);
      }
      const id = edgeMap.get(key); cell.edges.push(id); edges[id].cells.push(cell.id);
    }
  }
  for (const c of cells) c.neighbors = DIRS.map(([q,r]) => cellMap.get(`${c.q+q},${c.r+r}`));
  const xs = vertices.map(v => v.x), ys = vertices.map(v => v.y);
  return { cells, edges, vertices, bounds: { x: Math.min(...xs)-1, y: Math.min(...ys)-1, w: Math.max(...xs)-Math.min(...xs)+2, h: Math.max(...ys)-Math.min(...ys)+2 } };
}
export function random(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function generatePuzzle(board, seed) {
  const rng = random(seed), inside = new Set();
  inside.add(board.cells.find(c => c.q === 0 && c.r === 0).id);
  const target = Math.floor(board.cells.length * (0.49 + rng() * .15));
  while (inside.size < target) {
    const candidates = board.cells.filter(c => {
      if (inside.has(c.id)) return false;
      const ns = c.neighbors.map(n => inside.has(n)), count = ns.filter(Boolean).length;
      // A single contiguous attachment preserves a connected region without holes.
      return count >= 1 && count <= 3 && ns.filter((v, i) => v && !ns[(i+5)%6]).length === 1;
    });
    if (!candidates.length) break;
    inside.add(candidates[Math.floor(rng()*candidates.length)].id);
  }
  const solution = board.edges.map(e => e.cells.filter(id => inside.has(id)).length === 1 && (e.cells.length === 2 || inside.has(e.cells[0])) ? 1 : 0);
  const clues = board.cells.map(c => c.edges.reduce((s,id) => s+solution[id],0));
  return { seed, solution, clues };
}
export function inspect(board, clues, states) {
  const lines = board.edges.filter(e => states[e.id] === 1);
  const counts = board.cells.map(c => c.edges.filter(id => states[id] === 1).length);
  const satisfied = counts.filter((n,i) => n === clues[i]).length;
  const badCells = board.cells.filter(c => counts[c.id] > clues[c.id] || c.edges.filter(id => states[id] !== 2).length < clues[c.id]).map(c => c.id);
  const badVertices = board.vertices.filter(v => v.edges.filter(id => states[id] === 1).length > 2);
  let loop = false;
  if (lines.length && board.vertices.every(v => { const n = v.edges.filter(id => states[id]===1).length; return n===0 || n===2; })) {
    const seen = new Set(), queue = [lines[0].id];
    while(queue.length) { const id = queue.pop(); if(seen.has(id)) continue; seen.add(id); const e=board.edges[id]; for(const v of [e.a,e.b]) for(const next of board.vertices[v].edges) if(states[next]===1 && !seen.has(next)) queue.push(next); }
    loop = seen.size === lines.length;
  }
  return { counts, satisfied, badCells, badVertices, lines: lines.length, loop, won: satisfied === clues.length && loop };
}
