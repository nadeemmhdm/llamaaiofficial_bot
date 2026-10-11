export const VERSION='2.4.0';
export const CHAT_API='https://ollama.com/api/chat';
export const SEARCH_API='https://ollama.com/api/web_search';
export const GITHUB_USER='nadeemmhdm';
export const GITHUB_URL='https://github.com/nadeemmhdm';
export const BOT_USERNAME='llamaaiofficial_bot';
export const BOT_URL=`https://t.me/${BOT_USERNAME}`;
export const WORKER_URL='https://llamaaiofficial-bot.nadeemmhdm-ai.workers.dev';
export const LLAMA_BIRTHDAY='2026-03-02';
export const PAID_STARS=99;
export const SUBSCRIPTION_PERIOD=2592000;
export const INVITER_COINS=25;
export const INVITEE_COINS=10;
export const REWARD_COST=100;
export const REWARD_DAYS=7;

export const MODELS={
  fast:{id:'gpt-oss:20b',name:'Llama Fast',description:'Quick answers for everyday questions',reasoning:'low'},
  smart:{id:'gpt-oss:120b',name:'Llama Smart',description:'Balanced quality, context and speed',reasoning:'medium'},
  reason:{id:'gpt-oss:120b',name:'Llama Reasoning',description:'Extra care for harder multi-step questions',reasoning:'high'},
};
export const VOICES={
  luna:{name:'Luna',speaker:'luna',description:'Warm and balanced'},
  asteria:{name:'Asteria',speaker:'asteria',description:'Clear and expressive'},
  orion:{name:'Orion',speaker:'orion',description:'Calm and deeper'},
  athena:{name:'Athena',speaker:'athena',description:'Confident and clear'},
  arcas:{name:'Arcas',speaker:'arcas',description:'Natural and relaxed'},
};
export const PLAN_LIMITS={
  free:{ai:250,web:20,voiceIn:50,voiceOut:50},
  paid:{ai:2500,web:250,voiceIn:500,voiceOut:500},
};

export const PUBLIC_COMMANDS=[
  {command:'start',description:'🏠 Open Llama home'},{command:'plan',description:'⭐ View Free / Paid plan'},
  {command:'models',description:'🧠 Choose AI mode'},{command:'web',description:'🔎 Web search settings'},
  {command:'search',description:'🌐 Search the web once'},{command:'voice',description:'🔊 Voice settings'},
  {command:'profile',description:'👤 View your profile'},{command:'memory',description:'🧩 View your private memory'},
  {command:'rewards',description:'🪙 Coins and invite rewards'},{command:'redeem',description:'🎟 Redeem a coupon'},
  {command:'invite',description:'🎁 Invite friends to Llama'},{command:'settings',description:'⚙️ View your settings'},
  {command:'about',description:'ℹ️ About Llama'},{command:'help',description:'❓ Help and commands'},
  {command:'ping',description:'🟢 Check bot status'},
];
export const ADMIN_COMMANDS=[
  {command:'admin',description:'Control panel'},{command:'admin_users',description:'Recent users'},
  {command:'admin_search',description:'Search users'},{command:'admin_user',description:'View user'},
  {command:'admin_invites',description:'Invite leaderboard'},{command:'admin_sub',description:'Grant Paid days'},
  {command:'admin_free',description:'Set user Free'},{command:'admin_coins',description:'Adjust user coins'},
  {command:'admin_coupon',description:'Create coupon'},{command:'admin_coupons',description:'List coupons'},
  {command:'admin_coupon_off',description:'Disable coupon'},{command:'admin_message',description:'Message user'},
  {command:'admin_block',description:'Block user'},{command:'admin_unblock',description:'Unblock user'},
  {command:'admin_stats',description:'Bot stats'},
];

export function isPaid(u){if(!u||u.plan!=='paid'||!u.paid_until)return false;const t=Date.parse(String(u.paid_until).replace(' ','T')+'Z');return Number.isFinite(t)&&t>Date.now();}
export const planLabel=u=>isPaid(u)?'Paid':'Free';
export const activeModel=u=>isPaid(u)?(MODELS[u?.model]?u.model:'smart'):'fast';

