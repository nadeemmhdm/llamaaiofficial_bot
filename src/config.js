export const VERSION='2.1.0';
export const CHAT_API='https://ollama.com/api/chat';
export const SEARCH_API='https://ollama.com/api/web_search';
export const GITHUB_USER='nadeemmhdm';
export const GITHUB_URL='https://github.com/nadeemmhdm';
export const BOT_USERNAME='llamaaiofficial_bot';
export const BOT_URL=`https://t.me/${BOT_USERNAME}`;
export const WORKER_URL='https://llamaaiofficial-bot.nadeemmhdm-ai.workers.dev';
export const MODELS={
  fast:{id:'gpt-oss:20b',name:'Llama Fast',description:'Quick answers for everyday questions',reasoning:'low'},
  smart:{id:'gpt-oss:120b',name:'Llama Smart',description:'Balanced quality, context and speed',reasoning:'medium'},
  reason:{id:'gpt-oss:120b',name:'Llama Reasoning',description:'Extra care for harder multi-step questions',reasoning:'high'},
};
export const PUBLIC_COMMANDS=[
  {command:'start',description:'🏠 Open Llama home'},
  {command:'models',description:'🧠 Choose AI mode'},
  {command:'web',description:'🔎 Web search settings'},
  {command:'search',description:'🌐 Search the web once'},
  {command:'voice',description:'🔊 Voice reply settings'},
  {command:'memory',description:'🧩 View your private memory'},
  {command:'invite',description:'🎁 Invite friends to Llama'},
  {command:'new',description:'✨ Start a fresh chat'},
  {command:'settings',description:'⚙️ View your settings'},
  {command:'about',description:'ℹ️ About Llama'},
  {command:'help',description:'❓ Help and commands'},
  {command:'ping',description:'🟢 Check bot status'},
];
export const ADMIN_COMMANDS=[
  {command:'admin',description:'Control panel'},
  {command:'admin_users',description:'Recent users'},
  {command:'admin_search',description:'Search users'},
  {command:'admin_user',description:'View user'},
  {command:'admin_invites',description:'Invite leaderboard'},
  {command:'admin_message',description:'Message user'},
  {command:'admin_block',description:'Block user'},
  {command:'admin_unblock',description:'Unblock user'},
  {command:'admin_stats',description:'Bot stats'},
];
export function homeKeyboard(){return{inline_keyboard:[
  [{text:'💬 Ask Llama',switch_inline_query_current_chat:''}],
  [{text:'🧠 Models',callback_data:'menu:models'},{text:'🔎 Web Search',callback_data:'menu:web'}],
  [{text:'🔊 Voice',callback_data:'menu:voice'},{text:'🧩 Memory',callback_data:'menu:memory'}],
  [{text:'🎁 Invite Friends',callback_data:'menu:invite'},{text:'⚙️ Settings',callback_data:'menu:settings'}],
  [{text:'ℹ️ About',callback_data:'menu:about'}],
]};}
export function modelKeyboard(current){return{inline_keyboard:[...['fast','smart','reason'].map(k=>[{text:`${current===k?'✅ ':''}${MODELS[k].name}`,callback_data:`model:${k}`}]),[{text:'⬅️ Back',callback_data:'menu:home'}]]};}
export function webKeyboard(on){return{inline_keyboard:[[{text:`${on?'✅ ':''}Web ON`,callback_data:'web:on'},{text:`${!on?'✅ ':''}Web OFF`,callback_data:'web:off'}],[{text:'⬅️ Back',callback_data:'menu:home'}]]};}
export function voiceKeyboard(on){return{inline_keyboard:[[{text:`${on?'✅ ':''}Text + Voice`,callback_data:'voice:on'},{text:`${!on?'✅ ':''}Text only`,callback_data:'voice:off'}],[{text:'⬅️ Back',callback_data:'menu:home'}]]};}
export function settingsKeyboard(){return{inline_keyboard:[[{text:'🧠 Models',callback_data:'menu:models'},{text:'🔎 Web',callback_data:'menu:web'}],[{text:'🔊 Voice',callback_data:'menu:voice'},{text:'🧩 Memory',callback_data:'menu:memory'}],[{text:'🎁 Invite',callback_data:'menu:invite'}],[{text:'⬅️ Back',callback_data:'menu:home'}]]};}
export function responseKeyboard(id,sourceCount,suggestions){const rows=[];if(sourceCount)rows.push([{text:`🔎 Sources (${sourceCount})`,callback_data:`src:${id}`}]);for(let i=0;i<Math.min(4,suggestions.length);i++)rows.push([{text:`💬 ${truncate(suggestions[i],55)}`,callback_data:`ask:${id}:${i}`}]);rows.push([{text:'🔊 Hear this reply',callback_data:`voice:${id}`}]);return{inline_keyboard:rows};}
export function welcomeText(u){const name=escapeHtml(u?.first_name||'there');return`<b>🦙 Welcome to Llama, ${name}!</b>\n\nI’m your personal AI assistant for questions, learning, writing, coding, ideas, web search and voice conversations. ✨\n\n<b>🧠 Mode:</b> ${escapeHtml((MODELS[u?.model]||MODELS.smart).name)}\n<b>🔎 Web Search:</b> ${u?.web_enabled?'ON':'OFF'}\n<b>🔊 Voice Replies:</b> ${u?.voice_reply?'Text + Voice':'Text only'}\n<b>🧩 Memory:</b> Private to your Telegram account\n\nSend me a message, emoji, sticker or voice note — or use the controls below. 👇`;}
export function helpText(){return`<b>❓ Llama Help</b>\n\n<b>Chat naturally</b> — ask questions, send emojis/stickers or a voice note.\n\n🧠 <code>/models</code> — choose AI mode\n🔎 <code>/web</code> — web-search settings\n🌐 <code>/search question</code> — one-time live search\n🔊 <code>/voice</code> — text + voice reply settings\n🧩 <code>/memory</code> — your private saved memory\n🎁 <code>/invite</code> — referral link and invite count\n✨ <code>/new</code> — fresh chat state\n⚙️ <code>/settings</code> — current preferences\nℹ️ <code>/about</code> — version and developer\n🟢 <code>/ping</code> — service status\n\n<b>Privacy:</b> Llama does not store your conversation history or AI answers in the database. Only useful personalization memories you explicitly reveal may be saved.`;}
export function modelText(k){const m=MODELS[k]||MODELS.smart;return`<b>🧠 Choose a Llama mode</b>\n\nCurrent: <b>${escapeHtml(m.name)}</b>\n\n⚡ <b>Llama Fast</b> — quick everyday answers\n⚖️ <b>Llama Smart</b> — balanced quality and speed\n🧠 <b>Llama Reasoning</b> — harder multi-step questions\n\nTap a mode below. Your choice is saved privately.`;}
export function webText(on){return`<b>🔎 Web Search</b>\n\nStatus: <b>${on?'ON ✅':'OFF'}</b>\n\n${on?'Llama can use current web information when it helps. Source details stay behind the <b>Sources</b> button instead of filling your answer.':'Normal questions stay model-only. Use <code>/search</code> anytime for a one-off live lookup.'}`;}
export function voiceText(on){return`<b>🔊 Voice Mode</b>\n\nReply style: <b>${on?'Text + Voice ✅':'Text only'}</b>\n\nYou can always send a Telegram voice note. When <b>Text + Voice</b> is enabled, Llama sends the normal text answer and a voice version too.`;}
export function settingsText(u){return`<b>⚙️ Llama Settings</b>\n\n🧠 Model: <b>${escapeHtml((MODELS[u?.model]||MODELS.smart).name)}</b>\n🔎 Web Search: <b>${u?.web_enabled?'ON':'OFF'}</b>\n🔊 Reply Style: <b>${u?.voice_reply?'Text + Voice':'Text only'}</b>\n🧩 Memory: <b>Private per Telegram user</b>\n🔐 Chat history storage: <b>OFF</b>`;}
export function aboutText(){return`<b>🦙 Llama</b>\n<i>A private, modern Telegram AI assistant.</i>\n\n<b>Version:</b> v${VERSION}\n<b>Developed by:</b> Nadeem\n<b>GitHub:</b> <a href="${GITHUB_URL}">${GITHUB_URL}</a>\n\nLlama supports selectable AI modes, live web search, private personalization memory, voice input/output, stickers & emojis, smart follow-up suggestions and referrals.\n\n<b>Privacy:</b> Conversation history and AI answers are not stored in the database.`;}
export function inviteText(code,count,people=[]){const link=`${BOT_URL}?start=ref_${encodeURIComponent(code)}`;const list=people.length?'\n\n<b>👥 People you invited</b>\n'+people.map((p,i)=>`${i+1}. ${escapeHtml(p.first_name||p.username||'Llama user')}${p.username?` (@${escapeHtml(p.username)})`:''}`).join('\n'):'';return`<b>🎁 Invite friends to Llama</b>\n\nShare your personal link. When someone starts Llama through it, they’re counted as your invite.\n\n<b>🔗 Your invite link</b>\n<code>${escapeHtml(link)}</code>\n\n<b>🏆 Invites:</b> ${Number(count)||0}${list}`;}
export function inviteKeyboard(code){const link=`${BOT_URL}?start=ref_${encodeURIComponent(code)}`;return{inline_keyboard:[[{text:'📤 Share invite',url:`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Try Llama — a smart Telegram AI assistant 🦙')}`}],[{text:'🤖 Open bot',url:BOT_URL}],[{text:'⬅️ Back',callback_data:'menu:home'}]]};}
export function truncate(s,n){s=String(s||'');return s.length<=n?s:s.slice(0,n-1)+'…';}
export function escapeHtml(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
export function escapeAttr(s){return escapeHtml(s).replace(/"/g,'&quot;');}
export function safeError(e){return e instanceof Error?e.message:String(e);}
