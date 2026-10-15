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
    copy.textContent='Location is enabled. Tap Disable if you want ParkPulse to stop using your location.';
    return;
  }
  if(status==='denied'){
    btn.textContent='Enable';
    btn.classList.add('blocked');
    copy.textContent='Location permission was not granted. Tap Enable to try again, or allow it in your browser/site settings.';
    return;
  }
  btn.textContent='Enable';
  btn.classList.add('blocked');
  copy.textContent='Location is disabled in ParkPulse. Tap Enable to verify location access before parking.';
}

export function installLocationControl({doc=document,geolocation=navigator.geolocation,storage=localStorage}={}){
  const btn=doc.getElementById('locationPermissionBtn');
  const copy=doc.getElementById('locationPermissionCopy');
  if(!btn||!copy)return false;

  btn.onclick=async()=>{
    if(btn.dataset.status==='granted'){
      disableLocation(storage);
      setButtonState(btn,copy,'disabled');
      showToast('Location disabled in ParkPulse');
      return;
    }

    if(!geolocation){
      disableLocation(storage);
      btn.dataset.status='unsupported';
      btn.textContent='Unavailable';
      copy.textContent='Location is not available in this browser or on this device.';
      showToast('Location is not available on this device.');
      return;
    }

    btn.disabled=true;
    btn.textContent='Verifying…';
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
  return true;
}

if(typeof document!=='undefined')installLocationControl();
