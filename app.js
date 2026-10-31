import { createBoard, generatePuzzle, inspect, lineComponents } from './puzzle.js';
const $ = id => document.getElementById(id), board = createBoard(), svg = $('board');
const NS = 'http://www.w3.org/2000/svg', KEY = 'honeyloop-v1';
let puzzle, states, history = [], future = [], seconds = 0, moves = 0, won = false, zoom = 1, panX = 0, panY = 0, feedback = false, activeEdge = 0;
const edgeEls = [], numberEls = [];
const fragmentPalette = ['#309d80', '#7860bd', '#c9cb36', '#408fc1', '#d49739', '#5144ac', '#5da34d', '#c66a83'];
let fragmentColors = new Map();
function updateFragmentColors() {
  const next = new Map(), used = new Set();
  // Retain the dominant color when fragments join; give split fragments distinct colors.
  const components = lineComponents(board, states).sort((a,b) => b.length-a.length);
  for (const ids of components) {
    const votes = new Map();
    for (const id of ids) {
      const color = fragmentColors.get(id);
      if (color) votes.set(color, (votes.get(color) || 0) + 1);
    }
    const preferred = [...votes].sort((a,b) => b[1]-a[1]).find(([color]) => !used.has(color));
    const color = preferred?.[0] || fragmentPalette.find(color => !used.has(color)) || fragmentPalette[used.size % fragmentPalette.length];
    used.add(color);
    for (const id of ids) next.set(id, color);
  }
  fragmentColors = next;
}
function el(tag, attrs, parent = svg) { const node = document.createElementNS(NS, tag); for(const [k,v] of Object.entries(attrs)) node.setAttribute(k,v); parent.append(node); return node; }
const baseGroup = el('g', {}), numberGroup = el('g', {}), markGroup = el('g', {}), vertexGroup = el('g', {}), hitGroup = el('g', {});
for (const e of board.edges) {
  const a=board.vertices[e.a], b=board.vertices[e.b], attrs={x1:a.x,y1:a.y,x2:b.x,y2:b.y};
  el('line', {...attrs,class:'edge-base'},baseGroup);
  const outline=el('line',{...attrs,class:'edge-outline',visibility:'hidden'},markGroup);
  const line=el('line',{...attrs,class:'edge-line',visibility:'hidden'},markGroup), x=(a.x+b.x)/2,y=(a.y+b.y)/2;
  const cross=el('path',{d:`M ${x-.09} ${y-.09} l .18 .18 M ${x+.09} ${y-.09} l -.18 .18`,class:'edge-cross',visibility:'hidden'},markGroup);
  const hit=el('line',{...attrs,class:'edge-hit','data-edge':e.id,tabindex:e.id===0?'0':'-1',role:'button'},hitGroup);
  hit.addEventListener('click',event=>{if(dragged || won) return; event.stopPropagation(); setEdge(e.id,(states[e.id]+1)%3);});
  hit.addEventListener('contextmenu',event=>{event.preventDefault();if(!won)setEdge(e.id,(states[e.id]+2)%3);});
  hit.addEventListener('focus',()=>{activeEdge=e.id;});
  hit.addEventListener('keydown',event=>{
    if(['Enter',' ','x','X','ч','Ч'].includes(event.key)){event.preventDefault();if(!won)setEdge(e.id,/x|ч/i.test(event.key)?(states[e.id]===2?0:2):(states[e.id]+1)%3);}
    if(event.key.startsWith('Arrow')){event.preventDefault(); const delta=['ArrowRight','ArrowDown'].includes(event.key)?1:-1; focusEdge((e.id+delta+board.edges.length)%board.edges.length);}
  });
  edgeEls.push({line,outline,cross,hit});
}
for(const v of board.vertices) el('circle',{cx:v.x,cy:v.y,r:.039,class:'vertex'},vertexGroup);
for(const c of board.cells) numberEls.push(el('text',{x:c.x,y:c.y,class:'cell-number'},numberGroup));
function focusEdge(id){edgeEls[activeEdge].hit.setAttribute('tabindex','-1');activeEdge=id;const hit=edgeEls[id].hit;hit.setAttribute('tabindex','0');hit.focus(); const e=board.edges[id],a=board.vertices[e.a],b=board.vertices[e.b];panX=(a.x+b.x)/2-(board.bounds.x+board.bounds.w/2);panY=(a.y+b.y)/2-(board.bounds.y+board.bounds.h/2);updateView();}
function setEdge(id,value){history.push({id,before:states[id],after:value});future=[];states[id]=value;moves++;feedback=false;render();save();}
function render(){
  const result=inspect(board,puzzle.clues,states);won=result.won;
  updateFragmentColors();
  for(let i=0;i<states.length;i++){const e=edgeEls[i];e.line.setAttribute('visibility',states[i]===1?'visible':'hidden');e.outline.setAttribute('visibility',states[i]===1?'visible':'hidden');e.line.style.stroke=fragmentColors.get(i)||fragmentPalette[0];e.cross.setAttribute('visibility',states[i]===2?'visible':'hidden');e.hit.setAttribute('aria-label',`Ребро ${i+1}: ${['пусто','линия','крестик'][states[i]]}`);}
  const errors=new Set(result.badCells);
  numberEls.forEach((el,i)=>{el.textContent=puzzle.clues[i];el.setAttribute('class',`cell-number${puzzle.clues[i]===0?' zero':''}${result.counts[i]===puzzle.clues[i]?' satisfied':''}${errors.has(i)?' error':''}`);});
  $('progress-text').textContent=`${result.satisfied} / ${board.cells.length}`;$('progress-bar').style.width=`${100*result.satisfied/board.cells.length}%`;
  $('line-count').textContent=result.lines;$('move-count').textContent=moves;$('undo').disabled=!history.length;$('redo').disabled=!future.length;
  $('hint').disabled=won;$('win-overlay').hidden=!won;
  if(won)message(`Готово за ${formatTime(seconds)}! Все числа совпали, контур замкнут.`);
  return result;
}
function message(text){$('status').textContent=text;}
function save(){try{localStorage.setItem(KEY,JSON.stringify({seed:puzzle.seed,states,history,future,seconds,moves}));}catch{$('save-status').textContent='Сохранение недоступно в этом браузере';}}
function validEntry(e){return e&&Number.isInteger(e.id)&&e.id>=0&&e.id<board.edges.length&&[0,1,2].includes(e.before)&&[0,1,2].includes(e.after);}
function start(seed=crypto.getRandomValues(new Uint32Array(1))[0], saved=null){
  puzzle=generatePuzzle(board,seed);states=saved?.states||Array(board.edges.length).fill(0);history=saved?.history||[];future=saved?.future||[];seconds=saved?.seconds||0;moves=saved?.moves||0;won=false;feedback=false;fragmentColors=new Map();zoom=1;panX=panY=0;
  $('board-label').textContent=`ГОЛОВОЛОМКА #${seed.toString(16).slice(-6).toUpperCase()}`;message(saved?'Прогресс восстановлен. Продолжайте свой контур.':'Начните с нулей: вокруг них нет линий.');updateView();render();$('timer').textContent=formatTime(seconds);save();
}
let saved=null;try{const raw=JSON.parse(localStorage.getItem(KEY));if(raw&&Number.isInteger(raw.seed)&&Array.isArray(raw.states)&&raw.states.length===board.edges.length&&raw.states.every(v=>[0,1,2].includes(v))&&Array.isArray(raw.history)&&raw.history.every(validEntry)&&Array.isArray(raw.future)&&raw.future.every(validEntry)&&Number.isFinite(raw.seconds)&&raw.seconds>=0&&Number.isFinite(raw.moves)&&raw.moves>=0)saved=raw;}catch{}
start(saved?.seed,saved);
function formatTime(s){return [Math.floor(s/60),s%60].map(v=>String(v).padStart(2,'0')).join(':');}
setInterval(()=>{if(!won&&!document.hidden&&!$('confirm').open&&!$('rules').open){seconds++;$('timer').textContent=formatTime(seconds);if(seconds%5===0)save();}},1000);
document.addEventListener('visibilitychange',save);
function undo(){if(!history.length)return;const action=history.pop();states[action.id]=action.before;future.push(action);feedback=false;render();save();}
function redo(){if(!future.length)return;const action=future.pop();states[action.id]=action.after;history.push(action);feedback=false;render();save();}
$('undo').onclick=undo;$('redo').onclick=redo;
document.addEventListener('keydown',e=>{if($('rules').open||$('confirm').open)return;if(e.ctrlKey||e.metaKey){if(e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}if(e.key.toLowerCase()==='y'){e.preventDefault();redo();}}});
$('check').onclick=()=>{feedback=true;const r=render();if(r.won)return;if(r.badCells.length||r.badVertices.length)message(`Есть противоречия: ${r.badCells.length} сот, ${r.badVertices.length} вершин. Проверьте линии и крестики.`);else if(r.satisfied===board.cells.length)message('Числа совпали. Теперь соедините линии в один замкнутый контур.');else message(`Явных противоречий нет. Осталось подобрать линии у ${board.cells.length-r.satisfied} сот.`);};
$('hint').onclick=()=>{
  const wrong=states.findIndex((v,i)=>v!==0&&((v===1)!==Boolean(puzzle.solution[i])));
  const id=wrong>=0?wrong:states.findIndex(v=>v===0);
  if(id<0)return;setEdge(id,puzzle.solution[id]?1:2);focusEdge(id);message('Открыто ребро из одного допустимого решения. Другие решения тоже принимаются.');
};
let pending=null;
function confirmAction(title,action){if(!history.length&&!states.some(Boolean)){action();return;}$('confirm-title').textContent=title;pending=action;$('confirm').showModal();}
$('new-game').onclick=()=>confirmAction('Начать новую головоломку?',()=>start());$('win-new').onclick=()=>start();
$('clear').onclick=()=>confirmAction('Очистить этот контур?',()=>start(puzzle.seed));
$('cancel-confirm').onclick=()=>{$('confirm').close();pending=null;};$('accept-confirm').onclick=()=>{$('confirm').close();pending?.();pending=null;};
$('rules-button').onclick=()=>$('rules').showModal();$('close-rules').onclick=$('start-playing').onclick=()=>$('rules').close();
function updateView(){const b=board.bounds,w=b.w/zoom,h=b.h/zoom;svg.setAttribute('viewBox',`${b.x+(b.w-w)/2+panX} ${b.y+(b.h-h)/2+panY} ${w} ${h}`);$('zoom-reset').textContent=`${Math.round(zoom*100)}%`;}
function changeZoom(next){zoom=Math.min(5,Math.max(1,next));if(zoom===1)panX=panY=0;updateView();}
$('zoom-in').onclick=()=>changeZoom(zoom*1.3);$('zoom-out').onclick=()=>changeZoom(zoom/1.3);$('zoom-reset').onclick=()=>{panX=panY=0;changeZoom(1);};
svg.addEventListener('wheel',e=>{e.preventDefault();changeZoom(zoom*Math.exp(-e.deltaY*.0015));},{passive:false});
const pointers=new Map();let drag=null,dragged=false,pinch=null;
function point(e){const pt=new DOMPoint(e.clientX,e.clientY);return pt.matrixTransform(svg.getScreenCTM().inverse());}
svg.addEventListener('pointerdown',e=>{
  if(e.button!==0&&e.button!==1)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});dragged=false;
  if(pointers.size===2){const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom};dragged=true;drag=null;svg.setPointerCapture(e.pointerId);return;}
  if(!e.target.hasAttribute('data-edge')||e.button===1||e.pointerType==='touch'){drag={id:e.pointerId,x:e.clientX,y:e.clientY,point:point(e),panX,panY};if(!e.target.hasAttribute('data-edge'))svg.setPointerCapture(e.pointerId);}
});
svg.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2&&pinch){const[a,b]=[...pointers.values()];changeZoom(pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/pinch.distance);return;}
  if(!drag||drag.id!==e.pointerId)return;
  if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5){dragged=true;svg.classList.add('dragging');svg.setPointerCapture(e.pointerId);const pt=point(e);panX+=drag.point.x-pt.x;panY+=drag.point.y-pt.y;const limit=board.bounds.w*.7;panX=Math.max(-limit,Math.min(limit,panX));panY=Math.max(-limit,Math.min(limit,panY));updateView();}
});
function release(e){pointers.delete(e.pointerId);drag=null;pinch=null;svg.classList.remove('dragging');if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);setTimeout(()=>{dragged=false;},0);}
svg.addEventListener('pointerup',release);svg.addEventListener('pointercancel',release);
