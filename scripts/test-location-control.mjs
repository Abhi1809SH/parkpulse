import assert from 'node:assert/strict';
import { enableLocationWithProof, disableLocation, locationPreferenceEnabled, LOCATION_TOGGLE_KEY } from '../location-control.js';

function storage(initial={}){
  const data=new Map(Object.entries(initial));
  return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v))};
}

function geoSuccess(coords={latitude:12.97,longitude:80.25,accuracy:12}){
  return {getCurrentPosition(success,_error,options){
    assert.equal(options.maximumAge,0,'Enable must not accept a cached location');
    assert.equal(options.enableHighAccuracy,true,'Enable should request high accuracy');
    success({coords});
  }};
}

function geoFailure(error){
  return {getCurrentPosition(_success,failure){failure(error)}};
}

{
  const s=storage();
  assert.equal(locationPreferenceEnabled(s),true,'Location should be enabled by default');
  assert.equal(s.getItem(LOCATION_TOGGLE_KEY),'true','Default-on state should persist across app restarts');
}

{
  const s=storage({[LOCATION_TOGGLE_KEY]:'true'});
  assert.equal(locationPreferenceEnabled(s),true,'Enabled preference must survive app restart');
}

{
  const s=storage({[LOCATION_TOGGLE_KEY]:'false'});
  assert.equal(locationPreferenceEnabled(s),false,'An explicit user disable must be respected');
}

{
  const s=storage({[LOCATION_TOGGLE_KEY]:'false'});
  const result=await enableLocationWithProof({geolocation:geoSuccess(),storage:s});
  assert.equal(s.getItem(LOCATION_TOGGLE_KEY),'true','Enable is persisted only after a real location result');
  assert.equal(result.accuracy,12);
}

{
  const s=storage({[LOCATION_TOGGLE_KEY]:'false'});
  await assert.rejects(enableLocationWithProof({geolocation:geoFailure({code:1}),storage:s}));
  assert.equal(s.getItem(LOCATION_TOGGLE_KEY),'false','Permission denial must leave location disabled');
}

{
  const s=storage({[LOCATION_TOGGLE_KEY]:'false'});
  await assert.rejects(enableLocationWithProof({geolocation:geoFailure({code:3}),storage:s}));
  assert.equal(s.getItem(LOCATION_TOGGLE_KEY),'false','Timeout must leave location disabled');
}

{
  const s=storage({[LOCATION_TOGGLE_KEY]:'true'});
  disableLocation(s);
  assert.equal(s.getItem(LOCATION_TOGGLE_KEY),'false','Disable must immediately block location use');
}

console.log('Location control tests passed.');
