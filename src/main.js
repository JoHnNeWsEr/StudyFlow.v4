import "./style.css";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
const StudyFlowFocus = registerPlugin("StudyFlowFocus");

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
data.notes=data.notes||[]; data.goals=data.goals||[]; data.grades=data.grades||[]; data.academicDates=data.academicDates||[]; data.semester=data.semester||{name:"1st Semester",schoolYear:"2026–2027"}; data.theme=data.theme||"light";
let view="home";

function save(){store.set(KEY,JSON.stringify(data));try{autoBackup()}catch(e){}try{syncNotifications()}catch(e){}}
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function fmtDate(x){if(!x)return "";return new Date(x+"T00:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});}
function fmtTime(x){if(!x)return "";let [h,m]=x.split(":");let d=new Date();d.setHours(+h,+m);return d.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});}
function todayName(){return new Date().toLocaleDateString(undefined,{weekday:"long"});}
function initials(n){const p=String(n||"").trim().split(/\s+/).filter(Boolean);return p.length?(p[0][0]+(p[1]?p[1][0]:"")).toUpperCase():"🎓"}
function headChips(){const dn=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()],t=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
 const c=data.classes.filter(x=>x.day===dn).length,e=upcomingEvents().length;
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
   <div class="theme-art" aria-hidden="true"><span>${themeArt(data.theme)}</span><i></i><i></i><i></i></div>
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
function go(v){
 if(v===view)return;
 const c=document.querySelector("#content");
 const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
 if(!c||reduced){view=v;shell();return;}
 c.classList.add("leave");
 setTimeout(()=>{
  view=v;shell();
  const nc=document.querySelector("#content");
  if(nc){nc.classList.add("enter");requestAnimationFrame(()=>requestAnimationFrame(()=>nc.classList.remove("enter")))}
 },130);
}

function render(){let c=document.querySelector("#content"); if(view==="home"){c.innerHTML=home();startHomeEventCountdowns();} else {clearInterval(homeEventCountdownTimer); if(view==="schedule")c.innerHTML=schedule(); else if(view==="events")c.innerHTML=events(); else if(view==="subjects")c.innerHTML=subjects(); else c.innerHTML=settings();}}

