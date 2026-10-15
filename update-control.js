export const APP_VERSION='18';
export const UPDATE_CHECK_MS=15000;

export async function fetchRemoteVersion({fetchImpl=fetch,now=Date.now}={}){
  try{
    const response=await fetchImpl(`./version.json?ts=${now()}`,{
      cache:'no-store',
      headers:{'Cache-Control':'no-cache'}
    });
    if(!response?.ok)return null;
    const data=await response.json();
    return String(data?.version||'').trim()||null;
  }catch{
    return null;
  }
}

export async function checkForUpdate({currentVersion=APP_VERSION,fetchImpl=fetch,now=Date.now,onUpdate=async()=>{}}={}){
  const remoteVersion=await fetchRemoteVersion({fetchImpl,now});
  if(!remoteVersion||remoteVersion===String(currentVersion))return false;
  await onUpdate(remoteVersion);
  return true;
}

function userIsBusy(){
  const active=document.activeElement;
  if(active&&/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName))return true;
  return !!document.querySelector('.modalBack:not(.hidden)');
}

function showUpdating(){
  const toast=document.getElementById('toast');
  if(!toast)return;
  toast.textContent='Updating ParkPulse…';
  toast.classList.remove('hidden');
}

let applying=false;
let timer=null;

async function applyUpdate(){
  if(applying||document.visibilityState!=='visible'||userIsBusy())return;
  applying=true;
  showUpdating();
  try{
    const registration=await navigator.serviceWorker?.getRegistration?.();
    await registration?.update?.();
  }catch{}
  setTimeout(()=>location.reload(),650);
}

async function runUpdateCheck(){
  if(document.visibilityState!=='visible'||!navigator.onLine)return false;
  return checkForUpdate({onUpdate:applyUpdate});
}

export function installAutoUpdater(){
  if(typeof window==='undefined'||typeof document==='undefined')return;
  clearInterval(timer);
  timer=setInterval(runUpdateCheck,UPDATE_CHECK_MS);
  setTimeout(runUpdateCheck,1200);
  window.addEventListener('focus',runUpdateCheck);
  window.addEventListener('online',runUpdateCheck);
  window.addEventListener('pageshow',runUpdateCheck);
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')runUpdateCheck();
  });
}

if(typeof window!=='undefined')installAutoUpdater();
