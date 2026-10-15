import assert from 'node:assert/strict';
import { hardenedGeolocationOptions, getFreshParkingLocation, installFreshGeolocationGuard } from '../parking-location.js';

{
  const options=hardenedGeolocationOptions({timeout:1234,maximumAge:999999,enableHighAccuracy:false});
  assert.equal(options.maximumAge,0,'Parking must never accept cached location');
  assert.equal(options.enableHighAccuracy,true,'Parking must always request high accuracy');
  assert.equal(options.timeout,1234);
}

{
  const calls=[];
  const geolocation={getCurrentPosition(success,_failure,options){
    calls.push(options);
    success({coords:{latitude:18.556,longitude:73.776,accuracy:20}});
  }};
  const location=await getFreshParkingLocation(geolocation);
  assert.equal(location.accuracy,20);
  assert.equal(calls.length,1);
  assert.equal(calls[0].maximumAge,0);
  assert.equal(calls[0].enableHighAccuracy,true);
}

{
  let call=0;
  const geolocation={getCurrentPosition(success,_failure,options){
    call++;
    assert.equal(options.maximumAge,0);
    success({coords:{latitude:18.556,longitude:73.776,accuracy:call===1?400:30}});
  }};
  const location=await getFreshParkingLocation(geolocation);
  assert.equal(call,2,'Low accuracy should trigger a second fresh reading');
  assert.equal(location.accuracy,30);
}

{
  let call=0;
  const geolocation={getCurrentPosition(success,_failure){
    call++;
    success({coords:{latitude:18.556,longitude:73.776,accuracy:400}});
  }};
  await assert.rejects(getFreshParkingLocation(geolocation),/LOCATION_ACCURACY_LOW/);
  assert.equal(call,2);
}

{
  let seen;
  const geolocation={getCurrentPosition(success,_failure,options){seen=options;success({coords:{latitude:1,longitude:1,accuracy:10}})}};
  const env={navigator:{geolocation}};
  assert.equal(installFreshGeolocationGuard(env),true);
  geolocation.getCurrentPosition(()=>{},()=>{},{maximumAge:60000,enableHighAccuracy:false,timeout:5000});
  assert.equal(seen.maximumAge,0,'Global guard must prevent stale cached coordinates');
  assert.equal(seen.enableHighAccuracy,true,'Global guard must force high accuracy');
  assert.equal(installFreshGeolocationGuard(env),false,'Guard should only install once');
}

console.log('Parking location tests passed.');
