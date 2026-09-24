import "./style.css";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

function uid(){try{return crypto.randomUUID()}catch(e){return Date.now().toString(36)+Math.random().toString(36).slice(2,10)}}
function addHour(t){let[h,m]=t.split(':').map(Number);return String((h+1)%24).padStart(2,'0')+':'+String(m).padStart(2,'0')}
const DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const KEY="studyflow-data-v1";
const TYPES=["Quiz","Exam","Oral","Project","Assignment","Other"];
const COLORS=["#7c5cff","#4f8cff","#2dbf9f","#ff9f43","#ef5da8","#8b8b98"];

const store={get(k){try{return localStorage.getItem(k)}catch(e){return mem[k]||null}},set(k,v){mem[k]=v;try{localStorage.setItem(k,v)}catch(e){}},del(k){delete mem[k];try{localStorage.removeItem(k)}catch(e){}}};
const mem={};
let data=JSON.parse(store.get(KEY)||"null")||{
  profile:{name:"",school:"",grade:""},
  subjects:[],
  classes:[],
  events:[],
  theme:"light",
  notifications:true
};
let view="home";

function save(){store.set(KEY,JSON.stringify(data));try{syncNotifications()}catch(e){}}
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function fmtDate(x){if(!x)return "";return new Date(x+"T00:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});}
function fmtTime(x){if(!x)return "";let [h,m]=x.split(":");let d=new Date();d.setHours(+h,+m);return d.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});}
function todayName(){return new Date().toLocaleDateString(undefined,{weekday:"long"});}
function greeting(){let h=new Date().getHours();return h<12?"Good morning":h<18?"Good afternoon":"Good evening";}
function subjectName(id){return data.subjects.find(s=>s.id===id)?.name||"No subject";}
function icon(type){return ({Quiz:"✦",Exam:"◈",Oral:"◉",Project:"◇",Assignment:"✓",Other:"•"})[type]||"•";}

function shell(){
 document.documentElement.dataset.theme=data.theme;
 document.querySelector("#app").innerHTML=`
 <div class="app">
  <header class="top"><div><div class="eyebrow">STUDYFLOW</div><h1>${greeting()}${data.profile.name?", "+esc(data.profile.name):""} <span>👋</span></h1></div>
  <button class="iconbtn" onclick="openQuick()">＋</button></header>
  <main id="content"></main>
  <nav class="nav">
   ${nav("home","⌂","Home")}${nav("schedule","▦","Schedule")}${nav("events","✓","Events")}${nav("subjects","◌","Subjects")}${nav("settings","⚙","Settings")}
  </nav>
 </div>`;
 render();
}
function nav(v,i,t){return `<button class="${view===v?"active":""}" onclick="go('${v}')"><b>${i}</b><span>${t}</span></button>`}
function go(v){view=v;shell();}

function render(){let c=document.querySelector("#content"); if(view==="home")c.innerHTML=home(); else if(view==="schedule")c.innerHTML=schedule(); else if(view==="events")c.innerHTML=events(); else if(view==="subjects")c.innerHTML=subjects(); else c.innerHTML=settings();}

