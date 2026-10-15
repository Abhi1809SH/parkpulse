import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL='https://qogvbexjjipuduhppaup.supabase.co';
const SUPABASE_KEY='sb_publishable_muMrKfVXCTNTT9pia2r7wg_4pyesv4g';
export const VAPID_PUBLIC_KEY='BA0WHv4ec_-lVPa68dBdv5JRWMaVT_-rll9TTUZYx6b10CmKIoR09voq-9RJXTpjjZ-2y2-pk4ntTlf5iLyGs8w';
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

function toast(message){
  const el=document.getElementById('toast');
  if(!el)return;
  el.textContent=message;
  el.classList.remove('hidden');
  clearTimeout(window.__notificationToastT);
  window.__notificationToastT=setTimeout(()=>el.classList.add('hidden'),3000);
}

export function urlBase64ToUint8Array(value){
  const padding='='.repeat((4-value.length%4)%4);
  const base64=(value+padding).replace(/-/g,'+').replace(/_/g,'/');
  const raw=atob(base64);
  return Uint8Array.from([...raw].map(ch=>ch.charCodeAt(0)));
}

export function pushSupported(env=globalThis){
  return !!(env.Notification&&env.navigator?.serviceWorker&&env.PushManager);
}

function ensurePreferenceUI(){
  if(document.getElementById('notificationPreferences'))return;
  const row=document.getElementById('notificationPermissionBtn')?.closest('.profileRow');
  if(!row)return;
  const prefs=document.createElement('div');
  prefs.id='notificationPreferences';
  prefs.className='notificationPreferences hidden';
  prefs.innerHTML='<span class="notificationPrefLabel">ALERTS FOR</span><div class="notificationPrefButtons"><button type="button" data-pref="car">🚗 Car</button><button type="button" data-pref="bike">🏍️ Bike</button><button type="button" data-pref="both">Car + Bike</button></div>';
  row.insertAdjacentElement('afterend',prefs);
  const style=document.createElement('style');
  style.textContent='.notificationPreferences{padding:10px 15px 14px 65px;border-top:1px solid var(--line);background:#fcfbff}.notificationPrefLabel{display:block;font-size:8px;font-weight:900;letter-spacing:.1em;color:#aaa5b4;margin-bottom:7px}.notificationPrefButtons{display:flex;gap:6px;flex-wrap:wrap}.notificationPrefButtons button{padding:7px 10px;border-radius:99px;background:#f2f0f7;color:#777184;font-size:9px;font-weight:850;border:1px solid var(--line)}.notificationPrefButtons button.on{background:#eeeaff;color:#5f4dd1;border-color:#d9d1ff}@media(max-width:390px){.notificationPreferences{padding-left:61px}}';
  document.head.appendChild(style);
  prefs.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>setNotificationPreference(button.dataset.pref)));
}

function setPreferenceUI(carAlerts=true,bikeAlerts=true,enabled=false){
  ensurePreferenceUI();
  const prefs=document.getElementById('notificationPreferences');
  if(!prefs)return;
  prefs.classList.toggle('hidden',!enabled);
  const selected=carAlerts&&bikeAlerts?'both':carAlerts?'car':'bike';
  prefs.querySelectorAll('button').forEach(button=>button.classList.toggle('on',button.dataset.pref===selected));
}

function setUI(status,preferences={car_alerts:true,bike_alerts:true}){
  const btn=document.getElementById('notificationPermissionBtn');
  const copy=document.getElementById('notificationPermissionCopy');
  if(!btn||!copy)return;
  btn.dataset.status=status;
  btn.classList.remove('enabled','blocked');
  if(status==='enabled'){
    btn.textContent='Disable';
    btn.classList.add('enabled');
    const car=preferences.car_alerts!==false,bike=preferences.bike_alerts!==false;
    const label=car&&bike?'car and bike':car?'car':'bike';
    copy.textContent=`Parking alerts are on for ${label} spaces. Choose what you want below.`;
    setPreferenceUI(car,bike,true);
    return;
  }
  setPreferenceUI(true,true,false);
  if(status==='blocked'){
    btn.textContent='Blocked';
    btn.classList.add('blocked');
    copy.textContent='Notifications are blocked by this device. Enable notifications in your browser or app settings to turn alerts on.';
    return;
  }
  if(status==='unsupported'){
    btn.textContent='Unavailable';
    btn.classList.add('blocked');
    copy.textContent='Push notifications are not available in this browser. On iPhone, use the ParkPulse Home Screen app.';
    return;
  }
  btn.textContent='Enable';
  copy.textContent='Enable parking alerts, then choose Car, Bike, or both.';
}

async function registration(){
  if(!('serviceWorker' in navigator))throw new Error('PUSH_UNSUPPORTED');
  return navigator.serviceWorker.ready;
}

function subscriptionKeys(subscription){
  const json=subscription.toJSON();
  return {endpoint:subscription.endpoint,p256dh:json.keys?.p256dh||'',auth:json.keys?.auth||''};
}

