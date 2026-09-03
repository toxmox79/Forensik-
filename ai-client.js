(()=>{
'use strict';
const MODULE=window.FORENSIK_MODULE||location.pathname.split('/').pop().split('.')[0]||'medizin';
const $=s=>document.querySelector(s);
const STORAGE='forensik-ai-config-v1';
const SECRET_PREFIX='forensik-ai-secret-';
const defaults={mode:'manual',provider:'openrouter',modelOpenRouter:'openrouter/free',modelGemini:'gemini-2.5-flash',modelGroq:'openai/gpt-oss-20b',webEnabled:true,researchDepth:'gruendlich',redTeam:true,rememberKeys:false,proxyUrl:''};
let cfg=loadConfig();
let running=false;
function loadConfig(){try{return {...defaults,...JSON.parse(localStorage.getItem(STORAGE)||'{}')}}catch(_){return {...defaults}}}
function saveConfig(){const safe={...cfg};delete safe.openrouterKey;delete safe.geminiKey;delete safe.groqKey;delete safe.tavilyKey;localStorage.setItem(STORAGE,JSON.stringify(safe));}
function secretName(k){return SECRET_PREFIX+k}
function getSecret(k){return sessionStorage.getItem(secretName(k))||localStorage.getItem(secretName(k))||''}
function setSecret(k,v,remember){sessionStorage.removeItem(secretName(k));localStorage.removeItem(secretName(k));if(!v)return;(remember?localStorage:sessionStorage).setItem(secretName(k),v)}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function providerModel(){if(cfg.provider==='gemini')return cfg.modelGemini||defaults.modelGemini;if(cfg.provider==='groq')return cfg.modelGroq||defaults.modelGroq;return cfg.modelOpenRouter||defaults.modelOpenRouter}
function moduleLabel(){return MODULE==='medizin'?'Medizin':MODULE==='alltag'?'Alltag':'Nachrichten'}
function isRedTeamDefault(){return MODULE!=='medizin'}
function insertUI(){
  const step=$('#step1'); if(!step)return;
  const head=step.querySelector('.section-head');
  const box=document.createElement('div');box.className='ai-mode-card';box.id='aiModeCard';
  box.innerHTML=`<div class="ai-mode-head"><div><span class="ai-badge">✨ Hybridmodus</span><h3>Analyseweg wählen</h3><p><b>Manuell</b> bleibt der bisherige Ablauf. <b>Integrierte KI</b> erzeugt den Prompt, recherchiert optional im Web, ruft das gewählte Modell auf und übernimmt das JSON direkt in den Bericht.</p></div><div class="ai-segmented" role="group" aria-label="Analyseweg"><button class="ai-mode-btn" data-ai-mode="manual" type="button">Manuell</button><button class="ai-mode-btn" data-ai-mode="integrated" type="button">✨ Integrierte KI</button></div></div>
  <div id="aiPanel" class="ai-panel" hidden>
    <div class="ai-grid">
      <label class="ai-field"><span>KI-Anbieter</span><select id="aiProvider"><option value="openrouter">OpenRouter</option><option value="gemini">Google Gemini</option><option value="groq">Groq</option></select><small class="ai-provider-hint">OpenRouter kann mit <code>openrouter/free</code> automatisch ein kostenloses Modell wählen.</small></label>
      <label class="ai-field"><span>Modell</span><input id="aiModel" type="text" autocomplete="off"></label>
      <label class="ai-field ai-key-row"><span id="aiKeyLabel">API-Schlüssel</span><input id="aiKey" type="password" autocomplete="off" placeholder="nur auf diesem Gerät"><button id="aiKeyToggle" class="ai-key-toggle" type="button">zeigen</button></label>
      <label class="ai-field"><span>Recherche-Tiefe</span><select id="aiDepth"><option value="schnell">Schnell</option><option value="gruendlich">Gründlich</option><option value="forensisch">Forensisch</option></select></label>
    </div>
    <details class="ai-settings-details"><summary>Websuche, Schlüssel & sicherer Proxy</summary><div class="ai-grid" style="margin-top:13px">
      <label class="ai-field ai-key-row"><span>Tavily API-Schlüssel (optional)</span><input id="tavilyKey" type="password" autocomplete="off" placeholder="für aktuelle Webrecherche"><button id="tavilyKeyToggle" class="ai-key-toggle" type="button">zeigen</button></label>
      <label class="ai-field"><span>Sicherer Proxy / Cloudflare Worker (optional)</span><input id="proxyUrl" type="url" inputmode="url" placeholder="https://…workers.dev"></label>
    </div>
    <div class="ai-inline-checks"><label><input id="webEnabled" type="checkbox"> Webrecherche verwenden</label><label><input id="redTeamEnabled" type="checkbox"> zweite Red-Team-KI-Phase</label><label><input id="rememberKeys" type="checkbox"> API-Schlüssel dauerhaft auf diesem Gerät speichern</label></div>
    <p class="ai-warning">API-Schlüssel werden niemals in die PWA-Dateien geschrieben. Ohne „dauerhaft speichern“ liegen sie nur im Sitzungsspeicher. Bei einer öffentlich zugänglichen PWA ist ein eigener Worker/Proxy die sicherere Variante.</p></details>
    <div class="ai-actions"><button id="runIntegratedAi" class="btn primary" type="button">✨ Recherche & Analyse starten</button><button id="testAiConnection" class="btn secondary" type="button">Verbindung testen</button><button id="clearAiKeys" class="btn ghost" type="button">Schlüssel löschen</button></div>
    <div id="aiStatus" class="ai-status">Bereit. Für reine Textanalyse genügt ein KI-Schlüssel. Für aktuelle Recherche zusätzlich Tavily oder einen Proxy konfigurieren.<div class="ai-progress"><i></i></div></div>
    <details id="aiResearchDetails" class="ai-settings-details" hidden><summary>Verwendete Recherche-Snippets anzeigen</summary><pre id="aiResearchPreview" class="ai-research-preview"></pre></details>
  </div>`;
  if(head)head.insertAdjacentElement('afterend',box);else step.prepend(box);
  bindUI(); renderUI();
}
function bindUI(){
  document.querySelectorAll('[data-ai-mode]').forEach(b=>b.addEventListener('click',()=>{cfg.mode=b.dataset.aiMode;saveConfig();renderUI()}));
  $('#aiProvider').addEventListener('change',e=>{syncModelFromInput();cfg.provider=e.target.value;saveConfig();renderUI()});
  $('#aiModel').addEventListener('change',()=>{const v=$('#aiModel').value.trim();if(cfg.provider==='gemini')cfg.modelGemini=v;else if(cfg.provider==='groq')cfg.modelGroq=v;else cfg.modelOpenRouter=v;saveConfig()});
  $('#aiDepth').addEventListener('change',e=>{cfg.researchDepth=e.target.value;saveConfig()});
  $('#webEnabled').addEventListener('change',e=>{cfg.webEnabled=e.target.checked;saveConfig()});
  $('#redTeamEnabled').addEventListener('change',e=>{cfg.redTeam=e.target.checked;saveConfig()});
  $('#rememberKeys').addEventListener('change',e=>{cfg.rememberKeys=e.target.checked;['openrouter','gemini','groq','tavily'].forEach(k=>setSecret(k,getSecret(k),cfg.rememberKeys));saveConfig()});
  $('#proxyUrl').addEventListener('change',e=>{cfg.proxyUrl=e.target.value.trim().replace(/\/$/,'');saveConfig()});
  $('#aiKey').addEventListener('change',e=>setSecret(cfg.provider,e.target.value.trim(),cfg.rememberKeys));
  $('#tavilyKey').addEventListener('change',e=>setSecret('tavily',e.target.value.trim(),cfg.rememberKeys));
  $('#aiKeyToggle').addEventListener('click',()=>togglePass('#aiKey','#aiKeyToggle'));
  $('#tavilyKeyToggle').addEventListener('click',()=>togglePass('#tavilyKey','#tavilyKeyToggle'));
  $('#clearAiKeys').addEventListener('click',()=>{['openrouter','gemini','groq','tavily'].forEach(k=>setSecret(k,'',false));renderUI();setStatus('API-Schlüssel wurden aus Sitzung und dauerhaftem Speicher gelöscht.','ok',0)});
  $('#testAiConnection').addEventListener('click',testConnection);
  $('#runIntegratedAi').addEventListener('click',runIntegrated);
}
function syncModelFromInput(){const el=$('#aiModel');if(!el)return;const v=el.value.trim();if(cfg.provider==='gemini')cfg.modelGemini=v;else if(cfg.provider==='groq')cfg.modelGroq=v;else cfg.modelOpenRouter=v;}
function renderUI(){
  document.querySelectorAll('[data-ai-mode]').forEach(b=>b.classList.toggle('active',b.dataset.aiMode===cfg.mode));
  const panel=$('#aiPanel'); if(panel)panel.hidden=cfg.mode!=='integrated';
  if(!panel)return;
  $('#aiProvider').value=cfg.provider;
  $('#aiModel').value=providerModel();
  $('#aiDepth').value=cfg.researchDepth||'gruendlich';
  $('#webEnabled').checked=cfg.webEnabled!==false;
  $('#redTeamEnabled').checked=cfg.redTeam ?? isRedTeamDefault();
  $('#rememberKeys').checked=!!cfg.rememberKeys;
  $('#proxyUrl').value=cfg.proxyUrl||'';
  $('#aiKey').value=getSecret(cfg.provider);
  $('#tavilyKey').value=getSecret('tavily');
  $('#aiKeyLabel').textContent=(cfg.provider==='openrouter'?'OpenRouter':cfg.provider==='gemini'?'Gemini':'Groq')+' API-Schlüssel';
  const hint=panel.querySelector('.ai-provider-hint');
  hint.innerHTML=cfg.provider==='openrouter'?'Standard: <code>openrouter/free</code> – automatischer Router für kostenlose Modelle.':cfg.provider==='gemini'?'Modellname ist frei änderbar, z. B. <code>gemini-2.5-flash</code>.':'Groq ist OpenAI-kompatibel; Modellname ist frei änderbar.';
}
function togglePass(sel,btnSel){const el=$(sel),btn=$(btnSel);const show=el.type==='password';el.type=show?'text':'password';btn.textContent=show?'verbergen':'zeigen'}
function setStatus(msg,kind='running',pct=0){const el=$('#aiStatus');if(!el)return;el.className='ai-status '+kind;const bar=Math.max(0,Math.min(100,pct));el.innerHTML=`${esc(msg)}<div class="ai-progress"><i style="width:${bar}%"></i></div>`}
function getInputSummary(){
  const q=$('#queryInput')?.value?.trim()||'';
  const focus=$('#focusInput')?.value?.trim()||'';
  const article=$('#articleText')?.value?.trim()||'';
  const countries=$('#countriesInput')?.value?.trim()||'';
  return {q,focus,article,countries};
}
function researchQueries(){const x=getInputSummary();let seed=x.q;if(/^https?:\/\//i.test(seed)&&x.article)seed=x.article.slice(0,700);seed=(seed+' '+x.focus).trim();if(!seed)seed=x.article.slice(0,700);const qs=[];if(MODULE==='medizin'){qs.push(seed);if(cfg.researchDepth!=='schnell')qs.push(`${seed} systematic review primary study guideline criticism adverse effects historical evidence`)}else if(MODULE==='nachrichten'){qs.push(seed);if(cfg.researchDepth!=='schnell')qs.push(`${seed} original source official document law primary source`);if(cfg.researchDepth==='forensisch'||x.countries)qs.push(`${seed} international coverage ${x.countries||'France Poland UK USA India'} alternative perspective`)}else{qs.push(seed);if(cfg.researchDepth!=='schnell')qs.push(`${seed} primary sources chronology counter evidence criticism`);if(cfg.researchDepth==='forensisch')qs.push(`${seed} international sources opposing perspective documents archive`)}return [...new Set(qs.filter(Boolean))].slice(0,cfg.researchDepth==='forensisch'?3:cfg.researchDepth==='gruendlich'?2:1)}
function counterQuery(){const x=getInputSummary();const base=(x.q+' '+x.focus).trim();return MODULE==='medizin'?`${base} evidence against claimed effect null results harms alternative explanation`:MODULE==='nachrichten'?`${base} contradiction correction counterevidence original source alternative international reporting`: `${base} counterevidence contradiction opposing primary sources alternative explanation`;}
async function tavilySearch(query,topic){
  if(!query)return [];
  if(cfg.proxyUrl){const data=await postJson(cfg.proxyUrl,{kind:'search',query,topic,depth:cfg.researchDepth});return data.results||[]}
  const key=getSecret('tavily');if(!key)throw new Error('Für Webrecherche fehlt der Tavily-Schlüssel oder ein Proxy.');
  const max=cfg.researchDepth==='forensisch'?9:cfg.researchDepth==='gruendlich'?7:5;
  const body={query,search_depth:cfg.researchDepth==='schnell'?'basic':'advanced',max_results:max,topic:topic||'general',include_answer:false,include_raw_content:false,include_images:false,include_usage:true};
  const r=await fetch('https://api.tavily.com/search',{method:'POST',headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body)});const t=await r.text();if(!r.ok)throw new Error(apiError(t,r.status));const d=JSON.parse(t);return d.results||[];
}
function formatResearch(blocks){let n=1;return blocks.flatMap(b=>b.results.map(r=>`[WEB-${n++}] ${r.title||''}\nURL: ${r.url||''}\n${String(r.content||'').slice(0,1800)}`)).join('\n\n')}
async function collectResearch(red=false){if(!cfg.webEnabled)return '';const topic=MODULE==='nachrichten'?'news':'general';const qs=red?[counterQuery()]:researchQueries();if(!qs.length)return '';const blocks=[];for(let i=0;i<qs.length;i++){setStatus(`${red?'Red-Team-Recherche':'Webrecherche'} ${i+1}/${qs.length}: ${qs[i].slice(0,90)}…`,'running',red?62+i*6:12+i*10);try{const results=await tavilySearch(qs[i],topic);blocks.push({query:qs[i],results})}catch(e){if(/Tavily-Schlüssel/.test(e.message))throw e;blocks.push({query:qs[i],results:[],error:e.message})}}
  const text=formatResearch(blocks);const det=$('#aiResearchDetails'),pre=$('#aiResearchPreview');if(text){det.hidden=false;pre.textContent=(pre.textContent?pre.textContent+'\n\n---\n\n':'')+(red?'RED-TEAM\n':'')+text}return text;
}
async function callModel(prompt){
  const model=providerModel();
  if(cfg.proxyUrl){const d=await postJson(cfg.proxyUrl,{kind:'llm',provider:cfg.provider,model,prompt,max_tokens:24000});return extractText(d)}
  const key=getSecret(cfg.provider);if(!key)throw new Error(`Für ${cfg.provider==='openrouter'?'OpenRouter':cfg.provider==='gemini'?'Gemini':'Groq'} fehlt der API-Schlüssel.`);
  if(cfg.provider==='gemini'){
    const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const body={contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:.2,maxOutputTokens:24000}};
    const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(body)});const t=await r.text();if(!r.ok)throw new Error(apiError(t,r.status));const d=JSON.parse(t);return d.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('')||'';
  }
  const endpoint=cfg.provider==='groq'?'https://api.groq.com/openai/v1/chat/completions':'https://openrouter.ai/api/v1/chat/completions';
  const headers={'Content-Type':'application/json','Authorization':'Bearer '+key};if(cfg.provider==='openrouter'){headers['X-Title']='Forensik-Zentrale PWA';headers['HTTP-Referer']=location.origin&&location.origin!=='null'?location.origin:'https://localhost'}
  const body={model,messages:[{role:'user',content:prompt}],temperature:.2,max_tokens:24000,stream:false};
  const r=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify(body)});const t=await r.text();if(!r.ok)throw new Error(apiError(t,r.status));const d=JSON.parse(t);return d.choices?.[0]?.message?.content||'';
}
function extractText(d){if(typeof d==='string')return d;if(d?.text)return d.text;if(d?.choices?.[0]?.message?.content)return d.choices[0].message.content;if(d?.candidates?.[0]?.content?.parts)return d.candidates[0].content.parts.map(x=>x.text||'').join('');return JSON.stringify(d)}
async function postJson(url,body){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const t=await r.text();if(!r.ok)throw new Error(apiError(t,r.status));try{return JSON.parse(t)}catch(_){return {text:t}}}
function apiError(t,status){try{const d=JSON.parse(t);return d.error?.message||d.detail?.error||d.message||`API-Fehler ${status}`}catch(_){return (t||`API-Fehler ${status}`).slice(0,500)}}
function stripFence(s){s=String(s||'').trim();const m=s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);return (m?m[1]:s).trim()}
function parseOrExtractJson(s){const raw=stripFence(s);try{JSON.parse(raw);return raw}catch(_){const a=raw.indexOf('{'),b=raw.lastIndexOf('}');if(a>=0&&b>a){const x=raw.slice(a,b+1);JSON.parse(x);return x}throw new Error('Die KI-Antwort enthält kein gültiges JSON. Öffne „Prompt“ bzw. kopiere die Antwort manuell und prüfe sie.')}}
function buildPhasePrompt(base,research,phase1='',redResearch=''){
  const supplied=research?`\n\nBEREITS ABGERUFENE WEBQUELLEN / SNIPPETS\nDiese Snippets sind Suchhilfen, keine automatisch verifizierten Wahrheiten. Prüfe Herkunft, Unabhängigkeit und Widersprüche. Verwende URLs in deinem Quellenverzeichnis, soweit relevant.\n${research}`:'';
  if(!phase1)return `${base}${supplied}\n\nINTEGRIERTE-KI-PHASE 1\nFühre jetzt die geforderte Analyse durch. Nutze die bereitgestellten Webquellen zusätzlich zu deinem eigenen Wissen. Erfinde keine Quellen und kennzeichne nicht überprüfbare Punkte. Gib ausschließlich den im Master-Prompt verlangten JSON-Codeblock aus.`;
  return `${base}${supplied}\n\nVORLÄUFIGES ERGEBNIS AUS PHASE 1\n${phase1}\n\nZUSÄTZLICHE RED-TEAM-QUELLEN\n${redResearch||'Keine zusätzlichen Webquellen verfügbar.'}\n\nVERPFLICHTENDE PHASE 2 – RED TEAM / FALSIFIKATION\nBehandle das Ergebnis aus Phase 1 als möglicherweise falsch. Suche logisch gezielt nach Gegenbelegen, alternativen Erklärungen, ausgelassenen Primärquellen, widersprechenden Zahlen, anderen Ländern/Sprachen und Fehlern in der ersten Bewertung. Übernimm Phase 1 nicht bloß sprachlich. Korrigiere sie, falls die Gegenprüfung dies erfordert. Gib anschließend ausschließlich EINEN endgültigen, vollständigen JSON-Codeblock gemäß dem ursprünglichen Master-Prompt aus.`;
}
async function testConnection(){if(running)return;try{running=true;syncModelFromInput();cfg.provider=$('#aiProvider').value;saveConfig();setSecret(cfg.provider,$('#aiKey').value.trim(),cfg.rememberKeys);setSecret('tavily',$('#tavilyKey').value.trim(),cfg.rememberKeys);cfg.proxyUrl=$('#proxyUrl').value.trim().replace(/\/$/,'');saveConfig();setStatus('Teste KI-Verbindung…','running',35);const text=await callModel('Antworte exakt mit: OK');setStatus(`KI-Verbindung erfolgreich (${providerModel()}). Antwort: ${String(text).trim().slice(0,80)}`,'ok',100)}catch(e){setStatus(e.message,'error',0)}finally{running=false}}
async function runIntegrated(){if(running)return;const q=getInputSummary().q;if(!q&&!getInputSummary().article){setStatus('Bitte zuerst das zu untersuchende Thema, den Link oder Text eingeben.','error',0);return}try{
  running=true;syncModelFromInput();cfg.provider=$('#aiProvider').value;cfg.researchDepth=$('#aiDepth').value;cfg.webEnabled=$('#webEnabled').checked;cfg.redTeam=$('#redTeamEnabled').checked;cfg.rememberKeys=$('#rememberKeys').checked;cfg.proxyUrl=$('#proxyUrl').value.trim().replace(/\/$/,'');saveConfig();setSecret(cfg.provider,$('#aiKey').value.trim(),cfg.rememberKeys);setSecret('tavily',$('#tavilyKey').value.trim(),cfg.rememberKeys);$('#aiResearchPreview').textContent='';$('#aiResearchDetails').hidden=true;
  setStatus('Erzeuge den vollständigen Forensik-Prompt…','running',5);$('#generatePromptBtn')?.click();await new Promise(r=>setTimeout(r,50));const base=$('#promptOutput')?.value?.trim();if(!base)throw new Error('Der Master-Prompt konnte nicht erzeugt werden.');
  let research='';if(cfg.webEnabled){try{research=await collectResearch(false)}catch(e){if(!cfg.proxyUrl&&!getSecret('tavily')){setStatus('Keine Websuche konfiguriert – fahre mit KI-Analyse ohne aktuelle Webquellen fort.','running',25)}else throw e}}
  setStatus(`Phase 1: ${moduleLabel()}-Analyse mit ${providerModel()}…`,'running',38);const phase1=await callModel(buildPhasePrompt(base,research));if(!phase1.trim())throw new Error('Die KI hat keine Antwort geliefert.');
  let final=phase1;
  if(cfg.redTeam){let redResearch='';if(cfg.webEnabled){try{redResearch=await collectResearch(true)}catch(e){redResearch='';}}
    setStatus('Phase 2: Red Team versucht die erste Schlussfolgerung gezielt zu widerlegen…','running',74);final=await callModel(buildPhasePrompt(base,research,phase1,redResearch));if(!final.trim())throw new Error('Die Red-Team-Phase hat keine Antwort geliefert.');}
  setStatus('Prüfe JSON und übernehme es in den Bericht…','running',91);const json=parseOrExtractJson(final);$('#jsonInput').value=json;$('#validateBtn')?.click();await new Promise(r=>setTimeout(r,40));$('#renderBtn')?.click();setStatus(`Fertig. ${cfg.redTeam?'Zwei KI-Phasen einschließlich Red Team wurden durchgeführt.':'Eine KI-Analyse wurde durchgeführt.'}`,'ok',100);
 }catch(e){console.error(e);setStatus(e.message||String(e),'error',0)}finally{running=false}}
insertUI();
})();
