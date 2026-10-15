export const LOCATION_TOGGLE_KEY='parkpulse.locationEnabled';

export function requestFreshLocation(geolocation){
  if(!geolocation) return Promise.reject(new Error('GEO_UNAVAILABLE'));
  return new Promise((resolve,reject)=>{
    geolocation.getCurrentPosition(
      pos=>resolve({
        latitude:pos.coords.latitude,
        longitude:pos.coords.longitude,
        accuracy:pos.coords.accuracy,
        capturedAt:Date.now()
      }),
      reject,
      {enableHighAccuracy:true,maximumAge:0,timeout:8000}
    );
  });
}

export async function enableLocationWithProof({geolocation,storage}){
  storage.setItem(LOCATION_TOGGLE_KEY,'false');
  const location=await requestFreshLocation(geolocation);
  storage.setItem(LOCATION_TOGGLE_KEY,'true');
  return location;
}

export function disableLocation(storage){
  storage.setItem(LOCATION_TOGGLE_KEY,'false');
}

export function locationPreferenceEnabled(storage){
  const value=storage.getItem(LOCATION_TOGGLE_KEY);
  if(value===null){
    storage.setItem(LOCATION_TOGGLE_KEY,'true');
    return true;
  }
  return value!=='false';
}

function showToast(message){
  const el=document.getElementById('toast');
  if(!el)return;
  el.textContent=message;
  el.classList.remove('hidden');
  clearTimeout(window.__locationToastT);
  window.__locationToastT=setTimeout(()=>el.classList.add('hidden'),2800);
}

function setButtonState(btn,copy,status){
  btn.dataset.status=status;
  btn.classList.remove('enabled','blocked');
  if(status==='granted'){
    btn.textContent='Disable';
    btn.classList.add('enabled');
    copy.textContent='Location is enabled. ParkPulse checks a fresh location whenever you park.';
    return;
  }
  if(status==='denied'){
    btn.textContent='Enable';
    btn.classList.add('blocked');
    copy.textContent='Location permission is blocked. Tap Enable to retry, or allow it in your browser/app settings.';
    return;
  }
  if(status==='checking'){
    btn.textContent='Checking…';
    copy.textContent='Confirming location access on this device.';
    return;
  }
  if(status==='unsupported'){
    btn.textContent='Unavailable';
    btn.classList.add('blocked');
    copy.textContent='Location is not available in this browser or on this device.';
    return;
  }
  btn.textContent='Enable';
  btn.classList.add('blocked');
  copy.textContent='Location is disabled in ParkPulse. Tap Enable to verify location access before parking.';
}

async function restoreLocationState({btn,copy,geolocation,storage}){
  if(!locationPreferenceEnabled(storage)){
    setButtonState(btn,copy,'disabled');
    return 'disabled';
  }
  if(!geolocation){
    setButtonState(btn,copy,'unsupported');
    return 'unsupported';
  }
  setButtonState(btn,copy,'checking');
  try{
    await requestFreshLocation(geolocation);
    setButtonState(btn,copy,'granted');
    return 'granted';
  }catch(error){
    setButtonState(btn,copy,error?.code===1?'denied':'disabled');
    return error?.code===1?'denied':'disabled';
  }
}

export function installLocationControl({doc=document,geolocation=navigator.geolocation,storage=localStorage}={}){
  const btn=doc.getElementById('locationPermissionBtn');
  const copy=doc.getElementById('locationPermissionCopy');
  if(!btn||!copy)return false;

  const restore=()=>restoreLocationState({btn,copy,geolocation,storage});

  btn.onclick=async()=>{
    if(btn.dataset.status==='granted'){
      disableLocation(storage);
      setButtonState(btn,copy,'disabled');
      showToast('Location disabled in ParkPulse');
      return;
    }

    if(!geolocation){
      disableLocation(storage);
      setButtonState(btn,copy,'unsupported');
      showToast('Location is not available on this device.');
      return;
    }

    btn.disabled=true;
    setButtonState(btn,copy,'checking');
    try{
      await enableLocationWithProof({geolocation,storage});
      setButtonState(btn,copy,'granted');
      showToast('Location access verified ✓');
    }catch(error){
      disableLocation(storage);
      setButtonState(btn,copy,error?.code===1?'denied':'disabled');
      if(error?.code===1)showToast('Location permission was not granted.');
      else if(error?.code===2)showToast('Could not determine your location. Please try again.');
      else showToast('Location check took too long. Please try again.');
    }finally{
      btn.disabled=false;
    }
  };

  const profileButton=doc.querySelector('[data-go="profile"]');
  profileButton?.addEventListener('click',()=>setTimeout(restore,0));
  setTimeout(restore,250);
  window.addEventListener('pageshow',restore);
  window.addEventListener('focus',restore);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')restore()});
  return true;
}

if(typeof document!=='undefined')installLocationControl();
