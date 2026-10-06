const test=require('node:test');const assert=require('node:assert/strict');
const images=require('../js/images.js');const core=require('../js/core.js');const {createStore}=require('../js/storage.js');
const photo='data:image/jpeg;base64,YWJj';const png='data:image/png;base64,ZA==';
const file={type:'image/jpeg',size:100};
const mine=core.createPost({type:'lost',title:'水杯',category:'其他',place:'食堂',contact:'demo'},'mine','2026-10-06T09:00:00Z');
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
test('只接受三种照片类型并拒绝 SVG、文本和缺失文件',()=>{
 for(const type of ['image/jpeg','image/png','image/webp']) assert.doesNotThrow(()=>images.validateFile({...file,type}));
 for(const bad of [null,{...file,type:'image/svg+xml'},{...file,type:'text/plain'}]) assert.throws(()=>images.validateFile(bad));
});
test('文件大小上限含边界，拒绝空文件、超限及无效大小',()=>{
 assert.doesNotThrow(()=>images.validateFile({...file,size:images.MAX_FILE_BYTES}));
 for(const size of [0,-1,NaN,Infinity,images.MAX_FILE_BYTES+1]) assert.throws(()=>images.validateFile({...file,size}));
});
test('图片持久化仅接受空值或长度受限的内嵌照片数据',()=>{
 for(const value of ['',photo,png,'data:image/webp;base64,YWJj']) assert.equal(images.validImage(value),true);
 for(const value of [null,undefined,'https://example.test/a.jpg','data:image/svg+xml;base64,YWJj','data:image/jpeg;base64,','data:image/jpeg;base64,<script>','data:image/jpeg;base64,'+'a'.repeat(images.MAX_DATA_LENGTH)]) assert.equal(images.validImage(value),false);
});
test('缩放保持比例，不放大小图，尺寸至少一像素',()=>{
 assert.deepEqual(images.fitSize(4000,2000),{width:1280,height:640});
 assert.deepEqual(images.fitSize(500,1000),{width:500,height:1000});
 assert.deepEqual(images.fitSize(1,10000),{width:1,height:1280});
 assert.deepEqual(images.fitSize(2000,4000),{width:640,height:1280});
});
test('异常图片尺寸被拒绝',()=>{
 for(const pair of [[0,1],[1,-2],[NaN,1],[Infinity,1]]) assert.throws(()=>images.fitSize(...pair));
});
test('图片附加、更换和移除不改其他物品字段或原数据',()=>{
 const original=[mine];const before=structuredClone(original);
 const attached=images.applyImage(original,'mine',photo);
 assert.deepEqual(attached[0],{...mine,image:photo});assert.deepEqual(original,before);
 const changed=images.applyImage(attached,'mine',png);
 assert.equal(changed[0].image,png);assert.equal(attached[0].image,photo);
 assert.equal(images.applyImage(changed,'mine','')[0].image,'');
});
test('不能为他人或不存在的信息修改图片，也不能附加非法图片',()=>{
 assert.throws(()=>images.applyImage([{...mine,isMine:false}],'mine',photo));
 assert.throws(()=>images.applyImage([mine],'missing',photo));
 assert.throws(()=>images.applyImage([mine],'mine','data:image/svg+xml;base64,YWJj'));
});
test('选择图片处理期间 busy 为真，完成后可提交',async()=>{
 const task=deferred();const selection=images.createSelection(()=>task.promise);
 const pending=selection.select(file);assert.equal(selection.getState().busy,true);
 task.resolve(photo);await pending;assert.deepEqual(selection.getState(),{image:photo,busy:false,error:''});
});
test('连续选择时后选图片生效，先选的迟到结果不会覆盖',async()=>{
 const a=deferred(),b=deferred();let calls=0;const selection=images.createSelection(()=>++calls===1?a.promise:b.promise);
 const first=selection.select(file),second=selection.select(file);
 b.resolve(png);await second;a.resolve(photo);await first;assert.equal(selection.getState().image,png);
});
test('处理中移除图片使旧读取结果失效',async()=>{
 const task=deferred();const selection=images.createSelection(()=>task.promise);selection.set(photo);
 const pending=selection.select(file);selection.set('');task.resolve(png);await pending;
 assert.deepEqual(selection.getState(),{image:'',busy:false,error:''});
});
test('取消编辑恢复草稿图片，迟到的编辑图片不会覆盖草稿',async()=>{
 const task=deferred();const selection=images.createSelection(()=>task.promise);
 const pending=selection.select(file);selection.set(photo);task.resolve(png);await pending;
 assert.equal(selection.getState().image,photo);
});
test('文件校验、解码及输出校验失败均保留原照片并报告错误',async()=>{
 for(const process of [()=>Promise.reject(Error('decode')),()=>Promise.resolve('invalid'),()=>Promise.resolve('')]) {
 const selection=images.createSelection(process);selection.set(photo);await selection.select(file);
 assert.equal(selection.getState().image,photo);assert.equal(selection.getState().busy,false);assert.ok(selection.getState().error);
 }
 const selection=images.createSelection(()=>{throw Error('should not execute');});selection.set(photo);
 await selection.select({...file,type:'text/plain'});assert.equal(selection.getState().image,photo);assert.match(selection.getState().error,/JPG/);
});
test('旧选择失败不会覆盖新选择的成功状态',async()=>{
 const task=deferred();let calls=0;const selection=images.createSelection(()=>++calls===1?task.promise:Promise.resolve(png));
 const first=selection.select(file);await selection.select(file);task.reject(Error('old error'));await first;
 assert.deepEqual(selection.getState(),{image:png,busy:false,error:''});
});
test('带照片的记录可持久化恢复，更换和移除后也可恢复',()=>{
 const map=new Map();const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const store=createStore(storage);store.load([mine]);let items=[mine];
 for(const image of [photo,png,'']) {
 items=images.applyImage(items,'mine',image);assert.equal(store.save(items).ok,true);
 assert.equal(createStore(storage).load([]).items[0].image,image);
 }
});
test('图片保存容量不足时原记录和已存图片保持不变',()=>{
 const original={...mine,image:photo};const raw=JSON.stringify({version:1,items:[original]});
 const storage={getItem:()=>raw,setItem:()=>{throw Error('quota');}};const store=createStore(storage);const loaded=store.load([]);
 assert.equal(store.save(images.applyImage(loaded.items,'mine',png)).ok,false);
 assert.equal(loaded.items[0].image,photo);assert.equal(createStore(storage).load([]).items[0].image,photo);
});
