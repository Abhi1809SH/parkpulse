import assert from 'node:assert/strict';
import {APP_VERSION,fetchRemoteVersion,checkForUpdate} from '../update-control.js';

const okFetch=async()=>({ok:true,json:async()=>({version:APP_VERSION})});
assert.equal(await fetchRemoteVersion({fetchImpl:okFetch,now:()=>1}),APP_VERSION);
assert.equal(await checkForUpdate({fetchImpl:okFetch,now:()=>1}),false);

let applied=null;
const newerFetch=async()=>({ok:true,json:async()=>({version:'999'})});
assert.equal(await checkForUpdate({currentVersion:APP_VERSION,fetchImpl:newerFetch,now:()=>2,onUpdate:async v=>{applied=v}}),true);
assert.equal(applied,'999');

const badFetch=async()=>{throw new Error('offline')};
assert.equal(await fetchRemoteVersion({fetchImpl:badFetch,now:()=>3}),null);
assert.equal(await checkForUpdate({fetchImpl:badFetch,now:()=>3}),false);

console.log('Automatic update checks passed.');
