import {timedFetch} from './telegram.js';

export const GEMINI_MODEL='gemini-3.8-flash';
export const GEMINI_TTS_MODEL='gemini-3.8-flash-lite-tts';
export const GEMINI_VOICE_MAP={luna:'Sulafat',asteria:'Aoede',orion:'Orus',athena:'Kore',arcas:'Achird'};

let geminiDeniedUntil=0;
export const hasGemini=env=>!!env.GEMINI_API_KEY&&Date.now()>=geminiDeniedUntil;
export function isGeminiQuotaError(e){const s=String(e?.message||e||'').toLowerCase();return s.includes('gemini 429')||s.includes('resource_exhausted')||(s.includes('quota')&&s.includes('gemini'));}
export function isGeminiBusyError(e){const s=String(e?.message||e||'').toLowerCase();return s.includes('gemini 503')||(s.includes('unavailable')&&s.includes('gemini'));}
export function isGeminiAccessDenied(e){const s=String(e?.message||e||'').toLowerCase();return s.includes('gemini 403')||s.includes('denied access')||s.includes('permission_denied')||s.includes('permission denied');}

function bytesToBase64(bytes){let bin='';for(let i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(bin);}
function base64ToBytes(s){const bin=atob(String(s||'').replace(/^data:[^,]+,/,'')),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out;}

async function geminiCall(env,model,body,ms=90000){
  if(!hasGemini(env))throw new Error('Gemini API key unavailable');
  const r=await timedFetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{
    method:'POST',headers:{'x-goog-api-key':env.GEMINI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)
  },ms);
  const txt=await r.text();let j=null;try{j=JSON.parse(txt);}catch{}
  if(!r.ok){
    const err=new Error(`Gemini ${r.status}: ${String(j?.error?.message||txt||'request failed').slice(0,500)}`);
    if(r.status===403)geminiDeniedUntil=Date.now()+5*60*1000;
    throw err;
  }
  return j||{};
}
function geminiText(j){const parts=j?.candidates?.[0]?.content?.parts||[];return parts.map(p=>typeof p?.text==='string'?p.text:'').filter(Boolean).join('\n').trim();}

export async function geminiTranscribe(env,bytes,mime='audio/ogg'){
  const j=await geminiCall(env,GEMINI_MODEL,{contents:[{role:'user',parts:[
    {inline_data:{mime_type:mime,data:bytesToBase64(bytes)}},
    {text:'Transcribe this audio accurately. Preserve the spoken language. Return only the transcript, with no commentary.'}
  ]}],generationConfig:{temperature:0}});
  const t=geminiText(j);if(!t)throw new Error('Gemini returned empty transcript');return t;
}

export async function geminiAnalyzeMedia(env,bytes,mime,prompt){
  const j=await geminiCall(env,GEMINI_MODEL,{contents:[{role:'user',parts:[
    {inline_data:{mime_type:mime,data:bytesToBase64(bytes)}},
    {text:String(prompt||'Analyse this media carefully and describe the important details.')}
  ]}],generationConfig:{temperature:0.2,maxOutputTokens:2500}});
  const t=geminiText(j);if(!t)throw new Error('Gemini returned empty media analysis');return t;
}

export async function geminiTts(env,text,voice='Sulafat'){
  const j=await geminiCall(env,GEMINI_TTS_MODEL,{contents:[{role:'user',parts:[{
    text:String(text||''),speech_metadata:{style:'natural, clear and friendly'}
  }]}],generationConfig:{
    responseModalities:['AUDIO'],responseFormat:{audio:{mimeType:'AUDIO_WAV',sampleRate:24000}},speechConfig:{voiceConfig:{voice}}
  }},90000);
  const parts=j?.candidates?.[0]?.content?.parts||[];
  const p=parts.find(x=>x?.inlineData?.data||x?.inline_data?.data),data=p?.inlineData?.data||p?.inline_data?.data;
  if(!data)throw new Error('Gemini TTS returned no audio');
  const b=base64ToBytes(data);if(b.byteLength<256)throw new Error('Gemini TTS returned empty audio');
  return new Blob([b],{type:'audio/wav'});
}