export function homeKeyboard(){return{inline_keyboard:[
  [{text:'⭐ Plan',callback_data:'menu:plan'},{text:'🧠 Models',callback_data:'menu:models'}],
  [{text:'🔎 Web Search',callback_data:'menu:web'},{text:'🔊 Voice',callback_data:'menu:voice'}],
  [{text:'👤 Profile',callback_data:'menu:profile'},{text:'🧩 Memory',callback_data:'menu:memory'}],
  [{text:'🪙 Rewards',callback_data:'menu:rewards'},{text:'🎁 Invite',callback_data:'menu:invite'}],
  [{text:'⚙️ Settings',callback_data:'menu:settings'},{text:'ℹ️ About',callback_data:'menu:about'}],
]};}
export function modelKeyboard(current,paid){return{inline_keyboard:[
  [{text:`${current==='fast'?'✅ ':''}Llama Fast`,callback_data:'model:fast'}],
  [{text:`${current==='smart'?'✅ ':''}${paid?'':'🔒 '}Llama Smart`,callback_data:'model:smart'}],
  [{text:`${current==='reason'?'✅ ':''}${paid?'':'🔒 '}Llama Reasoning`,callback_data:'model:reason'}],
  [{text:'⬅️ Back',callback_data:'menu:home'}],
]};}
export function webKeyboard(on){return{inline_keyboard:[[{text:`${on?'✅ ':''}Web ON`,callback_data:'web:on'},{text:`${!on?'✅ ':''}Web OFF`,callback_data:'web:off'}],[{text:'⬅️ Back',callback_data:'menu:home'}]]};}
export function voiceKeyboard(on,voice='luna',paid=false){const v=VOICES[voice]||VOICES.luna;return{inline_keyboard:[
  [{text:`${on?'✅ ':''}Text + Voice`,callback_data:'voice:on'},{text:`${!on?'✅ ':''}Text only`,callback_data:'voice:off'}],
  [{text:`🎙 Voice: ${v.name}${paid?'':' 🔒'}`,callback_data:'voice:choose'}],[{text:'⬅️ Back',callback_data:'menu:home'}],
]};}
export function voiceChoiceKeyboard(current='luna',paid=false){const rows=Object.entries(VOICES).map(([k,v])=>[{text:`${current===k?'✅ ':''}${v.name}${!paid&&k!=='luna'?' 🔒':''}`,callback_data:`voicepick:${k}`}]);rows.push([{text:'⬅️ Voice settings',callback_data:'menu:voice'}]);return{inline_keyboard:rows};}
export function settingsKeyboard(){return{inline_keyboard:[
  [{text:'⭐ Plan',callback_data:'menu:plan'},{text:'👤 Profile',callback_data:'menu:profile'}],
  [{text:'🧠 Models',callback_data:'menu:models'},{text:'🔎 Web',callback_data:'menu:web'}],
  [{text:'🔊 Voice',callback_data:'menu:voice'},{text:'🧩 Memory',callback_data:'menu:memory'}],[{text:'⬅️ Back',callback_data:'menu:home'}],
]};}
export function profileKeyboard(){return{inline_keyboard:[[{text:'✏️ Update profile',callback_data:'profile:edit'}],[{text:'⬅️ Back',callback_data:'menu:home'}]]};}
export function onboardingGenderKeyboard(){return{inline_keyboard:[[{text:'Male',callback_data:'onboard:gender:male'},{text:'Female',callback_data:'onboard:gender:female'}],[{text:'Other',callback_data:'onboard:gender:other'},{text:'Prefer not to say',callback_data:'onboard:gender:private'}]]};}
export function onboardingDobKeyboard(){return{inline_keyboard:[[{text:'Skip DOB',callback_data:'onboard:dob:skip'}]]};}
export function onboardingPositionKeyboard(){return{inline_keyboard:[[{text:'🎓 Student',callback_data:'onboard:position:student'},{text:'💼 Employee',callback_data:'onboard:position:employee'}],[{text:'🧑‍💻 Freelancer',callback_data:'onboard:position:freelancer'},{text:'🏢 Business',callback_data:'onboard:position:business'}],[{text:'🎨 Creator',callback_data:'onboard:position:creator'},{text:'✍️ Other',callback_data:'onboard:position:other'}]]};}
export function responseKeyboard(id,sourceCount,suggestions){const rows=[];if(sourceCount)rows.push([{text:`🔎 Sources (${sourceCount})`,callback_data:`src:${id}`}]);for(let i=0;i<Math.min(4,suggestions.length);i++)rows.push([{text:`💬 ${truncate(suggestions[i],55)}`,callback_data:`ask:${id}:${i}`}]);rows.push([{text:'🔊 Hear this reply',callback_data:`voice:${id}`}]);return{inline_keyboard:rows};}

