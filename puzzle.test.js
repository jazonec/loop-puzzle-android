import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoard,generatePuzzle,inspect,lineComponents,excludedEdges} from './puzzle.js';
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
test('fragments join and split when a connecting edge changes',()=>{
  const states=Array(board.edges.length).fill(0);
  const [a,bridge,b]=board.cells.find(c=>c.q===0&&c.r===0).edges;
  states[a]=states[b]=1;
  assert.equal(lineComponents(board,states).length,2);
  states[bridge]=1;
  assert.deepEqual(new Set(lineComponents(board,states)[0]),new Set([a,bridge,b]));
  assert.equal(lineComponents(board,states).length,1);
  states[bridge]=2;
  assert.equal(lineComponents(board,states).length,2);
});
test('zero hides all six edges and propagates through dangling chains',()=>{
  const clues=board.cells.map(()=>6), states=board.edges.map(()=>0);
  const cell=board.cells.find(c=>c.q===0&&c.r===0);clues[cell.id]=0;
  const excluded=excludedEdges(board,clues,states);
  for(const id of cell.edges){
    assert.equal(excluded[id],true);
    for(const v of [board.edges[id].a,board.edges[id].b])for(const next of board.vertices[v].edges)assert.equal(excluded[next],true);
  }
  assert.ok(excluded.some(v=>!v),'unrelated grid remains visible');
});
test('satisfied clues 1 to 5 hide remaining edges and restore them on undo',()=>{
  const cell=board.cells.find(c=>c.q===0&&c.r===0);
  for(let clue=1;clue<=5;clue++){
    const clues=board.cells.map(()=>6),states=board.edges.map(()=>0);clues[cell.id]=clue;
    for(const id of cell.edges.slice(0,clue))states[id]=1;
    const before=[...states],excluded=excludedEdges(board,clues,states);
    for(const id of cell.edges)assert.equal(excluded[id],states[id]!==1);
    assert.deepEqual(states,before,'deductions never change user marks');
    states[cell.edges[clue-1]]=0;
    const undone=excludedEdges(board,clues,states);
    assert.ok(cell.edges.some(id=>states[id]===0&&!undone[id]),`clue ${clue}: undone edge candidates restored`);
  }
});
test('vertex with two lines excludes its third branch, without hiding chosen lines',()=>{
  const vertex=board.vertices.find(v=>v.edges.length===3),states=board.edges.map(()=>0),clues=board.cells.map(()=>6);
  states[vertex.edges[0]]=states[vertex.edges[1]]=1;
  const excluded=excludedEdges(board,clues,states);
  assert.equal(excluded[vertex.edges[2]],true);
  assert.equal(excluded[vertex.edges[0]],false);assert.equal(excluded[vertex.edges[1]],false);
});
test('deductions from valid partial solutions never remove a solution line',()=>{
  for(let seed=0;seed<15;seed++){
    const p=generatePuzzle(board,seed);
    const states=p.solution.map((line,id)=>id%4===0?(line?1:2):0);
    const excluded=excludedEdges(board,p.clues,states);
    for(let id=0;id<states.length;id++)if(p.solution[id])assert.equal(excluded[id],false,`seed ${seed}, edge ${id}`);
  }
});
