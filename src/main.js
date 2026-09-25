import "./style.css";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

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

function save(){store.set(KEY,JSON.stringify(data));try{autoBackup()}catch(e){}try{syncNotifications()}catch(e){}}
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function fmtDate(x){if(!x)return "";return new Date(x+"T00:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});}
function fmtTime(x){if(!x)return "";let [h,m]=x.split(":");let d=new Date();d.setHours(+h,+m);return d.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});}
function todayName(){return new Date().toLocaleDateString(undefined,{weekday:"long"});}
function initials(n){const p=String(n||"").trim().split(/\s+/).filter(Boolean);return p.length?(p[0][0]+(p[1]?p[1][0]:"")).toUpperCase():"🎓"}
function headChips(){const dn=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()],t=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
 const c=data.classes.filter(x=>x.day===dn).length,e=data.events.filter(x=>x.status!=="Completed").length;
 return `<span>📚 ${c} class${c===1?"":"es"} today</span><span>⏰ ${e} upcoming</span>`}
function greeting(){let h=new Date().getHours();return h<12?"Good morning":h<18?"Good afternoon":"Good evening";}
function subjectName(id){return data.subjects.find(s=>s.id===id)?.name||"No subject";}
function icon(type){return ({Quiz:"✦",Exam:"◈",Oral:"◉",Project:"◇",Assignment:"✓",Other:"•"})[type]||"•";}