export function welcomeText(u){const name=escapeHtml(u?.profile_name||u?.first_name||'there'),paid=isPaid(u);return`<b>🦙 Hey ${name}, welcome to Llama!</b>\n\nI can help you learn, write, code, research, plan, analyse images/PDFs/files, brainstorm and talk by voice. ✨\n\n<b>⭐ Plan:</b> ${paid?'Paid ✨':'Free'}\n<b>🧠 Mode:</b> ${escapeHtml(MODELS[activeModel(u)].name)}\n<b>🔎 Web:</b> ${u?.web_enabled?'ON':'OFF'}\n<b>🔊 Reply:</b> ${u?.voice_reply?'Text + Voice':'Text only'}\n<b>🎙 Voice:</b> ${escapeHtml((VOICES[u?.voice_name]||VOICES.luna).name)}\n<b>🪙 Coins:</b> ${Number(u?.coins)||0}\n\nSend text, an image, PDF, supported file, emoji, sticker or voice note — or choose below. 👇`;}
export function helpText(){return`<b>❓ Llama Help</b>\n\n⭐ <code>/plan</code> — Free / Paid plan\n🧠 <code>/models</code> — AI mode\n🔎 <code>/web</code> — web-search settings\n🌐 <code>/search question</code> — one-time web lookup\n🔊 <code>/voice</code> — voice reply + voice selection\n🖼 Send JPG/PNG/WebP — image analysis\n📕 Send PDF — document analysis\n📄 Send text/code/JSON/CSV — file analysis\n👤 <code>/profile</code> — personalization profile\n🧩 <code>/memory</code> — useful private memory\n🪙 <code>/rewards</code> — coins & invite rewards\n🎟 <code>/redeem CODE</code> — redeem coupon\n🎁 <code>/invite</code> — invite link & count\n⚙️ <code>/settings</code> — preferences\nℹ️ <code>/about</code> — version & developer\n\n<b>Privacy:</b> Llama does not store full conversations, AI answers, or uploaded file bytes in D1. Telegram files are processed transiently for the current request.`;}
export function modelText(u){const paid=isPaid(u),m=MODELS[activeModel(u)];return`<b>🧠 Choose a Llama mode</b>\n\nCurrent: <b>${escapeHtml(m.name)}</b>\n\n⚡ <b>Llama Fast</b> — Free & Paid\n⚖️ <b>Llama Smart</b> — ${paid?'Unlocked ✅':'Paid 🔒'}\n🧠 <b>Llama Reasoning</b> — ${paid?'Unlocked ✅':'Paid 🔒'}\n\nFree accounts use one model: <b>Llama Fast</b>.`;}
export function webText(on,usage,paid){const l=PLAN_LIMITS[paid?'paid':'free'];return`<b>🔎 Web Search</b>\n\nStatus: <b>${on?'ON ✅':'OFF'}</b>\nThis month: <b>${usage?.web_count||0}/${l.web}</b> web searches\n\n${on?'Llama may use current information when helpful. Sources stay behind a Sources button.':'Use <code>/search</code> for a one-off lookup.'}`;}
export function voiceText(u,usage){const paid=isPaid(u),v=VOICES[u?.voice_name]||VOICES.luna,l=PLAN_LIMITS[paid?'paid':'free'];return`<b>🔊 Voice Settings</b>\n\nReply style: <b>${u?.voice_reply?'Text + Voice ✅':'Text only'}</b>\nVoice: <b>${escapeHtml(v.name)}</b> — ${escapeHtml(v.description)}\nVoice input this month: <b>${usage?.voice_in_count||0}/${l.voiceIn}</b>\nVoice output this month: <b>${usage?.voice_out_count||0}/${l.voiceOut}</b>\n\n${paid?'Paid includes all available voices.':'Free uses Luna. Upgrade to Paid to choose other voices.'}`;}
export function settingsText(u){return`<b>⚙️ Llama Settings</b>\n\n⭐ Plan: <b>${planLabel(u)}</b>\n🧠 Model: <b>${escapeHtml(MODELS[activeModel(u)].name)}</b>\n🔎 Web Search: <b>${u?.web_enabled?'ON':'OFF'}</b>\n🔊 Reply Style: <b>${u?.voice_reply?'Text + Voice':'Text only'}</b>\n🎙 Voice: <b>${escapeHtml((VOICES[u?.voice_name]||VOICES.luna).name)}</b>\n👤 Profile: <b>${u?.profile_complete?'Ready':'Setup needed'}</b>\n🧩 Memory: <b>Private per Telegram user</b>\n🔐 Full chat storage: <b>OFF</b>`;}
export function profileText(u){return`<b>👤 Your Llama Profile</b>\n\nName: <b>${escapeHtml(u?.profile_name||u?.first_name||'-')}</b>\nTelegram: ${u?.username?'@'+escapeHtml(u.username):'-'}\nGender: ${escapeHtml(formatValue(u?.gender))}\nDOB: ${escapeHtml(formatDob(u?.dob))}\nPosition: ${escapeHtml(formatValue(u?.position))}\n\nLlama uses this basic profile plus useful saved memories to personalize replies. You can restart profile setup anytime.`;}
export function planText(u,usage){const paid=isPaid(u),l=PLAN_LIMITS[paid?'paid':'free'];return`<b>⭐ Llama Plans</b>\n\n<b>${paid?'✨ Paid':'🆓 Free'}</b>${paid&&u?.paid_until?`\nAccess until: <b>${escapeHtml(String(u.paid_until))} UTC</b>`:''}\n\n<b>Free</b>\n• Llama Fast only\n• ${PLAN_LIMITS.free.ai} AI replies / month\n• ${PLAN_LIMITS.free.web} web searches / month\n• ${PLAN_LIMITS.free.voiceIn} voice inputs + ${PLAN_LIMITS.free.voiceOut} voice outputs / month\n• Luna voice\n\n<b>Paid — ${PAID_STARS} Telegram Stars / 30 days</b>\n• All 3 Llama modes\n• ${PLAN_LIMITS.paid.ai} AI replies / month\n• ${PLAN_LIMITS.paid.web} web searches / month\n• ${PLAN_LIMITS.paid.voiceIn} voice inputs + ${PLAN_LIMITS.paid.voiceOut} voice outputs / month\n• Choose from all Llama voices\n\n<b>This month</b>\nAI: ${usage?.ai_count||0}/${l.ai} · Web: ${usage?.web_count||0}/${l.web} · Voice in: ${usage?.voice_in_count||0}/${l.voiceIn} · Voice out: ${usage?.voice_out_count||0}/${l.voiceOut}`;}
export function planKeyboard(u){const paid=isPaid(u),rows=[];if(!paid)rows.push([{text:`⭐ Upgrade · ${PAID_STARS} Stars`,callback_data:'plan:upgrade'}]);if(paid&&u?.plan_source==='stars'&&u?.subscription_charge_id&&Number(u?.subscription_auto_renew)!==0)rows.push([{text:'🛑 Cancel renewal',callback_data:'plan:cancel'}]);rows.push([{text:'🎟 Redeem coupon',callback_data:'plan:coupon'},{text:'🪙 Rewards',callback_data:'menu:rewards'}],[{text:'⬅️ Back',callback_data:'menu:home'}]);return{inline_keyboard:rows};}
export function rewardsText(u,inviteCount=0){return`<b>🪙 Llama Rewards</b>\n\nBalance: <b>${Number(u?.coins)||0} Llama Coins</b>\nInvites: <b>${Number(inviteCount)||0}</b>\n\n🎁 Each valid invite rewards:\n• You: <b>+${INVITER_COINS} coins</b>\n• New user: <b>+${INVITEE_COINS} coins</b>\n\n⭐ <b>${REWARD_COST} coins = ${REWARD_DAYS} Paid days</b>\n\nLlama Coins are in-bot rewards and are separate from Telegram Stars.`;}
export function rewardsKeyboard(u){const coins=Math.max(0,Number(u?.coins)||0),units=Math.floor(coins/REWARD_COST),days=units*REWARD_DAYS,rows=[[{text:`⭐ Redeem ${REWARD_COST} coins → ${REWARD_DAYS} Paid days`,callback_data:'reward:redeem'}]];if(units>1)rows.push([{text:`⚡ Redeem all ${units*REWARD_COST} coins → ${days} days`,callback_data:'reward:redeem_all'}]);rows.push([{text:'🎁 Invite friends',callback_data:'menu:invite'}],[{text:'⬅️ Back',callback_data:'menu:home'}]);return{inline_keyboard:rows};}
export function aboutText(){return`<b>🦙 Llama</b>\n<i>A private, personalized Telegram AI assistant.</i>\n\n<b>Version:</b> v${VERSION}\n<b>Birthday:</b> March 2, 2026 🎂\n<b>Developed by:</b> Nadeem\n<b>GitHub:</b> <a href="${GITHUB_URL}">${GITHUB_URL}</a>\n\nLlama supports plans, Telegram Stars subscriptions, selectable AI modes, live web search, private memory, onboarding profiles, birthday wishes, voice input/output, image/PDF/file analysis, stickers/emojis, follow-up suggestions, coupons and referral rewards.\n\n<b>Privacy:</b> Full conversation history and AI answers are not stored in D1. Uploaded Telegram files are not copied to extra persistent storage.`;}
export function inviteText(code,count,people=[],coins=0){const link=`${BOT_URL}?start=ref_${encodeURIComponent(code)}`;const list=people.length?'\n\n<b>👥 People you invited</b>\n'+people.map((p,i)=>`${i+1}. ${escapeHtml(p.profile_name||p.first_name||p.username||'Llama user')}${p.username?` (@${escapeHtml(p.username)})`:''}`).join('\n'):'';return`<b>🎁 Invite friends to Llama</b>\n\nEach valid invite gives you <b>+${INVITER_COINS} Llama Coins</b> and the new user <b>+${INVITEE_COINS}</b>.\n\n<b>🔗 Your link</b>\n<code>${escapeHtml(link)}</code>\n\n<b>🏆 Invites:</b> ${Number(count)||0}\n<b>🪙 Coins:</b> ${Number(coins)||0}${list}`;}
export function inviteKeyboard(code){const link=`${BOT_URL}?start=ref_${encodeURIComponent(code)}`;return{inline_keyboard:[[{text:'📤 Share invite',url:`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Try Llama — a smart personalized Telegram AI assistant 🦙')}`}],[{text:'🪙 Rewards',callback_data:'menu:rewards'}],[{text:'⬅️ Back',callback_data:'menu:home'}]]};}
export function onboardingNameText(){return`<b>👋 Let’s personalize Llama for you.</b>\n\nFirst, what name should I call you?\n\nSend your preferred name (2–40 characters).`;}
export function onboardingGenderText(name){return`Nice to meet you, <b>${escapeHtml(name)}</b>! ✨\n\nChoose your gender. This helps basic personalization; <b>Prefer not to say</b> is always available.`;}
export function onboardingDobText(){return`<b>🎂 Date of birth</b>\n\nSend it as <code>DD/MM/YYYY</code> — for example <code>02/03/2004</code>.\n\nI’ll use it for birthday wishes. You can also skip it.`;}
export function onboardingPositionText(){return`<b>💼 What best describes you?</b>\n\nChoose your current position. This helps Llama tailor explanations and suggestions.`;}
export function onboardingDoneText(u){return`<b>✅ Profile ready, ${escapeHtml(u?.profile_name||u?.first_name||'friend')}!</b>\n\nI’ll use your profile and useful memories to personalize future replies. You can edit it later with <code>/profile</code>.\n\nWelcome to Llama. 🦙✨`;}
export function birthdayMessage(u){const name=escapeHtml(u?.profile_name||u?.first_name||'friend');return`🎉🎂 <b>Happy Birthday, ${name}!</b>\n\nWishing you a great year ahead — more wins, good health, new opportunities and plenty of reasons to smile. ✨\n\n— Llama 🦙`;}
export function llamaBirthdayMessage(){return`🎂🦙 <b>Today is my birthday!</b>\n\nLlama was born on <b>March 2, 2026</b>. Thanks for being part of my journey. ✨\n\n— Llama`;}
function formatValue(v){if(!v||v==='private')return'Prefer not to say';return String(v).replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());}
function formatDob(v){if(!v)return'Not provided';const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}/${m[1]}`:String(v);}
export function truncate(s,n){s=String(s||'');return s.length<=n?s:s.slice(0,n-1)+'…';}
export function escapeHtml(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
export function escapeAttr(s){return escapeHtml(s).replace(/"/g,'&quot;');}
export function safeError(e){return e instanceof Error?e.message:String(e);}