function home(){
 let dn=todayName(), cls=data.classes.filter(x=>x.day===dn).sort((a,b)=>a.start.localeCompare(b.start));
 let upcoming=data.events.filter(e=>e.status!=="Completed").sort((a,b)=>(a.date+" "+a.time).localeCompare(b.date+" "+b.time)).slice(0,5);
 return `<section class="page">
  <div class="hero"><div><span class="muted">${new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"})}</span><h2>Today at a glance</h2></div><div class="orb">✦</div></div>
  <div class="sectionhead"><h3>Today's classes</h3><button onclick="addClass()">Add</button></div>
  ${cls.length?cls.map(classCard).join(""):`<div class="empty"><div>☁️</div><strong>No classes today</strong><span>Add your schedule to see it here.</span><button onclick="addClass()">Add class</button></div>`}
  <div class="sectionhead"><h3>Upcoming</h3><button onclick="go('events')">See all</button></div>
  ${upcoming.length?upcoming.map(eventCard).join(""):`<div class="empty small"><strong>You're all caught up 🎉</strong></div>`}
 </section>`;
}
function classCard(x){return `<div class="card classcard"><div class="time">${fmtTime(x.start)}<small>${fmtTime(x.end)}</small></div><div class="line"></div><div class="grow"><strong>${esc(subjectName(x.subjectId))}</strong><span>${esc(x.teacher||"")} ${x.room?"· "+esc(x.room):""}</span></div><button class="dots" onclick="editClass('${x.id}')">⋯</button></div>`}
function eventCard(e){return `<div class="card eventcard"><div class="typeicon t-${e.type.toLowerCase()}">${icon(e.type)}</div><div class="grow"><strong>${esc(e.title)}</strong><span>${esc(e.type)} · ${esc(subjectName(e.subjectId))}</span><small>${fmtDate(e.date)}${e.time?" · "+fmtTime(e.time):""}</small></div><button class="dots" onclick="editEvent('${e.id}')">⋯</button></div>`}

function schedule(){
 let days=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
 return `<section class="page"><div class="pagehead"><div><span class="muted">YOUR WEEK</span><h2>Schedule</h2></div><button class="primary" onclick="addClass()">＋ Class</button></div>
 <div class="daystrip">${days.map(d=>`<button onclick="selectDay('${d}')">${d.slice(0,3)}</button>`).join("")}</div>
 <div id="dayview">${dayView(todayName())}</div></section>`;
}
function selectDay(d){document.querySelector("#dayview").innerHTML=dayView(d);}
function dayView(d){
 let cls=data.classes.filter(x=>x.day===d).sort((a,b)=>a.start.localeCompare(b.start));
 return `<div class="daytitle"><h3>${d}</h3><button onclick="addClass('${d}')">Add</button></div>${cls.length?cls.map(classCard).join(""):`<div class="empty small"><strong>No classes on ${d}.</strong></div>`}`;
}

function events(){
 let list=[...data.events].sort((a,b)=>(a.date+" "+a.time).localeCompare(b.date+" "+b.time));
 return `<section class="page"><div class="pagehead"><div><span class="muted">ACADEMIC PLANNER</span><h2>Events</h2></div><button class="primary" onclick="addEvent()">＋ Event</button></div>
 <div class="chips"><button class="selected" onclick="filterEvents('All',this)">All</button>${TYPES.map(t=>`<button onclick="filterEvents('${t}',this)">${t}</button>`).join("")}</div>
 <div id="eventlist">${list.length?list.map(eventCard).join(""):`<div class="empty"><div>📝</div><strong>No events yet</strong><span>Keep quizzes, exams and deadlines in one place.</span><button onclick="addEvent()">Add event</button></div>`}</div></section>`;
}
function filterEvents(t,btn){document.querySelectorAll(".chips button").forEach(x=>x.classList.remove("selected"));btn.classList.add("selected");let l=data.events.filter(e=>t==="All"||e.type===t).sort((a,b)=>(a.date+" "+a.time).localeCompare(b.date+" "+b.time));document.querySelector("#eventlist").innerHTML=l.length?l.map(eventCard).join(""):`<div class="empty small"><strong>No ${t.toLowerCase()} events.</strong></div>`;}

function subjects(){
 return `<section class="page"><div class="pagehead"><div><span class="muted">YOUR CLASSES</span><h2>Subjects</h2></div><button class="primary" onclick="addSubject()">＋ Subject</button></div>
 ${data.subjects.length?data.subjects.map((s,i)=>`<div class="card subject"><span class="swatch" style="background:${COLORS[i%COLORS.length]}"></span><div class="grow"><strong>${esc(s.name)}</strong><span>${esc(s.teacher||"No teacher")} ${s.room?"· "+esc(s.room):""}</span></div><button class="dots" onclick="editSubject('${s.id}')">⋯</button></div>`).join(""):`<div class="empty"><div>📚</div><strong>No subjects yet</strong><span>Add your subjects once, then reuse them in your schedule.</span><button onclick="addSubject()">Add subject</button></div>`}</section>`;
}
function settings(){
 return `<section class="page"><div class="pagehead"><div><span class="muted">PREFERENCES</span><h2>Settings</h2></div></div>
 <div class="settinggroup"><h3>Profile</h3><button class="setting" onclick="profile()"><span>👤</span><div><strong>${esc(data.profile.name||"Your profile")}</strong><small>${esc(data.profile.school||"Add your school information")}</small></div><b>›</b></button></div>
 <div class="settinggroup"><h3>Appearance</h3><button class="setting" onclick="toggleTheme()"><span>◐</span><div><strong>Theme</strong><small>${data.theme==="light"?"Light":"Dark"}</small></div><b>›</b></button></div>
 <div class="settinggroup"><h3>Reminders</h3><button class="setting" onclick="toggleNotifications()"><span>🔔</span><div><strong>Notifications</strong><small>${data.notifications?"Enabled":"Disabled"}</small></div><b>${data.notifications?"ON":"OFF"}</b></button><label class="setting"><span>⏰</span><div><strong>Class reminder</strong><small>Before each class starts</small></div><select onchange="setClassRemind(this.value)">${[[0,"Off"],[5,"5 min"],[10,"10 min"],[15,"15 min"],[30,"30 min"]].map(o=>`<option value="${o[0]}" ${(data.classRemind??10)==o[0]?"selected":""}>${o[1]}</option>`).join("")}</select></label><button class="setting" onclick="testNotify()"><span>🧪</span><div><strong>Send test notification</strong><small>Arrives in 5 seconds</small></div><b>TEST</b></button></div>
 <div class="settinggroup"><h3>Help</h3><button class="setting" onclick="startTour()"><span>🎓</span><div><strong>Replay tutorial</strong><small>A quick guided tour of the app</small></div><b>›</b></button></div><div class="settinggroup"><h3>Backup</h3><button class="setting" onclick="openBackup()"><span>💾</span><div><strong>Backup &amp; restore</strong><small>Save or move your data</small></div><b>›</b></button></div><div class="settinggroup"><h3>Data</h3><button class="setting danger" onclick="resetData()"><span>↺</span><div><strong>Reset all data</strong><small>Remove subjects, classes and events</small></div><b>›</b></button></div>
 <p class="version">StudyFlow • MVP 1.0</p></section>`;
}

function modal(title,body){
 let el=document.createElement("div");el.className="modalwrap";el.id="modal";el.innerHTML=`<div class="backdrop" onclick="closeModal()"></div><div class="modal"><div class="modalhead"><h2>${title}</h2><button onclick="closeModal()">×</button></div>${body}</div>`;document.body.appendChild(el);
 el.querySelectorAll("form").forEach(f=>f.addEventListener("click",ev=>{
  let b=ev.target.closest("button");
  if(!b||b.type!=="submit")return;
  ev.preventDefault();
  if(f.reportValidity&&!f.reportValidity())return;
  f.onsubmit&&f.onsubmit(new Event("submit",{cancelable:true}));
 }));
}
function closeModal(){document.querySelector("#modal")?.remove();}
function subjectOptions(selected=""){return `<option value="">No subject</option>`+data.subjects.map(s=>`<option value="${s.id}" ${s.id===selected?"selected":""}>${esc(s.name)}</option>`).join("");}

window.openQuick=()=>modal("Quick add",`<div class="quickgrid">${["Class","Quiz","Exam","Oral","Project","Assignment"].map(x=>`<button onclick="${x==="Class"?"addClass()":"addEvent('"+x+"')"}">${icon(x)}<span>${x}</span></button>`).join("")}</div>`);
window.addSubject=()=>modal("Add subject",`<form onsubmit="saveSubject(event)"><label>Subject name<input id="sname" required placeholder="Mathematics"></label><label>Teacher<input id="steacher" placeholder="Mr. Santos"></label><label>Room<input id="sroom" placeholder="204"></label><label>Class days (pick one or more)</label><div class="chips">${DAYS.map(d=>`<label class="chip"><input type="checkbox" name="sday" value="${d}"><span>${d.slice(0,3)}</span></label>`).join("")}</div><div class="row"><label>Start<input id="sstart" type="time" value="08:00"></label><label>End<input id="send" type="time" value="09:00"></label></div><label>Notes<textarea id="snotes" placeholder="Optional"></textarea></label><button class="primary wide">Save subject</button></form>`);
window.editSubject=id=>{let s=data.subjects.find(x=>x.id===id);modal("Edit subject",`<form onsubmit="updateSubject(event,'${id}')"><label>Subject name<input id="sname" required value="${esc(s.name)}"></label><label>Teacher<input id="steacher" value="${esc(s.teacher||"")}"></label><label>Room<input id="sroom" value="${esc(s.room||"")}"></label><button class="primary wide">Save changes</button><button type="button" class="delete wide" onclick="deleteSubject('${id}')">Delete</button></form>`)};
window.saveSubject=e=>{e.preventDefault();
 let sub={id:uid(),name:sname.value.trim(),teacher:steacher.value,room:sroom.value,notes:snotes.value};data.subjects.push(sub);
 document.querySelectorAll('input[name="sday"]:checked').forEach(c=>data.classes.push({id:uid(),subjectId:sub.id,day:c.value,start:sstart.value,end:(send.value>sstart.value?send.value:addHour(sstart.value)),teacher:sub.teacher,room:sub.room}));
 save();closeModal();shell()};
window.updateSubject=(e,id)=>{e.preventDefault();let s=data.subjects.find(x=>x.id===id);Object.assign(s,{name:sname.value,teacher:steacher.value,room:sroom.value});save();closeModal();shell()};
window.deleteSubject=id=>{if(true){data.subjects=data.subjects.filter(x=>x.id!==id);save();closeModal();shell()}};

window.addClass=(day="")=>modal("Add class",`<form onsubmit="saveClass(event)"><label>Subject<select id="csub">${subjectOptions()}</select></label><label>Or type a new subject<input id="ccustom" placeholder="e.g. Physics"></label><label>Day<select id="cday">${["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(d=>`<option ${d===day?"selected":""}>${d}</option>`).join("")}</select></label><div class="row"><label>Start<input id="cstart" type="time" value="08:00" required></label><label>End<input id="cend" type="time" value="09:00" required></label></div><label>Teacher<input id="cteacher" placeholder="Teacher"></label><label>Room<input id="croom" placeholder="Room"></label><button class="primary wide">Save class</button></form>`);
function resolveSubject(){
 let c=document.querySelector("#ccustom")||document.querySelector("#ecustom"),sel=document.querySelector("#csub")||document.querySelector("#esub");
 let n=(c?.value||"").trim();
 if(!n)return sel.value;
 let f=data.subjects.find(x=>x.name.toLowerCase()===n.toLowerCase());
 if(f)return f.id;
 let ns={id:uid(),name:n,teacher:"",room:"",notes:""};data.subjects.push(ns);return ns.id;
}
window.saveClass=e=>{e.preventDefault();data.classes.push({id:uid(),subjectId:resolveSubject(),day:cday.value,start:cstart.value,end:cend.value,teacher:cteacher.value,room:croom.value});save();closeModal();shell()};
window.editClass=id=>{let x=data.classes.find(c=>c.id===id);modal("Edit class",`<form onsubmit="updateClass(event,'${id}')"><label>Subject<select id="csub">${subjectOptions(x.subjectId)}</select></label><label>Or type a new subject<input id="ccustom" placeholder="e.g. Physics"></label><label>Day<select id="cday">${["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(d=>`<option ${d===x.day?"selected":""}>${d}</option>`).join("")}</select></label><div class="row"><label>Start<input id="cstart" type="time" value="${x.start}" required></label><label>End<input id="cend" type="time" value="${x.end}" required></label></div><label>Teacher<input id="cteacher" value="${esc(x.teacher||"")}"></label><label>Room<input id="croom" value="${esc(x.room||"")}"></label><button class="primary wide">Save changes</button><button type="button" class="delete wide" onclick="deleteClass('${id}')">Delete</button></form>`)};
window.updateClass=(e,id)=>{e.preventDefault();let x=data.classes.find(c=>c.id===id);Object.assign(x,{subjectId:resolveSubject(),day:cday.value,start:cstart.value,end:cend.value,teacher:cteacher.value,room:croom.value});save();closeModal();shell()};
window.deleteClass=id=>{if(true){data.classes=data.classes.filter(x=>x.id!==id);save();closeModal();shell()}};

window.addEvent=(type="Quiz")=>modal("Add academic event",`<form onsubmit="saveEvent(event)"><label>Title<input id="etitle" required placeholder="${type} title"></label><div class="row"><label>Type<select id="etype">${TYPES.map(t=>`<option ${t===type?"selected":""}>${t}</option>`).join("")}</select></label><label>Subject<select id="esub">${subjectOptions()}</select></label></div><label>Or type a new subject<input id="ecustom" placeholder="e.g. Chemistry"></label><div class="row"><label>Date<input id="edate" type="date" value="${new Date().toISOString().slice(0,10)}" required></label><label>Time<input id="etime" type="time" value="08:00"></label></div><label>Location<input id="eloc" placeholder="Room / location"></label><label>Description<textarea id="edesc" placeholder="Optional details"></textarea></label><label>Reminder<select id="erem"><option value="0">No reminder</option><option value="5">5 minutes before</option><option value="15">15 minutes before</option><option value="30">30 minutes before</option><option value="60">1 hour before</option><option value="1440">1 day before</option></select></label><button class="primary wide">Save event</button></form>`);
window.saveEvent=e=>{e.preventDefault();let x={id:uid(),title:etitle.value,type:etype.value,subjectId:resolveSubject(),date:edate.value,time:etime.value,location:eloc.value,description:edesc.value,reminder:+erem.value,status:"Upcoming"};data.events.push(x);save();closeModal();shell()};
window.editEvent=id=>{let e=data.events.find(x=>x.id===id);modal("Edit event",`<form onsubmit="updateEvent(event,'${id}')"><label>Title<input id="etitle" required value="${esc(e.title)}"></label><div class="row"><label>Type<select id="etype">${TYPES.map(t=>`<option ${t===e.type?"selected":""}>${t}</option>`).join("")}</select></label><label>Subject<select id="esub">${subjectOptions(e.subjectId)}</select></label></div><label>Or type a new subject<input id="ecustom" placeholder="e.g. Chemistry"></label><div class="row"><label>Date<input id="edate" type="date" value="${e.date}" required></label><label>Time<input id="etime" type="time" value="${e.time||""}"></label></div><label>Location<input id="eloc" value="${esc(e.location||"")}"></label><label>Description<textarea id="edesc">${esc(e.description||"")}</textarea></label><label>Reminder<select id="erem">${[0,5,15,30,60,1440].map(n=>`<option value="${n}" ${e.reminder===n?"selected":""}>${n===0?"No reminder":n<60?n+" minutes before":n===60?"1 hour before":"1 day before"}</option>`).join("")}</select></label><button class="primary wide">Save changes</button><button type="button" class="complete wide" onclick="completeEvent('${id}')">${e.status==="Completed"?"Mark upcoming":"✓ Mark completed"}</button><button type="button" class="delete wide" onclick="deleteEvent('${id}')">Delete</button></form>`)};
window.updateEvent=(e,id)=>{e.preventDefault();let x=data.events.find(a=>a.id===id);Object.assign(x,{title:etitle.value,type:etype.value,subjectId:resolveSubject(),date:edate.value,time:etime.value,location:eloc.value,description:edesc.value,reminder:+erem.value});save();closeModal();shell()};
window.completeEvent=id=>{let e=data.events.find(x=>x.id===id);e.status=e.status==="Completed"?"Upcoming":"Completed";save();closeModal();shell()};
window.deleteEvent=id=>{if(true){data.events=data.events.filter(x=>x.id!==id);save();closeModal();shell()}};

window.profile=()=>modal("Your profile",`<form onsubmit="saveProfile(event)"><label>Name<input id="pname" value="${esc(data.profile.name)}" placeholder="Your name"></label><label>School<input id="pschool" value="${esc(data.profile.school)}" placeholder="School name"></label><label>Grade / Year<input id="pgrade" value="${esc(data.profile.grade)}" placeholder="Grade 10"></label><button class="primary wide">Save profile</button></form>`);
window.saveProfile=e=>{e.preventDefault();data.profile={name:pname.value,school:pschool.value,grade:pgrade.value};save();closeModal();shell()};
window.toggleTheme=()=>{data.theme=data.theme==="light"?"dark":"light";save();shell()};
window.toggleNotifications=()=>{data.notifications=!data.notifications;save();shell()};
window.resetData=()=>{if(confirm("Reset all StudyFlow data?")){store.del(KEY);data={profile:{name:"",school:"",grade:""},subjects:[],classes:[],events:[],theme:"light",notifications:true};view="home";shell()}};

shell();

if("serviceWorker" in navigator && location.protocol.startsWith("http") && location.hostname!=="localhost"){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}

window.go=go;window.selectDay=selectDay;window.filterEvents=filterEvents;window.closeModal=closeModal;

// Reminders: native Android notifications via Capacitor; browser fallback while the page is open.
const native=Capacitor.isNativePlatform();
let timers=[];
function numId(str){let h=0;for(const c of str)h=(h*31+c.charCodeAt(0))|0;return Math.abs(h)%2000000000+1;}
function due(e){return new Date(e.date+"T"+e.time+":00").getTime()-e.reminder*60000;}
function body(e){return `${e.type} · ${subjectName(e.subjectId)} · ${fmtTime(e.time)}`;}
const WD=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
async function ensurePerm(){
 if(native){let p=await LocalNotifications.checkPermissions();if(p.display!=="granted")p=await LocalNotifications.requestPermissions();return p.display==="granted";}
 if(!("Notification" in window))return false;
 if(Notification.permission==="default")await Notification.requestPermission();
 return Notification.permission==="granted";
}
function classAlarm(c,mins){
 let wd=WD.indexOf(c.day)+1,[h,m]=c.start.split(":").map(Number),t=h*60+m-mins;
 if(t<0){t+=1440;wd=wd===1?7:wd-1;}
 return{weekday:wd,hour:Math.floor(t/60),minute:t%60};
}
async function syncNotifications(){
 timers.forEach(clearTimeout);timers=[];
 const on=data.notifications!==false,cm=data.classRemind??10;
 const evs=on?data.events.filter(e=>e.reminder&&e.date&&e.time&&e.status!=="Completed"&&due(e)>Date.now()):[];
 const cls=on&&cm>0?data.classes.filter(c=>c.day&&c.start&&WD.includes(c.day)):[];
 try{
  if(native){
   const pending=await LocalNotifications.getPending();
   if(pending.notifications.length)await LocalNotifications.cancel({notifications:pending.notifications.map(n=>({id:n.id}))});
   if(!evs.length&&!cls.length)return;
   if(!await ensurePerm())return;
   try{await LocalNotifications.createChannel({id:"reminders",name:"Reminders",description:"Class and event reminders",importance:5,visibility:1,vibration:true})}catch(e){}
   const list=[...evs.map(e=>({channelId:"reminders",id:numId(e.id),title:e.title,body:body(e),schedule:{at:new Date(due(e)),allowWhileIdle:true}})),
    ...cls.map(c=>({channelId:"reminders",id:numId(c.id+"c"),title:subjectName(c.subjectId)+" starts in "+cm+" min",body:(c.room?"Room "+c.room+" · ":"")+fmtTime(c.start),schedule:{on:classAlarm(c,cm),allowWhileIdle:true}}))];
   await LocalNotifications.schedule({notifications:list});
  }else if(evs.length&&await ensurePerm()){
   evs.filter(e=>due(e)-Date.now()<2147000000).forEach(e=>timers.push(setTimeout(()=>new Notification(e.title,{body:body(e),icon:"./icon-192.png"}),due(e)-Date.now())));
  }
 }catch(err){console.warn("Reminder sync failed",err);}
}
window.setClassRemind=v=>{data.classRemind=+v;save();shell()};
window.testNotify=async()=>{
 try{
  if(native)try{await LocalNotifications.createChannel({id:"reminders",name:"Reminders",description:"Class and event reminders",importance:5,visibility:1,vibration:true})}catch(e){}
  if(!await ensurePerm()){alert("Notifications are blocked. Allow them for StudyFlow in Android Settings > Apps > StudyFlow > Notifications.");return;}
  if(native)await LocalNotifications.schedule({notifications:[{channelId:"reminders",id:1,title:"StudyFlow",body:"Notifications are working! 🎉",schedule:{at:new Date(Date.now()+5000),allowWhileIdle:true}}]});
  else setTimeout(()=>new Notification("StudyFlow",{body:"Notifications are working! 🎉"}),5000);
 }catch(e){alert("Could not send: "+e.message)}
};
syncNotifications();

document.addEventListener("visibilitychange",()=>{if(!document.hidden)syncNotifications()});

// ---------- First-run guided tour (spotlight) ----------
const STEPS=[
 {t:"Welcome to StudyFlow 👋",d:"A quick tour (under a minute) shows you where everything is. You can replay it anytime in Settings."},
 {v:"home",sel:".hero",t:"Your day at a glance",d:"Home shows today's classes and your next events, so you know what's coming."},
 {v:"home",sel:".iconbtn",t:"Quick add",d:"Tap ＋ anywhere to quickly add a subject, class or event."},
 {v:"subjects",sel:".pagehead .primary",t:"Start here: add a subject",d:"Type the name, teacher and room once, then pick the days and times (like Monday and Friday). It fills your schedule automatically."},
 {v:"schedule",sel:".daystrip",t:"Your weekly schedule",d:"Tap a day to see its classes. Use ＋ Class to add one-off classes or type a brand-new subject."},
 {v:"events",sel:".pagehead .primary",t:"Quizzes, exams & projects",d:"Add events with a date, time and a reminder. Filter them by type below."},
 {v:"settings",sel:".settinggroup",t:"Reminders",d:"Turn notifications on, choose how early class reminders arrive, and tap Send test to check they work. For best results, set StudyFlow's battery to Unrestricted in Android Settings."},
 {t:"You're all set! 🎉",d:"Add your first subject to get started."}
];
let tourI=0;
function tourEl(){return document.getElementById("tour")}
window.startTour=()=>{tourI=0;if(!tourEl()){const t=document.createElement("div");t.id="tour";t.innerHTML='<div class="spot"></div><div class="tip"><h3></h3><p></p><div class="tbtns"><button class="tskip">Skip</button><span class="tcount"></span><button class="tback">Back</button><button class="tnext primary">Next</button></div></div>';document.body.appendChild(t);
 t.querySelector(".tskip").onclick=endTour;t.querySelector(".tback").onclick=()=>{tourI=Math.max(0,tourI-1);showStep()};
 t.querySelector(".tnext").onclick=()=>{tourI>=STEPS.length-1?endTour():(tourI++,showStep())};
 window.addEventListener("resize",showStep)}showStep()};
function endTour(){tourEl()?.remove();window.removeEventListener("resize",showStep);data.tourDone=true;save();if(view!=="subjects")go("subjects")}
function showStep(){
 const t=tourEl();if(!t)return;const st=STEPS[tourI];
 if(st.v&&view!==st.v)go(st.v);
 requestAnimationFrame(()=>{
  const spot=t.querySelector(".spot"),tip=t.querySelector(".tip"),el=st.sel&&document.querySelector(st.sel);
  t.querySelector("h3").textContent=st.t;t.querySelector("p").textContent=st.d;
  t.querySelector(".tcount").textContent=(tourI+1)+"/"+STEPS.length;
  t.querySelector(".tback").style.visibility=tourI?"visible":"hidden";
  t.querySelector(".tnext").textContent=tourI>=STEPS.length-1?"Done":"Next";
  tip.style.top=tip.style.bottom="";
  if(el){
   el.scrollIntoView({block:"center"});
   const r=el.getBoundingClientRect(),p=6;
   Object.assign(spot.style,{display:"block",left:r.left-p+"px",top:r.top-p+"px",width:r.width+2*p+"px",height:r.height+2*p+"px"});
   if(r.top+r.height/2>innerHeight/2)tip.style.bottom=innerHeight-r.top+18+"px";else tip.style.top=r.bottom+18+"px";
  }else{spot.style.display="none";tip.style.top=Math.max(40,innerHeight/2-110)+"px";}
 });
}
if(!data.tourDone)setTimeout(startTour,600);

window.openBackup=()=>modal("Backup & restore",`<p class="muted">Tap Copy and paste it somewhere safe (Notes, WhatsApp to yourself). To restore, paste it back below and tap Restore.</p><textarea id="bk" rows="7" style="width:100%">${esc(JSON.stringify(data))}</textarea><button type="button" class="primary wide" onclick="copyBackup()">Copy backup</button><button type="button" class="delete wide" onclick="restoreBackup()">Restore from text above</button>`);
window.copyBackup=async()=>{const t=document.querySelector("#bk");try{await navigator.clipboard.writeText(t.value);alert("Copied!")}catch(e){t.select();alert("Select all and copy the text manually.")}};
window.restoreBackup=()=>{try{const d=JSON.parse(document.querySelector("#bk").value);if(!d.subjects||!d.classes||!d.events)throw 0;data=d;save();closeModal();shell();alert("Restored!")}catch(e){alert("That backup text isn't valid.")}};
