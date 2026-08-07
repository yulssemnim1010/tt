const fs=require('fs'),zlib=require('zlib');
function decode(p){
  const b=fs.readFileSync(p);let o=8,w,h,ct,bd,idat=[];
  while(o<b.length){const len=b.readUInt32BE(o),t=b.toString('ascii',o+4,o+8);
    if(t==='IHDR'){w=b.readUInt32BE(o+8);h=b.readUInt32BE(o+12);bd=b[o+16];ct=b[o+17];}
    if(t==='IDAT')idat.push(b.slice(o+8,o+8+len));
    if(t==='IEND')break;o+=12+len;}
  const raw=zlib.inflateSync(Buffer.concat(idat)),bpp=4,stride=w*bpp,out=Buffer.alloc(h*stride);
  let pos=0;
  for(let y=0;y<h;y++){const f=raw[pos++];
    for(let x=0;x<stride;x++){const cur=raw[pos+x];
      const A=x>=bpp?out[y*stride+x-bpp]:0,B=y>0?out[(y-1)*stride+x]:0,C=(x>=bpp&&y>0)?out[(y-1)*stride+x-bpp]:0;
      let v;switch(f){case 0:v=cur;break;case 1:v=cur+A;break;case 2:v=cur+B;break;case 3:v=cur+((A+B)>>1);break;
        default:{const pp=A+B-C,pa=Math.abs(pp-A),pb=Math.abs(pp-B),pc=Math.abs(pp-C);v=cur+(pa<=pb&&pa<=pc?A:pb<=pc?B:C);}}
      out[y*stride+x]=v&255;}
    pos+=stride;}
  return {w,h,d:out,stride};
}
module.exports={decode};
