export const WORLD = { width: 1600, height: 900 };
export const PATH = [
  [70, 190], [205, 190], [205, 355], [505, 355], [505, 165],
  [795, 165], [795, 505], [1065, 505], [1065, 290], [1210, 290], [1210, 655],
].map(([x, y]) => ({ x, y }));
export const PAD_BASELINE_RANGE = 140;
const pad = (x, y, role) => ({ x, y, role, r: 30 });
export const BUILD_PADS = [
  pad(140, 310, 'virage entrée'), pad(280, 270, 'double voie entrée'), pad(340, 410, 'courte portée sud'),
  pad(420, 270, 'carrefour ouest'), pad(480, 410, 'virage central ouest'), pad(560, 270, 'double voie centrale'),
  pad(640, 110, 'ligne haute'), pad(680, 230, 'carrefour nord'), pad(680, 370, 'artillerie centrale'),
  pad(740, 490, 'virage bas central'), pad(780, 110, 'ligne haute longue'), pad(900, 250, 'double voie est'),
  pad(900, 430, 'carrefour est'), pad(960, 570, 'ligne basse est'), pad(1000, 350, 'triple couverture'),
  pad(1140, 230, 'virage nexus haut'), pad(1140, 410, 'nœud nexus'), pad(1120, 550, 'dernière ligne'),
].map((value, id) => ({ id, ...value }));
export const DECOR = [
  [58,76,'tree'],[158,70,'tree'],[276,82,'rock'],[352,512,'ruin'],[442,566,'tree'],[566,582,'crystal'],
  [718,728,'tree'],[848,670,'rock'],[1002,764,'crystal'],[1110,112,'ruin'],[1242,102,'tree'],[1362,102,'crystal'],
  [1490,120,'tree'],[1510,470,'rock'],[1260,792,'tree'],[510,785,'ruin'],[250,690,'crystal'],[78,625,'tree'],
  [368,705,'bush'],[1140,790,'bush'],[1318,520,'ruin'],[865,810,'tree'],[1015,95,'rock'],[1460,820,'bush'],
].map(([x,y,type],id)=>({id,x,y,type,scale:.78+(id%5)*.09,variant:id%4}));
export function distanceToPath(x,y){let best=Infinity;for(let i=1;i<PATH.length;i++){const a=PATH[i-1],b=PATH[i],dx=b.x-a.x,dy=b.y-a.y,len2=dx*dx+dy*dy||1,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/len2)),px=a.x+dx*t,py=a.y+dy*t;best=Math.min(best,Math.hypot(x-px,y-py));}return best;}
export function pathCoverageAt(x,y,range=PAD_BASELINE_RANGE,step=5){let covered=0;const segments=new Set();for(let i=1;i<PATH.length;i++){const a=PATH[i-1],b=PATH[i],length=Math.hypot(b.x-a.x,b.y-a.y),count=Math.max(1,Math.ceil(length/step));for(let j=0;j<count;j++){const t=(j+.5)/count,px=a.x+(b.x-a.x)*t,py=a.y+(b.y-a.y)*t;if(Math.hypot(x-px,y-py)<=range){covered+=length/count;segments.add(i-1);}}}return{length:covered,segments:segments.size,nearest:distanceToPath(x,y)};}
