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

function setUI(status){
  const btn=document.getElementById('notificationPermissionBtn');
  const copy=document.getElementById('notificationPermissionCopy');
  if(!btn||!copy)return;
  btn.dataset.status=status;
  btn.classList.remove('enabled','blocked');
  if(status==='enabled'){
    btn.textContent='Disable';
    btn.classList.add('enabled');
    copy.textContent='Parking alerts are on. You will be notified whenever a car space is occupied, parking becomes full, or a car space becomes free.';
    return;
  }
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
  copy.textContent='Get an alert after every car space is occupied or released, including when parking becomes full.';
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

export async function refreshNotificationStatus(){
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
    setUI('enabled');
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
  setUI('enabled');
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
  btn.onclick=toggleNotifications;
  setTimeout(refreshNotificationStatus,800);
  window.addEventListener('pageshow',refreshNotificationStatus);
  window.addEventListener('focus',refreshNotificationStatus);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshNotificationStatus()});
  return true;
}

if(typeof document!=='undefined')installNotificationControl();
