async function openToolbar(p,id){const menu=p.locator('#'+id);if(await menu.count()&&!await menu.evaluate(e=>e.open))await menu.locator(':scope > summary').click()}
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{let b;try{b=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});const ctx=await b.newContext({acceptDownloads:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));const url='file://'+path.resolve(process.argv[2]||'output','index.html');await p.goto(url);await p.waitForTimeout(500);console.log('errors',errs);assert.deepEqual(errs,[]);
await p.route('https://api.dictionaryapi.dev/**',r=>r.fulfill({json:[{word:'unlistedword',meanings:[{partOfSpeech:'noun',definitions:[{definition:'A controlled dictionary test.'}]}]}]}));
await p.route('https://en.wiktionary.org/**',r=>r.fulfill({status:404,body:'not found'}));
await p.evaluate(()=>showQuick('unlistedword',{left:40,top:100,bottom:120},document.querySelector('.source-text')));await p.waitForFunction(()=>document.querySelector('#quickOnlineResult')?.textContent.includes('A controlled dictionary test.'));await p.locator('[data-action=closeQuick]').click();
await p.locator('#transcript-L1 > summary').click();await p.locator('[data-edit-blanks]').click();await p.locator('.blank-token:not(.is-blank)').first().click();await p.locator('#saveTeacherBlanks').click();assert.equal(await p.evaluate(()=>sections.get('L1').blanks.length),2);
await p.reload();assert.equal(await p.evaluate(()=>sections.get('L1').blanks.length),2);
assert(await p.evaluate(()=>{try{checkedTeacherBlanks(sections.get('L1'),[{paragraph_id:'L1-p1',start:9999,end:10000,quote:'x'}]);return false}catch{return true}}));
await p.evaluate(()=>{saveSession();const record=JSON.parse(localStorage.getItem(saveKey));applyTeacherBlanks({L1:[]});restoreRecord(record)});assert.equal(await p.evaluate(()=>sections.get('L1').blanks.length),2);

await openToolbar(p,'displaySettings');await p.locator('#fontSizeSelect').selectOption({label:'56 · 超大'});
await p.reload();assert.equal(await p.locator('#fontSizeSelect').inputValue(),'56');
const listeningSizes=await p.evaluate(()=>['.listening-view .stem','.listening-view .option','.listen-transcript .ptext'].map(selector=>parseFloat(getComputedStyle(document.querySelector(selector)).fontSize)));
assert(listeningSizes.every(size=>size>=50),JSON.stringify(listeningSizes));
await openToolbar(p,'displaySettings');await p.locator('#fontFamilySelect').selectOption('times');assert.equal(await p.locator('body').getAttribute('data-lesson-font'),'times');await p.locator('#audio-L1').evaluate(audio=>{audio.muted=true});await p.locator('[data-action=playListening][data-sid=L1]').click();await p.waitForFunction(()=>document.querySelector('#audio-L1').currentTime>0,undefined,{timeout:8000});await p.locator('.listen-play').first().click();
const dl=p.waitForEvent('download');await openToolbar(p,'lessonMore');await p.locator('#exportPortableLesson').click();const d=await dl;const dest=path.resolve(process.argv[2]||'output','..','standalone.html');await d.saveAs(dest);
const isolated=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const phone=await isolated.newPage();phone.on('pageerror',e=>errs.push(e.message));await phone.goto('file://'+dest);assert.equal(await phone.evaluate(()=>sections.get('L1').blanks.length),2);assert.equal(await phone.locator('#fontFamilySelect').inputValue(),'times');assert.equal(await phone.locator('#fontSizeSelect').inputValue(),'56');await phone.locator('#audio-L1').evaluate(audio=>{audio.muted=true});await phone.locator('[data-action=playListening][data-sid=L1]').tap();await phone.waitForFunction(()=>document.querySelector('#audio-L1').currentTime>0,undefined,{timeout:8000});assert(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await openToolbar(phone,'displaySettings');await phone.locator('#boardMode').tap();assert(await phone.locator('body').evaluate(e=>e.classList.contains('touch-board')));
assert.equal(await phone.locator('#fontSizeSelect').inputValue(),'56');
assert(await phone.locator('#section-L1 .stem').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=50),'whiteboard mode must honor the selected projection size');
assert.deepEqual(errs,[]);
for(const size of [{width:390,height:844},{width:820,height:1180},{width:1920,height:1080}]){
 await phone.setViewportSize(size);
 assert(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert(await phone.locator('#projectSource').isVisible());
 assert.equal(await phone.locator('#section-L1 .listen-content').evaluate(el=>getComputedStyle(el).display),'block');
 assert.equal(await phone.locator('#questions-L1').evaluate(el=>getComputedStyle(el).overflowY),'visible');
}
await phone.locator('#projectSource').tap();
await phone.waitForFunction(()=>{const transcript=document.querySelector('#transcript-L1');const top=transcript.getBoundingClientRect().top;return transcript.open&&top>=0&&top<180});
await phone.locator('#projectQuestions').tap();
await phone.waitForFunction(()=>{const top=document.querySelector('#questions-L1').getBoundingClientRect().top;return top>=0&&top<230});
await phone.screenshot({path:path.resolve(process.argv[2]||'output','projection-listening.png')});
await phone.locator('[data-group="reading"] .chapter-group-toggle').tap();
await phone.locator('#chapterMenuFloat [data-nav="A"]').tap();
assert.equal(await phone.locator('#section-A .workspace-main').evaluate(el=>getComputedStyle(el).display),'block');
await phone.locator('#projectQuestions').tap();
await phone.waitForFunction(()=>{const top=document.querySelector('#section-A .teaching-tabs').getBoundingClientRect().top;return top>=0&&top<180});
await phone.locator('#section-A [data-action="answer"][data-qid="21"]').tap();
assert(await phone.locator('#q-21 .analysis-panel').first().isVisible());
await phone.screenshot({path:path.resolve(process.argv[2]||'output','projection-reading.png')});
await openToolbar(phone,'displaySettings');
await phone.locator('#fontSizeSelect').selectOption('28');
assert.equal(await phone.locator('#section-A .workspace-main').evaluate(el=>getComputedStyle(el).display),'grid');
assert(await phone.locator('#projectSource').isHidden());
assert.deepEqual(errs,[]);
console.log('PASS blank edit/reload/export; offline audio; projection reflow and jumps; regular split layout restored');}finally{if(b)await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
