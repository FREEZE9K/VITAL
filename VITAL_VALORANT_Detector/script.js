const $ = id => document.getElementById(id);
const DEFAULTS = {break_minutes:60,water_minutes:45,stretch_minutes:50,eye_minutes:20,daily_water_goal:2000};
const STORAGE_KEY = "vital-normal-website-v1";
let data = loadData(), sessionStart = data.activeSessionStart || null;
let reminderClock = {break:Date.now(),water:Date.now(),stretch:Date.now(),eye:Date.now()};
let breakUntil = 0, toastTimer;
let detectorConnected = false, detectedValorant = false, autoSession = false;

function loadData(){
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {settings:{...DEFAULTS,...(saved.settings||{})}, logs:saved.logs||[], sessions:saved.sessions||[], activeSessionStart:saved.activeSessionStart||null};
  } catch { return {settings:{...DEFAULTS},logs:[],sessions:[],activeSessionStart:null}; }
}
function save(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(data)); }
function todayKey(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),3000);}
function fmt(sec){sec=Math.max(0,Math.floor(sec||0));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;return h?`${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`:`${m}:${String(s).padStart(2,"0")}`;}
function shortTime(sec){const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60);return h?`${h}h ${m}m`:`${m}m`;}
function addLog(kind,amount=1){
  data.logs.unshift({kind,amount,at:new Date().toISOString()});save();
  reminderClock[kind==="water"?"water":kind==="stretch"?"stretch":kind==="eye"?"eye":"break"]=Date.now();
  render();toast("Wellness activity logged.");
}
function getTodayLogs(kind){return data.logs.filter(x=>x.kind===kind&&x.at.slice(0,10)===todayKey()).reduce((sum,x)=>sum+x.amount,0);}
function todayGamingSeconds(){
  let total=data.sessions.filter(s=>s.startedAt.slice(0,10)===todayKey()).reduce((n,s)=>n+s.seconds,0);
  if(sessionStart){const start=new Date(sessionStart);if(start.toDateString()===new Date().toDateString())total+=Math.max(0,(Date.now()-start.getTime())/1000);}
  return total;
}
function render(){
  const active=!!sessionStart, elapsed=active?(Date.now()-new Date(sessionStart).getTime())/1000:0;
  $("game-state").textContent=detectedValorant?"●  VALORANT detected":(detectorConnected?(active?"●  Gaming session active":"◉  VALORANT not running"):"◉  Detector offline");
  $("detector-hint").textContent=detectorConnected?(detectedValorant?"VALORANT detected — session tracking automatically.":"Windows detector connected — waiting for VALORANT."):"Start the Windows helper (start_vital.bat) to enable automatic detection.";
  $("session-time").textContent=fmt(elapsed);$("today-time").textContent=shortTime(todayGamingSeconds());
  const water=getTodayLogs("water"),breaks=getTodayLogs("break"),stretches=getTodayLogs("stretch"),eyes=getTodayLogs("eye");
  $("water-total").textContent=`${water.toLocaleString()} ml`;$("breaks").textContent=breaks;$("stretches").textContent=stretches;$("eyes").textContent=eyes;
  $("start-btn").disabled=active;$("stop-btn").disabled=!active;
  const energy=Math.max(0,100-Math.min(100,Math.floor(elapsed/3600*15)));
  $("energy").textContent=`${energy}%`;$("energy-big").textContent=`${energy}%`;
  const goal=Number(data.settings.daily_water_goal)||2000,pct=Math.min(100,Math.floor(water/goal*100));
  $("hydration-pct").textContent=`${pct}%`;$("hydration-amount").textContent=`${water.toLocaleString()} / ${goal.toLocaleString()} ml`;$("hydration-label").textContent=pct>=75?"ON TRACK":"KEEP HYDRATING";
  const mobility=Math.min(100,stretches*20);$("mobility-pct").textContent=`${mobility}%`;$("mobility-label").textContent=mobility>=60?"NICE WORK":"MOVE A LITTLE";
  $("mode-badge").textContent=active?"SESSION ACTIVE":"READY";$("mode-badge").className=`pill ${active?"red":"green"}`;
  $("companion-title").textContent=active?"KEEP IT BALANCED":"YOUR COMPANION";
  $("companion-message").innerHTML=active?"Your session is being tracked.<br>Remember to pause and hydrate.":"Ready when you are.<br>Play smart. Take breaks.";
  $("break-countdown").textContent=countdown("break");$("eye-countdown").textContent=countdown("eye");
}
function countdown(kind){
  if(!sessionStart)return fmt((data.settings[kind+"_minutes"]||20)*60);
  const elapsed=(Date.now()-reminderClock[kind])/1000,remaining=Math.max(0,(data.settings[kind+"_minutes"]||20)*60-elapsed);
  return fmt(remaining);
}
function startSession(source="manual"){if(sessionStart)return;autoSession=(source==="auto");sessionStart=new Date().toISOString();data.activeSessionStart=sessionStart;reminderClock={break:Date.now(),water:Date.now(),stretch:Date.now(),eye:Date.now()};save();render();toast("Gaming session started.");}
function stopSession(){if(!sessionStart)return;autoSession=false;const seconds=Math.max(0,Math.floor((Date.now()-new Date(sessionStart).getTime())/1000));data.sessions.unshift({startedAt:sessionStart,endedAt:new Date().toISOString(),seconds});sessionStart=null;data.activeSessionStart=null;save();render();loadHistory();toast(`Session ended (${shortTime(seconds)}).`);}
function notify(title,message){toast(`${title}: ${message}`);if("Notification"in window&&Notification.permission==="granted")new Notification(title,{body:message});}
function remindersTick(){
 if(!sessionStart||Date.now()<breakUntil)return;
 for(const [key,title,msg] of [["break","Time for a break","Take a short pause away from the game."],["water","Water reminder","Consider getting a drink of water."],["stretch","Stretch reminder","Stand up and move gently if comfortable."],["eye","Eye rest","Look at something in the distance for a little while."]]){
  const interval=(Number(data.settings[key+"_minutes"])||20)*60000;
  if(Date.now()-reminderClock[key]>=interval){reminderClock[key]=Date.now();notify(title,msg);}
 }
}
function startBreak(){breakUntil=Date.now()+5*60000;addLog("break");notify("Break started","Take five minutes away from the game.");}
function loadHistory(){
 const rows=[];
 data.sessions.slice(0,20).forEach(s=>rows.push(`${new Date(s.startedAt).toLocaleString()} — ${shortTime(s.seconds)} session`));
 data.logs.slice(0,30).forEach(l=>rows.push(`${new Date(l.at).toLocaleString()} — ${l.kind}: ${l.amount}${l.kind==="water"?" ml":""}`));
 $("history-list").textContent=rows.length?rows.join("\n"):"No activity yet.";
}
function loadSettings(){for(const [k,v] of Object.entries(data.settings)){const el=document.querySelector(`[name="${k}"]`);if(el)el.value=v;}}
document.querySelectorAll(".nav").forEach(btn=>btn.addEventListener("click",()=>{
 document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
 btn.classList.add("active");$(`page-${btn.dataset.page}`).classList.add("active");if(btn.dataset.page==="history")loadHistory();if(btn.dataset.page==="settings")loadSettings();
}));
$("start-btn").addEventListener("click",startSession);$("stop-btn").addEventListener("click",stopSession);
$("stretch-btn").addEventListener("click",()=>addLog("stretch"));$("hub-stretch").addEventListener("click",()=>addLog("stretch"));$("eye-btn").addEventListener("click",()=>addLog("eye"));
$("break-btn").addEventListener("click",startBreak);$("hub-break").addEventListener("click",startBreak);
document.querySelectorAll("[data-water]").forEach(b=>b.addEventListener("click",()=>addLog("water",Number(b.dataset.water))));
$("log-water-btn").addEventListener("click",()=>{const n=Number($("custom-ml").value);if(!Number.isInteger(n)||n<1||n>5000){toast("Enter an amount from 1 to 5000 ml.");return;}$("custom-ml").value="";addLog("water",n);});
$("settings-form").addEventListener("submit",e=>{e.preventDefault();const form=new FormData(e.currentTarget);for(const [k,v]of form.entries()){const n=Number(v);if(!Number.isInteger(n)||n<1||n>10000){toast("Please enter valid positive whole numbers.");return;}data.settings[k]=n;}save();render();toast("Settings saved.");});

async function pollGameDetector(){
  try{
    const response=await fetch("/api/status",{cache:"no-store"});
    if(!response.ok) throw new Error("Detector API unavailable");
    const status=await response.json();
    detectorConnected=!!status.ok;
    const wasDetected=detectedValorant;
    detectedValorant=!!status.valorant_running;
    if(detectedValorant && !sessionStart){
      startSession("auto");
      toast("VALORANT detected — tracking started automatically.");
    }else if(!detectedValorant && wasDetected && sessionStart && autoSession){
      stopSession();
      toast("VALORANT closed — session tracking stopped.");
    }
    render();
  }catch(error){
    detectorConnected=false;
    detectedValorant=false;
    render();
  }
}

if("Notification"in window&&Notification.permission==="default")document.body.addEventListener("click",()=>Notification.requestPermission(),{once:true});
$("clock").textContent=new Date().toLocaleTimeString();render();loadHistory();
pollGameDetector();setInterval(()=>{$("clock").textContent=new Date().toLocaleTimeString();render();remindersTick();},1000);setInterval(pollGameDetector,3000);
