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
  notifications:true,
  notes:[],
  goals:[],
  grades:[],
  academicDates:[],
  semester:{name:"1st Semester",schoolYear:"2026–2027"}
};
data.notes=data.notes||[]; data.goals=data.goals||[]; data.grades=data.grades||[]; data.academicDates=data.academicDates||[]; data.semester=data.semester||{name:"1st Semester",schoolYear:"2026–2027"};
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
 let activeGoals=data.goals.filter(g=>!g.done).slice(0,3);
 let doneGoals=data.goals.filter(g=>g.done).slice(-2).reverse();
 let totalGoals=data.goals.length, completedGoals=data.goals.filter(g=>g.done).length;
 let studyProgress=totalGoals?Math.round((completedGoals/totalGoals)*100):0;
 return `<section class="page">
  <div class="hero"><div><span class="muted">${new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"})}</span><h2>Today at a glance</h2><small class="muted">${esc(data.semester.name)} · ${esc(data.semester.schoolYear)}</small></div><div class="orb">✦</div></div>
  <div class="sectionhead"><h3>Study & Goals</h3><button onclick="openGoals()">Manage</button></div>
  <div class="studygoalgrid">
   <div class="card studygoalstat"><span class="staticon">📚</span><b>${studyProgress}%</b><span>Study progress</span></div>
   <div class="card studygoalstat"><span class="staticon">🎯</span><b>${activeGoals.length}</b><span>Active goals</span></div>
  </div>
  <div class="card studygoalpanel">
   <div class="studygoalhead"><div><strong>Study & Goals</strong><span>Keep your progress moving</span></div><button class="primary" onclick="openFocus()">⏱ Focus</button></div>
   <div class="progressbar"><span style="width:${studyProgress}%"></span></div>
   ${activeGoals.map(g=>{let running=focusEndAt&&focusTarget?.type==='goal'&&focusTarget.id===g.id;return `<div class="goalmini"><div class="grow"><strong>🎯 ${esc(g.title)}</strong><span>${esc(g.target||"Keep going")}</span></div><button class="inlinefocus ${running?'running':''}" onclick="openFocus('goal','${g.id}')">${running?'⏱ '+formatFocus(focusLeft):'⏱ Focus'}</button><button class="complete" onclick="toggleGoal('${g.id}')">Done</button></div>`}).join("")}
   ${doneGoals.map(g=>`<div class="goalmini done"><div class="grow"><strong>✓ ${esc(g.title)}</strong><span>Completed${g.target?" · "+esc(g.target):""}</span></div><button onclick="toggleGoal('${g.id}')">Undo</button></div>`).join("")}
   ${!activeGoals.length&&!doneGoals.length?`<div class="empty small"><strong>No study goals yet</strong><span>Add a goal to start tracking your progress.</span></div>`:""}
  </div>
  <div class="sectionhead"><h3>Today's classes</h3><button onclick="addClass()">Add</button></div>
  ${cls.length?cls.map(classCard).join(""):`<div class="empty"><div>☁️</div><strong>No classes today</strong><span>Add your schedule to see it here.</span><button onclick="addClass()">Add class</button></div>`}
 </section>`;
}
function classCard(x){return `<div class="card classcard"><div class="time">${fmtTime(x.start)}<small>${fmtTime(x.end)}</small></div><div class="line"></div><div class="grow"><strong>${esc(subjectName(x.subjectId))}</strong><span>${esc(x.teacher||"")} ${x.room?"· "+esc(x.room):""}</span></div><button class="dots" onclick="editClass('${x.id}')">⋯</button></div>`}
function eventCard(e){const d=e.status==="Completed",p=e.type==="Assignment"?e.priority:"",running=focusEndAt&&focusTarget?.type==='event'&&focusTarget.id===e.id;return `<div class="card eventcard ${d?"done":""}"><button class="chk ${d?"on":""}" onclick="toggleDone('${e.id}',this)" aria-label="Mark complete"><span class="burst"></span><svg viewBox="0 0 24 24"><path d="M5 12l4.5 4.5L19 7.5"/></svg></button><div class="typeicon t-${e.type.toLowerCase()}">${icon(e.type)}</div><div class="grow"><strong>${esc(e.title)}</strong><span>${esc(e.type)} · ${esc(subjectName(e.subjectId))}${p?" · "+esc(p)+" priority":""}</span><small>${d?"✓ Completed":fmtDate(e.date)+(e.time?" · "+fmtTime(e.time):"")}</small></div>${!d?`<button class="inlinefocus ${running?'running':''}" onclick="openFocus('event','${e.id}')">${running?'⏱ '+formatFocus(focusLeft):'⏱'}</button>`:""}<button class="dots" onclick="editEvent('${e.id}')">⋯</button></div>`}

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
 ${data.subjects.length?data.subjects.map((s,i)=>`<div class="card subject" onclick="openSubjectHub('${s.id}')"><span class="swatch" style="background:${COLORS[i%COLORS.length]}"></span><div class="grow"><strong>${esc(s.name)}</strong><span>${esc(s.teacher||"No teacher")} ${s.room?"· "+esc(s.room):""}</span></div><button class="dots" onclick="event.stopPropagation();editSubject('${s.id}')">⋯</button></div>`).join(""):`<div class="empty"><div>📚</div><strong>No subjects yet</strong><span>Add your subjects once, then reuse them in your schedule.</span><button onclick="addSubject()">Add subject</button></div>`}</section>`;
}
function settings(){
 return `<section class="page"><div class="pagehead"><div><span class="muted">PREFERENCES</span><h2>Settings</h2></div></div>
 <div class="settinggroup"><h3>Profile</h3><button class="setting" onclick="profile()"><span>${data.profile.photo?`<img class="pthumb" src="${data.profile.photo}" alt="">`:"👤"}</span><div><strong>${esc(data.profile.name||"Your profile")}</strong><small>${esc(data.profile.school||"Add your school information")}</small></div><b>›</b></button></div>
 <div class="settinggroup"><h3>Appearance</h3><button class="setting" onclick="toggleTheme()"><span>◐</span><div><strong>Theme</strong><small>${data.theme==="light"?"Light":"Dark"}</small></div><b>›</b></button></div>
 <div class="settinggroup"><h3>Reminders</h3><button class="setting" onclick="toggleNotifications()"><span>🔔</span><div><strong>Notifications</strong><small>${data.notifications?"Enabled":"Disabled"}</small></div><b>${data.notifications?"ON":"OFF"}</b></button><label class="setting"><span>⏰</span><div><strong>Class reminder</strong><small>Before each class starts</small></div><select onchange="setClassRemind(this.value)">${[[0,"Off"],[5,"5 min"],[10,"10 min"],[15,"15 min"],[30,"30 min"]].map(o=>`<option value="${o[0]}" ${(data.classRemind??10)==o[0]?"selected":""}>${o[1]}</option>`).join("")}</select></label><button class="setting" onclick="openSound()"><span>🔊</span><div><strong>Notification sound</strong><small>${data.soundOn===false?"Off":data.sound&&data.sound!=="default"?prettyS(data.sound)+" · "+(data.soundDur||15)+" sec":"Phone default"}</small></div><b>›</b></button><button class="setting" onclick="testNotify()"><span>🧪</span><div><strong>Send test notification</strong><small>Arrives in 5 seconds</small></div><b>TEST</b></button></div>
 <div class="settinggroup"><h3>Study tools</h3><button class="setting" onclick="openNotes()"><span>🗒️</span><div><strong>Notes</strong><small>${data.notes.length} saved note${data.notes.length===1?"":"s"}</small></div><b>›</b></button><button class="setting" onclick="openGoals()"><span>🎯</span><div><strong>Study goals & focus</strong><small>${data.goals.filter(g=>!g.done).length} active goal${data.goals.filter(g=>!g.done).length===1?"":"s"} · Focus timer</small></div><b>›</b></button><button class="setting" onclick="openSemester()"><span>🗃️</span><div><strong>Semester</strong><small>${esc(data.semester.name)} · ${esc(data.semester.schoolYear)}</small></div><b>›</b></button></div>
 <div class="settinggroup"><h3>Help</h3><button class="setting" onclick="startTour()"><span>🎓</span><div><strong>Replay tutorial</strong><small>A quick guided tour of the app</small></div><b>›</b></button></div><div class="settinggroup"><h3>Backup</h3><button class="setting" onclick="openBackup()"><span>💾</span><div><strong>Backup &amp; restore</strong><small>Save or move your data</small></div><b>›</b></button></div><div class="settinggroup"><h3>Data</h3><button class="setting danger" onclick="resetData()"><span>↺</span><div><strong>Reset all data</strong><small>Remove subjects, classes and events</small></div><b>›</b></button></div>
 <p class="version">StudyFlow • 1.7.0</p></section>`;
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

window.addEvent=(type="Quiz")=>modal(type==="Assignment"?"Add assignment":"Add academic event",`<form onsubmit="saveEvent(event)"><label>Title<input id="etitle" required placeholder="${type==="Assignment"?"Assignment title":type+" title"}"></label><div class="row"><label>Type<select id="etype" onchange="togglePriorityField()">${TYPES.map(t=>`<option ${t===type?"selected":""}>${t}</option>`).join("")}</select></label><label>Subject<select id="esub">${subjectOptions()}</select></label></div><label>Or type a new subject<input id="ecustom" placeholder="e.g. Chemistry"></label><div class="row"><label>Due date<input id="edate" type="date" value="${new Date().toISOString().slice(0,10)}" required></label><label>Time<input id="etime" type="time" value="08:00"></label></div><div id="priorityWrap" style="${type==="Assignment"?"":"display:none"}"><label>Priority<select id="epriority"><option>High</option><option selected>Medium</option><option>Low</option></select></label></div><label>Location<input id="eloc" placeholder="Room / location"></label><label>Description<textarea id="edesc" placeholder="${type==="Assignment"?"What do you need to do?":"Optional details"}"></textarea></label><label>Reminder<select id="erem"><option value="0">No reminder</option><option value="5">5 minutes before</option><option value="15">15 minutes before</option><option value="30">30 minutes before</option><option value="60">1 hour before</option><option value="1440">1 day before</option></select></label><button class="primary wide">${type==="Assignment"?"Save assignment":"Save event"}</button></form>`);
window.togglePriorityField=()=>{const w=document.querySelector("#priorityWrap");if(w)w.style.display=document.querySelector("#etype").value==="Assignment"?"block":"none"};
window.saveEvent=e=>{e.preventDefault();let x={id:uid(),title:etitle.value,type:etype.value,subjectId:resolveSubject(),date:edate.value,time:etime.value,location:eloc.value,description:edesc.value,reminder:+erem.value,status:"Upcoming",priority:etype.value==="Assignment"?(document.querySelector("#epriority")?.value||"Medium"):""};data.events.push(x);save();closeModal();shell()};
window.editEvent=id=>{let e=data.events.find(x=>x.id===id);modal(e.type==="Assignment"?"Edit assignment":"Edit event",`<form onsubmit="updateEvent(event,'${id}')"><label>Title<input id="etitle" required value="${esc(e.title)}"></label><div class="row"><label>Type<select id="etype" onchange="togglePriorityField()">${TYPES.map(t=>`<option ${t===e.type?"selected":""}>${t}</option>`).join("")}</select></label><label>Subject<select id="esub">${subjectOptions(e.subjectId)}</select></label></div><label>Or type a new subject<input id="ecustom" placeholder="e.g. Chemistry"></label><div class="row"><label>Due date<input id="edate" type="date" value="${e.date}" required></label><label>Time<input id="etime" type="time" value="${e.time||""}"></label></div><div id="priorityWrap" style="${e.type==="Assignment"?"":"display:none"}"><label>Priority<select id="epriority"><option ${e.priority==="High"?"selected":""}>High</option><option ${(!e.priority||e.priority==="Medium")?"selected":""}>Medium</option><option ${e.priority==="Low"?"selected":""}>Low</option></select></label></div><label>Location<input id="eloc" value="${esc(e.location||"")}"></label><label>Description<textarea id="edesc">${esc(e.description||"")}</textarea></label><label>Reminder<select id="erem">${[0,5,15,30,60,1440].map(n=>`<option value="${n}" ${e.reminder===n?"selected":""}>${n===0?"No reminder":n<60?n+" minutes before":n===60?"1 hour before":"1 day before"}</option>`).join("")}</select></label><button class="primary wide">Save changes</button><button type="button" class="complete wide" onclick="completeEvent('${id}')">${e.status==="Completed"?"Mark upcoming":"✓ Mark completed"}</button><button type="button" class="delete wide" onclick="deleteEvent('${id}')">Delete</button></form>`) };
window.updateEvent=(e,id)=>{e.preventDefault();let x=data.events.find(a=>a.id===id);Object.assign(x,{title:etitle.value,type:etype.value,subjectId:resolveSubject(),date:edate.value,time:etime.value,location:eloc.value,description:edesc.value,reminder:+erem.value,priority:etype.value==="Assignment"?(document.querySelector("#epriority")?.value||"Medium"):""});save();closeModal();shell()};
window.completeEvent=id=>{let e=data.events.find(x=>x.id===id);e.status=e.status==="Completed"?"Upcoming":"Completed";save();closeModal();shell()};
window.deleteEvent=id=>{if(true){data.events=data.events.filter(x=>x.id!==id);save();closeModal();shell()}};


function subjEvents(id){return data.events.filter(e=>e.subjectId===id).sort((a,b)=>(a.date||"").localeCompare(b.date||""));}
window.openSubjectHub=id=>{let s=data.subjects.find(x=>x.id===id);if(!s)return;let cls=data.classes.filter(c=>c.subjectId===id).sort((a,b)=>(DAYS.indexOf(a.day)-DAYS.indexOf(b.day))||a.start.localeCompare(b.start)),ev=subjEvents(id),notes=data.notes.filter(n=>n.subjectId===id);modal(esc(s.name),`<div class="hubhero"><div class="hubdot"></div><div><strong>${esc(s.teacher||"No teacher")}</strong><span>${esc(s.room||"No room")}</span></div></div><div class="sectionhead"><h3>Classes</h3><button onclick="addClassForSubject('${id}')">Add</button></div>${cls.length?cls.map(c=>`<div class="minirow"><b>${c.day.slice(0,3)}</b><span>${fmtTime(c.start)}–${fmtTime(c.end)}${c.room?" · "+esc(c.room):""}</span></div>`).join(""):`<p class="muted">No class schedule yet.</p>`}<div class="sectionhead"><h3>Assessments & assignments</h3><button onclick="addEventForSubject('${id}')">Add</button></div>${ev.length?ev.slice(0,6).map(eventCard).join(""):`<p class="muted">Nothing recorded for this subject yet.</p>`}<div class="sectionhead"><h3>Notes</h3><button onclick="addNote('${id}')">＋ Note</button></div>${notes.length?notes.slice(0,5).map(n=>`<div class="card note"><div class="grow"><strong>${esc(n.title)}</strong><span>${esc(n.text)}</span></div><button class="dots" onclick="editNote('${n.id}')">⋯</button></div>`).join(""):`<p class="muted">Keep notes for this subject here.</p>`}<button class="primary wide" onclick="editSubject('${id}')">Edit subject</button>`)};
window.addClassForSubject=id=>{closeModal();modal("Add class",`<form onsubmit="saveClassForSubject(event,'${id}')"><label>Day<select id="cday">${DAYS.map(d=>`<option>${d}</option>`).join("")}</select></label><div class="row"><label>Start<input id="cstart" type="time" value="08:00" required></label><label>End<input id="cend" type="time" value="09:00" required></label></div><label>Teacher<input id="cteacher" value="${esc(subjectName(id))}"></label><label>Room<input id="croom" placeholder="Room"></label><button class="primary wide">Save class</button></form>`) };
window.saveClassForSubject=(e,id)=>{e.preventDefault();data.classes.push({id:uid(),subjectId:id,day:cday.value,start:cstart.value,end:cend.value,teacher:cteacher.value,room:croom.value});save();closeModal();shell();openSubjectHub(id)};
window.addEventForSubject=id=>{closeModal();addEvent("Assignment");setTimeout(()=>{if(document.querySelector("#esub"))document.querySelector("#esub").value=id},0)};
window.addNote=(subjectId="")=>modal("Add note",`<form onsubmit="saveNote(event,'${subjectId}')"><label>Title<input id="ntitle" required placeholder="Chapter 1 notes"></label><label>Subject<select id="nsub">${subjectOptions(subjectId)}</select></label><label>Note<textarea id="ntext" required placeholder="Write your notes here..."></textarea></label><button class="primary wide">Save note</button></form>`);
window.saveNote=(e,subjectId)=>{e.preventDefault();data.notes.push({id:uid(),title:ntitle.value,subjectId:nsub.value,text:ntext.value,updated:Date.now()});save();closeModal();shell()};
window.editNote=id=>{let n=data.notes.find(x=>x.id===id);modal("Edit note",`<form onsubmit="updateNote(event,'${id}')"><label>Title<input id="ntitle" required value="${esc(n.title)}"></label><label>Subject<select id="nsub">${subjectOptions(n.subjectId)}</select></label><label>Note<textarea id="ntext" required>${esc(n.text)}</textarea></label><button class="primary wide">Save changes</button><button type="button" class="delete wide" onclick="deleteNote('${id}')">Delete</button></form>`)};
window.updateNote=(e,id)=>{e.preventDefault();let n=data.notes.find(x=>x.id===id);Object.assign(n,{title:ntitle.value,subjectId:nsub.value,text:ntext.value,updated:Date.now()});save();closeModal();shell()};
window.deleteNote=id=>{data.notes=data.notes.filter(n=>n.id!==id);save();closeModal();shell()};
window.openNotes=()=>modal("Notes",`<div class="sectionhead"><h3>Your notes</h3><button onclick="addNote()">＋ Note</button></div>${data.notes.length?data.notes.slice().sort((a,b)=>(b.updated||0)-(a.updated||0)).map(n=>`<div class="card note" onclick="editNote('${n.id}')"><div class="grow"><strong>${esc(n.title)}</strong><span>${esc(subjectName(n.subjectId))}</span><small>${esc(n.text).slice(0,130)}${n.text.length>130?"…":""}</small></div><b>›</b></div>`).join(""):`<div class="empty small"><strong>No notes yet</strong><span>Add notes by subject so everything stays together.</span><button onclick="addNote()">Add note</button></div>`}`);
window.openGrades=()=>modal("Grades",`<p class="muted">Record scores or percentages for each subject. StudyFlow keeps the entries locally on your phone.</p><div class="sectionhead"><h3>Recorded grades</h3><button onclick="addGrade()">＋ Grade</button></div>${data.grades.length?data.grades.map(g=>`<div class="card grade"><div class="grow"><strong>${esc(subjectName(g.subjectId))}</strong><span>${esc(g.label||"Assessment")} · ${esc(g.score)}%</span></div><button class="dots" onclick="editGrade('${g.id}')">⋯</button></div>`).join(""):`<div class="empty small"><strong>No grades yet</strong><span>Add quiz, exam or project scores as you receive them.</span></div>`}`);
window.addGrade=()=>modal("Add grade",`<form onsubmit="saveGrade(event)"><label>Subject<select id="gsub" required>${subjectOptions()}</select></label><label>Assessment<input id="glabel" required placeholder="Midterm exam"></label><label>Score (%)<input id="gscore" type="number" min="0" max="100" step="0.01" required placeholder="85"></label><button class="primary wide">Save grade</button></form>`);
window.saveGrade=e=>{e.preventDefault();data.grades.push({id:uid(),subjectId:gsub.value,label:glabel.value,score:+gscore.value});save();closeModal();openGrades()};
window.editGrade=id=>{let g=data.grades.find(x=>x.id===id);modal("Edit grade",`<form onsubmit="updateGrade(event,'${id}')"><label>Subject<select id="gsub">${subjectOptions(g.subjectId)}</select></label><label>Assessment<input id="glabel" value="${esc(g.label)}"></label><label>Score (%)<input id="gscore" type="number" min="0" max="100" step="0.01" value="${g.score}"></label><button class="primary wide">Save changes</button><button type="button" class="delete wide" onclick="deleteGrade('${id}')">Delete</button></form>`)};
window.updateGrade=(e,id)=>{e.preventDefault();let g=data.grades.find(x=>x.id===id);Object.assign(g,{subjectId:gsub.value,label:glabel.value,score:+gscore.value});save();closeModal();openGrades()};
window.deleteGrade=id=>{data.grades=data.grades.filter(g=>g.id!==id);save();closeModal();openGrades()};
window.openGoals=()=>modal("Study goals & focus",`<div class="sectionhead"><h3>Goals</h3><button onclick="addGoal()">＋ Goal</button></div>${data.goals.length?data.goals.map(g=>`<div class="card goalmini ${g.done?"done":""}"><button class="chk ${g.done?"on":""}" onclick="toggleGoal('${g.id}')" aria-label="Mark goal ${g.done?"not done":"done"}"><svg viewBox="0 0 24 24"><path d="M5 12l4.5 4.5L19 7.5"/></svg></button><div class="grow"><strong>${esc(g.title)}</strong><span>${esc(g.target||"")}</span></div><button class="dots" onclick="editGoal('${g.id}')">⋯</button></div>`).join(""):`<div class="empty small"><strong>No study goals yet</strong><span>Set a small target and build momentum.</span></div>`}<button class="primary wide" onclick="openFocus()">⏱ Start focus session</button>`);
window.addGoal=()=>modal("New study goal",`<form onsubmit="saveGoal(event)"><label>Goal<input id="gotitle" required placeholder="Finish Chapter 3"></label><label>Target / detail<input id="gotarget" placeholder="By Friday"></label><button class="primary wide">Save goal</button></form>`);
window.saveGoal=e=>{e.preventDefault();data.goals.push({id:uid(),title:gotitle.value,target:gotarget.value,done:false});save();closeModal();openGoals()};
window.toggleGoal=id=>{let g=data.goals.find(x=>x.id===id);if(g)g.done=!g.done;save();closeModal();openGoals()};
window.editGoal=id=>{let g=data.goals.find(x=>x.id===id);modal("Edit goal",`<form onsubmit="updateGoal(event,'${id}')"><label>Goal<input id="gotitle" required value="${esc(g.title)}"></label><label>Target / detail<input id="gotarget" value="${esc(g.target||"")}"></label><button class="primary wide">Save changes</button><button type="button" class="delete wide" onclick="deleteGoal('${id}')">Delete</button></form>`)};
window.updateGoal=(e,id)=>{e.preventDefault();let g=data.goals.find(x=>x.id===id);Object.assign(g,{title:gotitle.value,target:gotarget.value});save();closeModal();openGoals()};window.deleteGoal=id=>{data.goals=data.goals.filter(g=>g.id!==id);save();closeModal();openGoals()};
let focusTimer=null,focusLeft=25*60,focusTotal=25*60,focusEndAt=null,focusTarget=null;
const FOCUS_KEY="studyflow-focus-v2",FOCUS_NOTIFY_ID=8801;
function formatFocus(sec){sec=Math.max(0,Math.floor(sec));let h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;return h?`${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`:`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`}
function readFocus(){try{return JSON.parse(localStorage.getItem(FOCUS_KEY)||"null")}catch(e){return null}}
function writeFocus(){try{localStorage.setItem(FOCUS_KEY,JSON.stringify({running:!!focusEndAt,endAt:focusEndAt,total:focusTotal,left:focusLeft,target:focusTarget}))}catch(e){}}
async function cancelFocusNotification(){try{if(Capacitor.isNativePlatform())await LocalNotifications.cancel({notifications:[{id:FOCUS_NOTIFY_ID}]})}catch(e){}}
async function scheduleFocusNotification(){if(!focusEndAt)return;try{if(!Capacitor.isNativePlatform())return;let p=await LocalNotifications.checkPermissions();if(p.display!=="granted")p=await LocalNotifications.requestPermissions();if(p.display!=="granted")return;await LocalNotifications.cancel({notifications:[{id:FOCUS_NOTIFY_ID}]});if(data.notifications===false)return;let label=focusTarget?.type==="goal"?data.goals.find(g=>g.id===focusTarget.id)?.title:focusTarget?.type==="event"?data.events.find(e=>e.id===focusTarget.id)?.title:null;await LocalNotifications.schedule({notifications:[{id:FOCUS_NOTIFY_ID,channelId:chId(),title:"StudyFlow · Focus complete",body:label?`Focus session for “${label}” is finished. Great work! 🎉`:"Your focus session is finished. Great work! 🎉",schedule:{at:new Date(focusEndAt),allowWhileIdle:true}}]})}catch(e){console.warn("Focus notification failed",e)}}
function renderFocus(){let el=document.querySelector("#focusclock");if(el)el.textContent=formatFocus(focusLeft);let btn=document.querySelector("#focusstart");if(btn)btn.textContent=focusEndAt?"Running…":"Start";document.querySelectorAll(".inlinefocus").forEach(b=>{let row=b.closest(".goalmini")||b.closest(".eventcard");let type=b.closest(".goalmini")?"goal":"event";let id=row?.querySelector(".complete")?.getAttribute("onclick")?.match(/toggleGoal\('([^']+)/)?.[1]||row?.querySelector(".dots")?.getAttribute("onclick")?.match(/editEvent\('([^']+)/)?.[1];let active=focusEndAt&&focusTarget?.type===type&&focusTarget.id===id;b.textContent=active?`⏱ ${formatFocus(focusLeft)}`:(type==="goal"?"⏱ Focus":"⏱");b.classList.toggle("running",!!active)})}
async function finishFocus(){clearInterval(focusTimer);focusTimer=null;focusLeft=0;focusEndAt=null;focusTarget=null;writeFocus();await cancelFocusNotification();renderFocus();try{navigator.vibrate&&navigator.vibrate([120,80,120])}catch(e){}alert("Focus session complete! Take a 5-minute break 🎉")}
function reconcileFocus(){let st=readFocus();if(!st)return;if(st.running&&st.endAt){focusTotal=Number(st.total)||focusTotal;focusEndAt=Number(st.endAt);focusTarget=st.target||null;focusLeft=Math.max(0,Math.ceil((focusEndAt-Date.now())/1000));if(focusLeft<=0){focusEndAt=null;focusLeft=0;focusTarget=null;writeFocus();cancelFocusNotification()}else{clearInterval(focusTimer);focusTimer=setInterval(()=>{focusLeft=Math.max(0,Math.ceil((focusEndAt-Date.now())/1000));renderFocus();if(focusLeft<=0)finishFocus()},250)}}else{focusTotal=Number(st.total)||focusTotal;focusLeft=Number(st.left)||focusTotal;focusTarget=st.target||null;focusEndAt=null}}
window.openFocus=(type=null,id=null)=>{reconcileFocus();if(type&&id&&!focusEndAt){focusTarget={type,id};writeFocus()}let targetLabel=focusTarget?.type==="goal"?data.goals.find(g=>g.id===focusTarget.id)?.title:focusTarget?.type==="event"?data.events.find(e=>e.id===focusTarget.id)?.title:null;let amount=focusEndAt?Math.max(1,Math.ceil(focusLeft/60)):25;modal("Focus timer",`<div class="focus"><div class="focustarget">${targetLabel?`🎯 <strong>${esc(targetLabel)}</strong>`:"General study session"}</div><div id="focusclock">${formatFocus(focusLeft)}</div><p class="muted">The timer keeps running if you leave, minimize, or close StudyFlow. Android will notify you when it finishes.</p><div class="row"><label>Duration<input id="focusamount" type="number" min="1" step="1" value="${amount}"></label><label>Unit<select id="focusunit"><option value="seconds">Seconds</option><option value="minutes" selected>Minutes</option><option value="hours">Hours</option></select></label></div><button class="wide" onclick="setFocusDuration()">Set duration</button><button id="focusstart" class="primary wide" onclick="startFocus()">${focusEndAt?"Running…":"Start"}</button><button class="wide" onclick="resetFocus()">Reset</button></div>`);renderFocus()};
window.setFocusDuration=()=>{if(focusEndAt)return;let n=Math.max(1,Number(document.querySelector("#focusamount")?.value||25)),u=document.querySelector("#focusunit")?.value||"minutes";let mult=u==="hours"?3600:u==="seconds"?1:60;focusTotal=Math.round(n*mult);focusLeft=focusTotal;writeFocus();renderFocus()};
window.startFocus=async()=>{if(focusEndAt)return;if(!focusLeft)setFocusDuration();focusEndAt=Date.now()+focusLeft*1000;writeFocus();await scheduleFocusNotification();reconcileFocus();renderFocus();shell()};
window.resetFocus=async()=>{clearInterval(focusTimer);focusTimer=null;focusEndAt=null;focusTarget=null;focusLeft=focusTotal;writeFocus();await cancelFocusNotification();renderFocus();shell()};
window.addEventListener("visibilitychange",()=>{if(!document.hidden)reconcileFocus()});window.addEventListener("focus",()=>reconcileFocus());reconcileFocus();

// ---------- profile picture ----------
window.setPhoto=f=>{if(!f)return;const img=new Image();img.onload=()=>{const n=Math.min(img.width,img.height),c=document.createElement("canvas");c.width=c.height=256;c.getContext("2d").drawImage(img,(img.width-n)/2,(img.height-n)/2,n,n,0,0,256,256);data.profile.photo=c.toDataURL("image/jpeg",.85);save();closeModal();shell();profile()};img.onerror=()=>alert("Couldn't read that photo.");img.src=URL.createObjectURL(f)};
window.removePhoto=()=>{delete data.profile.photo;save();closeModal();shell();profile()};
