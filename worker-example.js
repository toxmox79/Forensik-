/**
 * Optionaler Cloudflare Worker für Forensik-Zentrale v1.2.
 * Secrets im Worker setzen: OPENROUTER_API_KEY, GEMINI_API_KEY, GROQ_API_KEY, TAVILY_API_KEY.
 * Optional ALLOWED_ORIGIN setzen, z.B. https://deinname.github.io
 */
export default {
  async fetch(request, env) {
    const origin=request.headers.get('Origin')||'';
    const allowed=env.ALLOWED_ORIGIN||'*';
    const cors={
      'Access-Control-Allow-Origin': allowed==='*'?'*':(origin===allowed?origin:allowed),
      'Access-Control-Allow-Headers':'Content-Type',
      'Access-Control-Allow-Methods':'POST,OPTIONS',
      'Vary':'Origin'
    };
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers:cors});
    if(request.method!=='POST') return json({error:'POST required'},405,cors);
    if(allowed!=='*' && origin && origin!==allowed) return json({error:'Origin not allowed'},403,cors);
    try{
      const b=await request.json();
      if(b.kind==='search'){
        if(!env.TAVILY_API_KEY) return json({error:'TAVILY_API_KEY fehlt'},400,cors);
        const max=b.depth==='forensisch'?9:b.depth==='gruendlich'?7:5;
        const r=await fetch('https://api.tavily.com/search',{method:'POST',headers:{'Authorization':'Bearer '+env.TAVILY_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({query:b.query,search_depth:b.depth==='schnell'?'basic':'advanced',max_results:max,topic:b.topic||'general',include_answer:false,include_raw_content:false,include_images:false,include_usage:true})});
        return relay(r,cors);
      }
      if(b.kind==='llm'){
        const provider=b.provider||'openrouter';
        if(provider==='gemini'){
          if(!env.GEMINI_API_KEY) return json({error:'GEMINI_API_KEY fehlt'},400,cors);
          const model=encodeURIComponent(b.model||'gemini-2.5-flash');
          const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},body:JSON.stringify({contents:[{role:'user',parts:[{text:b.prompt||''}]}],generationConfig:{temperature:.2,maxOutputTokens:b.max_tokens||24000}})});
          return relay(r,cors);
        }
        const isGroq=provider==='groq';
        const key=isGroq?env.GROQ_API_KEY:env.OPENROUTER_API_KEY;
        if(!key) return json({error:(isGroq?'GROQ_API_KEY':'OPENROUTER_API_KEY')+' fehlt'},400,cors);
        const endpoint=isGroq?'https://api.groq.com/openai/v1/chat/completions':'https://openrouter.ai/api/v1/chat/completions';
        const r=await fetch(endpoint,{method:'POST',headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json','X-Title':'Forensik-Zentrale PWA'},body:JSON.stringify({model:b.model||(isGroq?'openai/gpt-oss-20b':'openrouter/free'),messages:[{role:'user',content:b.prompt||''}],temperature:.2,max_tokens:b.max_tokens||24000,stream:false})});
        return relay(r,cors);
      }
      return json({error:'Unbekannter kind-Wert'},400,cors);
    }catch(e){return json({error:e?.message||String(e)},500,cors)}
  }
};
async function relay(r,cors){const text=await r.text();return new Response(text,{status:r.status,headers:{...cors,'Content-Type':r.headers.get('Content-Type')||'application/json'}})}
function json(obj,status,cors){return new Response(JSON.stringify(obj),{status,headers:{...cors,'Content-Type':'application/json'}})}