let homeEventCountdownTimer=null;
function eventStartMs(e){
 const base=e?.date||"";
 if(!base)return NaN;
 return new Date(`${base}T${e.time||"00:00"}`).getTime();
}
function formatEventCountdown(ms){
 const past=ms<0;
 ms=Math.abs(ms);
 let s=Math.floor(ms/1000),d=Math.floor(s/86400);s%=86400;
 let h=Math.floor(s/3600);s%=3600;
 let m=Math.floor(s/60),sec=s%60;
 const value=d>0?`${d}d ${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`:`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
 return past?`Overdue ${value}`:value;
}
function startHomeEventCountdowns(){
 clearInterval(homeEventCountdownTimer);
 const update=()=>{
  document.querySelectorAll(".eventcountdown[data-event-time]").forEach(el=>{
   const left=Number(el.dataset.eventTime)-Date.now();
   el.textContent=formatEventCountdown(left);
   el.classList.toggle("starting",left<=0);
   el.classList.toggle("overdue",left<0);
  });
 };
 update();
 homeEventCountdownTimer=setInterval(update,1000);
}
function localTodayIso(){
 const d=new Date();
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function upcomingEvents(){
 // Home only shows unfinished events on their exact calendar day.
 // Events scheduled for tomorrow/later remain available in the Events page.
 const today=localTodayIso();
 return data.events
  .filter(e=>e.status!=="Completed"&&e.date===today&&Number.isFinite(eventStartMs(e)))
  .sort((a,b)=>eventStartMs(a)-eventStartMs(b))
  .slice(0,3);
}
function home(){
 clearInterval(homeEventCountdownTimer);
 let dn=todayName(), cls=data.classes.filter(x=>x.day===dn).sort((a,b)=>a.start.localeCompare(b.start));
 let activeGoals=data.goals.filter(g=>!g.done).slice(0,3);
 let doneGoals=data.goals.filter(g=>g.done).slice(-2).reverse();
 let totalGoals=data.goals.length, completedGoals=data.goals.filter(g=>g.done).length;
 let studyProgress=totalGoals?Math.round((completedGoals/totalGoals)*100):0;
 let upcoming=upcomingEvents();
 const goalRows=[...activeGoals.map(g=>({g,done:false})),...doneGoals.map(g=>({g,done:true}))];
 const goalMarkup=goalRows.map(({g,done})=>{
  const activeFocus=!done&&focusEndAt&&focusTarget?.type==="goal"&&focusTarget.id===g.id;
  return `<div class="goalmini ${done?"done":""}" data-id="${g.id}"><div class="grow"><strong>${done?"✓":"🎯"} ${esc(g.title)}</strong><span>${done?"Completed"+(g.target?" · "+esc(g.target):""):esc(g.target||"Keep going")}</span></div>${!done?`<button class="inlinefocus ${activeFocus?"running":""}" onclick="openFocus('goal','${g.id}')">${activeFocus?`<span class="focusdot"></span><span>${formatFocus(Math.max(0,Math.ceil((focusEndAt-Date.now())/1000)))}</span>`:"⏱ Focus"}</button>`:""}<button class="chk goalcheck ${done?"on":""}" aria-label="${done?"Mark goal active":"Mark goal complete"}" onclick="toggleGoal('${g.id}',this)"><span class="burst"></span><svg viewBox="0 0 24 24"><path d="M5 12l4.5 4.5L19 7.5"/></svg></button></div>`;
 }).join("");
 return `<section class="page">
  <div class="hero"><div><span class="muted">${new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"})}</span><h2>Today at a glance</h2><small class="muted">${esc(data.semester.name)} · ${esc(data.semester.schoolYear)}</small></div><div class="orb">✦</div></div>
  <div class="sectionhead"><h3>Study & Goals</h3><button onclick="openGoals()">Manage</button></div>
  <div class="studygoalgrid">
   <div class="card studygoalstat"><span class="staticon">📚</span><b>${studyProgress}%</b><span>Study progress</span></div>
   <div class="card studygoalstat"><span class="staticon">🎯</span><b>${activeGoals.length}</b><span>Active goals</span></div>
  </div>
  <div class="card studygoalpanel">
   <div class="studygoalhead"><div><strong>Study & Goals</strong><span>Keep your progress moving</span></div></div>
   <div class="progressbar"><span style="width:${studyProgress}%"></span></div>
   ${goalMarkup}
   ${!activeGoals.length&&!doneGoals.length?`<div class="empty small"><strong>No study goals yet</strong><span>Add a goal to start tracking your progress.</span></div>`:""}
  </div>
  <div class="sectionhead"><h3>Upcoming Events</h3><button onclick="go('events')">View all</button></div>
  <div class="homeevents">${upcoming.length?upcoming.map(e=>homeEventCard(e)).join(""):`<div class="empty small"><strong>No upcoming events</strong><span>Add quizzes, exams, assignments or other deadlines from Events.</span><button onclick="addEvent()">Add event</button></div>`}</div>
  <div class="sectionhead"><h3>Today's classes</h3><button onclick="addClass()">Add</button></div>
  ${cls.length?cls.map(classCard).join(""):`<div class="empty"><div>☁️</div><strong>No classes today</strong><span>Add your schedule to see it here.</span><button onclick="addClass()">Add class</button></div>`}
 </section>`;
}
function homeEventCard(e){
 const d=e.status==="Completed",t=eventStartMs(e);
 const overdue=Number.isFinite(t)&&t<Date.now();
 return `<div class="card homeevent ${d?"done":""} ${overdue?"overdue":""}" data-id="${e.id}"><button class="chk ${d?"on":""}" onclick="toggleDone('${e.id}',this)" aria-label="Mark complete"><span class="burst"></span><svg viewBox="0 0 24 24"><path d="M5 12l4.5 4.5L19 7.5"/></svg></button><div class="typeicon t-${e.type.toLowerCase()}">${icon(e.type)}</div><div class="grow"><strong>${esc(e.title)}</strong><span>${esc(e.type)} · ${esc(subjectName(e.subjectId))}</span><small>${fmtDate(e.date)}${e.time?" · "+fmtTime(e.time):""}</small></div>${Number.isFinite(t)?`<span class="eventcountdown" data-event-time="${t}">${formatEventCountdown(t-Date.now())}</span>`:""}</div>`;
}
function classCard(x){return `<div class="card classcard"><div class="time">${fmtTime(x.start)}<small>${fmtTime(x.end)}</small></div><div class="line"></div><div class="grow"><strong>${esc(subjectName(x.subjectId))}</strong><span>${esc(x.teacher||"")} ${x.room?"· "+esc(x.room):""}</span></div><button class="dots" onclick="editClass('${x.id}')">⋯</button></div>`}
function eventCard(e){const d=e.status==="Completed",p=e.type==="Assignment"?e.priority:"";return `<div class="card eventcard ${d?"done":""}" data-id="${e.id}"><button class="chk ${d?"on":""}" onclick="toggleDone('${e.id}',this)" aria-label="Mark complete"><span class="burst"></span><svg viewBox="0 0 24 24"><path d="M5 12l4.5 4.5L19 7.5"/></svg></button><div class="typeicon t-${e.type.toLowerCase()}">${icon(e.type)}</div><div class="grow"><strong>${esc(e.title)}</strong><span>${esc(e.type)} · ${esc(subjectName(e.subjectId))}${p?" · "+esc(p)+" priority":""}</span><small>${d?"✓ Completed":fmtDate(e.date)+(e.time?" · "+fmtTime(e.time):"")}</small></div>${!d?`<button class="inlinefocus" onclick="openFocus('event','${e.id}')">⏱</button>`:""}<button class="dots" onclick="editEvent('${e.id}')">⋯</button></div>`}

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
 ${evProg()}<div class="chips">${["All",...TYPES.filter(t=>data.events.some(e=>e.type===t)),"Done"].map(t=>`<button class="${evFilter===t?"selected":""}" onclick="filterEvents('${t}',this)">${t==="Done"?"✓ Done":t}</button>`).join("")}</div>
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
 <div class="settinggroup"><h3>Appearance</h3><button class="setting" onclick="openThemes()"><span>◐</span><div><strong>Theme</strong><small>${themeName(data.theme)}</small></div><b>›</b></button></div>
 <div class="settinggroup"><h3>Reminders</h3><button class="setting" onclick="toggleNotifications()"><span>🔔</span><div><strong>Notifications</strong><small>${data.notifications?"Enabled":"Disabled"}</small></div><b>${data.notifications?"ON":"OFF"}</b></button><label class="setting"><span>⏰</span><div><strong>Class reminder</strong><small>Before each class starts</small></div><select onchange="setClassRemind(this.value)">${[[0,"Off"],[5,"5 min"],[10,"10 min"],[15,"15 min"],[20,"20 min"],[30,"30 min"]].map(o=>`<option value="${o[0]}" ${(data.classRemind??10)==o[0]?"selected":""}>${o[1]}</option>`).join("")}</select></label><button class="setting" onclick="openSound()"><span>🔊</span><div><strong>Notification sound</strong><small>${data.soundOn===false?"Off":data.sound&&data.sound!=="default"?prettyS(data.sound)+" · "+(data.soundDur||15)+" sec":"Phone default"}</small></div><b>›</b></button><button class="setting" onclick="testNotify()"><span>🧪</span><div><strong>Send test notification</strong><small>Arrives in 5 seconds</small></div><b>TEST</b></button></div>
 <div class="settinggroup"><h3>Study tools</h3><button class="setting" onclick="openNotes()"><span>🗒️</span><div><strong>Notes</strong><small>${data.notes.length} saved note${data.notes.length===1?"":"s"}</small></div><b>›</b></button><button class="setting" onclick="openGoals()"><span>🎯</span><div><strong>Study goals & focus</strong><small>${data.goals.filter(g=>!g.done).length} active goal${data.goals.filter(g=>!g.done).length===1?"":"s"} · Pomodoro</small></div><b>›</b></button><button class="setting" onclick="openSemester()"><span>🗃️</span><div><strong>Semester</strong><small>${esc(data.semester.name)} · ${esc(data.semester.schoolYear)}</small></div><b>›</b></button></div>
 <div class="settinggroup"><h3>Help</h3><button class="setting" onclick="startTour()"><span>🎓</span><div><strong>Replay tutorial</strong><small>A quick guided tour of the app</small></div><b>›</b></button></div><div class="settinggroup"><h3>Backup</h3><button class="setting" onclick="openBackup()"><span>💾</span><div><strong>Backup &amp; restore</strong><small>Save or move your data</small></div><b>›</b></button></div><div class="settinggroup"><h3>Data</h3><button class="setting danger" onclick="resetData()"><span>↺</span><div><strong>Reset all data</strong><small>Remove subjects, classes and events</small></div><b>›</b></button></div>
 <p class="version">StudyFlow • v33</p></section>`;
}

function modal(title,body){
 let el=document.createElement("div");el.className="modalwrap modal-transition";el.id="modal";el.innerHTML=`<div class="backdrop" onclick="closeModal()"></div><div class="modal"><div class="modalhead"><h2>${title}</h2><button onclick="closeModal()">×</button></div>${body}</div>`;document.body.appendChild(el);
 requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add("modal-transition-in")));
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
window.openGoals=()=>modal("Study goals & focus",`<div class="sectionhead"><h3>Goals</h3><button onclick="addGoal()">＋ Goal</button></div>${data.goals.length?data.goals.map(g=>`<div class="card goalmini ${g.done?"done":""}" data-id="${g.id}"><button class="chk goalcheck ${g.done?"on":""}" aria-label="${g.done?"Mark goal active":"Mark goal complete"}" onclick="toggleGoal('${g.id}',this)"><span class="burst"></span><svg viewBox="0 0 24 24"><path d="M5 12l4.5 4.5L19 7.5"/></svg></button><div class="grow"><strong>${esc(g.title)}</strong><span>${esc(g.target||"")}</span></div><button class="dots" onclick="editGoal('${g.id}')">⋯</button></div>`).join(""):`<div class="empty small"><strong>No study goals yet</strong><span>Set a small target and build momentum.</span></div>`}<button class="primary wide" onclick="openFocus()">⏱ Start focus session</button>`);
window.addGoal=()=>modal("New study goal",`<form onsubmit="saveGoal(event)"><label>Goal<input id="gotitle" required placeholder="Finish Chapter 3"></label><label>Target / detail<input id="gotarget" placeholder="By Friday"></label><button class="primary wide">Save goal</button></form>`);
window.saveGoal=e=>{e.preventDefault();data.goals.push({id:uid(),title:gotitle.value,target:gotarget.value,done:false});save();closeModal();openGoals()};
window.toggleGoal=(id,btn)=>{
 const g=data.goals.find(x=>x.id===id); if(!g)return;
 const was=g.done; g.done=!was; save();
 const card=btn?.closest(".goalmini");
 const inHome=!!btn?.closest(".studygoalpanel");
 if(!was && btn && card){
  playCompletionEffect(btn,card);
  setTimeout(()=>inHome?shell():(closeModal(),openGoals()),950);
 }else{
  inHome?shell():(closeModal(),openGoals());
 }
};
window.editGoal=id=>{let g=data.goals.find(x=>x.id===id);modal("Edit goal",`<form onsubmit="updateGoal(event,'${id}')"><label>Goal<input id="gotitle" required value="${esc(g.title)}"></label><label>Target / detail<input id="gotarget" value="${esc(g.target||"")}"></label><button class="primary wide">Save changes</button><button type="button" class="delete wide" onclick="deleteGoal('${id}')">Delete</button></form>`)};
window.updateGoal=(e,id)=>{e.preventDefault();let g=data.goals.find(x=>x.id===id);Object.assign(g,{title:gotitle.value,target:gotarget.value});save();closeModal();openGoals()};window.deleteGoal=id=>{data.goals=data.goals.filter(g=>g.id!==id);save();closeModal();openGoals()};
let focusTimer=null,focusLeft=25*60,focusTotal=25*60,focusEndAt=null,focusTarget=null;
const FOCUS_KEY="studyflow-focus-v2",FOCUS_NOTIFY_ID=8801;
function formatFocus(sec){sec=Math.max(0,Math.floor(sec));let h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),ss=sec%60;return h?`${h}:${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`:`${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`}
function readFocus(){try{return JSON.parse(localStorage.getItem(FOCUS_KEY)||"null")}catch(e){return null}}
function writeFocus(){try{localStorage.setItem(FOCUS_KEY,JSON.stringify({running:!!focusEndAt,endAt:focusEndAt,total:focusTotal,left:focusLeft,target:focusTarget}))}catch(e){}}
function focusLabel(){return focusTarget?.type==="goal"?data.goals.find(g=>g.id===focusTarget.id)?.title:focusTarget?.type==="event"?data.events.find(e=>e.id===focusTarget.id)?.title:null}
async function cancelFocusNotification(){if(!native)return;try{await LocalNotifications.cancel({notifications:[{id:FOCUS_NOTIFY_ID}]})}catch(e){}try{await StudyFlowFocus.stop()}catch(e){}}
async function scheduleFocusNotification(){if(!focusEndAt||!native||data.notifications===false)return;try{if(!await ensurePerm())return;await mkChannel();await LocalNotifications.cancel({notifications:[{id:FOCUS_NOTIFY_ID}]});let label=focusLabel();await LocalNotifications.schedule({notifications:[{id:FOCUS_NOTIFY_ID,channelId:chId(),title:"StudyFlow · Focus complete",body:label?`Focus session for “${label}” is finished. Great work! 🎉`:"Your focus session is finished. Great work! 🎉",schedule:{at:new Date(focusEndAt),allowWhileIdle:true}}]});try{await StudyFlowFocus.start({endAt:focusEndAt,title:label||"Focus session"})}catch(e){console.warn("Live focus notification unavailable",e)}}catch(e){console.warn("Focus notification failed",e)}}
function renderFocus(){let el=document.querySelector("#focusclock");if(el)el.textContent=formatFocus(focusLeft);let btn=document.querySelector("#focusstart");if(btn)btn.textContent=focusEndAt?"Running…":"Start";document.querySelectorAll(".inlinefocus").forEach(b=>{let row=b.closest(".goalmini")||b.closest(".eventcard")||b.closest(".homeevent"),type=b.closest(".goalmini")?"goal":"event",id=row?.dataset.id,active=focusEndAt&&focusTarget?.type===type&&focusTarget.id===id;b.innerHTML=active?`<span class="focusdot"></span><span>${formatFocus(focusLeft)}</span>`:(type==="goal"?"⏱ Focus":"⏱");b.classList.toggle("running",!!active)})}
async function finishFocus(){clearInterval(focusTimer);focusTimer=null;focusLeft=0;focusEndAt=null;focusTarget=null;writeFocus();await cancelFocusNotification();renderFocus();try{navigator.vibrate&&navigator.vibrate([120,80,120])}catch(e){}if(document.visibilityState!=="hidden")alert("Focus session complete! Take a 5-minute break 🎉")}
function reconcileFocus(){let st=readFocus();if(!st)return;if(st.running&&st.endAt){focusTotal=Number(st.total)||focusTotal;focusEndAt=Number(st.endAt);focusTarget=st.target||null;focusLeft=Math.max(0,Math.ceil((focusEndAt-Date.now())/1000));if(focusLeft<=0){finishFocus()}else{clearInterval(focusTimer);focusTimer=setInterval(()=>{focusLeft=Math.max(0,Math.ceil((focusEndAt-Date.now())/1000));renderFocus();if(focusLeft<=0)finishFocus()},250)}}else{focusTotal=Number(st.total)||focusTotal;focusLeft=Number(st.left)||focusTotal;focusTarget=st.target||null;focusEndAt=null}}
window.openFocus=async(type=null,id=null)=>{
 reconcileFocus();
 if(type&&id){
  const nextTarget={type,id};
  const changed=!focusTarget||focusTarget.type!==type||focusTarget.id!==id;
  focusTarget=nextTarget;
  writeFocus();
  // If a session is already running, attach that live session to the exact item
  // the user selected and refresh the native notification label as well.
  if(changed&&focusEndAt) await scheduleFocusNotification();
 }
 let label=focusLabel(),amount=focusEndAt?Math.max(1,Math.ceil(focusLeft/60)):25;
 modal("Focus timer",`<div class="focus"><div class="focustarget">${label?`🎯 <strong>${esc(label)}</strong>`:"General study session"}</div><div id="focusclock">${formatFocus(focusLeft)}</div><p class="muted">The timer keeps running if you leave, minimize, or close StudyFlow. Android will notify you when it finishes.</p><div class="row"><label>Duration<input id="focusamount" type="number" min="1" step="1" value="${amount}"></label><label>Unit<select id="focusunit"><option value="seconds">Seconds</option><option value="minutes" selected>Minutes</option><option value="hours">Hours</option></select></label></div><button class="wide" onclick="setFocusDuration()">Set duration</button><button id="focusstart" class="primary wide" onclick="startFocus()">${focusEndAt?"Running…":"Start"}</button><button class="wide" onclick="resetFocus()">Reset</button></div>`);
 renderFocus();
};
window.setFocusDuration=()=>{if(focusEndAt)return;let n=Math.max(1,Number(document.querySelector("#focusamount")?.value||25)),u=document.querySelector("#focusunit")?.value||"minutes",mult=u==="hours"?3600:u==="seconds"?1:60;focusTotal=Math.round(n*mult);focusLeft=focusTotal;writeFocus();renderFocus()};
window.startFocus=async()=>{if(focusEndAt)return;if(!focusLeft)setFocusDuration();focusEndAt=Date.now()+focusLeft*1000;writeFocus();await scheduleFocusNotification();reconcileFocus();shell()};
window.resetFocus=async()=>{clearInterval(focusTimer);focusTimer=null;focusEndAt=null;focusTarget=null;focusLeft=focusTotal;writeFocus();await cancelFocusNotification();shell()};
window.addEventListener("visibilitychange",()=>{if(!document.hidden)reconcileFocus()});window.addEventListener("focus",reconcileFocus);reconcileFocus();
window.openAcademicCalendar=()=>modal("Academic calendar",`<div class="sectionhead"><h3>Important dates</h3><button onclick="addAcademicDate()">＋ Date</button></div>${data.academicDates.length?data.academicDates.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(a=>`<div class="card note"><div class="grow"><strong>${esc(a.title)}</strong><span>${fmtDate(a.date)}${a.kind?" · "+esc(a.kind):""}</span></div><button class="dots" onclick="deleteAcademicDate('${a.id}')">×</button></div>`).join(""):`<div class="empty small"><strong>No academic dates</strong><span>Add holidays, exam periods, school events or deadlines.</span></div>`}`);
window.addAcademicDate=()=>modal("Add academic date",`<form onsubmit="saveAcademicDate(event)"><label>Title<input id="adtitle" required placeholder="Midterm week"></label><div class="row"><label>Date<input id="addate" type="date" required></label><label>Type<input id="adkind" placeholder="Exam / Holiday"></label></div><button class="primary wide">Save date</button></form>`);
window.saveAcademicDate=e=>{e.preventDefault();data.academicDates.push({id:uid(),title:adtitle.value,date:addate.value,kind:adkind.value});save();closeModal();openAcademicCalendar()};window.deleteAcademicDate=id=>{data.academicDates=data.academicDates.filter(a=>a.id!==id);save();closeModal();openAcademicCalendar()};
window.openSemester=()=>modal("Semester management",`<form onsubmit="saveSemester(event)"><label>Semester name<input id="semname" value="${esc(data.semester.name)}" placeholder="1st Semester"></label><label>School year<input id="semyear" value="${esc(data.semester.schoolYear)}" placeholder="2026–2027"></label><button class="primary wide">Save semester</button></form><p class="muted">Your subjects, classes, events, notes and grades stay on this device. Use Backup & restore before starting a new semester if you want an archive of the old data.</p>`);
window.saveSemester=e=>{e.preventDefault();data.semester={name:semname.value,schoolYear:semyear.value};save();closeModal();shell()};
window.profile=()=>modal("Your profile",`<div class="pavatar"><div class="pav">${data.profile.photo?`<img src="${data.profile.photo}" alt="">`:`<span>${initials(data.profile.name)}</span>`}</div><div class="pavbtns"><button type="button" class="primary" onclick="document.querySelector('#pphoto').click()">📷 ${data.profile.photo?"Change":"Add"} photo</button>${data.profile.photo?`<button type="button" class="delete" onclick="removePhoto()">Remove</button>`:""}</div><input id="pphoto" type="file" accept="image/*" hidden onchange="setPhoto(this.files[0])"></div><form onsubmit="saveProfile(event)"><label>Name<input id="pname" value="${esc(data.profile.name)}" placeholder="Your name"></label><label>School<input id="pschool" value="${esc(data.profile.school)}" placeholder="School name"></label><label>Grade / Year<input id="pgrade" value="${esc(data.profile.grade)}" placeholder="Grade 10"></label><button class="primary wide">Save profile</button></form>`);
window.saveProfile=e=>{e.preventDefault();data.profile={...data.profile,name:pname.value,school:pschool.value,grade:pgrade.value};save();closeModal();shell()};
const THEME_OPTIONS=[
 {id:"light",icon:"☀️",name:"Light",desc:"Clean and bright"},
 {id:"dark",icon:"🌙",name:"Dark",desc:"Classic dark mode"},
 {id:"midnight",icon:"🌌",name:"Midnight",desc:"Deep purple night"},
 {id:"ocean",icon:"🌊",name:"Ocean",desc:"Cool blue focus"},
 {id:"forest",icon:"🌲",name:"Forest",desc:"Calm emerald green"},
 {id:"sunset",icon:"🌅",name:"Sunset",desc:"Warm amber energy"},
 {id:"rose",icon:"🌸",name:"Rose",desc:"Plum and pink"},
 {id:"minimal",icon:"⚫",name:"Minimal",desc:"Black, white and gray"}
];
function themeName(id){return THEME_OPTIONS.find(t=>t.id===id)?.name||"Light"}
function themeArt(id){return ({light:"☀️",dark:"🌙",midnight:"🌌",ocean:"🌊",forest:"🌲",sunset:"🌅",rose:"🌸",minimal:"◼"})[id]||"☀️"}
window.openThemes=()=>modal("Choose a theme",`<div class="themegrid">${THEME_OPTIONS.map(t=>`<button class="themecard ${data.theme===t.id?"selected":""}" onclick="setTheme('${t.id}')"><span class="themeicon theme-${t.id}">${t.icon}</span><span class="grow"><strong>${t.name}</strong><small>${t.desc}</small></span>${data.theme===t.id?'<b>✓</b>':'<b>›</b>'}</button>`).join("")} </div>`);
window.setTheme=id=>{data.theme=THEME_OPTIONS.some(t=>t.id===id)?id:"light";save();closeModal();shell()};
window.toggleTheme=()=>openThemes();
window.toggleNotifications=()=>{data.notifications=!data.notifications;save();shell()};
window.resetData=()=>{if(confirm("Reset all StudyFlow data?")){store.del(KEY);data={profile:{name:"",school:"",grade:""},subjects:[],classes:[],events:[],theme:"light",notifications:true,notes:[],goals:[],grades:[],academicDates:[],semester:{name:"1st Semester",schoolYear:"2026–2027"}};view="home";shell()}};

