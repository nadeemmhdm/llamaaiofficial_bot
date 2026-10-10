export const CHAT_API='https://ollama.com/api/chat';
export const SEARCH_API='https://ollama.com/api/web_search';
export const GITHUB_USER='nadeemmhdm';
export const GITHUB_URL='https://github.com/nadeemmhdm';
export const MODELS={
  fast:{id:'gpt-oss:20b',name:'Llama Fast',description:'Fast everyday replies',reasoning:'low'},
  smart:{id:'gpt-oss:120b',name:'Llama Smart',description:'Balanced quality and speed',reasoning:'medium'},
  reason:{id:'gpt-oss:120b',name:'Llama Reasoning',description:'Deeper reasoning for harder questions',reasoning:'high'},
};
export const PUBLIC_COMMANDS=[
  {command:'start',description:'Open Llama home'},
  {command:'models',description:'Choose AI mode'},
  {command:'web',description:'Web search settings'},
  {command:'search',description:'Search the web once'},
  {command:'voice',description:'Voice reply settings'},
  {command:'memory',description:'View your saved memory'},
  {command:'new',description:'Start a new chat'},
  {command:'settings',description:'View your settings'},
  {command:'help',description:'Show help'},
];
export const ADMIN_COMMANDS=[
  {command:'admin',description:'Control panel'},
  {command:'admin_users',description:'Recent users'},
  {command:'admin_user',description:'View user'},
  {command:'admin_message',description:'Message user'},
  {command:'admin_block',description:'Block user'},
  {command:'admin_unblock',description:'Unblock user'},
  {command:'admin_stats',description:'Bot stats'},
];
export function homeKeyboard(){return{inline_keyboard:[[{text:'🧠 Models',callback_data:'menu:models'},{text:'🔎 Web Search',callback_data:'menu:web'}],[{text:'🔊 Voice',callback_data:'menu:voice'},{text:'⚙️ Settings',callback_data:'menu:settings'}]]};}
export function modelKeyboard(current){return{inline_keyboard:[['fast','smart','reason'].map(k=>({text:`${current===k?'✓ ':''}${MODELS[k].name}`,callback_data:`model:${k}`})),[{text:'← Back',callback_data:'menu:home'}]]};}
export function webKeyboard(on){return{inline_keyboard:[[{text:`${on?'✓ ':''}ON`,callback_data:'web:on'},{text:`${!on?'✓ ':''}OFF`,callback_data:'web:off'}],[{text:'← Back',callback_data:'menu:home'}]]};}
export function voiceKeyboard(on){return{inline_keyboard:[[{text:`${on?'✓ ':''}Auto voice ON`,callback_data:'voice:on'},{text:`${!on?'✓ ':''}Auto voice OFF`,callback_data:'voice:off'}],[{text:'← Back',callback_data:'menu:home'}]]};}
export function settingsKeyboard(){return{inline_keyboard:[[{text:'Models',callback_data:'menu:models'},{text:'Web',callback_data:'menu:web'},{text:'Voice',callback_data:'menu:voice'}],[{text:'← Back',callback_data:'menu:home'}]]};}
export function responseKeyboard(id,sourceCount,suggestions){const rows=[];if(sourceCount)rows.push([{text:`🔎 Sources (${sourceCount})`,callback_data:`src:${id}`}]);for(let i=0;i<Math.min(4,suggestions.length);i++)rows.push([{text:`💬 ${truncate(suggestions[i],55)}`,callback_data:`ask:${id}:${i}`}]);rows.push([{text:'👍',callback_data:`react:${id}:up`},{text:'👎',callback_data:`react:${id}:down`},{text:'🔊 Voice',callback_data:`voice:${id}`}]);return{inline_keyboard:rows};}
export function welcomeText(u){return`<b>Llama</b>\n<i>Your personal AI assistant on Telegram.</i>\n\nAsk questions, write, learn, code, brainstorm, send a voice note, or search the web.\n\n<b>Model:</b> ${escapeHtml((MODELS[u?.model]||MODELS.smart).name)}\n<b>Web:</b> ${u?.web_enabled?'ON':'OFF'}\n<b>Voice:</b> ${u?.voice_reply?'Auto ON':'On demand'}`;}
export function helpText(){return`<b>Llama Help</b>\n\n/models — choose model\n/web — web search settings\n/search question — one-time live search\n/voice — voice reply settings\n/memory — view your saved memory\n/new — clear conversation history\n/settings — current settings\n\nYou can also send a Telegram voice message.`;}
export function modelText(k){const m=MODELS[k]||MODELS.smart;return`<b>Choose Llama model</b>\n\nCurrent: <b>${escapeHtml(m.name)}</b>\n\n• <b>Llama Fast</b> — fast everyday replies\n• <b>Llama Smart</b> — balanced quality and speed\n• <b>Llama Reasoning</b> — deeper reasoning`;}
export function webText(on){return`<b>Web Search</b>\n\nStatus: <b>${on?'ON':'OFF'}</b>\n\n${on?'Normal questions may use live web results. Sources stay hidden until you tap the Sources button.':'Normal questions stay model-only. Use /search for a one-off live search.'}`;}
export function voiceText(on){return`<b>Voice</b>\n\nAuto voice replies: <b>${on?'ON':'OFF'}</b>\n\nYou can always send Llama a voice note. For text answers, tap <b>🔊 Voice</b> to hear the response.`;}
export function settingsText(u){return`<b>Llama Settings</b>\n\nModel: ${escapeHtml((MODELS[u?.model]||MODELS.smart).name)}\nWeb Search: ${u?.web_enabled?'ON':'OFF'}\nAuto Voice: ${u?.voice_reply?'ON':'OFF'}\nMemory: private per Telegram user`;}
export function aboutText(){return`<b>Llama</b> is a personal Telegram AI assistant built by <b>Nadeem</b>.\n\n<a href="${GITHUB_URL}">Nadeem on GitHub</a>`;}
export function truncate(s,n){s=String(s||'');return s.length<=n?s:s.slice(0,n-1)+'…';}
export function escapeHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
export function escapeAttr(s){return escapeHtml(s).replace(/"/g,'&quot;');}
export function safeError(e){return e instanceof Error?e.message:String(e);}
