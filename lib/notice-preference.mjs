// A device-local display preference, deliberately separate from project storage.
export const NOTICE_KEY='rijksmap-dismissed-notices-v1';
export function dismissedNotice(message,storage) {
  try {const values=JSON.parse(storage.getItem(NOTICE_KEY)||'[]');return Array.isArray(values)&&values.includes(message);}
  catch {return false;}
}
export function dismissNotice(message,storage) {
  try {
    let values;try{values=JSON.parse(storage.getItem(NOTICE_KEY)||'[]');}catch{values=[];}
    storage.setItem(NOTICE_KEY,JSON.stringify([...new Set([...(Array.isArray(values)?values.filter(v=>typeof v==='string'):[]),message])].slice(-30)));
    return true;
  }catch{return false;}
}
function browserStores(){
  const stores=[];
  if(typeof window==='undefined')return stores;
  for(const key of ['localStorage','sessionStorage'])try{stores.push(window[key]);}catch{/* Browser denies storage. */}
  return stores;
}
export function isBrowserNoticeDismissed(message){return browserStores().some(s=>dismissedNotice(message,s));}
export function rememberBrowserNoticeDismissal(message){return browserStores().map(s=>dismissNotice(message,s)).some(Boolean);}