function shell(){
 document.documentElement.dataset.theme=data.theme;
 document.querySelector("#app").innerHTML=`
 <div class="app">
  <header class="top"><div class="hgrid"><div class="avatar" onclick="profile()">${data.profile.photo?`<img src="${data.profile.photo}" alt="">`:initials(data.profile.name)}</div>
   <div class="htext"><div class="eyebrow">${greeting().toUpperCase()} ${new Date().getHours()<12?"☀️":new Date().getHours()<18?"🌤️":"🌙"}</div><h1 class="hname">${data.profile.name?esc(data.profile.name):"Ready to study?"}</h1></div>
   <button class="iconbtn" onclick="openQuick()">＋</button></div>
   <div class="hchips">${headChips()}</div></header>
  <main id="content"></main>
  <nav class="nav">
   ${nav("home",navIcon("home"),"Home")}${nav("schedule",navIcon("schedule"),"Schedule")}${nav("events",navIcon("events"),"Events")}${nav("subjects",navIcon("subjects"),"Subjects")}${nav("settings",navIcon("settings"),"Settings")}
  </nav>
 </div>`;
 render();
}
function navIcon(n){const P={
 home:'<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
 schedule:'<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/>',
 events:'<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
 subjects:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M6.5 17H20v4H6.5A2.5 2.5 0 0 1 4 18.5"/>',
 settings:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>'};
 return '<svg viewBox="0 0 24 24">'+P[n]+'</svg>'}
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
function eventCard(e){const d=e.status==="Completed";return `<div class="card eventcard ${d?"done":""}"><button class="chk ${d?"on":""}" onclick="toggleDone('${e.id}',this)" aria-label="Mark complete"><span class="burst"></span><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button><div class="typeicon t-${e.type.toLowerCase()}">${icon(e.type)}</div><div class="grow"><strong>${esc(e.title)}</strong><span>${esc(e.type)} · ${esc(subjectName(e.subjectId))}</span><small>${d?"✓ Completed":fmtDate(e.date)+(e.time?" · "+fmtTime(e.time):"")}</small></div><button class="dots" onclick="editEvent('${e.id}')">⋯</button></div>`}

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

let evFilter="All";
function evList(){const l=data.events.filter(e=>evFilter==="All"||(evFilter==="Done"?e.status==="Completed":e.type===evFilter)).sort((a,b)=>{const x=a.status==="Completed",y=b.status==="Completed";return x!==y?x-y:(a.date+" "+a.time).localeCompare(b.date+" "+b.time)});return l.length?l.map(eventCard).join(""):`<div class="empty small"><strong>Nothing here yet.</strong></div>`}
function evProg(){const n=data.events.length,d=data.events.filter(e=>e.status==="Completed").length;if(!n)return"";const p=Math.round(d/n*100);return `<div class="evprog"><div class="evtxt"><b>${d} of ${n} done</b><span>${p===100?"All caught up! 🎉":(n-d)+" left to go"}</span></div><div class="pbar"><i style="width:${p}%"></i></div></div>`}
function events(){
 return `<section class="page"><div class="pagehead"><div><span class="muted">ACADEMIC PLANNER</span><h2>Events</h2></div><button class="primary" onclick="addEvent()">＋ Event</button></div>
 ${evProg()}<div class="chips">${["All",...TYPES,"Done"].map(t=>`<button class="${evFilter===t?"selected":""}" onclick="filterEvents('${t}',this)">${t==="Done"?"✓ Done":t}</button>`).join("")}</div>
 <div id="eventlist">${data.events.length?evList():`<div class="empty"><div>📝</div><strong>No events yet</strong><span>Keep quizzes, exams and deadlines in one place.</span><button onclick="addEvent()">Add event</button></div>`}</div></section>`;
}
function filterEvents(t,btn){evFilter=t;document.querySelectorAll(".chips button").forEach(x=>x.classList.remove("selected"));btn.classList.add("selected");document.querySelector("#eventlist").innerHTML=evList()}

function subjects(){
 return `<section class="page"><div class="pagehead"><div><span class="muted">YOUR CLASSES</span><h2>Subjects</h2></div><button class="primary" onclick="addSubject()">＋ Subject</button></div>
 <button class="scanbtn" onclick="openScan()">📷 Scan your class program (photo)</button>
 ${data.subjects.length?data.subjects.map((s,i)=>`<div class="card subject"><span class="swatch" style="background:${COLORS[i%COLORS.length]}"></span><div class="grow"><strong>${esc(s.name)}</strong><span>${esc(s.teacher||"No teacher")} ${s.room?"· "+esc(s.room):""}</span></div><button class="dots" onclick="editSubject('${s.id}')">⋯</button></div>`).join(""):`<div class="empty"><div>📚</div><strong>No subjects yet</strong><span>Add your subjects once, then reuse them in your schedule.</span><button onclick="addSubject()">Add subject</button></div>`}</section>`;
}
function settings(){
 return `<section class="page"><div class="pagehead"><div><span class="muted">PREFERENCES</span><h2>Settings</h2></div></div>
 <div class="settinggroup"><h3>Profile</h3><button class="setting" onclick="profile()"><span>${data.profile.photo?`<img class="pthumb" src="${data.profile.photo}" alt="">`:"👤"}</span><div><strong>${esc(data.profile.name||"Your profile")}</strong><small>${esc(data.profile.school||"Add your school information")}</small></div><b>›</b></button></div>
 <div class="settinggroup"><h3>Appearance</h3><button class="setting" onclick="toggleTheme()"><span>◐</span><div><strong>Theme</strong><small>${data.theme==="light"?"Light":"Dark"}</small></div><b>›</b></button></div>
 <div class="settinggroup"><h3>Reminders</h3><button class="setting" onclick="toggleNotifications()"><span>🔔</span><div><strong>Notifications</strong><small>${data.notifications?"Enabled":"Disabled"}</small></div><b>${data.notifications?"ON":"OFF"}</b></button><label class="setting"><span>⏰</span><div><strong>Class reminder</strong><small>Before each class starts</small></div><select onchange="setClassRemind(this.value)">${[[0,"Off"],[5,"5 min"],[10,"10 min"],[15,"15 min"],[30,"30 min"]].map(o=>`<option value="${o[0]}" ${(data.classRemind??10)==o[0]?"selected":""}>${o[1]}</option>`).join("")}</select></label><button class="setting" onclick="openSound()"><span>🔊</span><div><strong>Notification sound</strong><small>${data.soundOn===false?"Off":data.sound&&data.sound!=="default"?prettyS(data.sound)+" · "+(data.soundDur||15)+" sec":"Phone default"}</small></div><b>›</b></button><button class="setting" onclick="testNotify()"><span>🧪</span><div><strong>Send test notification</strong><small>Arrives in 5 seconds</small></div><b>TEST</b></button></div>
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

window.profile=()=>modal("Your profile",`<div class="pavatar"><div class="pav">${data.profile.photo?`<img src="${data.profile.photo}" alt="">`:`<span>${initials(data.profile.name)}</span>`}</div><div class="pavbtns"><button type="button" class="primary" onclick="document.querySelector('#pphoto').click()">📷 ${data.profile.photo?"Change":"Add"} photo</button>${data.profile.photo?`<button type="button" class="delete" onclick="removePhoto()">Remove</button>`:""}</div><input id="pphoto" type="file" accept="image/*" hidden onchange="setPhoto(this.files[0])"></div><form onsubmit="saveProfile(event)"><label>Name<input id="pname" value="${esc(data.profile.name)}" placeholder="Your name"></label><label>School<input id="pschool" value="${esc(data.profile.school)}" placeholder="School name"></label><label>Grade / Year<input id="pgrade" value="${esc(data.profile.grade)}" placeholder="Grade 10"></label><button class="primary wide">Save profile</button></form>`);
window.saveProfile=e=>{e.preventDefault();data.profile={...data.profile,name:pname.value,school:pschool.value,grade:pgrade.value};save();closeModal();shell()};
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
   try{await mkChannel()}catch(e){}
   const list=[...evs.map(e=>({channelId:chId(),id:numId(e.id),title:e.title,body:body(e),schedule:{at:new Date(due(e)),allowWhileIdle:true}})),
    ...cls.map(c=>({channelId:chId(),id:numId(c.id+"c"),title:subjectName(c.subjectId)+" starts in "+cm+" min",body:(c.room?"Room "+c.room+" · ":"")+fmtTime(c.start),schedule:{on:classAlarm(c,cm),allowWhileIdle:true}}))];
   await LocalNotifications.schedule({notifications:list});
  }else if(evs.length&&await ensurePerm()){
   evs.filter(e=>due(e)-Date.now()<2147000000).forEach(e=>timers.push(setTimeout(()=>new Notification(e.title,{body:body(e),icon:"./icon-192.png"}),due(e)-Date.now())));
  }
 }catch(err){console.warn("Reminder sync failed",err);}
}
window.setClassRemind=v=>{data.classRemind=+v;save();shell()};
window.testNotify=async()=>{
 try{
  if(native)try{await mkChannel()}catch(e){}
  if(!await ensurePerm()){alert("Notifications are blocked. Allow them for StudyFlow in Android Settings > Apps > StudyFlow > Notifications.");return;}
  if(native)await LocalNotifications.schedule({notifications:[{channelId:chId(),id:1,title:"StudyFlow",body:"Notifications are working! 🎉",schedule:{at:new Date(Date.now()+5000),allowWhileIdle:true}}]});
  else setTimeout(()=>new Notification("StudyFlow",{body:"Notifications are working! 🎉"}),5000);
 }catch(e){alert("Could not send: "+e.message)}
};
syncNotifications();

document.addEventListener("visibilitychange",()=>{if(!document.hidden)syncNotifications()});

// ---------- First-run guided tour (spotlight) ----------
const STEPS=[
 {t:"Welcome to StudyFlow 👋",d:"A quick tour (about a minute) shows you where everything is. You can replay it anytime in Settings → Replay tutorial."},
 {v:"home",sel:".top",t:"Your day at a glance",d:"Home shows today's classes and your next events, so you always know what's coming. Tap your photo circle to add a profile picture."},
 {v:"home",sel:".iconbtn",t:"Quick add",d:"Tap ＋ anywhere to quickly add a subject, class or event."},
 {v:"subjects",sel:".scanbtn",t:"Scan your COR or class program",d:"Snap a photo of your COR or schedule and StudyFlow reads the subjects, teachers and times for you. You review and fix everything before it's saved."},
 {v:"subjects",sel:".pagehead .primary",t:"Or add a subject by hand",d:"Type the name, teacher and room once, then pick the days and times (like Monday and Friday). It fills your schedule automatically."},
 {v:"schedule",sel:".daystrip",t:"Your weekly schedule",d:"Tap a day to see its classes. Use ＋ Class to add one-off classes or type a brand-new subject."},
 {v:"events",sel:".pagehead .primary",t:"Quizzes, exams & projects",d:"Add events with a date, time and a reminder. Tap the circle on any event to mark it done — filter by type or by Done below."},
 {v:"settings",sel:".settinggroup",t:"Reminders & sound",d:"Turn notifications on, choose how early class reminders arrive, and pick a notification sound with its own play length. Tap Send test to check it works."},
 {v:"settings",sel:"[onclick=\"openBackup()\"]",t:"Keep your data safe",d:"Backup & restore saves a file with everything in StudyFlow — subjects, classes, events and your photo — so you never lose it, even if you reinstall."},
 {t:"You're all set! 🎉",d:"Add your first subject, or scan your COR, to get started."}
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
if(!data.tourDone)setTimeout(startTour,1900);

window.openBackup=()=>modal("Backup & restore",`<p class="muted">Tap Copy and paste it somewhere safe (Notes, WhatsApp to yourself). To restore, paste it back below and tap Restore.</p><textarea id="bk" rows="7" style="width:100%">${esc(JSON.stringify(data))}</textarea><button type="button" class="primary wide" onclick="copyBackup()">Copy backup</button><button type="button" class="delete wide" onclick="restoreBackup()">Restore from text above</button>`);
window.copyBackup=async()=>{const t=document.querySelector("#bk");try{await navigator.clipboard.writeText(t.value);alert("Copied!")}catch(e){t.select();alert("Select all and copy the text manually.")}};
window.restoreBackup=()=>{try{const d=JSON.parse(document.querySelector("#bk").value);if(!d.subjects||!d.classes||!d.events)throw 0;data=d;save();closeModal();shell();alert("Restored!")}catch(e){alert("That backup text isn't valid.")}};

// ---------- Scan class program (photo -> OCR -> review -> schedule) ----------
const DAYRE=/\b(mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/gi;
const DAYMAP={mon:"Monday",tue:"Tuesday",wed:"Wednesday",thu:"Thursday",fri:"Friday",sat:"Saturday",sun:"Sunday"};
const CODEMAP={m:"Monday",t:"Tuesday",w:"Wednesday",th:"Thursday",f:"Friday",s:"Saturday",su:"Sunday",sa:"Saturday"};
const TIMERE=/(\d{1,2})[:.;](\d{2})\s*(a\.?m\.?|p\.?m\.?)?\s*(?:[-–—~_=]+|to)?\s*(\d{1,2})[:.;](\d{2})\s*(a\.?m\.?|p\.?m\.?)?/i;
const TEACH=/((?:Mr|Mrs|Ms|Dr|Engr|Prof|Atty|Sir|Maam)\.?\s+[A-Z][\w.'’ -]+|[A-Z][A-Za-z'’-]+,\s*[A-Z][A-Za-z.'’ ]+)$/;
const fixT=t=>t.replace(/\b([0-9OoIl|]{1,2})[:.;]([0-9OoIl|]{2})\b/g,(m,a,b)=>{const f=x=>x.replace(/[Oo]/g,"0").replace(/[Il|]/g,"1");return f(a)+":"+f(b)});
function to24(h,m,ref,ap){h=+h;if(ap)h=(h%12)+(ap==="p"?12:0);else if(h>=1&&h<=6)h+=12;let t=h*60+ +m;if(ref!=null&&t<=ref)t+=720;return t}
function hhmm(t){t=t%1440;return String(Math.floor(t/60)).padStart(2,"0")+":"+String(t%60).padStart(2,"0")}
function lineDays(pre){
 const f=[...pre.matchAll(DAYRE)].map(x=>DAYMAP[x[1].slice(0,3).toLowerCase()]);if(f.length)return[...new Set(f)];
 const out=[];for(const tk of pre.split(/[\s\/,]+/)){if(tk&&tk.length<=6&&/^(?:Th|Su|Sa|M|T|W|F|S)+$/i.test(tk))out.push(...[...tk.matchAll(/Th|Su|Sa|M|T|W|F|S/gi)].map(x=>CODEMAP[x[0].toLowerCase()]))}
 return[...new Set(out)];
}
function lev(a,b){const m=[];for(let i=0;i<=a.length;i++){m[i]=[i];for(let j=1;j<=b.length;j++)m[i][j]=i?Math.min(m[i-1][j]+1,m[i][j-1]+1,m[i-1][j-1]+(a[i-1]===b[j-1]?0:1)):j}return m[a.length][b.length]}
// Column headers we can recognize on ANY class-schedule table (COR, class program, custom layouts).
// desc/subj -> the subject name column. inst -> teacher. time -> the time column. days -> explicit day-code column (TF, MTH, WED...).
// Everything else (course, section, units, hours, lec, lab, room, bldg) is recognized ONLY so it doesn't get mixed into desc/inst/time.
const HW={
 time:["time"],days:["days","day"],
 desc:["description","descriptive","title"],subj:["subject"],
 course:["course","code"],section:["section","sec"],
 units:["units","unit"],hours:["hours","hrs","hour"],lec:["lec","lecture"],lab:["lab","laboratory"],
 inst:["instructor","professor","teacher","faculty"],room:["room","rm"],bldg:["bldg","building"]
};
function hdrKeys(words){const ks={};for(const w of words){const t=(w.t||"").toLowerCase().replace(/[^a-z]/g,"");if(t.length<2)continue;for(const k in HW){if(ks[k]!=null)continue;if(HW[k].some(h=>h.length<=3?t===h:(t.startsWith(h)||lev(t,h)<=(h.length<=5?1:2)))){ks[k]=w.x;break}}}return ks}
function findHeader(lines){let best=null,n=0;for(const l of lines){const k=hdrKeys(l.words);const c=Object.keys(k).length;if(c>n){n=c;best={line:l,keys:k}}}return n>=2?best:null}
const okw=w=>w.c==null||w.c>=45;
function assignCols(words,bounds){ // bounds: [{key,x0,x1}] sorted by x
 const out={};for(const b of bounds)out[b.key]="";
 for(const w of words){if(!okw(w))continue;const b=bounds.find(b=>w.x>=b.x0&&w.x<b.x1)||bounds[bounds.length-1];out[b.key]=(out[b.key]?out[b.key]+" ":"")+w.t}
 for(const k in out)out[k]=out[k].replace(/[|_\[\]]/g," ").replace(/\s+/g," ").trim();
 return out;
}
function makeBounds(keys){
 const KEEP=["desc","subj","time","days","inst"],xs=Object.entries(keys).sort((a,b)=>a[1]-b[1]);
 const bounds=[];for(let i=0;i<xs.length;i++){const[k,x]=xs[i],x0=i===0?-1e9:(xs[i-1][1]+x)/2,x1=i===xs.length-1?1e9:(x+xs[i+1][1])/2;bounds.push({key:k,x0,x1})}
 return{bounds,has:k=>keys[k]!=null};
}
function cleanTeacher(t){t=t.replace(/[|_]/g," ").replace(/\s+/g," ").trim();const p=t.split(" ");if(p.length>1&&/^[A-Za-z]{1,2}$/.test(p[p.length-1])&&!/^[A-Z]\.$/.test(p[p.length-1]))p.pop();return p.join(" ")}
function cleanName(n){return n.replace(/^[^A-Za-z0-9]+|[\s|,;:.\-]+$/g,"").replace(/\s+\d(\s+\d)?$/,"").slice(0,140)}
window.parseProgram=function(text,data){
 const L=data&&data.lines&&data.lines.length?data.lines:null,lines=[];
 if(L)for(const l of L){const ws=(l.words||[]).map(w=>({t:w.text,x:(w.bbox.x0+w.bbox.x1)/2,c:w.confidence}));lines.push({text:fixT(l.text.replace(/[|_\[\]]/g," ").replace(/\s+/g," ").trim()),words:ws,y0:l.bbox.y0,y1:l.bbox.y1})}
 else for(const t of text.split(/\n/))lines.push({text:fixT(t.replace(/[|_\[\]]/g," ").replace(/\s+/g," ").trim()),words:null});
 const hdr=L?findHeader(lines):null,useCols=!!(hdr&&(hdr.keys.desc!=null||hdr.keys.subj!=null));
 let CB=null;
 if(useCols){const keys={...hdr.keys};if(keys.desc==null)keys.desc=keys.subj;CB=makeBounds(keys)}
 let headingDays=[],days=[],out=[],prev=null,pl=null;
 for(const l of lines){
  const line=l.text;if(!line)continue;
  if(/total|number of units|prepared|noted|approved|note:/i.test(line)){prev=null;continue}
  let timeText=line,daysText="";
  if(useCols&&l.words){const c=assignCols(l.words,CB.bounds);timeText=CB.has("time")?c.time:line;daysText=CB.has("days")?c.days:""}
  const tm=timeText.match(TIMERE),ok=tm&&+tm[1]<24&&+tm[4]<24&&+tm[2]<60&&+tm[5]<60;
  if(!ok){
   const f=lineDays(line.match(DAYRE)?line:"");
   if(f.length){headingDays=f;prev=null;continue}
   if(prev&&useCols&&pl&&l.y0-pl.y1<(pl.y1-pl.y0)*.9){
    const c=assignCols(l.words,CB.bounds);
    if(c.desc)prev.name=cleanName(prev.name+" "+c.desc);if(c.inst)prev.teacher=cleanTeacher((prev.teacher?prev.teacher+" ":"")+c.inst);pl=l}
   continue}
  let name="",teacher="";
  if(useCols&&l.words){const c=assignCols(l.words,CB.bounds);name=c.desc;teacher=c.inst||""}
  else{const after=line.slice(tm.index+tm[0].length).trim();
   if(/lunch|flag|break|vacant/i.test(after)){prev=null;continue}
   let rest=after,m1=rest.match(/^(\S+(?:\s+\d{1,4}[A-Za-z]?)?)\s+(.+)$/);
   if(m1&&(/\d/.test(m1[1])||/-/.test(m1[1])||/^[A-Z]{2,8}$/.test(m1[1])))rest=m1[2];
   let m2=rest.match(/^(.*?)\s+\d\s+\d\s+(.*)$/),m3;
   if(m2){name=m2[1];teacher=m2[2]}else if((m3=rest.match(TEACH))&&m3.index>2){teacher=m3[1];name=rest.slice(0,m3.index)}else name=rest}
  name=cleanName(name);teacher=cleanTeacher(teacher);
  if(!name){prev=null;continue}
  let d=daysText?lineDays(daysText):[];
  if(!d.length){const pre=useCols&&l.words?l.words.filter(w=>w.x<(CB?CB.bounds.find(b=>b.key==="desc").x0:0)).map(w=>w.t).join(" "):line.slice(0,tm.index);d=lineDays(pre).length?lineDays(pre):headingDays}
  if(!d.length){prev=null;continue}
  const apE=tm[6]?(/p/i.test(tm[6])?"p":"a"):null,apS=tm[3]?(/p/i.test(tm[3])?"p":"a"):apE;
  let a=to24(tm[1],tm[2],null,apS),b=to24(tm[4],tm[5],a,apE);
  prev={name,teacher,room:"",days:[...d],start:hhmm(a),end:hhmm(b)};out.push(prev);pl=l;
 }
 return out;
};
function getLines(d){if(d.lines&&d.lines.length)return d.lines;const bl=[];for(const b of d.blocks||[])for(const p of b.paragraphs||[])for(const l of p.lines||[])bl.push(l);return bl}
window.openScan=()=>modal("Scan class program",`<div class="scanhero"><div class="scanicon">✨</div><h3>Turn a photo into a schedule</h3><p>Snap or upload your COR. StudyFlow reads the subjects, teachers and times for you, then lets you fix anything before saving.</p></div>
<div class="scanopts">
<button type="button" class="scancard cam" onclick="document.querySelector('#scancam').click()"><span class="si">📷</span><b>Take a photo</b><small>Use your camera</small></button>
<button type="button" class="scancard gal" onclick="document.querySelector('#scanpick').click()"><span class="si">🖼️</span><b>From gallery</b><small>Pick a saved photo</small></button>
</div>
<div class="scantips"><span>☀️ Good light</span><span>📐 Hold it straight</span><span>🔍 Fill the frame</span></div>
<input id="scancam" type="file" accept="image/*" capture="environment" hidden onchange="scanFile(this.files[0])">
<input id="scanpick" type="file" accept="image/*" hidden onchange="scanFile(this.files[0])">
<div class="scanprog" id="scanprog"><div class="bar"><i id="scanbar"></i></div><p id="scanstat"></p></div>
<button type="button" class="linkbtn" onclick="reviewScan([])">✍️ Skip and add rows by hand</button>`);
function prep(file){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>{
 const k=Math.min(1,2000/img.width),W=Math.round(img.width*k),H=Math.round(img.height*k),c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");x.drawImage(img,0,0,W,H);
 const d=x.getImageData(0,0,W,H),p=d.data,g=new Float32Array(W*H);
 for(let i=0,j=0;i<p.length;i+=4,j++)g[j]=.3*p[i]+.59*p[i+1]+.11*p[i+2];
 const S=W+1,I=new Float64Array(S*(H+1));for(let y=1;y<=H;y++){let r=0;for(let z=1;z<=W;z++){r+=g[(y-1)*W+z-1];I[y*S+z]=I[(y-1)*S+z]+r}}
 const R=Math.max(15,Math.round(W/60));
 for(let y=0;y<H;y++){const y0=Math.max(0,y-R),y1=Math.min(H-1,y+R);for(let z=0;z<W;z++){const x0=Math.max(0,z-R),x1=Math.min(W-1,z+R),n=(x1-x0+1)*(y1-y0+1),m=(I[(y1+1)*S+x1+1]-I[y0*S+x1+1]-I[(y1+1)*S+x0]+I[y0*S+x0])/n,v=g[y*W+z]<m*.88?0:255,q=(y*W+z)*4;p[q]=p[q+1]=p[q+2]=v}}
 x.putImageData(d,0,0);res(c)};img.onerror=rej;img.src=URL.createObjectURL(file)})}
window.scanFile=async f=>{
 if(!f)return;const st=document.querySelector("#scanstat"),bar=p=>{document.querySelector("#scanprog").classList.add("on");document.querySelector("#scanbar").style.width=p+"%"};
 try{
  bar(8);st.textContent="Preparing photo…";const c=await prep(f);
  bar(20);st.textContent="Loading the reader (first time needs internet)…";
  const {createWorker}=await import("tesseract.js");
  const w=await createWorker("eng",1,{logger:m=>{if(m.status==="recognizing text"){bar(25+Math.round(m.progress*70));st.textContent="Reading your schedule… "+Math.round(m.progress*100)+"%"}}});
  await w.setParameters({tessedit_pageseg_mode:"6",preserve_interword_spaces:"1"});
  const {data}=await w.recognize(c);await w.terminate();
  const rows=parseProgram(data.text,{lines:getLines(data)});
  reviewScan(rows,rows.length?"":"I couldn't find any classes in that photo. Add them by hand below, or retake a straighter, brighter photo.");
 }catch(e){st.textContent="Scanning isn't available here ("+(e.message||e)+"). You can add rows by hand instead."}
};
let scanRows=[];
function rowHTML(r,i){return `<div class="card scanrow" data-i="${i}"><div class="row"><label>Subject<input class="rn" value="${esc(r.name)}"></label><label>Teacher<input class="rt" value="${esc(r.teacher)}"></label></div><div class="row"><label>Room<input class="rr" value="${esc(r.room)}"></label><label>Start<input class="rs" type="time" value="${r.start}"></label><label>End<input class="re" type="time" value="${r.end}"></label></div><div class="chips">${DAYS.map(d=>`<label class="chip"><input type="checkbox" class="rd" value="${d}" ${r.days.includes(d)?"checked":""}><span>${d.slice(0,3)}</span></label>`).join("")}</div><button type="button" class="delete" onclick="this.closest('.scanrow').remove()">Remove</button></div>`}
window.reviewScan=(rows,msg)=>{scanRows=rows;if(document.querySelector("#modal"))closeModal();modal("Review & edit",`<p class="muted">${msg||"Check each class. Fix anything that's wrong, then import."}</p><div id="scanlist">${rows.map(rowHTML).join("")}</div><button type="button" class="wide" onclick="addScanRow()">＋ Add row</button><button type="button" class="primary wide" onclick="importScan()">Import to my schedule</button>`)};
window.addScanRow=()=>document.querySelector("#scanlist").insertAdjacentHTML("beforeend",rowHTML({name:"",teacher:"",room:"",days:[],start:"08:00",end:"09:00"},Date.now()));
window.importScan=()=>{
 let n=0;document.querySelectorAll(".scanrow").forEach(el=>{
  const name=el.querySelector(".rn").value.trim(),days=[...el.querySelectorAll(".rd:checked")].map(x=>x.value);if(!name||!days.length)return;
  const teacher=el.querySelector(".rt").value.trim(),room=el.querySelector(".rr").value.trim(),start=el.querySelector(".rs").value,end=el.querySelector(".re").value;
  let sub=data.subjects.find(x=>x.name.toLowerCase()===name.toLowerCase());
  if(!sub){sub={id:uid(),name,teacher,room,notes:""};data.subjects.push(sub)}else{if(teacher&&!sub.teacher)sub.teacher=teacher;if(room&&!sub.room)sub.room=room}
  days.forEach(d=>{if(!data.classes.some(c=>c.subjectId===sub.id&&c.day===d&&c.start===start))data.classes.push({id:uid(),subjectId:sub.id,day:d,start,end,teacher,room});n++});
 });
 save();closeModal();go("schedule");alert(n+" classes added to your schedule.");
};

// ---------- Backup FILE (save / share / restore) + automatic in-app backup ----------
const bkName=()=>"StudyFlow-backup-"+new Date().toISOString().slice(0,10)+".json";
window.saveBackupFile=async()=>{
 const json=JSON.stringify(data,null,1);
 try{
  if(native){
   await Filesystem.writeFile({path:bkName(),data:json,directory:Directory.Cache,encoding:Encoding.UTF8});
   const {uri}=await Filesystem.getUri({path:bkName(),directory:Directory.Cache});
   await Share.share({title:"StudyFlow backup",files:[uri],dialogTitle:"Save your backup file (Files, Drive, WhatsApp...)"});
  }else{
   const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([json],{type:"application/json"}));a.download=bkName();document.body.appendChild(a);a.click();a.remove();
  }
 }catch(e){if(!/cancel/i.test(String(e.message||e)))alert("Couldn't save the file: "+(e.message||e))}
};
function applyBackup(d){if(!d||!d.subjects||!d.classes||!d.events)throw new Error("Not a StudyFlow backup");data=d;save();closeModal();go("schedule");alert("Backup restored!")}
window.restoreFile=async f=>{if(!f)return;try{applyBackup(JSON.parse(await f.text()))}catch(e){alert("That file isn't a valid StudyFlow backup.")}};
let abT;
function autoBackup(){if(!native)return;clearTimeout(abT);abT=setTimeout(async()=>{try{await Filesystem.writeFile({path:"auto-backup.json",data:JSON.stringify(data),directory:Directory.Data,encoding:Encoding.UTF8});store.set("abTime",new Date().toLocaleString())}catch(e){}},1500)}
window.restoreAuto=async()=>{try{const r=await Filesystem.readFile({path:"auto-backup.json",directory:Directory.Data,encoding:Encoding.UTF8});applyBackup(JSON.parse(r.data))}catch(e){alert("No automatic backup found yet.")}};
window.openBackup=()=>modal("Backup & restore",`<p class="muted">Keep a backup file so you never lose your schedule, even if you reinstall the app.</p>
<button type="button" class="primary wide" onclick="saveToFolder()">📁 Save to my phone</button>
<small class="muted">Creates the folder <b>StudyFlow Backup File</b> inside your Documents folder.</small>
<button type="button" class="wide" onclick="saveBackupFile()">📤 Share backup file (Drive, WhatsApp...)</button>
<button type="button" class="wide" onclick="document.querySelector('#bkfile').click()">📂 Restore from a backup file</button>
<input id="bkfile" type="file" accept=".json,.txt,application/json,text/plain" hidden onchange="restoreFile(this.files[0])">
${native?`<button type="button" class="wide" onclick="restoreAuto()">🕘 Restore automatic backup</button><small class="muted">The app keeps its own copy after every change. Last: ${esc(store.get("abTime")||"none yet")}</small>`:""}
<details style="margin-top:12px"><summary class="muted">Advanced: backup as text</summary><textarea id="bk" rows="6" style="width:100%">${esc(JSON.stringify(data))}</textarea><button type="button" class="wide" onclick="copyBackup()">Copy text</button><button type="button" class="delete wide" onclick="restoreBackup()">Restore from text above</button></details>`);

// ---------- Custom notification sound + duration ----------
let SND=null;
async function loadSounds(){if(SND)return SND;try{SND=await (await fetch("sounds.json")).json()}catch(e){SND=[]}return SND}
function prettyS(n){return String(n).replace(/_/g," ").replace(/^./,c=>c.toUpperCase())}
function soundSel(){return data.sound&&data.sound!=="default"?data.sound:null}
function soundOn(){return data.soundOn!==false}
function chId(){if(!soundOn())return "rem_silent";const s=soundSel();return s?"rem_"+s+"_"+(data.soundDur||15):"reminders"}
async function mkChannel(){const s=soundSel(),d=data.soundDur||15;
 if(!soundOn()){try{await LocalNotifications.createChannel({id:"rem_silent",name:"Reminders (silent)",description:"Class and event reminders without sound",importance:2,visibility:1,vibration:true})}catch(e){}return}
 try{await LocalNotifications.createChannel({id:chId(),name:s?"Reminders - "+prettyS(s)+" ("+d+"s)":"Reminders",description:"Class and event reminders",importance:5,visibility:1,vibration:true,...(s?{sound:"s_"+s+"_"+d+".ogg"}:{})})}catch(e){}}
let aud;
window.playSound=n=>{try{if(aud){aud.pause();aud=null}aud=new Audio("sounds/"+n+".ogg");aud.play()}catch(e){}};
window.pickSound=n=>{data.sound=n;save();closeModal();shell();openSound()};
window.toggleSound=()=>{data.soundOn=!soundOn();save();closeModal();shell();openSound()};
window.setDur=d=>{data.soundDur=d;save();shell()};
window.openSound=async()=>{
 const list=native?await loadSounds():[],cur=data.sound||"default",dur=data.soundDur||15;
 modal("Notification sound",`<button type="button" class="setting" onclick="toggleSound()"><span>${soundOn()?"🔔":"🔕"}</span><div><strong>Sound</strong><small>${soundOn()?"Reminders play a sound":"Silent reminders"}</small></div><b>${soundOn()?"ON":"OFF"}</b></button>
 <div ${soundOn()?"":'style="opacity:.4;pointer-events:none"'}><p class="muted">Pick a sound and how long it plays.</p>
 <div id="sndlist">${["default",...list].map(n=>`<div class="setting snd"><span onclick="pickSound('${n}')">${cur===n?"●":"○"}</span><div onclick="pickSound('${n}')"><strong>${n==="default"?"Phone default":prettyS(n)}</strong></div>${n==="default"?"":`<button type="button" class="tiny" onclick="playSound('${n}')">▶</button>`}</div>`).join("")}</div>
 <p class="muted">Play for</p><div class="chips">${[10,15,20].map(d=>`<label class="chip"><input type="radio" name="sd" ${d===dur?"checked":""} onchange="setDur(${d})"><span>${d} sec</span></label>`).join("")}</div></div>
 ${native?`<button type="button" class="primary wide" onclick="testNotify()">Send test notification</button><p class="muted">Your phone must not be on silent or Do Not Disturb to hear it.</p>`:`<p class="muted">Custom sounds work in the installed Android app.</p>`}`)};

// ---------- Animated intro / splash ----------
(function(){
 const sp=document.createElement("div");sp.id="splash";
 sp.innerHTML=`<div class="sp-blocks">${[0,1,2,3,4,5,6].map(i=>`<i style="--i:${i}"></i>`).join("")}</div>
 <div class="sp-center"><svg class="sp-ring" viewBox="0 0 120 120"><circle cx="60" cy="60" r="54"/></svg><div class="sp-logo"><div class="sp-o"></div></div></div>
 <div class="sp-name">StudyFlow</div><div class="sp-tag">Plan · Focus · Achieve</div>`;
 document.body.appendChild(sp);
 const out=()=>{sp.classList.add("out");document.querySelector("#app").classList.add("in");setTimeout(()=>sp.remove(),450)};
 setTimeout(out,matchMedia("(prefers-reduced-motion: reduce)").matches?450:1350);
})();

// tiny haptic tick on every button press (Android)
document.addEventListener("pointerdown",e=>{if(e.target.closest&&e.target.closest("button")&&navigator.vibrate)try{navigator.vibrate(8)}catch(x){}},{passive:true});

const bkStamp=()=>new Date().toISOString().slice(0,16).replace("T","_").replace(":","");
window.saveToFolder=async()=>{
 if(!native)return saveBackupFile();
 const name="StudyFlow-backup-"+bkStamp()+".json";
 try{
  try{const p=await Filesystem.checkPermissions();if(p.publicStorage!=="granted")await Filesystem.requestPermissions()}catch(e){}
  await Filesystem.writeFile({path:"StudyFlow Backup File/"+name,data:JSON.stringify(data,null,1),directory:Directory.Documents,encoding:Encoding.UTF8,recursive:true});
  alert("Backup saved!\n\nOpen your file manager, then Documents > StudyFlow Backup File > "+name);
 }catch(e){alert("Couldn't save to the folder ("+(e.message||e)+"). Try Share backup file instead.")}
};

// ---------- realistic "mark as completed" ----------
function toast(msg,undo){document.querySelector("#toast")?.remove();const t=document.createElement("div");t.id="toast";t.innerHTML=`<span>${msg}</span>${undo?'<button type="button">Undo</button>':""}`;document.body.appendChild(t);if(undo)t.querySelector("button").onclick=()=>{t.remove();undo()};setTimeout(()=>t.classList.add("in"),20);setTimeout(()=>{t.classList.remove("in");setTimeout(()=>t.remove(),300)},4200)}
function confetti(btn){const b=btn.querySelector(".burst");b.innerHTML="";for(let i=0;i<12;i++){const a=i/12*6.283+Math.random()*.4,r=26+Math.random()*16,p=document.createElement("i");p.style.cssText=`--dx:${Math.cos(a)*r}px;--dy:${Math.sin(a)*r}px;--h:${Math.floor(Math.random()*360)}`;b.appendChild(p)}setTimeout(()=>b.innerHTML="",800)}
window.toggleDone=(id,btn)=>{
 const e=data.events.find(x=>x.id===id),was=e.status==="Completed";e.status=was?"Upcoming":"Completed";e.doneAt=was?null:Date.now();save();
 const card=btn.closest(".eventcard");
 if(!was){btn.classList.add("on","anim");card.classList.add("done","popping");confetti(btn);try{navigator.vibrate&&navigator.vibrate([14,50,22])}catch(x){}
  toast("Nice! Marked as done ✓",()=>{e.status="Upcoming";save();shell()})}
 else{btn.classList.remove("on","anim");card.classList.remove("done","popping")}
 setTimeout(shell,was?260:950);
};

// ---------- profile picture ----------
window.setPhoto=f=>{if(!f)return;const img=new Image();img.onload=()=>{const n=Math.min(img.width,img.height),c=document.createElement("canvas");c.width=c.height=256;c.getContext("2d").drawImage(img,(img.width-n)/2,(img.height-n)/2,n,n,0,0,256,256);data.profile.photo=c.toDataURL("image/jpeg",.85);save();closeModal();shell();profile()};img.onerror=()=>alert("Couldn't read that photo.");img.src=URL.createObjectURL(f)};
window.removePhoto=()=>{delete data.profile.photo;save();closeModal();shell();profile()};
