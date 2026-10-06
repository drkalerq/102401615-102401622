const test=require('node:test');const assert=require('node:assert/strict');
const rules=require('../js/recommendations.js');const core=require('../js/core.js');
const source={id:'lost',type:'lost',title:'黑色雨伞',category:'生活用品',place:'食堂门口',eventTime:'2026-10-06 12:00',createdAt:'2026-10-06T12:00:00+08:00',status:'active',description:'',contact:'demo'};
const found={...source,id:'found',type:'found',eventTime:'2026-10-06 13:00'};
function ids(items,id='lost',limit){return rules.recommend(items,id,limit).map(x=>x.item.id);}
test('只推荐相反类型的未完成记录，排除自身、同类型与已完成',()=>{
 assert.deepEqual(ids([source,found,{...found,id:'done',status:'completed'},{...source,id:'same'}]),['found']);
 assert.deepEqual(ids([found,source],'found'),['lost']);
});
test('源记录已完成、不存在或数据为空时不推荐',()=>{
 assert.deepEqual(ids([]),[]);assert.deepEqual(ids([found]),[]);
 assert.deepEqual(ids([{...source,status:'completed'},found]),[]);
});
test('类别必须相同，只有类别地点时间相同但名称无关不会推荐',()=>{
 assert.deepEqual(ids([source,{...found,category:'其他'}]),[]);
 assert.deepEqual(ids([source,{...found,title:'白色水杯'}]),[]);
});
test('相同名称和包含关系命中，中文连续双字允许部分相似',()=>{
 assert.equal(rules.similarity('黑色雨伞','黑色雨伞'),1);
 assert.equal(rules.similarity('雨伞','黑色雨伞'),0.85);
 assert.ok(rules.similarity('黑色雨伞','蓝色雨伞')>=0.25);
 assert.equal(rules.similarity('黑色雨伞','黑色水杯'),0.2);
});
test('名称忽略大小写、空白、标点和全半角差异，不解释正则',()=>{
 assert.equal(rules.similarity('Ａｉｒ Pods','air-pods'),1);
 assert.equal(rules.similarity('',''),0);
 assert.equal(rules.similarity('伞','雨伞'),0);
 assert.equal(rules.similarity('.*','水杯'),0);
});
test('时间窗口包含七天边界，超过七天排除',()=>{
 assert.deepEqual(ids([source,{...found,eventTime:'2026-10-13 12:00'}]),['found']);
 assert.deepEqual(ids([source,{...found,eventTime:'2026-10-13 12:01'}]),[]);
 assert.deepEqual(ids([source,{...found,eventTime:'2026-09-29 12:00'}]),['found']);
});
test('时间解析拒绝日期溢出，跨月及跨年差值正确',()=>{
 assert.ok(Number.isNaN(rules.eventTimestamp('2026-02-30 12:00')));
 assert.ok(Number.isNaN(rules.eventTimestamp('2026-10-06 24:00')));
 assert.ok(Number.isFinite(rules.eventTimestamp('2024-02-29 12:00')));
 assert.equal(rules.eventTimestamp('2027-01-01 12:00')-rules.eventTimestamp('2026-12-31 12:00'),86400000);
});
test('缺失或非法事件时间不获得时间加分也不产生时间理由',()=>{
 const result=rules.recommend([source,{...found,eventTime:'unknown'}],'lost')[0];
 assert.ok(result);assert.equal(result.reasons.some(x=>x.includes('时间')),false);
 assert.ok(result.score<rules.recommend([source,found],'lost')[0].score);
});
test('名称、地点与时间更接近的结果优先，理由对应实际匹配',()=>{
 const weak={...found,id:'weak',title:'蓝色雨伞',place:'教学楼',eventTime:'2026-10-10 12:00'};
 const results=rules.recommend([source,weak,found],'lost');
 assert.deepEqual(results.map(x=>x.item.id),['found','weak']);
 assert.deepEqual(results[0].reasons,['物品名称相同','类别相同','地点相同','时间相差不超过 1 天']);
 assert.ok(!results[1].reasons.some(x=>x.includes('地点')));
});
test('默认最多三条，同分按发布时间及编号确定顺序，支持空限制',()=>{
 const candidates=['c','a','b','d'].map(id=>({...found,id}));
 assert.deepEqual(ids([source,...candidates]),['a','b','c']);
 assert.deepEqual(ids([source,...candidates],'lost',0),[]);
 assert.equal(ids([source,...candidates],'lost',2).length,2);
 assert.equal(ids([source,...candidates],'lost',Infinity).length,3);
 const newer={...found,id:'new',createdAt:'2026-10-07T12:00:00+08:00'};
 assert.equal(ids([source,...candidates,newer])[0],'new');
});
test('不读取联系方式、归属或图片，不修改原数组和记录',()=>{
 const items=[source,{...found,contact:'秘密',image:'',isMine:true}];const before=structuredClone(items);
 const a=rules.recommend(items,'lost');const b=rules.recommend([source,{...found,contact:'不同',image:'other',isMine:false}],'lost');
 assert.equal(a[0].score,b[0].score);assert.deepEqual(a[0].reasons,b[0].reasons);assert.deepEqual(items,before);
});
test('标记完成或删除后线索消失，恢复进行中后重新推荐',()=>{
 const mine={...found,isMine:true};const items=[source,mine];
 assert.deepEqual(ids(core.changeStatus(items,'found','completed')),[]);
 const restored=core.changeStatus(core.changeStatus(items,'found','completed'),'found','active');
 assert.deepEqual(ids(restored),['found']);assert.deepEqual(ids(core.deletePost(items,'found')),[]);
});
