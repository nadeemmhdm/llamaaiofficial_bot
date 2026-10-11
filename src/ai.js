import {CHAT_API,SEARCH_API,GITHUB_USER,GITHUB_URL,MODELS,VOICES,PLAN_LIMITS,LLAMA_BIRTHDAY,responseKeyboard,truncate,escapeHtml,escapeAttr,isPaid,activeModel} from './config.js';
import {timedFetch,sendText,editText,sendAction,downloadVoice,sendVoiceBlob,sendAudioBlob,renderHtml,splitRendered,stripFormatting} from './telegram.js';
import {memories,saveMemory,saveAction,ownedAction,getUsage,bumpUsage} from './db.js';

function limitsFor(user){return PLAN_LIMITS[isPaid(user)?'paid':'free'];}
function todayIST(){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return`${p.find(x=>x.type==='year')?.value}-${p.find(x=>x.type==='month')?.value}-${p.find(x=>x.type==='day')?.value}`;}
function isDailyVoiceQuotaError(e){const s=String(e?.message||e||'').toLowerCase();return s.includes('daily free allocation')||s.includes('10,000 neurons')||s.includes('10000 neurons')||(s.includes('neurons')&&s.includes('upgrade'))||s.includes('error: 4006')||s.includes('4006:');}
function isCapacityError(e){const s=String(e?.message||e||'').toLowerCase();return s.includes('429')||s.includes('capacity temporarily exceeded')||s.includes('3040');}
function bytesToBase64(bytes){let bin='';for(let i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(bin);}
function base64ToBytes(s){const bin=atob(String(s||'').replace(/^data:[^,]+,/,'')),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out;}

function thinkingFrames(text,useWeb){
  const q=String(text||'').toLowerCase();
  if(useWeb)return ['🔎 <i>Searching fresh sources…</i>','🌐 <i>Checking the latest information…</i>','🧭 <i>Comparing useful sources…</i>','🧠 <i>Connecting the findings…</i>','✨ <i>Preparing your answer…</i>'];
  if(/code|bug|error|github|deploy|api|worker|javascript|python|react|sql/i.test(q))return ['🧩 <i>Understanding the issue…</i>','🔍 <i>Inspecting the details…</i>','🧠 <i>Working through the logic…</i>','🛠 <i>Building a useful solution…</i>','✨ <i>Polishing the answer…</i>'];
  return ['💭 <i>Understanding your request…</i>','🧠 <i>Connecting the details…</i>','✨ <i>Working on a clear answer…</i>','🪄 <i>Refining the response…</i>','🦙 <i>Almost ready…</i>'];
}
function startThinkingAnimation(env,chatId,messageId,text,useWeb){
  const frames=thinkingFrames(text,useWeb),spin=['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];let i=0,active=true,pending=Promise.resolve();
  const timer=setInterval(()=>{if(!active)return;const frame=spin[i%spin.length]+' '+frames[i%frames.length];i++;pending=pending.then(async()=>{if(!active)return;await editText(env,chatId,messageId,frame,null,{parse_mode:'HTML'}).catch(()=>{});});},2400);
  return async()=>{active=false;clearInterval(timer);await pending.catch(()=>{});};
}

export async function generateReply(env,ctx,msg,text,user,opt={}){
  const uid=Number(msg.from.id),chatId=Number(msg.chat.id),started=Date.now(),paid=isPaid(user),limits=limitsFor(user),usage=await getUsage(env,uid);
  if(Number(usage.ai_count)>=limits.ai){return sendText(env,chatId,`⏳ <b>Monthly AI limit reached.</b>\n\nYour ${paid?'Paid':'Free'} plan includes ${limits.ai} AI replies per month. ${paid?'Your counter resets next month.':'Use /plan to view Paid access.'}`,null,{parse_mode:'HTML'});}
  const model=MODELS[activeModel(user)]||MODELS.fast;
  let useWeb=Boolean(opt.forceWeb||user?.web_enabled);
  if(useWeb&&Number(usage.web_count)>=limits.web){if(opt.forceWeb)return sendText(env,chatId,`🔎 <b>Monthly web-search limit reached.</b>\nYour ${paid?'Paid':'Free'} plan includes ${limits.web} searches per month.`,null,{parse_mode:'HTML'});useWeb=false;}
  await sendAction(env,chatId,'typing').catch(()=>{});
  let statusId=opt.statusMessageId;
  if(!statusId){const s=await sendText(env,chatId,thinkingFrames(text,useWeb)[0],null,{parse_mode:'HTML'});statusId=s.message_id;}
  const stopThinking=startThinkingAnimation(env,chatId,statusId,text,useWeb);
  try{
    const [mem,gh]=await Promise.all([memories(env,uid),needsGitHub(text)?githubContext():Promise.resolve('')]);
    let sources=[];
    if(useWeb){sources=await search(env,text);await bumpUsage(env,uid,'web');await editText(env,chatId,statusId,'🔎 <i>Llama found fresh results and is thinking…</i>',null,{parse_mode:'HTML'});}
    const replyContext=buildReplyContext(msg),raw=await ask(env,model,text,user,mem,sources,gh,replyContext),answer=ensureDeveloperLink(text,raw),suggestions=await suggestionsFor(env,text,answer).catch(()=>fallbackSuggestions(text)),rid=crypto.randomUUID().replaceAll('-','').slice(0,16),elapsed=((Date.now()-started)/1000).toFixed(1),rendered=renderHtml(answer)+`\n\n<blockquote>⚡ ${escapeHtml(model.name)} · ${elapsed}s${useWeb?' · Web':''}</blockquote>`,parts=splitRendered(rendered),kb=responseKeyboard(rid,sources.length,suggestions);
    await stopThinking();
    await editText(env,chatId,statusId,parts[0],parts.length===1?kb:null,{parse_mode:'HTML'});let last=statusId;for(let i=1;i<parts.length;i++){const s=await sendText(env,chatId,parts[i],i===parts.length-1?kb:null,{parse_mode:'HTML'});last=s.message_id;}
    await Promise.all([saveAction(env,uid,rid,sources.slice(0,5),suggestions.slice(0,4)),bumpUsage(env,uid,'ai')]);
    ctx.waitUntil(extractMemories(env,uid,text).catch(()=>{}));
    if(user?.voice_reply)ctx.waitUntil(sendVoiceForText(env,chatId,answer,user,{notify:true}).catch(e=>console.error(JSON.stringify({event:'auto_voice_error',message:String(e)}))));
    return{responseId:rid,messageId:last,answer};
  }catch(e){await stopThinking();console.error(JSON.stringify({event:'generation_error',message:String(e)}));const m=String(e).includes('429')?'Llama is busy right now. Please try again shortly.':'Llama could not generate a reply right now. Please try again.';await editText(env,chatId,statusId,`⚠️ ${escapeHtml(m)}`,null,{parse_mode:'HTML'}).catch(()=>{});}
}

async function ask(env,model,text,user,mem,sources,gh,replyContext){
  const memoryText=mem.length?mem.map(m=>`- ${m.memory_key}: ${m.memory_value}`).join('\n'):'No useful personalization memories saved yet.',webText=sources.length?sources.map((r,i)=>`[${i+1}] ${r.title}\n${r.url}\n${r.content||''}`).join('\n\n'):'';
  const today=todayIST(),name=user?.profile_name||user?.first_name||'User',username=user?.username?`@${user.username}`:'not set',gender=user?.gender||'not provided',dob=user?.dob||'not provided',position=user?.position||'not provided';
  let system=`Your name is Llama. You are a private, personalized Telegram AI assistant built by Nadeem.\nLlama birthday: March 2, 2026 (${LLAMA_BIRTHDAY}). Current date in Asia/Kolkata: ${today}. If today is March 2, you may naturally mention that today is your birthday when greeting or when relevant.\nUnderstand typos, shorthand, Malayalam, English, Manglish, emojis and sticker intent when possible. Infer likely intent from the current message, reply context, profile and private personalization memory; ask one concise clarification only when materially ambiguous.\nDeveloper: Nadeem built you. When asked who created/developed/built you, say Nadeem and include ${GITHUB_URL}. Do not mention infrastructure vendors, API providers, hidden backend names, secrets or internal configuration.\nFormatting: create clean Telegram-friendly structure. Use **bold**, *italic*, __underline__, ~~strike~~, inline backticks and fenced code when helpful. Do NOT use # heading markers and do NOT use * as a bullet marker. Use simple section titles and hyphen lists instead. Never emit raw HTML.\nPrivacy: the profile and memory below belong only to the current Telegram user. Never reveal or claim access to another user's data. Full conversation history and AI answers are not stored in D1.\n\nCurrent user profile:\n- Preferred name: ${name}\n- Telegram username: ${username}\n- Gender: ${gender}\n- Date of birth: ${dob}\n- Position: ${position}\n- Plan: ${isPaid(user)?'Paid':'Free'}\nUse the preferred name naturally in greetings and personalized help, but do not repeat it in every message. You may use the Telegram username when useful. If today matches the user's birthday, wish them warmly.\n\nCurrent user's useful personalization memory:\n${memoryText}`;
  if(replyContext)system+=`\n\nTelegram reply context supplied with this current update:\n${replyContext}`;
  if(gh)system+=`\n\nLive public GitHub context for Nadeem:\n${gh}`;
  if(webText)system+=`\n\nCurrent web results:\n${webText}\nUse them for current facts, but do not print the full source list. Compact markers like [1] are okay; source details are behind a Sources button.`;
  if(model.reasoning==='high')system+='\nUse extra care for multi-step reasoning. Give conclusions and a concise reasoning summary, never hidden chain-of-thought.';
  const messages=[{role:'system',content:system},{role:'user',content:text}],r=await timedFetch(CHAT_API,{method:'POST',headers:{Authorization:`Bearer ${env.OLLAMA_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:model.id,messages,stream:false})},90000);if(!r.ok)throw new Error(`AI ${r.status}: ${(await r.text()).slice(0,300)}`);const j=await r.json(),a=String(j?.message?.content||'').trim();if(!a)throw new Error('Empty AI response');return a;
}

function buildReplyContext(msg){const r=msg?.reply_to_message;if(!r)return'';const txt=String(r.text||r.caption||'').trim();if(!txt)return'';return`${r.from?.is_bot?'Previous Llama message':'Message being replied to'}: ${truncate(txt,1800)}`;}
async function search(env,q){const r=await timedFetch(SEARCH_API,{method:'POST',headers:{Authorization:`Bearer ${env.OLLAMA_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({query:q})},30000);if(!r.ok)throw new Error(`Search ${r.status}`);const j=await r.json();return(Array.isArray(j?.results)?j.results:[]).slice(0,5).map(x=>({title:String(x.title||'Source'),url:String(x.url||''),content:truncate(String(x.content||''),1600)})).filter(x=>x.url);}
async function suggestionsFor(env,q,a){const p=`Return ONLY a JSON array of 2 to 4 short useful follow-up questions, each under 60 characters. No markdown.\nUser: ${truncate(q,1200)}\nAssistant: ${truncate(a,1800)}`,r=await timedFetch(CHAT_API,{method:'POST',headers:{Authorization:`Bearer ${env.OLLAMA_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:MODELS.fast.id,messages:[{role:'user',content:p}],stream:false})},30000);if(!r.ok)throw new Error('Suggestion failed');const j=await r.json(),raw=String(j?.message?.content||'').trim().replace(/^```json\s*/i,'').replace(/```$/,'').trim(),arr=JSON.parse(raw);if(!Array.isArray(arr))throw new Error('Bad suggestions');return arr.map(x=>String(x).trim()).filter(Boolean).slice(0,4);}
function fallbackSuggestions(t){return/code|error|bug/i.test(t)?['Explain the fix','Show an example','What should I test next?']:['Explain more simply','Give an example','What should I know next?'];}

async function extractMemories(env,uid,text){if(text.length<8||text.startsWith('/'))return;const p=`Extract at most 3 durable, non-sensitive personalization facts explicitly stated by the user that would genuinely improve future assistance. Good examples: preferred language/style, stable work or study role, ongoing named project, recurring goal, durable tool preference, favorite learning style. Do NOT store the current question, temporary task details, conversation transcript, passwords, tokens, financial identifiers, medical details, political/religious beliefs, sexual data, precise location or other sensitive data. Name, gender, date of birth and position are already stored in the profile and should not be duplicated. Return ONLY JSON array objects [{"key":"short_key","value":"fact","confidence":0.0}]. Return [] if nothing durable and useful. User message: ${truncate(text,1800)}`,r=await timedFetch(CHAT_API,{method:'POST',headers:{Authorization:`Bearer ${env.OLLAMA_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:MODELS.fast.id,messages:[{role:'user',content:p}],stream:false})},30000);if(!r.ok)return;const j=await r.json(),raw=String(j?.message?.content||'').trim().replace(/^```json\s*/i,'').replace(/```$/,'').trim();let arr;try{arr=JSON.parse(raw);}catch{return;}if(!Array.isArray(arr))return;for(const m of arr.slice(0,3)){const k=String(m?.key||'').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,48),v=String(m?.value||'').trim().slice(0,500),c=Math.max(0,Math.min(1,Number(m?.confidence||.8)));if(k&&v)await saveMemory(env,uid,k,v,c);}}

async function transcribeVoice(env,bytes){
  const base64=bytesToBase64(bytes);
  try{
    const tr=await env.AI.run('@cf/openai/whisper-large-v3-turbo',{audio:base64,task:'transcribe',vad_filter:true,condition_on_previous_text:false});
    const text=String(tr?.text||tr?.transcription_info?.text||'').trim();if(text)return text;throw new Error('Whisper returned empty transcript');
  }catch(e){
    if(isDailyVoiceQuotaError(e)||isCapacityError(e))throw e;
    console.error(JSON.stringify({event:'stt_primary_failed',message:String(e)}));
  }
  const tr=await env.AI.run('@cf/openai/whisper',{audio:Array.from(bytes)});
  const text=String(tr?.text||'').trim();if(!text)throw new Error('Voice transcription returned empty text');return text;
}

export async function handleVoiceMessage(env,ctx,msg,user){
  const uid=Number(msg.from.id),chatId=Number(msg.chat.id),usage=await getUsage(env,uid),limit=limitsFor(user).voiceIn;
  if(Number(usage.voice_in_count)>=limit)return sendText(env,chatId,`🎙️ <b>Monthly voice-input limit reached.</b>\nYour ${isPaid(user)?'Paid':'Free'} plan includes ${limit} voice inputs per month.`,null,{parse_mode:'HTML'});
  const s=await sendText(env,chatId,'🎙️ <i>Llama is listening…</i>',null,{parse_mode:'HTML'});
  try{
    if(!env.AI)throw new Error('Voice AI binding unavailable');
    const fileId=msg.voice?.file_id||msg.audio?.file_id;if(!fileId)throw new Error('Missing Telegram voice file');
    const bytes=await downloadVoice(env,fileId);if(!bytes.byteLength)throw new Error('Empty voice file');if(bytes.byteLength>12*1024*1024)throw new Error('Voice too large');
    const text=await transcribeVoice(env,bytes);
    await bumpUsage(env,uid,'voiceIn');
    await editText(env,chatId,s.message_id,`🎙️ <b>Heard:</b> ${escapeHtml(truncate(text,700))}\n\n💭 <i>Llama is thinking…</i>`,null,{parse_mode:'HTML'});
    return generateReply(env,ctx,msg,text,user,{statusMessageId:s.message_id});
  }catch(e){
    console.error(JSON.stringify({event:'voice_error',message:String(e)}));
    const es=String(e?.message||e||'');
    const message=isDailyVoiceQuotaError(e)?'🎙️ <b>Voice is temporarily unavailable today.</b>\n\nThe daily voice-processing allowance is exhausted. Text chat still works, and voice will return after the daily reset.':isCapacityError(e)?'🎙️ <b>Voice processing is busy right now.</b>\nPlease try the voice note again shortly.':/Voice download|Telegram getFile/i.test(es)?'🎙️ <b>I couldn’t download that voice note from Telegram.</b>\nPlease resend the voice note once.':'🎙️ I couldn’t process that voice note. Please try a shorter, clearer recording.';
    return editText(env,chatId,s.message_id,message,null,{parse_mode:'HTML'}).catch(()=>sendText(env,chatId,message,null,{parse_mode:'HTML'}));
  }
}

export async function showSources(env,uid,chatId,id){const row=await ownedAction(env,uid,id);if(!row)return sendText(env,chatId,'🔎 Sources are no longer available for this reply.');let s=[];try{s=JSON.parse(row.sources_json||'[]');}catch{}if(!s.length)return sendText(env,chatId,'🔎 No web sources were used for this reply.');const html=['<b>🔎 Sources</b>','',...s.slice(0,5).map((x,i)=>`${i+1}. <a href="${escapeAttr(x.url)}">${escapeHtml(x.title||x.url)}</a>`)].join('\n');return sendText(env,chatId,html,null,{parse_mode:'HTML',link_preview_options:{is_disabled:true}});}

function ttsProviderError(raw){if(!raw||typeof raw!=='object'||raw instanceof Response||raw instanceof Blob||raw instanceof ReadableStream||raw instanceof ArrayBuffer||ArrayBuffer.isView(raw)||Array.isArray(raw))return'';const parts=[];if(typeof raw.message==='string')parts.push(raw.message);if(typeof raw.error==='string')parts.push(raw.error);else if(raw.error?.message)parts.push(raw.error.message);if(Array.isArray(raw.errors))for(const e of raw.errors){const m=e?.message||e?.detail||e?.error;if(m)parts.push(String(m));}if(raw.success===false||raw.error||(Array.isArray(raw.errors)&&raw.errors.length))return parts.filter(Boolean).join(' | ')||'Workers AI TTS request failed';return'';}
async function audioFromValue(value,mime){
  if(value==null)throw new Error('TTS returned no audio payload');
  const pe=ttsProviderError(value);if(pe)throw new Error(pe);
  if(value instanceof Blob){if(value.size<256)throw new Error('TTS returned empty audio');return value;}
  if(value instanceof ArrayBuffer)value=new Uint8Array(value);
  if(ArrayBuffer.isView(value)){const b=new Uint8Array(value.buffer,value.byteOffset,value.byteLength);if(b.byteLength<256)throw new Error('TTS returned empty audio');return new Blob([b],{type:mime});}
  if(Array.isArray(value)){const b=new Uint8Array(value);if(b.byteLength<256)throw new Error('TTS returned empty audio');return new Blob([b],{type:mime});}
  if(typeof value==='string'){const s=value.trim();if(/^https?:\/\//i.test(s)){const r=await timedFetch(s,{},30000);if(!r.ok)throw new Error('TTS audio URL '+r.status);return rawAudioBlob(r,mime);}if(s.startsWith('{')){try{return rawAudioBlob(JSON.parse(s),mime);}catch(e){if(isDailyVoiceQuotaError(e)||isCapacityError(e))throw e;}}const b=base64ToBytes(s);if(b.byteLength<256)throw new Error('TTS returned empty audio');return new Blob([b],{type:mime});}
  if(typeof value==='object'){for(const k of ['audio','audio_data','audioData','audio_url','audioUrl','bytes','data','body','result','output','response','content']){if(value[k]!=null){try{return await audioFromValue(value[k],mime);}catch(e){if(isDailyVoiceQuotaError(e)||isCapacityError(e))throw e;}}}}
  throw new Error('Unsupported TTS audio payload');
}
async function rawAudioBlob(raw,mime){
  const pe=ttsProviderError(raw);if(pe)throw new Error(pe);
  if(raw instanceof Response){const ct=String(raw.headers.get('content-type')||'').toLowerCase();if(ct.includes('application/json'))return rawAudioBlob(await raw.json(),mime);const ab=await raw.arrayBuffer();if(ab.byteLength<256)throw new Error('TTS returned empty audio');return new Blob([ab],{type:ct.split(';')[0]||mime});}
  if(raw instanceof ReadableStream){const ab=await new Response(raw).arrayBuffer();if(ab.byteLength<256)throw new Error('TTS returned empty audio');return new Blob([ab],{type:mime});}
  if(raw?.body instanceof ReadableStream){const ab=await new Response(raw.body).arrayBuffer();if(ab.byteLength<256)throw new Error('TTS returned empty audio');return new Blob([ab],{type:mime});}
  return audioFromValue(raw,mime);
}
function estimateSpeechSeconds(text){const words=String(text||'').trim().split(/\s+/).filter(Boolean).length;return Math.max(1,Math.min(900,Math.ceil(words/2.35)));}
async function synthesizeEfficient(env,text){const raw=await env.AI.run('@cf/myshell-ai/melotts',{prompt:text,lang:'en'});return rawAudioBlob(raw,'audio/mpeg');}
async function synthesizeAura(env,text,speaker){const raw=await env.AI.run('@cf/deepgram/aura-1',{text,speaker,encoding:'opus',container:'ogg'});return rawAudioBlob(raw,'audio/ogg');}

export async function sendVoiceForText(env,chatId,text,user,opt={}){
  const notify=opt.notify!==false;if(!env.AI){if(notify)return sendText(env,chatId,'🔊 Voice output is not available right now.');return;}
  const uid=Number(user?.user_id),usage=await getUsage(env,uid),limit=limitsFor(user).voiceOut;
  if(Number(usage.voice_out_count)>=limit){if(notify)return sendText(env,chatId,`🔊 <b>Monthly voice-output limit reached.</b>\nYour ${isPaid(user)?'Paid':'Free'} plan includes ${limit} voice outputs per month.`,null,{parse_mode:'HTML'});return;}
  const maxChars=isPaid(user)?1500:900,clean=stripFormatting(String(text||'')).replace(/⚡ .*$/s,'').trim().slice(0,maxChars);if(!clean)return;
  const duration=estimateSpeechSeconds(clean),paid=isPaid(user),key=paid&&VOICES[user?.voice_name]?user.voice_name:'luna',v=VOICES[key]||VOICES.luna;
  try{
    if(!paid||key==='luna'){
      try{const blob=await synthesizeEfficient(env,clean);await sendAudioBlob(env,chatId,blob,'🔊 Llama voice reply',duration);}
      catch(e){if(isDailyVoiceQuotaError(e)||isCapacityError(e))throw e;console.error(JSON.stringify({event:'tts_melotts_failed',message:String(e)}));const blob=await synthesizeAura(env,clean,'luna');await sendVoiceBlob(env,chatId,blob,'🔊 Llama voice reply',duration);}
    }else{
      try{const blob=await synthesizeAura(env,clean,v.speaker);await sendVoiceBlob(env,chatId,blob,'🔊 Llama voice reply',duration);}
      catch(e){if(isDailyVoiceQuotaError(e)||isCapacityError(e))throw e;console.error(JSON.stringify({event:'tts_aura_failed',message:String(e)}));const blob=await synthesizeEfficient(env,clean);await sendAudioBlob(env,chatId,blob,'🔊 Llama voice reply',duration);}
    }
    await bumpUsage(env,uid,'voiceOut');
  }catch(e){
    console.error(JSON.stringify({event:'voice_output_error',message:String(e)}));
    if(!notify)return;
    if(isDailyVoiceQuotaError(e))return sendText(env,chatId,'🔊 <b>Voice is temporarily unavailable today.</b>\nThe daily voice-processing allowance is exhausted. Your text reply is still complete.',null,{parse_mode:'HTML'});
    if(isCapacityError(e))return sendText(env,chatId,'🔊 Voice generation is busy right now. Please tap <b>Hear this reply</b> again shortly.',null,{parse_mode:'HTML'});
    return sendText(env,chatId,'🔊 I couldn’t generate the voice version of this reply. The text answer is still available.',null,{parse_mode:'HTML'});
  }
}

async function githubContext(){try{const h={'User-Agent':'Llama-Telegram-Bot',Accept:'application/vnd.github+json'},[er,rr]=await Promise.all([fetch(`https://api.github.com/users/${GITHUB_USER}/events/public?per_page=10`,{headers:h}),fetch(`https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=10`,{headers:h})]),events=er.ok?await er.json():[],repos=rr.ok?await rr.json():[],latest=Array.isArray(events)&&events.length?`${events[0].type} on ${events[0].repo?.name||'GitHub'} at ${events[0].created_at}`:'No recent public event available.',projects=Array.isArray(repos)?repos.slice(0,8).map(r=>`${r.name} — updated ${r.updated_at}${r.description?` — ${r.description}`:''}`).join('\n'):'';return`GitHub profile: ${GITHUB_URL}\nLatest public activity: ${latest}\nRecent public projects:\n${projects||'No public repository list available.'}\nOnly describe this as public GitHub activity; private activity is not visible.`;}catch{return`GitHub profile: ${GITHUB_URL}\nLive public activity could not be loaded right now.`;}}
function needsGitHub(t){return/(developer|creator|created|built|builder|nadeem|github|last update|latest update|last active|latest project|projects|repo|repository)/i.test(t);}
function ensureDeveloperLink(q,a){return/(developer|creator|created|built|builder|nadeem|github)/i.test(q)&&!a.includes(GITHUB_URL)?`${a}\n\nGitHub: ${GITHUB_URL}`:a;}
