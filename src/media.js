import {sendText,editText,downloadTelegramFile} from './telegram.js';
import {generateReply} from './ai.js';

const IMAGE_ANALYSIS_MODEL='@cf/llava-hf/llava-1.5-7b-hf';
const TEXT_FILE_EXTS=new Set([
  'txt','md','markdown','json','jsonl','csv','tsv','js','mjs','cjs','ts','tsx','jsx','py','java','c','cc','cpp','h','hpp','cs','go','rs','php','rb','swift','kt','kts',
  'html','htm','css','scss','sass','xml','yaml','yml','toml','ini','cfg','conf','log','sql','sh','bash','zsh','ps1','bat','cmd','env','gitignore','dockerfile'
]);

function isDailyQuotaError(e){const s=String(e?.message||e||'').toLowerCase();return s.includes('daily free allocation')||s.includes('10,000 neurons')||s.includes('10000 neurons')||(s.includes('neurons')&&s.includes('upgrade'))||s.includes('error: 4006')||s.includes('4006:');}
function isCapacityError(e){const s=String(e?.message||e||'').toLowerCase();return s.includes('429')||s.includes('capacity temporarily exceeded')||s.includes('3040');}
function fileExt(name=''){const s=String(name).toLowerCase(),i=s.lastIndexOf('.');return i>=0?s.slice(i+1):s;}
function isImageDoc(doc){const mime=String(doc?.mime_type||'').toLowerCase(),ext=fileExt(doc?.file_name||'');return mime.startsWith('image/')||['jpg','jpeg','png','webp'].includes(ext);}
function isTextDoc(doc){const mime=String(doc?.mime_type||'').toLowerCase(),ext=fileExt(doc?.file_name||'');return mime.startsWith('text/')||['application/json','application/xml','application/javascript','application/x-javascript','application/sql','application/x-yaml'].includes(mime)||TEXT_FILE_EXTS.has(ext);}
function visionDescription(raw){if(typeof raw==='string')return raw.trim();for(const k of ['description','response','text','result','output']){const v=raw?.[k];if(typeof v==='string'&&v.trim())return v.trim();if(v&&typeof v==='object'){for(const k2 of ['description','response','text','content']){if(typeof v[k2]==='string'&&v[k2].trim())return v[k2].trim();}}}return'';}

export async function handleImageMessage(env,ctx,msg,user,doc=null){
  const chatId=Number(msg.chat.id);
  const status=await sendText(env,chatId,'🖼️ <i>Llama is looking at your image…</i>',null,{parse_mode:'HTML'});
  try{
    if(!env.AI)throw new Error('Image AI binding unavailable');
    const source=doc||((msg.photo&&msg.photo.length)?msg.photo[msg.photo.length-1]:null);
    const fileId=source?.file_id;if(!fileId)throw new Error('Missing image file');
    const {bytes}=await downloadTelegramFile(env,fileId,8*1024*1024);
    const request=String(msg.caption||msg.text||'').trim()||'Describe this image carefully. Identify visible objects, text, layout and important details. If something is uncertain, say so.';
    const raw=await env.AI.run(IMAGE_ANALYSIS_MODEL,{image:Array.from(bytes),prompt:`Analyze this image for a Telegram assistant. User request: ${request}\nGive a factual, detailed description that another assistant can use to answer the user.`,max_tokens:1200});
    const desc=visionDescription(raw);if(!desc)throw new Error('Vision model returned no description');
    const prompt=`The user sent an image${doc?.file_name?` named "${doc.file_name}"`:''}.\nUser request: ${request}\n\nVision analysis:\n${desc}\n\nAnswer the user's request using only what can reasonably be supported by the vision analysis. Mention uncertainty where appropriate.`;
    return generateReply(env,ctx,msg,prompt,user,{statusMessageId:status.message_id,skipMemory:true});
  }catch(e){
    console.error(JSON.stringify({event:'image_analysis_error',message:String(e)}));
    const m=isDailyQuotaError(e)?'🖼️ <b>Image analysis is temporarily unavailable today.</b>\nThe shared daily AI-processing allowance is exhausted. Text and supported text-file analysis still work.':isCapacityError(e)?'🖼️ <b>Image analysis is busy right now.</b>\nPlease try the image again shortly.':'🖼️ I couldn’t analyse that image right now. Please resend it as JPG, PNG or WebP.';
    return editText(env,chatId,status.message_id,m,null,{parse_mode:'HTML'}).catch(()=>sendText(env,chatId,m,null,{parse_mode:'HTML'}));
  }
}

export async function handleDocumentMessage(env,ctx,msg,user){
  const doc=msg.document,chatId=Number(msg.chat.id);
  if(!doc?.file_id)return;
  if(isImageDoc(doc))return handleImageMessage(env,ctx,msg,user,doc);
  if(!isTextDoc(doc)){
    return sendText(env,chatId,'📎 <b>I can analyse images and text/code files directly.</b>\n\nSupported now: JPG, PNG, WebP, TXT, Markdown, JSON, CSV, source code, HTML/CSS, XML, YAML, SQL, logs and similar text files.\n\nPDF, DOCX, XLSX and PPTX are not parsed by this no-storage mode yet.',null,{parse_mode:'HTML'});
  }
  const declared=Number(doc.file_size||0);
  if(declared>8*1024*1024)return sendText(env,chatId,'📄 That file is too large for direct analysis. Please send a text/code file under 8 MB.');
  const status=await sendText(env,chatId,'📄 <i>Llama is reading your file…</i>',null,{parse_mode:'HTML'});
  try{
    const {bytes}=await downloadTelegramFile(env,doc.file_id,8*1024*1024);
    let content=new TextDecoder('utf-8',{fatal:false}).decode(bytes).replace(/\u0000/g,'');
    if(!content.trim())throw new Error('Text file is empty or not UTF-8 text');
    const originalChars=content.length;if(content.length>70000)content=content.slice(0,70000);
    const request=String(msg.caption||'').trim()||'Analyse this file, explain the important content, and point out issues or useful insights.';
    const prompt=`The user sent a Telegram file named "${doc.file_name||'file'}" (${doc.mime_type||'text/unknown'}).\nUser request: ${request}\n${originalChars>content.length?`Note: only the first ${content.length} of ${originalChars} text characters are included for safety.\n`:''}\nFile content:\n\n${content}\n\nAnswer based on this file. Do not claim to have read content that is not included above.`;
    return generateReply(env,ctx,msg,prompt,user,{statusMessageId:status.message_id,skipMemory:true});
  }catch(e){
    console.error(JSON.stringify({event:'document_analysis_error',message:String(e)}));
    return editText(env,chatId,status.message_id,'📄 I couldn’t read that file as text. Try UTF-8 TXT/Markdown/JSON/CSV/code, or send an image file for visual analysis.',null,{parse_mode:'HTML'}).catch(()=>{});
  }
}