async function saveSubscription(subscription){
  const keys=subscriptionKeys(subscription);
  if(!keys.p256dh||!keys.auth)throw new Error('PUSH_KEYS_MISSING');
  const {error}=await supabase.rpc('save_my_push_subscription',{
    p_endpoint:keys.endpoint,
    p_p256dh:keys.p256dh,
    p_auth:keys.auth,
    p_user_agent:navigator.userAgent
  });
  if(error)throw error;
}

async function loadPreferences(endpoint){
  const {data,error}=await supabase.rpc('get_my_push_preferences',{p_endpoint:endpoint});
  if(error)return {car_alerts:true,bike_alerts:true};
  const row=Array.isArray(data)?data[0]:data;
  return row||{car_alerts:true,bike_alerts:true};
}

export async function setNotificationPreference(preference){
  if(!['car','bike','both'].includes(preference))throw new Error('INVALID_NOTIFICATION_PREFERENCE');
  const reg=await registration();
  const sub=await reg.pushManager.getSubscription();
  if(!sub)throw new Error('PUSH_NOT_ENABLED');
  const car=preference==='car'||preference==='both';
  const bike=preference==='bike'||preference==='both';
  const prefs=document.getElementById('notificationPreferences');
  prefs?.querySelectorAll('button').forEach(button=>button.disabled=true);
  try{
    const {data,error}=await supabase.rpc('set_my_push_preferences',{p_endpoint:sub.endpoint,p_car_alerts:car,p_bike_alerts:bike});
    if(error||data!==true)throw error||new Error('PREFERENCE_SAVE_FAILED');
    setUI('enabled',{car_alerts:car,bike_alerts:bike});
    toast(preference==='both'?'Car + bike alerts enabled ✓':`${preference==='car'?'Car':'Bike'} alerts enabled ✓`);
    return true;
  }finally{
    prefs?.querySelectorAll('button').forEach(button=>button.disabled=false);
  }
}

export async function refreshNotificationStatus(){
  ensurePreferenceUI();
  if(!pushSupported()){setUI('unsupported');return 'unsupported'}
  if(Notification.permission==='denied'){setUI('blocked');return 'blocked'}
  try{
    const reg=await registration();
    const sub=await reg.pushManager.getSubscription();
    if(!sub){setUI('disabled');return 'disabled'}
    const {data,error}=await supabase.rpc('has_my_push_subscription',{p_endpoint:sub.endpoint});
    if(error||data!==true){
      try{await saveSubscription(sub)}catch{}
    }
    const preferences=await loadPreferences(sub.endpoint);
    setUI('enabled',preferences);
    return 'enabled';
  }catch{
    setUI('disabled');
    return 'disabled';
  }
}

export async function enableNotifications(){
  if(!pushSupported()){setUI('unsupported');throw new Error('PUSH_UNSUPPORTED')}
  let permission=Notification.permission;
  if(permission!=='granted')permission=await Notification.requestPermission();
  if(permission!=='granted'){
    setUI(permission==='denied'?'blocked':'disabled');
    throw new Error('PUSH_PERMISSION_NOT_GRANTED');
  }
  const reg=await registration();
  let sub=await reg.pushManager.getSubscription();
  if(!sub){
    sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(VAPID_PUBLIC_KEY)});
  }
  await saveSubscription(sub);
  const preferences=await loadPreferences(sub.endpoint);
  setUI('enabled',preferences);
  return true;
}

export async function disableNotifications(){
  if(!pushSupported()){setUI('unsupported');return true}
  try{
    const reg=await registration();
    const sub=await reg.pushManager.getSubscription();
    if(sub){
      await supabase.rpc('remove_my_push_subscription',{p_endpoint:sub.endpoint});
      await sub.unsubscribe();
    }
  }finally{
    setUI('disabled');
  }
  return true;
}

async function toggleNotifications(){
  const btn=document.getElementById('notificationPermissionBtn');
  if(!btn)return;
  if(btn.dataset.status==='enabled'){
    btn.disabled=true;
    btn.textContent='Turning off…';
    try{await disableNotifications();toast('Parking notifications disabled')}catch{toast('Could not disable notifications. Please try again.')}finally{btn.disabled=false}
    return;
  }
  btn.disabled=true;
  btn.textContent='Enabling…';
  try{await enableNotifications();toast('Parking notifications enabled ✓')}catch(error){
    if(error?.message==='PUSH_PERMISSION_NOT_GRANTED')toast('Notification permission was not granted.');
    else if(error?.message==='PUSH_UNSUPPORTED')toast('Push notifications are not available on this device.');
    else toast('Could not enable notifications. Please try again.');
  }finally{btn.disabled=false;await refreshNotificationStatus()}
}

export function installNotificationControl(){
  const btn=document.getElementById('notificationPermissionBtn');
  if(!btn)return false;
  ensurePreferenceUI();
  btn.onclick=toggleNotifications;
  const version=document.querySelector('.appVersion');
  if(version)version.textContent='ParkPulse · Version 22';
  setTimeout(refreshNotificationStatus,800);
  window.addEventListener('pageshow',refreshNotificationStatus);
  window.addEventListener('focus',refreshNotificationStatus);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshNotificationStatus()});
  return true;
}

if(typeof document!=='undefined')installNotificationControl();
