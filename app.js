const tabs=[...document.querySelectorAll('.tab')];
const panels={
  medizin:document.getElementById('panel-medizin'),
  alltag:document.getElementById('panel-alltag'),
  nachrichten:document.getElementById('panel-nachrichten')
};
function activate(name,save=true){
  if(!panels[name]) name='medizin';
  tabs.forEach(btn=>{const on=btn.dataset.tab===name;btn.classList.toggle('active',on);btn.setAttribute('aria-selected',String(on));});
  Object.entries(panels).forEach(([key,p])=>{const on=key===name;p.hidden=!on;p.classList.toggle('active',on);});
  if(save) localStorage.setItem('forensik-zentrale-tab',name);
  try{history.replaceState(null,'','#'+name)}catch(e){}
}
tabs.forEach(btn=>btn.addEventListener('click',()=>activate(btn.dataset.tab)));
const hash=location.hash.replace('#','');
activate(hash||localStorage.getItem('forensik-zentrale-tab')||'medizin',false);
window.addEventListener('hashchange',()=>activate(location.hash.replace('#',''),false));
let deferredPrompt=null; const installBtn=document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;installBtn.hidden=false;});
installBtn.addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;installBtn.hidden=true;});
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
