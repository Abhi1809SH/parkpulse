export const PARKING_MAX_ACCURACY_M=250;

function locationError(message){
  const error=new Error(message);
  error.code=message;
  return error;
}

export function readFreshPosition(geolocation,{timeout=8000}={}){
  if(!geolocation)return Promise.reject(locationError('GEO_UNAVAILABLE'));
  return new Promise((resolve,reject)=>{
    geolocation.getCurrentPosition(
      position=>resolve({
        latitude:position.coords.latitude,
        longitude:position.coords.longitude,
        accuracy:position.coords.accuracy,
        capturedAt:Date.now()
      }),
      reject,
      {enableHighAccuracy:true,maximumAge:0,timeout}
    );
  });
}

export async function getFreshParkingLocation(geolocation,{maxAccuracy=PARKING_MAX_ACCURACY_M}={}){
  let location=await readFreshPosition(geolocation,{timeout:7000});
  if(Number(location.accuracy)>maxAccuracy){
    location=await readFreshPosition(geolocation,{timeout:9000});
  }
  if(!Number.isFinite(Number(location.accuracy))||Number(location.accuracy)>maxAccuracy){
    throw locationError('LOCATION_ACCURACY_LOW');
  }
  return location;
}
