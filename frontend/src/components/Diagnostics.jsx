import React, { useEffect, useRef, useState } from 'react'
import { api, speak, stopSpeaking, downloadJson } from '../api.js'
import { ContinuousMic } from '../lib/continuousMic.js'
import { transcribe } from '../lib/recorder.js'
import Icon from './Icon.jsx'
export default function Diagnostics() {
 const [data,setData]=useState(null),[model,setModel]=useState(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[recording,setRecording]=useState(false),[level,setLevel]=useState(0),[heard,setHeard]=useState(''),[audio,setAudio]=useState('未测试')
 const mic=useRef(null),timer=useRef(null),alive=useRef(true)
 useEffect(()=>{alive.current=true;api.diagnostics().then(d=>{if(alive.current)setData(d)}).catch(()=>setNotice('本地服务暂时未连接'));return()=>{alive.current=false;clearTimeout(timer.current);mic.current?.stop();stopSpeaking()}},[])
 const stop=()=>{clearTimeout(timer.current);mic.current?.stop();mic.current=null;setRecording(false);setLevel(0)}
 const testMic=async()=>{if(recording){stop();return}setHeard('');setNotice('');const m=new ContinuousMic({silenceMs:1000,isBusy:()=>false,onLevel:v=>alive.current&&setLevel(v),onSpeechStart:()=>{},onUtterance:async blob=>{try{const text=await transcribe(blob);if(alive.current)setHeard(text||'这句没听清，请再试一次')}catch(e){if(alive.current)setNotice(e.message)}},onError:e=>{stop();setNotice(e.message)}});mic.current=m;try{await m.start();if(!alive.current){m.stop();return}setRecording(true);timer.current=setTimeout(stop,15000)}catch(e){stop();setNotice(e.name==='NotAllowedError'?'麦克风权限未开启，请允许桌面应用使用麦克风':'没有可用的麦克风')}}
 const testModel=async()=>{setBusy(true);try{const r=await api.testConnection();setModel(r)}catch(e){setNotice(e.message)}finally{setBusy(false)}}
 return <div className="diagnostics"><p className="form-note">按顺序检查一次，问题就能定位到具体环节。检查不会发送你的聊天记录。</p><div className="check-row"><span className="check-number">1</span><div><b>本地服务</b><p>{data?'已连接 · '+data.version:'正在检查…'}</p></div><span className="status-tag">{data?'正常':'检查中'}</span></div>
 <div className="check-row"><span className="check-number">2</span><div><b>麦克风与本地识别</b><p>点开始，说一句话并稍作停顿。15 秒后自动关闭。</p></div><button className="btn ghost" onClick={testMic}>{recording?'停止测试':'测试麦克风'}</button></div>{recording&&<div className="test-level"><span style={{width:Math.min(100,level*100)+'%'}}/></div>}{heard&&<p className="test-transcript">识别结果：{heard}</p>}
 <div className="check-row"><span className="check-number">3</span><div><b>对话模型</b><p>{model?.message||(data?.model_configured?'已配置，待实际连接测试':'尚未配置，请先到“连接”填写')}</p></div><button className="btn ghost" disabled={busy} onClick={testModel}>{busy?'测试中…':'测试模型'}</button></div>
 <div className="check-row"><span className="check-number">4</span><div><b>语音播放</b><p>{audio}</p></div><button className="btn ghost" disabled={audio==='播放中…'} onClick={async()=>{setAudio('播放中…');try{const ok=await speak('你好，这里是心屿。听到这句话，说明语音播放已连接。');if(alive.current)setAudio(ok?'播放完成，请确认是否听到声音':'播放未完成')}catch{if(alive.current)setAudio('语音服务连接失败')}}}>播放测试音</button></div>
 {notice&&<p className="hint-err" role="alert">{notice}</p>}<button className="text-button" disabled={!data} onClick={()=>downloadJson({...data,model_test:model?{ok:model.ok,latency_ms:model.latency_ms}:null,audio_test:audio},'心屿-内测诊断.json')}>导出诊断结果</button><p className="form-note">诊断文件不含密钥、录音或聊天原文。模型测试和在线朗读需要网络。</p></div>
}