shell();

if("serviceWorker" in navigator && location.protocol.startsWith("http") && location.hostname!=="localhost"){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}

window.go=go;window.selectDay=selectDay;window.filterEvents=filterEvents;window.closeModal=closeModal;

// Reminders: native Android notifications via Capacitor; browser fallback while the page is open.
const native=Capacitor.isNativePlatform();
let timers=[];
const REMINDER_IDS_KEY="STUDYFLOW_REMINDER_IDS";
function numId(str){let h=0;for(const c of str)h=(h*31+c.charCodeAt(0))|0;return Math.abs(h)%2000000000+1;}
function reminderIds(){try{return JSON.parse(localStorage.getItem(REMINDER_IDS_KEY)||"[]").filter(Number.isInteger);}catch{return[];}}
function saveReminderIds(ids){try{localStorage.setItem(REMINDER_IDS_KEY,JSON.stringify([...new Set(ids)]));}catch{}}
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
   const oldIds=reminderIds();
   if(oldIds.length)await LocalNotifications.cancel({notifications:oldIds.map(id=>({id}))});
   if(!evs.length&&!cls.length){saveReminderIds([]);return;}
   if(!await ensurePerm()){saveReminderIds([]);return;}
   try{await mkChannel()}catch(e){}
   const list=[...evs.map(e=>({channelId:chId(),id:numId(e.id),title:e.title,body:body(e),schedule:{at:new Date(due(e)),allowWhileIdle:true}})),
    ...cls.map(c=>({channelId:chId(),id:numId(c.id+"c"),title:subjectName(c.subjectId)+" starts in "+cm+" min",body:(c.room?"Room "+c.room+" · ":"")+fmtTime(c.start),schedule:{on:classAlarm(c,cm),allowWhileIdle:true}}))];
   await LocalNotifications.schedule({notifications:list});
   saveReminderIds(list.map(n=>n.id));
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
 {t:"Welcome to StudyFlow 👋",d:"This guide is updated with the latest StudyFlow features. It appears when you start the app, and you can also replay it from Settings."},
 {v:"home",sel:".top",t:"Your day at a glance",d:"Home shows today's classes, progress and your Study & Goals card. Tap your photo circle to add a profile picture."},
 {v:"home",sel:".studygoalpanel",t:"Study & Goals",d:"Your goals live here. Use the check circle to mark a goal done, or tap Focus beside a goal to start a timer for that specific goal."},
 {v:"home",sel:".studygoalpanel",t:"Live Focus timer",d:"When a Focus session is running, its live countdown appears beside the exact goal you selected. This step highlights the whole goal area so it still works when no goal is currently active."},
 {v:"subjects",sel:".pagehead .primary",t:"Subjects",d:"Type the name, teacher and room once, then pick the days and times. StudyFlow reuses the subject in your schedule."},
 {v:"schedule",sel:".daystrip",t:"Your weekly schedule",d:"Tap a day to see its classes. Use ＋ Class to add or edit your schedule."},
 {v:"events",sel:".pagehead .primary",t:"Quizzes, exams & tasks",d:"Add events with dates, times and reminders. Tap the centered check circle to mark one done; the button gives a small push/bounce animation."},
 {v:"events",sel:[".eventcard:not(.done)",".eventcard",".pagehead"],t:"Focus a specific task",d:"Tap ⏱ beside an unfinished task to attach a Focus session to that exact task. The countdown stays visible beside it."},
 {v:"settings",sel:'[onclick="toggleNotifications()"]',t:"Notifications",d:"Enable notifications, choose reminder timing and sound, and use Send test notification to confirm your phone can receive StudyFlow alerts."},
 {v:"settings",sel:'[onclick="openGoals()"]',t:"Focus keeps running",d:"Focus uses a real end time, so leaving StudyFlow, opening another app, minimizing it or closing it will not reset the session. Android sends the completion notification when the time is reached."},
 {v:"settings",sel:'[onclick="openBackup()"]',t:"Keep your data safe",d:"Backup & restore lets you save your subjects, classes, events, goals and other StudyFlow data so you can restore them later."},
 {t:"You're all set! 🎉",d:"Start with a subject, add your schedule and set your first study goal. You can replay this guide from Settings anytime."}
]
let tourI=0;
function tourEl(){return document.getElementById("tour")}
let tourBusy=false;
function tourTarget(st){
 const sels=Array.isArray(st.sel)?st.sel:(st.sel?[st.sel]:[]);
 for(const sel of sels){const el=document.querySelector(sel);if(el)return el}
 return null;
}
window.startTour=()=>{tourI=0;tourBusy=false;if(!tourEl()){const t=document.createElement("div");t.id="tour";t.innerHTML='<div class="spot"></div><div class="tip"><h3></h3><p></p><div class="tbtns"><button class="tskip">Skip</button><span class="tcount"></span><button class="tback">Back</button><button class="tnext primary">Next</button></div></div>';document.body.appendChild(t);
 t.querySelector(".tskip").onclick=endTour;t.querySelector(".tback").onclick=()=>changeTourStep(-1);
 t.querySelector(".tnext").onclick=()=>tourI>=STEPS.length-1?endTour():changeTourStep(1);
 window.addEventListener("resize",showStep)}showStep(true)};
