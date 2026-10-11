import {
  VERSION,GITHUB_URL,BOT_URL,WORKER_URL,LLAMA_BIRTHDAY,PAID_STARS,SUBSCRIPTION_PERIOD,MODELS,VOICES,PLAN_LIMITS,
  PUBLIC_COMMANDS,ADMIN_COMMANDS,homeKeyboard,modelKeyboard,webKeyboard,voiceKeyboard,voiceChoiceKeyboard,settingsKeyboard,
  profileKeyboard,onboardingGenderKeyboard,onboardingDobKeyboard,onboardingPositionKeyboard,welcomeText,helpText,modelText,
  webText,voiceText,settingsText,profileText,planText,planKeyboard,rewardsText,rewardsKeyboard,aboutText,inviteText,inviteKeyboard,
  onboardingNameText,onboardingGenderText,onboardingDobText,onboardingPositionText,onboardingDoneText,birthdayMessage,llamaBirthdayMessage,
  escapeHtml,truncate,isPaid,activeModel
} from './config.js';
import {secureEqual,sendText,editText,answerCallback,react,chooseReaction,api} from './telegram.js';
import {
  upsertUser,getUser,clearMemory,clearActions,setModel,setWeb,setVoice,setVoiceName,ownedAction,memories,inviteStats,getUsage,
  setProfileField,resetProfileSetup,completeProfile,redeemCoinsForPaid,redeemCoupon,grantPaidDays,setPaidUntilUnix,setFree,
  markSubscriptionCanceled,recordPayment,addCoins,counts,recentUsers,searchUsers,inviteLeaderboard,setBlocked,adminLog,
  createCoupon,listCoupons,disableCoupon,birthdayUsers,markBirthdaySent,llamaBirthdayUsers,markLlamaBirthdaySent
} from './db.js';
import {generateReply,handleVoiceMessage,showSources,sendVoiceForText} from './ai.js';
import {handleImageMessage,handleDocumentMessage} from './media.js';

const PAYMENT_PAYLOAD='llama_paid_monthly_v1';

