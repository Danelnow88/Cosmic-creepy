'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('CRPeer',{host:options=>ipcRenderer.invoke('cr:host',options),join:options=>ipcRenderer.invoke('cr:join',options),leave:()=>ipcRenderer.invoke('cr:leave'),input:value=>ipcRenderer.send('cr:input',value),publish:value=>ipcRenderer.send('cr:snapshot',value),onEvent:callback=>{const listener=(_,value)=>callback(value);ipcRenderer.on('cr:peer',listener);return ()=>ipcRenderer.removeListener('cr:peer',listener);}});