function endTour(){tourEl()?.remove();window.removeEventListener("resize",showStep);data.tourDone=true;save();tourBusy=false;}
function changeTourStep(dir){
 if(tourBusy)return;
 const t=tourEl();if(!t)return;
 tourBusy=true;
 t.classList.remove("tour-step-in");t.classList.add("tour-step-out");
 const next=Math.max(0,Math.min(STEPS.length-1,tourI+dir));
 setTimeout(()=>{
  tourI=next;
  t.classList.remove("tour-step-out");
  showStep();
  setTimeout(()=>{tourBusy=false},420);
 },190);
}
function showStep(first=false){
 const t=tourEl();if(!t)return;const st=STEPS[tourI];
 const position=()=>{
  const spot=t.querySelector(".spot"),tip=t.querySelector(".tip"),el=tourTarget(st);
  t.querySelector("h3").textContent=st.t;t.querySelector("p").textContent=st.d;
  t.querySelector(".tcount").textContent=(tourI+1)+"/"+STEPS.length;
  t.querySelector(".tback").style.visibility=tourI?"visible":"hidden";
  t.querySelector(".tnext").textContent=tourI>=STEPS.length-1?"Done":"Next";
  tip.style.top=tip.style.bottom="";
  if(el){
   el.scrollIntoView({block:"center",behavior:"smooth"});
   setTimeout(()=>{
    const r=el.getBoundingClientRect(),p=8;
    Object.assign(spot.style,{display:"block",left:Math.max(6,r.left-p)+"px",top:Math.max(6,r.top-p)+"px",width:r.width+2*p+"px",height:r.height+2*p+"px"});
    tip.style.top=tip.style.bottom="";
    const tipH=tip.offsetHeight||150;
    if(r.top+r.height/2>innerHeight/2){tip.style.bottom=Math.max(18,innerHeight-r.top+18)+"px";}else{tip.style.top=Math.min(innerHeight-tipH-18,r.bottom+18)+"px";}
    t.classList.add("tour-step-in");
   },260);
  }else{
   spot.style.display="none";tip.style.top=Math.max(40,innerHeight/2-110)+"px";
   t.classList.add("tour-step-in");
  }
 };
 t.classList.remove("tour-step-in");
 if(st.v&&view!==st.v){
  view=st.v;
  shell();
  setTimeout(position,220);
 }else{
  requestAnimationFrame(position);
 }
}
if(!data.tourDone)setTimeout(()=>startTour(),1900);

