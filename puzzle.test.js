import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoard,generatePuzzle,inspect} from './puzzle.js';
const board=createBoard();
test('hexagon has side 12, 397 cells and shared edges / vertices',()=>{
  assert.equal(board.cells.length,397);assert.equal(board.edges.length,1260);assert.equal(board.vertices.length,864);
  for(const c of board.cells)assert.equal(new Set(c.edges).size,6);
  for(const e of board.edges)assert.ok(e.cells.length===1||e.cells.length===2);
  for(const v of board.vertices)assert.ok(v.edges.length===2||v.edges.length===3);
});
test('100 generated puzzles have a valid single loop and deterministic clues',()=>{
  for(let seed=0;seed<100;seed++){
    const p=generatePuzzle(board,seed);assert.ok(inspect(board,p.clues,p.solution).won,`seed ${seed}`);
    assert.deepEqual(p,generatePuzzle(board,seed));assert.ok(p.clues.every(v=>v>=0&&v<=6));
  }
});
test('empty board cannot win; missing and branching edges fail',()=>{
  const p=generatePuzzle(board,42);assert.equal(inspect(board,p.clues,Array(board.edges.length).fill(0)).won,false);
  const state=[...p.solution];state[state.indexOf(1)]=0;assert.equal(inspect(board,p.clues,state).won,false);
  const v=board.vertices.find(v=>v.edges.length===3);for(const id of v.edges)state[id]=1;assert.ok(inspect(board,p.clues,state).badVertices.length>0);
});
test('excluded edges can contradict clues, crosses are optional for winning',()=>{
  const p=generatePuzzle(board,5),state=[...p.solution];for(let i=0;i<state.length;i++)if(!state[i])state[i]=2;
  assert.ok(inspect(board,p.clues,state).won);
  const cell=board.cells.find(c=>p.clues[c.id]>0);for(const id of cell.edges)state[id]=2;
  assert.ok(inspect(board,p.clues,state).badCells.includes(cell.id));
});
test('two separate loops cannot win even when every clue matches',()=>{
  const state=Array(board.edges.length).fill(0);
  for(const cell of [board.cells[0],board.cells.at(-1)])for(const id of cell.edges)state[id]=1;
  const clues=board.cells.map(c=>c.edges.reduce((sum,id)=>sum+state[id],0));
  const result=inspect(board,clues,state);
  assert.equal(result.satisfied,397);assert.equal(result.loop,false);assert.equal(result.won,false);
});
