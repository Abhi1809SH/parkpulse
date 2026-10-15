import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
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
check(app.includes("permission.state==='granted'"),'Location is prewarmed only when permission is already granted');
check(html.includes('app.js?v=13'),'HTML points at current JavaScript release');
check(html.includes('app.css?v=11'),'HTML points at current CSS release');
check(sw.includes("const CACHE='parkpulse-v13'"),'Service worker cache version matches release');
check(sw.includes("fetch(request,{cache:'no-store'})"),'Core asset refresh is network-first');
check(!html.includes('invite code') || html.includes('No invite code'),'Invite-code onboarding is not required');
check(!html.includes('sendOtpBtn') && !html.includes('verifyOtpBtn'),'Old OTP controls are absent');

if(failures.length){
  console.error('\nValidation failed:');
  failures.forEach(x=>console.error(`✗ ${x}`));
  process.exit(1);
}
console.log('\nParkPulse static validation passed.');