window.openBackup=()=>modal("Backup & restore",`<p class="muted">Tap Copy and paste it somewhere safe (Notes, WhatsApp to yourself). To restore, paste it back below and tap Restore.</p><textarea id="bk" rows="7" style="width:100%">${esc(JSON.stringify(data))}</textarea><button type="button" class="primary wide" onclick="copyBackup()">Copy backup</button><button type="button" class="delete wide" onclick="restoreBackup()">Restore from text above</button>`);
window.copyBackup=async()=>{const t=document.querySelector("#bk");try{await navigator.clipboard.writeText(t.value);alert("Copied!")}catch(e){t.select();alert("Select all and copy the text manually.")}};
window.restoreBackup=()=>{try{const d=JSON.parse(document.querySelector("#bk").value);if(!d.subjects||!d.classes||!d.events)throw 0;data=d;save();closeModal();shell();alert("Restored!")}catch(e){alert("That backup text isn't valid.")}};

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
function playCompletionEffect(btn,card){
 btn.classList.add("on","anim");
 card.classList.add("done","popping");
 confetti(btn);
 try{navigator.vibrate&&navigator.vibrate([14,50,22])}catch(x){}
}
window.toggleDone=(id,btn)=>{
 const e=data.events.find(x=>x.id===id),was=e.status==="Completed";
 e.status=was?"Upcoming":"Completed";e.doneAt=was?null:Date.now();save();
 const card=btn.closest(".eventcard,.homeevent");
 if(!was){
  playCompletionEffect(btn,card);
  toast("Nice! Marked as done ✓",()=>{e.status="Upcoming";save();shell()});
  setTimeout(shell,950);
 }else{
  btn.classList.remove("on","anim");card.classList.remove("done","popping");shell();
 }
};

// ---------- profile picture ----------
window.setPhoto=f=>{if(!f)return;const img=new Image();img.onload=()=>{const n=Math.min(img.width,img.height),c=document.createElement("canvas");c.width=c.height=256;c.getContext("2d").drawImage(img,(img.width-n)/2,(img.height-n)/2,n,n,0,0,256,256);data.profile.photo=c.toDataURL("image/jpeg",.85);save();closeModal();shell();profile()};img.onerror=()=>alert("Couldn't read that photo.");img.src=URL.createObjectURL(f)};
window.removePhoto=()=>{delete data.profile.photo;save();closeModal();shell();profile()};
