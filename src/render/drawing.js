export function hash(n){const x=Math.sin(n*12.9898+78.233)*43758.5453;return x-Math.floor(x);}
export function mix(a,b,t){return a+(b-a)*t;}
export function ellipse(ctx,x,y,rx,ry,fill,stroke=null,line=1){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}}
export function polygon(ctx,pts,fill,stroke=null,line=1){ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}}
export function roundRect(ctx,x,y,w,h,r,fill,stroke=null,line=1){const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.roundRect(x,y,w,h,rr);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}}
export function glow(ctx,color,blur=18){ctx.shadowColor=color;ctx.shadowBlur=blur;}
export function noGlow(ctx){ctx.shadowBlur=0;ctx.shadowColor='transparent';}
export function pathSamples(path,spacing=32,offset=0){const out=[];let carry=offset;for(let i=0;i<path.length-1;i++){const a=path[i],b=path[i+1],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);for(let d=carry;d<len;d+=spacing)out.push({x:a.x+dx*d/len,y:a.y+dy*d/len,angle,segment:i,d});carry=(carry-len)%spacing;if(carry<0)carry+=spacing;}return out;}
export function colorWithAlpha(hex,alpha){if(hex.startsWith('#')&&hex.length===7){const a=Math.round(Math.max(0,Math.min(1,alpha))*255).toString(16).padStart(2,'0');return hex+a;}return hex;}