export default {
  async fetch(req,env,ctx){
    const u=new URL(req.url);
    if(req.method==='GET'&&u.pathname==='/')return new Response(statusPage(),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
    if(req.method==='GET'&&u.pathname==='/health')return Response.json({ok:true,service:'Llama',version:VERSION,status:'online',birthday:LLAMA_BIRTHDAY,developed_by:'Nadeem',github:GITHUB_URL,bot:BOT_URL,plans:{free:'Llama Fast',paid:`${PAID_STARS} XTR / 30 days`},features:['personalized-profile','birthday-wishes','plans','telegram-stars','coupons','coins','referrals','model-gating','web-search','sources-button','suggestions','private-memory','voice-selection','voice-input-output','image-analysis','file-analysis','stickers-emojis','d1']},{headers:{'Cache-Control':'no-store'}});
    if(req.method!=='POST'||u.pathname!=='/webhook')return new Response('Not Found',{status:404});
    if(!env.TELEGRAM_BOT_TOKEN||!env.OLLAMA_API_KEY||!env.DB)return new Response('Config error',{status:503});
    if(env.TELEGRAM_WEBHOOK_SECRET&&!await secureEqual(req.headers.get('X-Telegram-Bot-Api-Secret-Token')||'',env.TELEGRAM_WEBHOOK_SECRET))return new Response('Unauthorized',{status:401});
    let update;try{update=await req.json();}catch{return new Response('Bad JSON',{status:400});}
    if(update.pre_checkout_query){await handlePreCheckout(update.pre_checkout_query,env);return new Response('OK');}
    ctx.waitUntil(handleUpdate(update,env,ctx));return new Response('OK');
  },
  async scheduled(controller,env,ctx){ctx.waitUntil(runScheduled(env));}
};

async function handleUpdate(update,env,ctx){
  try{
    if(update.callback_query)return handleCallback(update.callback_query,env,ctx);
    const msg=update.message;if(!msg?.chat?.id||!msg?.from?.id)return;
    const uid=Number(msg.from.id),chatId=Number(msg.chat.id),rawText=String(msg.text||msg.caption||'').trim(),cmd=rawText?rawText.split(/\s+/)[0].toLowerCase().split('@')[0]:'',startParam=cmd==='/start'?(rawText.split(/\s+/)[1]||''):'';
    await upsertUser(env,msg.from,chatId,startParam);
    if(cmd==='/start')ctx.waitUntil(registerTelegram(env).catch(()=>{}));
    let user=await getUser(env,uid);
    if(user?.blocked)return sendText(env,chatId,'🚫 Llama is unavailable for this account.');
    if(msg.successful_payment)return handleSuccessfulPayment(env,msg,user);
    if(cmd.startsWith('/admin')){if(!isAdmin(env,uid))return;return adminCommand(env,msg,rawText);}
    if(!cmd.startsWith('/')&&!msg.successful_payment)ctx.waitUntil(react(env,chatId,msg.message_id,chooseReaction(msg,rawText)).catch(()=>{}));

    if(!Number(user?.profile_complete))return handleOnboardingMessage(env,msg,user,rawText,cmd);

    if(msg.voice)return handleVoiceMessage(env,ctx,msg,user);
    if(msg.photo?.length)return handleImageMessage(env,ctx,msg,user);
    if(msg.document)return handleDocumentMessage(env,ctx,msg,user);
    if(msg.sticker){const e=msg.sticker.emoji||'unspecified',set=msg.sticker.set_name||'unknown';const prompt=`The user sent a Telegram sticker. Telegram metadata says its associated emoji is ${e} and sticker set is ${set}. Understand the likely emotion or intent from this metadata and respond naturally. Do not claim exact visual details that are not provided.`;return generateReply(env,ctx,msg,prompt,user,{displayPrompt:`Sticker ${e}`});}
    if(!rawText)return sendText(env,chatId,'🦙 I can understand text, images, supported files, emojis, Telegram stickers and voice notes. Send me something and I’ll respond. ✨',homeKeyboard(),{parse_mode:'HTML'});

    if(cmd==='/start')return sendText(env,chatId,welcomeText(user),homeKeyboard(),{parse_mode:'HTML'});
    if(cmd==='/help')return sendText(env,chatId,helpText(),homeKeyboard(),{parse_mode:'HTML'});
    if(cmd==='/models'||cmd==='/model')return sendText(env,chatId,modelText(user),modelKeyboard(activeModel(user),isPaid(user)),{parse_mode:'HTML'});
    if(cmd==='/web'){const usage=await getUsage(env,uid);return sendText(env,chatId,webText(!!user.web_enabled,usage,isPaid(user)),webKeyboard(!!user.web_enabled),{parse_mode:'HTML'});}
    if(cmd==='/voice'){const usage=await getUsage(env,uid);return sendText(env,chatId,voiceText(user,usage),voiceKeyboard(!!user.voice_reply,user.voice_name,isPaid(user)),{parse_mode:'HTML'});}
    if(cmd==='/settings')return sendText(env,chatId,settingsText(user),settingsKeyboard(),{parse_mode:'HTML'});
    if(cmd==='/profile')return sendText(env,chatId,profileText(user),profileKeyboard(),{parse_mode:'HTML'});
    if(cmd==='/plan')return ownPlan(env,chatId,user);
    if(cmd==='/rewards')return ownRewards(env,chatId,user);
    if(cmd==='/redeem'){const code=rawText.slice(rawText.indexOf(' ')+1).trim();if(!code||code===rawText)return sendText(env,chatId,'🎟 Use: <code>/redeem YOURCODE</code>',null,{parse_mode:'HTML'});return redeemUserCoupon(env,chatId,uid,code);}
    if(cmd==='/new'||cmd==='/clear'){await clearActions(env,uid);return sendText(env,chatId,'✨ <b>Fresh chat ready.</b>\n\nFull conversations and AI answers are not stored. Your profile, plan, preferences and useful personalization memory stay unchanged.',homeKeyboard(),{parse_mode:'HTML'});}
    if(cmd==='/memory')return ownMemory(env,chatId,uid);
    if(cmd==='/invite')return ownInvite(env,chatId,uid);
    if(cmd==='/ping')return sendText(env,chatId,`🟢 <b>Llama is online.</b>\nVersion: <b>v${VERSION}</b>\nPlan: <b>${isPaid(user)?'Paid':'Free'}</b>\nStatus: Ready ✨`,null,{parse_mode:'HTML'});
    if(cmd==='/about')return sendText(env,chatId,aboutText(),{inline_keyboard:[[{text:'💻 Nadeem on GitHub',url:GITHUB_URL},{text:'🤖 Open Llama',url:BOT_URL}],[{text:'⬅️ Home',callback_data:'menu:home'}]]},{parse_mode:'HTML'});
    if(cmd==='/search'){const q=rawText.slice(rawText.indexOf(' ')+1).trim();if(!q||q===rawText)return sendText(env,chatId,'🌐 Use: <code>/search your question</code>',null,{parse_mode:'HTML'});return generateReply(env,ctx,msg,q,user,{forceWeb:true});}
    return generateReply(env,ctx,msg,rawText,user,{});
  }catch(e){console.error(JSON.stringify({event:'update_error',message:String(e)}));}
}

async function handleOnboardingMessage(env,msg,user,rawText,cmd){
  const uid=Number(msg.from.id),chatId=Number(msg.chat.id),step=user?.onboarding_step||'name';
  if(cmd==='/about')return sendText(env,chatId,aboutText(),null,{parse_mode:'HTML'});
  if(cmd==='/help')return sendText(env,chatId,helpText(),null,{parse_mode:'HTML'});
  if(cmd==='/start'){if(step==='gender')return sendText(env,chatId,onboardingGenderText(user?.profile_name||user?.first_name||'friend'),onboardingGenderKeyboard(),{parse_mode:'HTML'});if(step==='dob')return sendText(env,chatId,onboardingDobText(),onboardingDobKeyboard(),{parse_mode:'HTML'});if(step==='position')return sendText(env,chatId,onboardingPositionText(),onboardingPositionKeyboard(),{parse_mode:'HTML'});if(step==='position_text')return sendText(env,chatId,'✍️ Send a short position/title, for example <code>Teacher</code>, <code>Designer</code> or <code>Developer</code>.',null,{parse_mode:'HTML'});return sendText(env,chatId,onboardingNameText(),null,{parse_mode:'HTML'});}
  if(!rawText&&step==='name')return sendText(env,chatId,onboardingNameText(),null,{parse_mode:'HTML'});
  if(step==='name'||step==='edit_name'){
    if(!rawText||rawText.startsWith('/')||rawText.length<2||rawText.length>40)return sendText(env,chatId,'👤 Please send a name between 2 and 40 characters.');
    await setProfileField(env,uid,'profile_name',rawText.slice(0,40));await setProfileField(env,uid,'onboarding_step','gender');
    return sendText(env,chatId,onboardingGenderText(rawText.slice(0,40)),onboardingGenderKeyboard(),{parse_mode:'HTML'});
  }
  if(step==='gender')return sendText(env,chatId,'Choose an option below 👇',onboardingGenderKeyboard(),{parse_mode:'HTML'});
  if(step==='dob'){
    const dob=parseDob(rawText);if(!dob)return sendText(env,chatId,'🎂 Please use <code>DD/MM/YYYY</code>, or tap <b>Skip DOB</b>.',onboardingDobKeyboard(),{parse_mode:'HTML'});
    await setProfileField(env,uid,'dob',dob);await setProfileField(env,uid,'onboarding_step','position');
    return sendText(env,chatId,onboardingPositionText(),onboardingPositionKeyboard(),{parse_mode:'HTML'});
  }
  if(step==='position')return sendText(env,chatId,onboardingPositionText(),onboardingPositionKeyboard(),{parse_mode:'HTML'});
  if(step==='position_text'){
    if(!rawText||rawText.startsWith('/')||rawText.length>50)return sendText(env,chatId,'Send a short position/title, for example: <code>Teacher</code> or <code>Designer</code>.',null,{parse_mode:'HTML'});
    await setProfileField(env,uid,'position',rawText.slice(0,50));await completeProfile(env,uid);const fresh=await getUser(env,uid);await sendText(env,chatId,onboardingDoneText(fresh),null,{parse_mode:'HTML'});return sendText(env,chatId,welcomeText(fresh),homeKeyboard(),{parse_mode:'HTML'});
  }
  await setProfileField(env,uid,'onboarding_step','name');return sendText(env,chatId,onboardingNameText(),null,{parse_mode:'HTML'});
}

async function handleCallback(q,env,ctx){
  const uid=Number(q.from?.id),chatId=Number(q.message?.chat?.id),mid=Number(q.message?.message_id),d=String(q.data||'');if(!uid||!chatId||!mid)return;
  await answerCallback(env,q.id).catch(()=>{});let user=await getUser(env,uid);if(!user||user.blocked)return;

  if(d.startsWith('onboard:'))return handleOnboardingCallback(env,q,user,d);
  if(d==='profile:edit'){await resetProfileSetup(env,uid);return editText(env,chatId,mid,onboardingNameText(),null,{parse_mode:'HTML'});}
  if(!Number(user.profile_complete))return editText(env,chatId,mid,onboardingNameText(),null,{parse_mode:'HTML'});

  if(d.startsWith('model:')){const k=d.slice(6);if(!MODELS[k])return;if(!isPaid(user)&&k!=='fast')return sendText(env,chatId,'🔒 <b>This model is a Paid feature.</b>\nFree users can use Llama Fast. Open /plan to upgrade.',null,{parse_mode:'HTML'});await setModel(env,uid,k);user=await getUser(env,uid);return editText(env,chatId,mid,`✅ <b>${MODELS[k].name}</b> is now active.\n<i>${MODELS[k].description}</i>`,modelKeyboard(activeModel(user),isPaid(user)),{parse_mode:'HTML'});}
  if(d==='web:on'||d==='web:off'){const on=d==='web:on';await setWeb(env,uid,on);const usage=await getUsage(env,uid);return editText(env,chatId,mid,webText(on,usage,isPaid(user)),webKeyboard(on),{parse_mode:'HTML'});}
  if(d==='voice:on'||d==='voice:off'){const on=d==='voice:on';await setVoice(env,uid,on);user=await getUser(env,uid);const usage=await getUsage(env,uid);return editText(env,chatId,mid,voiceText(user,usage),voiceKeyboard(on,user.voice_name,isPaid(user)),{parse_mode:'HTML'});}
  if(d==='voice:choose')return editText(env,chatId,mid,'<b>🎙 Choose Llama voice</b>\n\nFree uses Luna. Paid unlocks all voices.',voiceChoiceKeyboard(user.voice_name,isPaid(user)),{parse_mode:'HTML'});
  if(d.startsWith('voicepick:')){const k=d.slice(10);if(!VOICES[k])return;if(!isPaid(user)&&k!=='luna')return sendText(env,chatId,'🔒 <b>Voice selection is a Paid feature.</b>\nFree accounts use Luna. Open /plan to upgrade.',null,{parse_mode:'HTML'});await setVoiceName(env,uid,k);user=await getUser(env,uid);const usage=await getUsage(env,uid);return editText(env,chatId,mid,voiceText(user,usage),voiceKeyboard(!!user.voice_reply,k,isPaid(user)),{parse_mode:'HTML'});}

  if(d==='menu:models')return editText(env,chatId,mid,modelText(user),modelKeyboard(activeModel(user),isPaid(user)),{parse_mode:'HTML'});
  if(d==='menu:web'){const usage=await getUsage(env,uid);return editText(env,chatId,mid,webText(!!user.web_enabled,usage,isPaid(user)),webKeyboard(!!user.web_enabled),{parse_mode:'HTML'});}
  if(d==='menu:voice'){const usage=await getUsage(env,uid);return editText(env,chatId,mid,voiceText(user,usage),voiceKeyboard(!!user.voice_reply,user.voice_name,isPaid(user)),{parse_mode:'HTML'});}
  if(d==='menu:settings')return editText(env,chatId,mid,settingsText(user),settingsKeyboard(),{parse_mode:'HTML'});
  if(d==='menu:home')return editText(env,chatId,mid,welcomeText(user),homeKeyboard(),{parse_mode:'HTML'});
  if(d==='menu:memory')return editMemory(env,chatId,mid,uid);
  if(d==='menu:invite')return editInvite(env,chatId,mid,uid);
  if(d==='menu:profile')return editText(env,chatId,mid,profileText(user),profileKeyboard(),{parse_mode:'HTML'});
  if(d==='menu:plan'){const usage=await getUsage(env,uid);return editText(env,chatId,mid,planText(user,usage),planKeyboard(user),{parse_mode:'HTML'});}
  if(d==='menu:rewards'){const inv=await inviteStats(env,uid);return editText(env,chatId,mid,rewardsText(user,inv.count),rewardsKeyboard(user),{parse_mode:'HTML'});}
  if(d==='menu:about')return editText(env,chatId,mid,aboutText(),{inline_keyboard:[[{text:'💻 GitHub',url:GITHUB_URL},{text:'🤖 Open bot',url:BOT_URL}],[{text:'⬅️ Back',callback_data:'menu:home'}]]},{parse_mode:'HTML'});

  if(d==='plan:upgrade')return sendUpgradeLink(env,chatId,user);
  if(d==='plan:coupon')return sendText(env,chatId,'🎟 Send your coupon like this:\n<code>/redeem YOURCODE</code>',null,{parse_mode:'HTML'});
  if(d==='plan:cancel')return cancelStarRenewal(env,chatId,user);
  if(d==='reward:redeem'||d==='reward:redeem_all'){const all=d==='reward:redeem_all',r=await redeemCoinsForPaid(env,uid,all);if(!r.ok)return sendText(env,chatId,'🪙 You need at least <b>100 Llama Coins</b> to redeem Paid days.',null,{parse_mode:'HTML'});user=await getUser(env,uid);return sendText(env,chatId,`⭐ <b>Reward redeemed!</b>\n\n🪙 Used: <b>${r.spent} coins</b>\n⭐ Added: <b>${r.days} Paid days</b>\n💰 Remaining: <b>${r.remaining} coins</b>`,rewardsKeyboard(user),{parse_mode:'HTML'});}

  if(d==='memory:clear'){await clearMemory(env,uid);return editText(env,chatId,mid,'🧩 <b>Your saved personalization memory was cleared.</b>\n\nFull conversation history was never stored.',{inline_keyboard:[[{text:'⬅️ Back',callback_data:'menu:home'}]]},{parse_mode:'HTML'});}
  if(d.startsWith('src:'))return showSources(env,uid,chatId,d.slice(4));
  if(d.startsWith('voice:')){const text=String(q.message?.text||q.message?.caption||'').replace(/⚡[^\n]*$/s,'').trim();return sendVoiceForText(env,chatId,text,user);}
  if(d.startsWith('ask:')){const[,id,ix]=d.split(':'),row=await ownedAction(env,uid,id);if(!row)return;let arr=[];try{arr=JSON.parse(row.suggestions_json||'[]');}catch{}const prompt=arr[Number(ix)];if(!prompt)return;await sendText(env,chatId,`💬 <b>You selected:</b> ${escapeHtml(prompt)}`,null,{parse_mode:'HTML'});const pseudo={chat:{id:chatId},from:q.from,text:prompt,reply_to_message:q.message};return generateReply(env,ctx,pseudo,prompt,await getUser(env,uid),{});}
}

async function handleOnboardingCallback(env,q,user,d){
  const uid=Number(q.from.id),chatId=Number(q.message.chat.id),mid=Number(q.message.message_id);
  if(d.startsWith('onboard:gender:')){const value=d.slice('onboard:gender:'.length);if(!['male','female','other','private'].includes(value))return;await setProfileField(env,uid,'gender',value);await setProfileField(env,uid,'onboarding_step','dob');return editText(env,chatId,mid,onboardingDobText(),onboardingDobKeyboard(),{parse_mode:'HTML'});}
  if(d==='onboard:dob:skip'){await setProfileField(env,uid,'dob',null);await setProfileField(env,uid,'onboarding_step','position');return editText(env,chatId,mid,onboardingPositionText(),onboardingPositionKeyboard(),{parse_mode:'HTML'});}
  if(d.startsWith('onboard:position:')){const value=d.slice('onboard:position:'.length);if(value==='other'){await setProfileField(env,uid,'onboarding_step','position_text');return editText(env,chatId,mid,'✍️ Send a short position/title, for example <code>Teacher</code>, <code>Designer</code> or <code>Developer</code>.',null,{parse_mode:'HTML'});}if(!['student','employee','freelancer','business','creator'].includes(value))return;await setProfileField(env,uid,'position',value);await completeProfile(env,uid);const fresh=await getUser(env,uid);await editText(env,chatId,mid,onboardingDoneText(fresh),null,{parse_mode:'HTML'});return sendText(env,chatId,welcomeText(fresh),homeKeyboard(),{parse_mode:'HTML'});}
}

function parseDob(s){const m=String(s||'').trim().match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);if(!m)return null;const d=Number(m[1]),mo=Number(m[2]),y=Number(m[3]);if(y<1900||y>new Date().getUTCFullYear()||mo<1||mo>12||d<1||d>31)return null;const dt=new Date(Date.UTC(y,mo-1,d));if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==mo-1||dt.getUTCDate()!==d)return null;return`${String(y).padStart(4,'0')}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}

async function ownMemory(env,chatId,uid){const m=await memories(env,uid);const body=m.length?'<b>🧩 Your private Llama memory</b>\n\n'+m.map(x=>`• <b>${escapeHtml(x.memory_key)}</b>: ${escapeHtml(x.memory_value)}`).join('\n'):'🧩 <b>No personalization memory saved yet.</b>\n\nLlama only saves durable, useful, non-sensitive facts you explicitly reveal — not full conversations.';return sendText(env,chatId,body,{inline_keyboard:[...(m.length?[[{text:'🗑 Clear memory',callback_data:'memory:clear'}]]:[]),[{text:'⬅️ Home',callback_data:'menu:home'}]]},{parse_mode:'HTML'});}
async function editMemory(env,chatId,mid,uid){const m=await memories(env,uid);const body=m.length?'<b>🧩 Your private Llama memory</b>\n\n'+m.map(x=>`• <b>${escapeHtml(x.memory_key)}</b>: ${escapeHtml(x.memory_value)}`).join('\n'):'🧩 <b>No personalization memory saved yet.</b>\n\nFull conversation history is not stored.';return editText(env,chatId,mid,body,{inline_keyboard:[...(m.length?[[{text:'🗑 Clear memory',callback_data:'memory:clear'}]]:[]),[{text:'⬅️ Back',callback_data:'menu:home'}]]},{parse_mode:'HTML'});}
async function ownInvite(env,chatId,uid){const s=await inviteStats(env,uid);return sendText(env,chatId,inviteText(s.code,s.count,s.people,s.coins),inviteKeyboard(s.code),{parse_mode:'HTML'});}
async function editInvite(env,chatId,mid,uid){const s=await inviteStats(env,uid);return editText(env,chatId,mid,inviteText(s.code,s.count,s.people,s.coins),inviteKeyboard(s.code),{parse_mode:'HTML'});}
async function ownPlan(env,chatId,user){const usage=await getUsage(env,Number(user.user_id));return sendText(env,chatId,planText(user,usage),planKeyboard(user),{parse_mode:'HTML'});}
async function ownRewards(env,chatId,user){const inv=await inviteStats(env,Number(user.user_id));return sendText(env,chatId,rewardsText(user,inv.count),rewardsKeyboard(user),{parse_mode:'HTML'});}

async function createPaidInvoiceLink(env){return api(env,'createInvoiceLink',{title:'Llama Paid',description:`Llama Paid for 30 days: all 3 AI modes, higher web/voice limits and voice selection. Renews every 30 days for ${PAID_STARS} Telegram Stars until canceled.`,payload:PAYMENT_PAYLOAD,provider_token:'',currency:'XTR',prices:[{label:'Llama Paid · 30 days',amount:PAID_STARS}],subscription_period:SUBSCRIPTION_PERIOD});}
async function sendUpgradeLink(env,chatId,user){if(isPaid(user))return sendText(env,chatId,'✨ Your Paid access is already active.',null,{parse_mode:'HTML'});try{const link=await createPaidInvoiceLink(env);return sendText(env,chatId,`<b>⭐ Upgrade to Llama Paid</b>\n\nPrice: <b>${PAID_STARS} Telegram Stars / 30 days</b>\nRecurring until canceled. Paid activates only after Telegram confirms a successful payment.`,{inline_keyboard:[[{text:`⭐ Pay ${PAID_STARS} Stars`,url:link}],[{text:'🎟 I have a coupon',callback_data:'plan:coupon'}]]},{parse_mode:'HTML'});}catch(e){console.error(JSON.stringify({event:'invoice_link_error',message:String(e)}));return sendText(env,chatId,'⚠️ I could not create the Telegram Stars checkout right now. Please try again shortly.');}}
async function handlePreCheckout(q,env){const ok=q?.invoice_payload===PAYMENT_PAYLOAD&&q?.currency==='XTR'&&Number(q?.total_amount)===PAID_STARS;return api(env,'answerPreCheckoutQuery',{pre_checkout_query_id:q.id,ok,...(!ok?{error_message:'This Llama subscription invoice is not valid. Please create a new checkout from /plan.'}:{})});}
async function handleSuccessfulPayment(env,msg,user){const p=msg.successful_payment,uid=Number(msg.from.id),chatId=Number(msg.chat.id);if(p.currency!=='XTR'||p.invoice_payload!==PAYMENT_PAYLOAD||Number(p.total_amount)!==PAID_STARS)return sendText(env,chatId,'⚠️ Payment received with an unexpected subscription payload. Access was not changed.');await recordPayment(env,uid,p);const exp=Number(p.subscription_expiration_date)||Math.floor(Date.now()/1000)+SUBSCRIPTION_PERIOD;await setPaidUntilUnix(env,uid,exp,'stars',p.telegram_payment_charge_id,p.is_recurring!==false);await setModel(env,uid,'smart');const fresh=await getUser(env,uid);return sendText(env,chatId,`🎉⭐ <b>Welcome to Llama Paid!</b>\n\nAll Llama modes, higher monthly limits and voice selection are now unlocked.\n\nPaid until: <b>${escapeHtml(String(fresh.paid_until))} UTC</b>${p.is_recurring?'\nAuto-renewal: <b>ON</b>':''}`,planKeyboard(fresh),{parse_mode:'HTML'});}
async function cancelStarRenewal(env,chatId,user){if(!user?.subscription_charge_id)return sendText(env,chatId,'No Telegram Stars subscription charge is attached to this account.');try{await api(env,'editUserStarSubscription',{user_id:Number(user.user_id),telegram_payment_charge_id:user.subscription_charge_id,is_canceled:true});await markSubscriptionCanceled(env,Number(user.user_id));return sendText(env,chatId,`🛑 <b>Auto-renewal canceled.</b>\n\nYour Paid access remains active until <b>${escapeHtml(String(user.paid_until||'-'))} UTC</b>.`,null,{parse_mode:'HTML'});}catch(e){console.error(JSON.stringify({event:'cancel_sub_error',message:String(e)}));return sendText(env,chatId,'⚠️ I could not cancel renewal right now. Please try again.');}}
async function redeemUserCoupon(env,chatId,uid,code){const r=await redeemCoupon(env,uid,code);if(!r.ok){const map={invalid:'Invalid, expired or fully used coupon.',used:'You already redeemed this coupon.',exhausted:'This coupon has reached its usage limit.'};return sendText(env,chatId,`🎟️ <b>Coupon not applied.</b>\n${escapeHtml(map[r.reason]||'Coupon unavailable.')}`,null,{parse_mode:'HTML'});}const user=await getUser(env,uid);return sendText(env,chatId,`🎉 <b>Coupon applied!</b>\n${r.paidDays?`⭐ Paid access: +${r.paidDays} days\n`:''}${r.coins?`🪙 Llama Coins: +${r.coins}\n`:''}\nNo payment was charged.`,planKeyboard(user),{parse_mode:'HTML'});}

const isAdmin=(env,uid)=>!!env.ADMIN_CHAT_ID&&String(uid)===String(env.ADMIN_CHAT_ID);
async function adminCommand(env,msg,text){
  const chatId=Number(msg.chat.id),uid=Number(msg.from.id),parts=text.trim().split(/\s+/),cmd=parts.shift().toLowerCase().split('@')[0];
  if(cmd==='/admin'){const c=await counts(env);return sendText(env,chatId,`<b>Llama Control</b>\n\nUsers: ${c.users}\nPaid users: ${c.paidUsers}\nTotal messages received: ${c.totalMessages}\nMemories: ${c.memories}\nInvites: ${c.invites}\nActive coupons: ${c.activeCoupons}\n\n<code>/admin_users</code>\n<code>/admin_search query</code>\n<code>/admin_user USER_ID</code>\n<code>/admin_invites</code>\n<code>/admin_sub USER_ID DAYS</code>\n<code>/admin_free USER_ID</code>\n<code>/admin_coins USER_ID AMOUNT</code>\n<code>/admin_coupon CODE DAYS COINS MAX_USES VALID_DAYS</code>\n<code>/admin_coupons</code>\n<code>/admin_coupon_off CODE</code>\n<code>/admin_message USER_ID text</code>\n<code>/admin_block USER_ID</code>\n<code>/admin_unblock USER_ID</code>\n<code>/admin_stats</code>`,null,{parse_mode:'HTML'});}
  if(cmd==='/admin_stats'){const c=await counts(env);return sendText(env,chatId,`<b>Stats</b>\nUsers: ${c.users}\nPaid: ${c.paidUsers}\nMessages received: ${c.totalMessages}\nSaved memories: ${c.memories}\nInvites: ${c.invites}\nActive coupons: ${c.activeCoupons}\nFull conversation/AI response storage: OFF`,null,{parse_mode:'HTML'});}
  if(cmd==='/admin_users'){const rows=await recentUsers(env);return sendText(env,chatId,'<b>Recent users</b>\n\n'+rows.map(u=>`• <code>${u.user_id}</code> ${escapeHtml(u.profile_name||u.first_name||u.username||'User')} · ${isPaid(u)?'Paid':'Free'} · ${u.message_count} msg${u.blocked?' · BLOCKED':''}`).join('\n'),null,{parse_mode:'HTML'});}
  if(cmd==='/admin_search'){const q=parts.join(' ').trim();if(!q)return sendText(env,chatId,'Use: /admin_search name, username or user ID');const rows=await searchUsers(env,q);return sendText(env,chatId,rows.length?'<b>Search results</b>\n\n'+rows.map(u=>`• <code>${u.user_id}</code> ${escapeHtml(u.profile_name||[u.first_name,u.last_name].filter(Boolean).join(' ')||'User')} ${u.username?'@'+escapeHtml(u.username):''} · ${isPaid(u)?'Paid':'Free'}`).join('\n'):'No users found.',null,{parse_mode:'HTML'});}
  if(cmd==='/admin_invites'){const rows=await inviteLeaderboard(env);return sendText(env,chatId,rows.length?'<b>Invite leaderboard</b>\n\n'+rows.map((u,i)=>`${i+1}. ${escapeHtml(u.profile_name||u.first_name||u.username||'User')} · <code>${u.user_id}</code> — <b>${u.invites}</b> invites · ${u.coins||0} coins`).join('\n'):'No invites yet.',null,{parse_mode:'HTML'});}
  if(cmd==='/admin_user'){const target=Number(parts[0]);if(!target)return sendText(env,chatId,'Use: /admin_user USER_ID');const u=await getUser(env,target);if(!u)return sendText(env,chatId,'User not found.');const mem=await memories(env,target),inv=await inviteStats(env,target),usage=await getUsage(env,target);return sendText(env,chatId,`<b>User</b> <code>${u.user_id}</code>\nName: ${escapeHtml(u.profile_name||[u.first_name,u.last_name].filter(Boolean).join(' ')||'-')}\nUsername: ${escapeHtml(u.username?'@'+u.username:'-')}\nGender: ${escapeHtml(u.gender||'-')}\nDOB: ${escapeHtml(u.dob||'-')}\nPosition: ${escapeHtml(u.position||'-')}\nPlan: ${isPaid(u)?'Paid':'Free'}\nPaid until: ${escapeHtml(u.paid_until||'-')}\nPlan source: ${escapeHtml(u.plan_source||'-')}\nCoins: ${u.coins||0}\nModel: ${escapeHtml(activeModel(u))}\nWeb: ${u.web_enabled?'ON':'OFF'}\nVoice: ${u.voice_reply?'Text + Voice':'Text only'} / ${escapeHtml(u.voice_name||'luna')}\nUsage: AI ${usage.ai_count||0}, Web ${usage.web_count||0}, Vin ${usage.voice_in_count||0}, Vout ${usage.voice_out_count||0}\nMessages received: ${u.message_count}\nInvites: ${inv.count}\nInvited by: ${u.invited_by_user_id?`<code>${u.invited_by_user_id}</code>`:'-'}\nLast seen: ${escapeHtml(u.last_seen)}\nBlocked: ${u.blocked?'YES':'NO'}\n\n<b>Memory</b>\n${mem.length?mem.map(m=>`• ${escapeHtml(m.memory_key)}: ${escapeHtml(m.memory_value)}`).join('\n'):'Empty'}`,null,{parse_mode:'HTML'});}
  if(cmd==='/admin_sub'){const target=Number(parts[0]),days=Number(parts[1]);if(!target||!days)return sendText(env,chatId,'Use: /admin_sub USER_ID DAYS');if(!await getUser(env,target))return sendText(env,chatId,'User not found.');await grantPaidDays(env,target,days,'manual');await adminLog(env,'grant_paid',target,`${days} days`);return sendText(env,chatId,`✅ Granted ${Math.trunc(days)} Paid days to <code>${target}</code>.`,null,{parse_mode:'HTML'});}
  if(cmd==='/admin_free'){const target=Number(parts[0]);if(!target)return sendText(env,chatId,'Use: /admin_free USER_ID');await setFree(env,target);await adminLog(env,'set_free',target);return sendText(env,chatId,'✅ User moved to Free.');}
  if(cmd==='/admin_coins'){const target=Number(parts[0]),amount=Math.trunc(Number(parts[1]));if(!target||!Number.isFinite(amount)||!amount)return sendText(env,chatId,'Use: /admin_coins USER_ID AMOUNT');if(!await getUser(env,target))return sendText(env,chatId,'User not found.');await addCoins(env,target,amount,'Manual adjustment');await adminLog(env,'coins',target,String(amount));return sendText(env,chatId,`✅ Coins adjusted by ${amount}.`);}
  if(cmd==='/admin_coupon'){const[code,days,coins,maxUses,validDays]=parts;if(!code||days===undefined||coins===undefined||maxUses===undefined||validDays===undefined)return sendText(env,chatId,'Use: /admin_coupon CODE DAYS COINS MAX_USES VALID_DAYS');try{const c=await createCoupon(env,code,Number(days),Number(coins),Number(maxUses),Number(validDays));await adminLog(env,'coupon_create',null,`${c} d=${days} c=${coins} max=${maxUses} valid=${validDays}`);return sendText(env,chatId,`✅ Coupon <code>${escapeHtml(c)}</code> created.\nPaid days: ${Number(days)||0}\nBonus coins: ${Number(coins)||0}\nMax uses: ${Number(maxUses)||0}\nValidity: ${Number(validDays)||0} days`,null,{parse_mode:'HTML'});}catch(e){return sendText(env,chatId,`Coupon error: ${escapeHtml(String(e.message||e))}`,null,{parse_mode:'HTML'});}}
  if(cmd==='/admin_coupons'){const rows=await listCoupons(env);return sendText(env,chatId,rows.length?'<b>Coupons</b>\n\n'+rows.map(c=>`• <code>${escapeHtml(c.code)}</code> · ${c.paid_days}d · ${c.bonus_coins} coins · ${c.use_count}/${c.max_uses} · ${c.active?'ON':'OFF'} · exp ${escapeHtml(c.expires_at)}`).join('\n'):'No coupons.',null,{parse_mode:'HTML'});}
  if(cmd==='/admin_coupon_off'){const code=parts[0];if(!code)return sendText(env,chatId,'Use: /admin_coupon_off CODE');await disableCoupon(env,code);await adminLog(env,'coupon_off',null,code);return sendText(env,chatId,'✅ Coupon disabled.');}
  if(cmd==='/admin_message'){const target=Number(parts.shift()),body=parts.join(' ').trim();if(!target||!body)return sendText(env,chatId,'Use: /admin_message USER_ID message');const u=await getUser(env,target);if(!u)return sendText(env,chatId,'User not found.');await sendText(env,Number(u.chat_id),`🦙 <b>Message from Llama</b>\n\n${escapeHtml(body)}`,null,{parse_mode:'HTML'});await adminLog(env,'message',target,truncate(body,1000));return sendText(env,chatId,'✅ Message sent.');}
  if(cmd==='/admin_block'||cmd==='/admin_unblock'){const target=Number(parts[0]);if(!target||target===uid)return sendText(env,chatId,'Invalid user.');const block=cmd==='/admin_block';await setBlocked(env,target,block);await adminLog(env,block?'block':'unblock',target);return sendText(env,chatId,block?'✅ User blocked.':'✅ User unblocked.');}
}

export async function registerTelegram(env){
  const adminId=env.ADMIN_CHAT_ID,webhook=`${WORKER_URL}/webhook`,results={};
  results.webhook=await api(env,'setWebhook',{url:webhook,secret_token:env.TELEGRAM_WEBHOOK_SECRET,allowed_updates:['message','callback_query','pre_checkout_query'],drop_pending_updates:false});
  results.publicCommands=await api(env,'setMyCommands',{commands:PUBLIC_COMMANDS});
  results.name=await api(env,'setMyName',{name:'Llama'}).catch(()=>false);
  results.short=await api(env,'setMyShortDescription',{short_description:'Personalized AI with web, voice, images, files, memory & plans.'}).catch(()=>false);
  results.description=await api(env,'setMyDescription',{description:'Llama is a personalized Telegram AI assistant built by Nadeem. Chat, web search, voice, image and file analysis, private memory, Free/Paid plans, coupons and invite rewards.'}).catch(()=>false);
  if(adminId)results.adminCommands=await api(env,'setMyCommands',{commands:[...PUBLIC_COMMANDS,...ADMIN_COMMANDS],scope:{type:'chat',chat_id:Number(adminId)}});
  return results;
}

async function runScheduled(env){
  await registerTelegram(env).catch(e=>console.error(JSON.stringify({event:'telegram_register_error',message:String(e)})));
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),year=Number(p.find(x=>x.type==='year')?.value),month=p.find(x=>x.type==='month')?.value,day=p.find(x=>x.type==='day')?.value,md=`${month}-${day}`;
  const birthdays=await birthdayUsers(env,md,year);await sendBirthdayBatch(env,birthdays,year,false);
  if(md==='03-02'){const users=await llamaBirthdayUsers(env,year);await sendBirthdayBatch(env,users,year,true);}
}
async function sendBirthdayBatch(env,users,year,llama){for(let i=0;i<users.length;i+=20){const chunk=users.slice(i,i+20);await Promise.allSettled(chunk.map(async u=>{await sendText(env,Number(u.chat_id),llama?llamaBirthdayMessage():birthdayMessage(u),null,{parse_mode:'HTML'});if(llama)await markLlamaBirthdaySent(env,Number(u.user_id),year);else await markBirthdaySent(env,Number(u.user_id),year);}));}}

function statusPage(){return`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Llama v${VERSION}</title><style>body{font-family:system-ui;background:#0b0d12;color:#f5f7fb;display:grid;place-items:center;min-height:100vh;margin:0}.card{width:min(680px,88vw);padding:34px;border:1px solid #252a36;border-radius:24px;background:#121620;box-shadow:0 20px 70px #0008}h1{font-size:42px;margin:0 0 8px}.muted{color:#9da7b8}.ok{color:#7df0a5}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:24px 0}.box{padding:14px;border-radius:16px;background:#181d29}a{color:#88b7ff;text-decoration:none}@media(max-width:560px){.grid{grid-template-columns:1fr}h1{font-size:34px}}</style></head><body><main class="card"><h1>🦙 Llama</h1><div class="muted">Personalized Telegram AI assistant</div><p class="ok">● Online · v${VERSION}</p><div class="grid"><div class="box"><b>Birthday</b><br><span class="muted">March 2, 2026</span></div><div class="box"><b>Plans</b><br><span class="muted">Free + Paid</span></div><div class="box"><b>Media</b><br><span class="muted">Images + text/code files</span></div><div class="box"><b>Privacy</b><br><span class="muted">Full chats/files not stored</span></div></div><p>Developed by <b>Nadeem</b> · <a href="${GITHUB_URL}">GitHub</a> · <a href="${BOT_URL}">Open bot</a> · <a href="${WORKER_URL}/health">Health</a></p></main></body></html>`;}
