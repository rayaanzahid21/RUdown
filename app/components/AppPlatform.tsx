'use client';
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {Download,Smartphone,Share,PlusSquare,WifiOff,CheckCircle2} from 'lucide-react';
import {Modal} from './UI';
type InstallEvent=Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
const PlatformContext=createContext({installed:false,offline:false,openInstall:()=>{}});
export const useAppPlatform=()=>useContext(PlatformContext);
export function InstallButton({compact=false}:{compact?:boolean}) {
 const {installed,openInstall}=useAppPlatform();
 if(installed)return null;
 return <button className={'button ghost install-button '+(compact?'compact':'')} onClick={openInstall} aria-label="Install RUdown"><Download size={17}/><span>Install app</span></button>;
}
export function AppPlatform({children}:{children:ReactNode}) {
 const [installed,setInstalled]=useState(false),[offline,setOffline]=useState(false),[open,setOpen]=useState(false),[prompt,setPrompt]=useState<InstallEvent|null>(null),[installing,setInstalling]=useState(false),[message,setMessage]=useState(''),[ios,setIos]=useState(false);
 useEffect(()=>{
  const media=window.matchMedia('(display-mode: standalone)'),check=()=>setInstalled(media.matches||!!(navigator as Navigator&{standalone?:boolean}).standalone),network=()=>setOffline(!navigator.onLine);
  const before=(e:Event)=>{e.preventDefault();setPrompt(e as InstallEvent);};
  const done=()=>{setInstalled(true);setPrompt(null);setMessage('RUdown is installed. Find it on your home screen or in your apps.');};
  check();network();setIos(/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1));
  window.addEventListener('beforeinstallprompt',before);window.addEventListener('appinstalled',done);window.addEventListener('online',network);window.addEventListener('offline',network);media.addEventListener('change',check);
  if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(()=>{});
  return()=>{window.removeEventListener('beforeinstallprompt',before);window.removeEventListener('appinstalled',done);window.removeEventListener('online',network);window.removeEventListener('offline',network);media.removeEventListener('change',check);};
 },[]);
 async function install(){if(!prompt)return;setInstalling(true);setMessage('');try{await prompt.prompt();const choice=await prompt.userChoice;setMessage(choice.outcome==='accepted'?'Installation requested. Your browser will finish adding RUdown.':'No problem. You can install RUdown later.');setPrompt(null);}catch{setMessage('Use your browser’s menu to install RUdown.');setPrompt(null);}finally{setInstalling(false);}}
 return <PlatformContext.Provider value={{installed,offline,openInstall:()=>{setMessage('');setOpen(true);}}}>
  {offline&&<div className="connection-banner" role="status"><WifiOff size={16}/><span>You’re offline. Reconnect to load or save shared plans. Changes are not queued.</span></div>}
  {children}
  {open&&<Modal title="Your people. One tap away." onClose={()=>setOpen(false)}>
   <div className="install-preview"><img src="/icons/icon-192.png" alt="RUdown app icon" width={70} height={70}/><div><strong>RUdown</strong><span>Less planning. More going.</span><small>Free · Install from your browser</small></div></div>
   {installed?<p className="alert success"><CheckCircle2 size={18}/>RUdown is installed on this device.</p>:<>
    <p className="muted">Add RUdown to your home screen and open it like an app, with quick navigation and more room for your plans.</p>
    {prompt&&<button className="button primary full" disabled={installing} onClick={install}><Download size={18}/>{installing?'Opening installer…':'Install RUdown'}</button>}
    <div className="install-guide"><h3><Smartphone size={18}/>{ios?'On this iPhone or iPad':'iPhone & iPad'}</h3><ol><li>Open this site in <strong>Safari</strong> and sign in if asked.</li><li>Open the browser menu or tap <Share size={14}/> <strong>Share</strong>, then <PlusSquare size={14}/> <strong>Add to Home Screen</strong>.</li><li>Keep <strong>Open as Web App</strong> on if shown, then tap <strong>Add</strong>.</li></ol></div>
    {!ios&&<div className="install-guide"><h3>Android</h3><ol><li>Open this site in <strong>Chrome</strong>.</li><li>Tap <strong>Install RUdown</strong> above if available, or open Chrome’s <strong>⋮</strong> menu.</li><li>Choose <strong>Add to Home screen</strong> or <strong>Install app</strong> and confirm.</li></ol></div>}
    <p className="data-note">On a computer, use the browser’s install icon or menu. In an in-app browser, open this link in Safari or Chrome first.</p>
   </>}
   {message&&<p className="alert neutral" role="status">{message}</p>}
   <p className="data-note">Internet is needed for shared plans, maps and calendar sync. Install before creating your group: some devices keep browser and installed-app storage separate. Installation does not grant access to this private site.</p>
  </Modal>}
 </PlatformContext.Provider>;
}
