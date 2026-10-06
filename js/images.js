/* 图片规则和异步选择状态可单独测试；浏览器解码与压缩在页面中调用。 */
(function(root){
 'use strict';
 const MAX_FILE_BYTES=5*1024*1024;
 const MAX_DATA_LENGTH=500000;
 function validateFile(file){
  if(!file || !['image/jpeg','image/png','image/webp'].includes(file.type)) throw Error('请选择 JPG、PNG 或 WebP 图片。');
  if(!Number.isFinite(file.size)||file.size<=0||file.size>MAX_FILE_BYTES) throw Error('图片不能为空，且不能超过 5 MB。');
 }
 function validImage(value){
  return value==='' || (typeof value==='string' && value.length<=MAX_DATA_LENGTH && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value));
 }
 function fitSize(width,height,maxSide){
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0) throw Error('图片尺寸无效。');
  const ratio=Math.min(1,(maxSide||1280)/Math.max(width,height));
  return {width:Math.max(1,Math.round(width*ratio)),height:Math.max(1,Math.round(height*ratio))};
 }
 function applyImage(items,id,image){
  if(!validImage(image)) throw Error('图片数据无效或过大。');
  const item=items.find(x=>x.id===id);
  if(!item || !item.isMine) throw Error('只能修改自己的图片。');
  return items.map(x=>x.id===id?Object.assign({},x,{image}):x);
 }
 function createSelection(process,onChange){
  let ticket=0;let state={image:'',busy:false,error:''};
  function emit(next){state=next;if(onChange) onChange({...state});}
  function set(image){
   if(!validImage(image)) image='';
   ticket++;emit({image,busy:false,error:''});
  }
  async function select(file){
   const current=++ticket;const previous=state.image;
   emit({image:previous,busy:true,error:''});
   try {
    validateFile(file);const image=await process(file);
    if(!image || !validImage(image)) throw Error('图片处理失败或压缩后仍过大，请换一张图片。');
    if(current===ticket) emit({image,busy:false,error:''});
   } catch(error){
    if(current===ticket) emit({image:previous,busy:false,error:error.message||'无法读取图片，请重新选择。'});
   }
  }
  return {select,set,getState:()=>({...state})};
 }
 function compressFile(file){
  validateFile(file);
  return new Promise(function(resolve,reject){
   const url=URL.createObjectURL(file);const image=new Image();
   function finish(error,value){URL.revokeObjectURL(url);image.onload=null;image.onerror=null;error?reject(error):resolve(value);}
   image.onerror=()=>finish(Error('图片无法解码，请选择有效图片。'));
   image.onload=function(){
    try{
     const size=fitSize(image.naturalWidth,image.naturalHeight);
     const canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;
     const ctx=canvas.getContext('2d');if(!ctx) throw Error('浏览器无法处理图片。');
     ctx.fillStyle='#ffffff';ctx.fillRect(0,0,size.width,size.height);ctx.drawImage(image,0,0,size.width,size.height);
     for(const quality of [0.82,0.65,0.45,0.3]){
      const data=canvas.toDataURL('image/jpeg',quality);
      if(validImage(data)){finish(null,data);return;}
     }
     throw Error('压缩后图片仍过大，请裁剪或选择更小图片。');
    }catch(error){finish(error);}
   };
   image.src=url;
  });
 }
 function renderPhoto(container,image,alt){
  if(!image || !validImage(image)) return;
  const fallback=container.textContent;
  const photo=document.createElement('img');photo.alt=alt;photo.src=image;
  photo.addEventListener('error',function(){container.textContent=fallback;container.classList.remove('has-photo');});
  container.replaceChildren(photo);container.classList.add('has-photo');
  container.removeAttribute('aria-hidden');
 }
 const api={MAX_FILE_BYTES,MAX_DATA_LENGTH,validateFile,validImage,fitSize,applyImage,createSelection,compressFile,renderPhoto};
 if(typeof module!=='undefined'&&module.exports) module.exports=api;else root.LostFoundImages=api;
})(typeof globalThis!=='undefined'?globalThis:this);
