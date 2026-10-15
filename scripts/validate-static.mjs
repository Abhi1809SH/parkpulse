import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
const locationControl=fs.readFileSync('location-control.js','utf8');
const parkingLocation=fs.readFileSync('parking-location.js','utf8');
const notificationControl=fs.readFileSync('notification-control.js','utf8');
const updateControl=fs.readFileSync('update-control.js','utf8');
const version=JSON.parse(fs.readFileSync('version.json','utf8'));
const sw=fs.readFileSync('sw.js','utf8');

const failures=[];
const check=(ok,msg)=>{if(!ok)failures.push(msg);else console.log(`✓ ${msg}`)};

const ids=new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]));
const dynamicIds=new Set([...app.matchAll(/id=[\\"']([^\\"']+)[\\"']/g)].map(m=>m[1]));
const referenced=[...new Set([...app.matchAll(/\$\(['"]([^'"]+)['"]\)/g)].map(m=>m[1]))];
const missing=referenced.filter(id=>!ids.has(id)&&!dynamicIds.has(id));
check(missing.length===0,missing.length?`All JS DOM ids exist (missing: ${missing.join(', ')})`:'All JS DOM ids exist, including dynamic controls');

check(/<section class="view active" id="home">/.test(html),'Home is the default active view');
check(!/<section class="view active" id="profile">/.test(html),'Profile is not the default active view');
check(app.includes("if(event==='SIGNED_IN'||event==='INITIAL_SESSION')setView('home')"),'Authentication explicitly lands on Home');
check(app.includes("from('parking_presence')"),'Frontend uses privacy-safe parking presence');
check(app.includes("from('parking_sessions')") && app.includes(".is('ended_at',null).maybeSingle()"),'Frontend only requests the signed-in user active session');
check(app.includes('const HEARTBEAT_MS=15000'),'15-second server heartbeat is enabled');
check(app.includes('refreshLive({silent:true})'),'Heartbeat revalidates live parking from the server');
check(app.includes("document.visibilityState==='visible'"),'Heartbeat only runs while ParkPulse is visible');
check(app.includes('navigator.geolocation.getCurrentPosition'),'Geolocation check is enabled');
check(app.includes("p_latitude:location.latitude")&&app.includes("p_longitude:location.longitude")&&app.includes("p_accuracy_m:location.accuracy"),'Parking claims send geofence coordinates and accuracy');
check(html.includes('id="locationPermissionBtn"'),'Profile includes an in-app location permission control');
check(locationControl.includes("locationPreferenceEnabled") && locationControl.includes("storage.setItem(LOCATION_TOGGLE_KEY,'true')"),'Location is enabled by default and persists across restarts');
check(locationControl.includes("maximumAge:0") && locationControl.includes("enableHighAccuracy:true"),'Location enable requires fresh high-accuracy proof');
check(locationControl.includes("import { installFreshGeolocationGuard }") && locationControl.includes('installFreshGeolocationGuard(globalThis)'),'Location control installs the fresh geolocation guard');
check(parkingLocation.includes('maximumAge:0') && parkingLocation.includes('enableHighAccuracy:true'),'Every guarded geolocation request rejects stale cached coordinates');
check(parkingLocation.includes('LOCATION_ACCURACY_LOW') && parkingLocation.includes('PARKING_MAX_ACCURACY_M=250'),'Parking location helper rejects poor accuracy');

check(html.includes('id="notificationPermissionBtn"') && html.includes('Parking alerts'),'Profile includes a parking notification toggle');
check(html.includes('Car, Bike, or both'),'Parking alert copy exposes vehicle preferences');
check(notificationControl.includes('Notification.requestPermission()'),'Notification enable flow requests device permission');
check(notificationControl.includes('pushManager.subscribe') && notificationControl.includes('userVisibleOnly:true'),'Notification enable flow creates a Web Push subscription');
check(notificationControl.includes("rpc('save_my_push_subscription'") && notificationControl.includes("rpc('remove_my_push_subscription'"),'Notification toggle persists and removes the signed-in user subscription');
check(notificationControl.includes("rpc('get_my_push_preferences'") && notificationControl.includes("rpc('set_my_push_preferences'"),'Notification preferences are loaded and saved per subscription');
check(notificationControl.includes("data-pref=\"car\"") && notificationControl.includes("data-pref=\"bike\"") && notificationControl.includes("data-pref=\"both\""),'Profile exposes Car, Bike and Both notification choices');
check(notificationControl.includes('await sub.unsubscribe()'),'Notification disable flow unsubscribes the current device');
check(sw.includes("addEventListener('push'") && sw.includes('showNotification'),'Service worker displays background push notifications');
check(sw.includes("addEventListener('notificationclick'") && sw.includes('openWindow'),'Notification taps reopen ParkPulse');

check(version.version==='22','Release marker reports version 22');
check(updateControl.includes("APP_VERSION='22'") && updateControl.includes("cache:'no-store'") && updateControl.includes("location.reload()"),'Automatic updater is aligned to version 22 and bypasses cache');
check(updateControl.includes('UPDATE_CHECK_MS=15000'),'Automatic updater checks for releases every 15 seconds');
check(html.includes('update-control.js?v=22'),'Automatic update control is loaded');
check(html.includes('location-control.js?v=22'),'Persistent location control is loaded');
check(html.includes('notification-control.js?v=22'),'Parking notification control is loaded');
check(html.includes('ParkPulse · Version 22'),'Profile displays the running app version');
check(html.includes('app.js?v=22'),'HTML points at current JavaScript release');
check(html.includes('app.css?v=22'),'HTML points at current CSS release');
check(sw.includes("const CACHE='parkpulse-v22'"),'Service worker cache version matches release');
check(sw.includes("'./parking-location.js'") && sw.includes("'./location-control.js'") && sw.includes("'./notification-control.js'") && sw.includes("'./update-control.js'") && sw.includes("'./version.json'"),'Service worker includes location, notification and update assets');
check(sw.includes('client.navigate(client.url)'),'New service worker refreshes open ParkPulse clients');
check(sw.includes("fetch(request,{cache:'no-store'})"),'Core asset refresh is network-first');
check(html.includes('Location access') && html.includes('Daily reset') && html.includes('Privacy first'),'Profile page includes parking rules and privacy guidance');
check(!html.includes('invite code') || html.includes('No invite code'),'Invite-code onboarding is not required');
check(!html.includes('sendOtpBtn') && !html.includes('verifyOtpBtn'),'Old OTP controls are absent');

if(failures.length){
  console.error('\nValidation failed:');
  failures.forEach(x=>console.error(`✗ ${x}`));
  process.exit(1);
}
console.log('\nParkPulse static validation passed.');
