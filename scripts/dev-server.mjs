import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));const port=Number(process.env.PORT||4425),host=process.env.HOST||'0.0.0.0';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
function safePath(urlPath){const clean=normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^(\.\.(\/|\\|$))+/,'');const candidate=resolve(join(root,clean==='/'?'index.html':clean));return candidate.startsWith(root)?candidate:null;}
const server=createServer((req,res)=>{let path=safePath(req.url||'/');if(!path){res.writeHead(403);res.end('Forbidden');return;}if(existsSync(path)&&statSync(path).isDirectory())path=join(path,'index.html');if(!existsSync(path)){if(!extname(path))path=join(root,'index.html');else{res.writeHead(404);res.end('Not found');return;}}res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});createReadStream(path).pipe(res);});
server.listen(port,host,()=>console.log(`TowerDefNapst dev server: http://localhost:${port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
