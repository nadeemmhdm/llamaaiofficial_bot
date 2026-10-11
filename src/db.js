import {INVITER_COINS,INVITEE_COINS,REWARD_COST,REWARD_DAYS,isPaid} from './config.js';

function codeFor(uid){return 'u'+Number(uid).toString(36);}
function utcSqlFromUnix(sec){return new Date(Number(sec)*1000).toISOString().slice(0,19).replace('T',' ');}
export function monthKeyIST(date=new Date()){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit'}).formatToParts(date);const y=p.find(x=>x.type==='year')?.value,m=p.find(x=>x.type==='month')?.value;return`${y}-${m}`;}

export async function upsertUser(env,from,chatId,startParam=''){
  const uid=Number(from.id);
  await env.DB.prepare(`INSERT INTO users(user_id,chat_id,username,first_name,last_name,invite_code,message_count) VALUES(?,?,?,?,?,?,1)
    ON CONFLICT(user_id) DO UPDATE SET chat_id=excluded.chat_id,username=excluded.username,first_name=excluded.first_name,last_name=excluded.last_name,last_seen=CURRENT_TIMESTAMP,message_count=users.message_count+1`)
    .bind(uid,chatId,from.username||null,from.first_name||null,from.last_name||null,codeFor(uid)).run();
  await env.DB.prepare("UPDATE users SET invite_code=COALESCE(invite_code,?),voice_name=COALESCE(voice_name,'luna'),plan=COALESCE(plan,'free'),coins=COALESCE(coins,0),model=CASE WHEN COALESCE(plan,'free')='free' THEN 'fast' ELSE model END WHERE user_id=?").bind(codeFor(uid),uid).run();
  if(startParam?.startsWith('ref_'))await applyReferral(env,uid,startParam.slice(4));
}

async function applyReferral(env,uid,code){
  if(!code)return;
  const me=await env.DB.prepare('SELECT message_count,invited_by_user_id FROM users WHERE user_id=?').bind(uid).first();
  if(!me||Number(me.message_count)>1||me.invited_by_user_id)return;
  const inviter=await env.DB.prepare('SELECT user_id FROM users WHERE invite_code=? AND user_id<>?').bind(code,uid).first();
  if(!inviter?.user_id)return;
  const r=await env.DB.prepare('UPDATE users SET invited_by_user_id=? WHERE user_id=? AND invited_by_user_id IS NULL').bind(Number(inviter.user_id),uid).run();
  if(Number(r?.meta?.changes||0)>0){
    await addCoins(env,Number(inviter.user_id),INVITER_COINS,'Referral reward',`invite:${uid}:inviter`);
    await addCoins(env,uid,INVITEE_COINS,'Invite welcome reward',`invite:${uid}:invitee`);
  }
}

export const getUser=(env,uid)=>env.DB.prepare('SELECT * FROM users WHERE user_id=?').bind(uid).first();
export async function memories(env,uid){const r=await env.DB.prepare('SELECT memory_key,memory_value,confidence FROM memories WHERE user_id=? ORDER BY updated_at DESC LIMIT 30').bind(uid).all();return r.results||[];}
export async function saveMemory(env,uid,key,value,confidence=.8){await env.DB.prepare(`INSERT INTO memories(user_id,memory_key,memory_value,confidence) VALUES(?,?,?,?) ON CONFLICT(user_id,memory_key) DO UPDATE SET memory_value=excluded.memory_value,confidence=excluded.confidence,updated_at=CURRENT_TIMESTAMP`).bind(uid,key,value,confidence).run();await env.DB.prepare(`DELETE FROM memories WHERE user_id=? AND id NOT IN (SELECT id FROM memories WHERE user_id=? ORDER BY updated_at DESC LIMIT 30)`).bind(uid,uid).run();}
export const clearMemory=(env,uid)=>env.DB.prepare('DELETE FROM memories WHERE user_id=?').bind(uid).run();
export async function clearActions(env,uid){await env.DB.prepare('DELETE FROM response_actions WHERE user_id=?').bind(uid).run();}

export const setModel=(env,uid,v)=>env.DB.prepare('UPDATE users SET model=?,last_seen=CURRENT_TIMESTAMP WHERE user_id=?').bind(v,uid).run();
export const setWeb=(env,uid,v)=>env.DB.prepare('UPDATE users SET web_enabled=?,last_seen=CURRENT_TIMESTAMP WHERE user_id=?').bind(v?1:0,uid).run();
export const setVoice=(env,uid,v)=>env.DB.prepare('UPDATE users SET voice_reply=?,last_seen=CURRENT_TIMESTAMP WHERE user_id=?').bind(v?1:0,uid).run();
export const setVoiceName=(env,uid,v)=>env.DB.prepare('UPDATE users SET voice_name=?,last_seen=CURRENT_TIMESTAMP WHERE user_id=?').bind(v,uid).run();

export async function saveAction(env,uid,id,sources,suggestions){await env.DB.prepare(`INSERT OR REPLACE INTO response_actions(response_id,user_id,sources_json,suggestions_json) VALUES(?,?,?,?)`).bind(id,uid,JSON.stringify(sources||[]),JSON.stringify(suggestions||[])).run();await env.DB.prepare(`DELETE FROM response_actions WHERE user_id=? AND response_id NOT IN (SELECT response_id FROM response_actions WHERE user_id=? ORDER BY created_at DESC LIMIT 40)`).bind(uid,uid).run();await env.DB.prepare(`DELETE FROM response_actions WHERE created_at < datetime('now','-7 days')`).run();}
export const ownedAction=(env,uid,id)=>env.DB.prepare('SELECT * FROM response_actions WHERE response_id=? AND user_id=?').bind(id,uid).first();

export async function inviteStats(env,uid){const u=await getUser(env,uid);const [c,r]=await env.DB.batch([env.DB.prepare('SELECT COUNT(*) n FROM users WHERE invited_by_user_id=?').bind(uid),env.DB.prepare('SELECT user_id,username,first_name,profile_name,last_seen FROM users WHERE invited_by_user_id=? ORDER BY created_at DESC LIMIT 20').bind(uid)]);return{code:u?.invite_code||codeFor(uid),count:c.results?.[0]?.n||0,people:r.results||[],coins:Number(u?.coins)||0};}

export async function getUsage(env,uid,date=new Date()){const key=monthKeyIST(date);let row=await env.DB.prepare('SELECT * FROM monthly_usage WHERE user_id=? AND month_key=?').bind(uid,key).first();if(!row){await env.DB.prepare('INSERT OR IGNORE INTO monthly_usage(user_id,month_key) VALUES(?,?)').bind(uid,key).run();row=await env.DB.prepare('SELECT * FROM monthly_usage WHERE user_id=? AND month_key=?').bind(uid,key).first();}return row||{user_id:uid,month_key:key,ai_count:0,web_count:0,voice_in_count:0,voice_out_count:0};}
export async function bumpUsage(env,uid,field,amount=1){const allowed={ai:'ai_count',web:'web_count',voiceIn:'voice_in_count',voiceOut:'voice_out_count'},col=allowed[field];if(!col)throw new Error('Invalid usage field');const key=monthKeyIST();await env.DB.prepare(`INSERT INTO monthly_usage(user_id,month_key,${col}) VALUES(?,?,?) ON CONFLICT(user_id,month_key) DO UPDATE SET ${col}=${col}+excluded.${col}`).bind(uid,key,amount).run();return getUsage(env,uid);}

export async function setProfileField(env,uid,field,value){const allowed=new Set(['profile_name','gender','dob','position','onboarding_step','profile_complete']);if(!allowed.has(field))throw new Error('Invalid profile field');await env.DB.prepare(`UPDATE users SET ${field}=?,last_seen=CURRENT_TIMESTAMP WHERE user_id=?`).bind(value,uid).run();}
export async function resetProfileSetup(env,uid){await env.DB.prepare("UPDATE users SET profile_complete=0,onboarding_step='name' WHERE user_id=?").bind(uid).run();}
export async function completeProfile(env,uid){await env.DB.prepare("UPDATE users SET profile_complete=1,onboarding_step='done' WHERE user_id=?").bind(uid).run();}

export async function addCoins(env,uid,delta,reason='Adjustment',sourceKey=null){delta=Math.trunc(Number(delta)||0);if(!delta)return false;let inserted=true;if(sourceKey){const r=await env.DB.prepare('INSERT OR IGNORE INTO coin_ledger(user_id,delta,reason,source_key) VALUES(?,?,?,?)').bind(uid,delta,reason,sourceKey).run();inserted=Number(r?.meta?.changes||0)>0;}else await env.DB.prepare('INSERT INTO coin_ledger(user_id,delta,reason) VALUES(?,?,?)').bind(uid,delta,reason).run();if(inserted)await env.DB.prepare('UPDATE users SET coins=MAX(0,COALESCE(coins,0)+?) WHERE user_id=?').bind(delta,uid).run();return inserted;}
export async function redeemCoinsForPaid(env,uid,all=false){
  const row=await env.DB.prepare('SELECT COALESCE(coins,0) coins FROM users WHERE user_id=?').bind(uid).first();
  const balance=Math.max(0,Math.trunc(Number(row?.coins)||0)),available=Math.floor(balance/REWARD_COST),units=all?available:Math.min(1,available);
  if(units<1)return{ok:false,reason:'coins',remaining:balance};
  const spent=units*REWARD_COST,days=units*REWARD_DAYS;
  const r=await env.DB.prepare('UPDATE users SET coins=coins-? WHERE user_id=? AND coins>=?').bind(spent,uid,spent).run();
  if(Number(r?.meta?.changes||0)<1)return{ok:false,reason:'race'};
  await env.DB.prepare('INSERT INTO coin_ledger(user_id,delta,reason,source_key) VALUES(?,?,?,?)').bind(uid,-spent,`${days} Paid days redemption`,`reward:${uid}:${Date.now()}:${units}`).run();
  await grantPaidDays(env,uid,days,'reward');
  const fresh=await env.DB.prepare('SELECT COALESCE(coins,0) coins FROM users WHERE user_id=?').bind(uid).first();
  return{ok:true,units,spent,days,remaining:Number(fresh?.coins)||0};
}

export async function grantPaidDays(env,uid,days,source='manual',chargeId=null){days=Math.max(1,Math.min(3650,Math.trunc(Number(days)||0)));const mod=`+${days} days`;await env.DB.prepare(`UPDATE users SET plan='paid',paid_until=datetime(CASE WHEN paid_until IS NOT NULL AND datetime(paid_until)>CURRENT_TIMESTAMP THEN paid_until ELSE CURRENT_TIMESTAMP END,?),plan_source=?,subscription_charge_id=COALESCE(?,subscription_charge_id) WHERE user_id=?`).bind(mod,source,chargeId,uid).run();}
export async function setPaidUntilUnix(env,uid,unix,source='stars',chargeId=null,autoRenew=1){const sql=utcSqlFromUnix(unix);await env.DB.prepare(`UPDATE users SET plan='paid',paid_until=CASE WHEN paid_until IS NOT NULL AND datetime(paid_until)>datetime(?) THEN paid_until ELSE ? END,plan_source=?,subscription_charge_id=?,subscription_auto_renew=? WHERE user_id=?`).bind(sql,sql,source,chargeId,autoRenew?1:0,uid).run();}
export async function setFree(env,uid){await env.DB.prepare("UPDATE users SET plan='free',paid_until=NULL,plan_source=NULL,subscription_auto_renew=0,model='fast' WHERE user_id=?").bind(uid).run();}
export async function markSubscriptionCanceled(env,uid){await env.DB.prepare('UPDATE users SET subscription_auto_renew=0 WHERE user_id=?').bind(uid).run();}

export async function recordPayment(env,uid,p){await env.DB.prepare(`INSERT OR IGNORE INTO payments(telegram_charge_id,user_id,currency,amount,invoice_payload,subscription_expiration_date,is_recurring,is_first_recurring,status) VALUES(?,?,?,?,?,?,?,?,?)`).bind(String(p.telegram_payment_charge_id||''),uid,String(p.currency||''),Number(p.total_amount||0),String(p.invoice_payload||''),p.subscription_expiration_date?utcSqlFromUnix(p.subscription_expiration_date):null,p.is_recurring?1:0,p.is_first_recurring?1:0,'paid').run();}

export async function createCoupon(env,code,paidDays,bonusCoins,maxUses,validDays){code=String(code||'').trim().toUpperCase();if(!/^[A-Z0-9_-]{3,32}$/.test(code))throw new Error('Invalid coupon code');paidDays=Math.max(0,Math.min(3650,Math.trunc(Number(paidDays)||0)));bonusCoins=Math.max(0,Math.min(100000,Math.trunc(Number(bonusCoins)||0)));maxUses=Math.max(1,Math.min(100000,Math.trunc(Number(maxUses)||1)));validDays=Math.max(1,Math.min(3650,Math.trunc(Number(validDays)||30)));await env.DB.prepare(`INSERT INTO coupons(code,paid_days,bonus_coins,max_uses,expires_at,active) VALUES(?,?,?,?,datetime('now',?),1) ON CONFLICT(code) DO UPDATE SET paid_days=excluded.paid_days,bonus_coins=excluded.bonus_coins,max_uses=excluded.max_uses,expires_at=excluded.expires_at,active=1`).bind(code,paidDays,bonusCoins,maxUses,`+${validDays} days`).run();return code;}
export async function listCoupons(env){const r=await env.DB.prepare('SELECT * FROM coupons ORDER BY created_at DESC LIMIT 50').all();return r.results||[];}
export async function disableCoupon(env,code){await env.DB.prepare('UPDATE coupons SET active=0 WHERE code=?').bind(String(code||'').trim().toUpperCase()).run();}
export async function redeemCoupon(env,uid,code){code=String(code||'').trim().toUpperCase();const c=await env.DB.prepare(`SELECT * FROM coupons WHERE code=? AND active=1 AND datetime(expires_at)>CURRENT_TIMESTAMP AND use_count<max_uses`).bind(code).first();if(!c)return{ok:false,reason:'invalid'};const prior=await env.DB.prepare('SELECT 1 ok FROM coupon_redemptions WHERE coupon_id=? AND user_id=?').bind(c.id,uid).first();if(prior)return{ok:false,reason:'used'};const ins=await env.DB.prepare('INSERT OR IGNORE INTO coupon_redemptions(coupon_id,user_id) VALUES(?,?)').bind(c.id,uid).run();if(Number(ins?.meta?.changes||0)<1)return{ok:false,reason:'used'};const upd=await env.DB.prepare('UPDATE coupons SET use_count=use_count+1 WHERE id=? AND use_count<max_uses').bind(c.id).run();if(Number(upd?.meta?.changes||0)<1){await env.DB.prepare('DELETE FROM coupon_redemptions WHERE coupon_id=? AND user_id=?').bind(c.id,uid).run();return{ok:false,reason:'exhausted'};}if(Number(c.paid_days)>0)await grantPaidDays(env,uid,Number(c.paid_days),'coupon');if(Number(c.bonus_coins)>0)await addCoins(env,uid,Number(c.bonus_coins),`Coupon ${code}`,`coupon:${c.id}:${uid}`);return{ok:true,paidDays:Number(c.paid_days)||0,coins:Number(c.bonus_coins)||0};}

export async function birthdayUsers(env,monthDay,year){const r=await env.DB.prepare(`SELECT * FROM users WHERE blocked=0 AND profile_complete=1 AND dob IS NOT NULL AND substr(dob,6,5)=? AND COALESCE(birthday_notice_year,0)<>? ORDER BY user_id LIMIT 1000`).bind(monthDay,year).all();return r.results||[];}
export const markBirthdaySent=(env,uid,year)=>env.DB.prepare('UPDATE users SET birthday_notice_year=? WHERE user_id=?').bind(year,uid).run();
export async function llamaBirthdayUsers(env,year){const r=await env.DB.prepare('SELECT * FROM users WHERE blocked=0 AND COALESCE(llama_birthday_notice_year,0)<>? ORDER BY user_id LIMIT 1000').bind(year).all();return r.results||[];}
export const markLlamaBirthdaySent=(env,uid,year)=>env.DB.prepare('UPDATE users SET llama_birthday_notice_year=? WHERE user_id=?').bind(year,uid).run();

export async function counts(env){const [u,m,i,t,p,c]=await env.DB.batch([env.DB.prepare('SELECT COUNT(*) n FROM users'),env.DB.prepare('SELECT COUNT(*) n FROM memories'),env.DB.prepare('SELECT COUNT(*) n FROM users WHERE invited_by_user_id IS NOT NULL'),env.DB.prepare('SELECT COALESCE(SUM(message_count),0) n FROM users'),env.DB.prepare("SELECT COUNT(*) n FROM users WHERE plan='paid' AND datetime(paid_until)>CURRENT_TIMESTAMP"),env.DB.prepare('SELECT COUNT(*) n FROM coupons WHERE active=1 AND datetime(expires_at)>CURRENT_TIMESTAMP')]);return{users:u.results?.[0]?.n||0,memories:m.results?.[0]?.n||0,invites:i.results?.[0]?.n||0,totalMessages:t.results?.[0]?.n||0,paidUsers:p.results?.[0]?.n||0,activeCoupons:c.results?.[0]?.n||0};}
export async function recentUsers(env){const r=await env.DB.prepare('SELECT * FROM users ORDER BY last_seen DESC LIMIT 30').all();return r.results||[];}
export async function searchUsers(env,q){q=String(q||'').trim();if(!q)return[];const id=Number(q);if(Number.isFinite(id)&&id>0){const r=await env.DB.prepare('SELECT * FROM users WHERE user_id=? LIMIT 10').bind(id).all();if(r.results?.length)return r.results;}const like='%'+q.replace(/^@/,'').toLowerCase()+'%';const r=await env.DB.prepare(`SELECT * FROM users WHERE lower(COALESCE(username,'')) LIKE ? OR lower(COALESCE(first_name,'')) LIKE ? OR lower(COALESCE(last_name,'')) LIKE ? OR lower(COALESCE(profile_name,'')) LIKE ? ORDER BY last_seen DESC LIMIT 15`).bind(like,like,like,like).all();return r.results||[];}
export async function inviteLeaderboard(env){const r=await env.DB.prepare(`SELECT u.user_id,u.username,u.first_name,u.profile_name,COUNT(i.user_id) invites,u.coins FROM users u JOIN users i ON i.invited_by_user_id=u.user_id GROUP BY u.user_id ORDER BY invites DESC,u.last_seen DESC LIMIT 20`).all();return r.results||[];}
export const setBlocked=(env,uid,v)=>env.DB.prepare('UPDATE users SET blocked=? WHERE user_id=?').bind(v?1:0,uid).run();
export const adminLog=(env,action,target,details='')=>env.DB.prepare('INSERT INTO admin_logs(action,target_user_id,details) VALUES(?,?,?)').bind(action,target,details).run();
