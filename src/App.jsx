import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { supabase, kvGet, kvSet, configOk } from "./supabase.js";

// ==================== 상수 ====================
const FIXED_COSTS = [
  {label:"가맹비",amount:50},{label:"미생물 쓰레기통 렌탈",amount:17.8},
  {label:"월세",amount:209},{label:"통신비",amount:5},{label:"가스",amount:30},
  {label:"전기",amount:50},{label:"수도",amount:25},{label:"세무기장",amount:11},
  {label:"주방기기렌탈",amount:120},{label:"에어컨 할부",amount:20},
  {label:"대출 할부금",amount:117.833},{label:"포스기",amount:18},{label:"대기앱",amount:5},
];
const FIXED_TOTAL = FIXED_COSTS.reduce((a,b)=>a+b.amount,0);
const DAYS_ALL = ["월","화","수","목","금","토","일"];
const DOW_KR = ["일","월","화","수","목","금","토"];

const POSITIONS = [
  {key:"점심-주방1",section:"점심",role:"주방1"},
  {key:"점심-주방2",section:"점심",role:"주방2"},
  {key:"점심-홀",section:"점심",role:"홀"},
  {key:"저녁-주방1",section:"저녁",role:"주방1"},
  {key:"저녁-주방2",section:"저녁",role:"주방2"},
  {key:"저녁-주방3",section:"저녁",role:"주방3"},
  {key:"저녁-홀",section:"저녁",role:"홀"},
];

const INIT_SCHEDULE = {
  "점심-주방1": {월:1,화:1,수:1,목:1,금:1,토:9,일:9},
  "점심-주방2": {월:2,화:2,수:2,목:100,금:100,토:100,일:100},
  "점심-홀":    {월:3,화:3,수:3,목:3,금:3,토:11,일:11},
  "저녁-주방1": {월:1,화:1,수:1,목:100,금:100,토:100,일:100},
  "저녁-주방2": {월:-1,화:-1,수:-1,목:4,금:4,토:10,일:10},
  "저녁-주방3": {월:5,화:5,수:4,목:7,금:7,토:9,일:9},
  "저녁-홀":    {월:8,화:12,수:12,목:13,금:13,토:8,일:8},
};

const INIT_STAFF = [
  {id:1,name:"승룡",role:"사장",position:"kitchen",wage:0,type:"사장",insurance:"-",days:["월","화","수","목","금"],lunchTime:"10:00–15:00",dinnerTime:"16:30–21:30",phone:"",contractFile:null,memo:"점심 월~금 / 저녁 월화수",color:"#3dba7a",weeklyHours:0},
  {id:2,name:"나래",role:"사모님",position:"kitchen",wage:0,type:"사장",insurance:"-",days:["월","화","수"],lunchTime:"10:00–15:00",dinnerTime:"-",phone:"",contractFile:null,memo:"점심만 월화수",color:"#4fc3f7",weeklyHours:0},
  {id:100,name:"이현민",role:"주방실장",position:"manager",wage:3000000,type:"월급",insurance:"4대보험",days:["목","금","토","일"],lunchTime:"10:00–21:30",dinnerTime:"10:00–21:30",phone:"",contractFile:null,memo:"월 300만원 확정 / 월차 없음(계약서 명시)",color:"#b39ddb",weeklyHours:42},
  {id:3,name:"자윤",role:"홀",position:"hall",wage:11000,type:"시급",insurance:"단기(3.3%)",days:["월","화","수","목","금"],lunchTime:"11:00–14:00",dinnerTime:"-",phone:"",contractFile:null,memo:"",color:"#80cbc4",weeklyHours:15},
  {id:4,name:"성현",role:"주방",position:"kitchen",wage:12000,type:"시급",insurance:"4대보험",days:["수","목","금"],lunchTime:"-",dinnerTime:"16:30–21:30",phone:"",contractFile:null,memo:"수: 주방3 / 목금: 주방2",color:"#ff8a65",weeklyHours:15},
  {id:5,name:"정희",role:"주방",position:"kitchen",wage:12000,type:"시급",insurance:"단기(3.3%)",days:["월","화"],lunchTime:"-",dinnerTime:"16:30–21:30",phone:"",contractFile:null,memo:"",color:"#f06292",weeklyHours:10},
  {id:7,name:"정은",role:"주방",position:"kitchen",wage:12000,type:"시급",insurance:"단기(3.3%)",days:["월","화","수","목","금"],lunchTime:"-",dinnerTime:"17:30–21:30",phone:"",contractFile:null,memo:"",color:"#ffd54f",weeklyHours:20},
  {id:8,name:"인호",role:"홀",position:"hall",wage:11000,type:"시급",insurance:"단기(3.3%)",days:["월","토","일"],lunchTime:"-",dinnerTime:"16:30–21:30",phone:"",contractFile:null,memo:"",color:"#4dd0e1",weeklyHours:15},
  {id:9,name:"세혁",role:"주방",position:"kitchen",wage:12000,type:"시급",insurance:"단기(3.3%)",days:["토","일"],lunchTime:"10:00–21:00",dinnerTime:"10:00–21:00",phone:"",contractFile:null,memo:"중간 1시간 휴무",color:"#ffb74d",weeklyHours:20},
  {id:10,name:"병무",role:"주방",position:"kitchen",wage:12000,type:"시급",insurance:"단기(3.3%)",days:["토","일"],lunchTime:"11:00–21:30",dinnerTime:"11:00–21:30",phone:"",contractFile:null,memo:"중간 1시간 휴무",color:"#ef9a9a",weeklyHours:21},
  {id:11,name:"서빈",role:"홀",position:"hall",wage:11000,type:"시급",insurance:"단기(3.3%)",days:["토","일"],lunchTime:"10:00–15:00",dinnerTime:"-",phone:"",contractFile:null,memo:"",color:"#90caf9",weeklyHours:10},
  {id:12,name:"혜지",role:"홀",position:"hall",wage:11000,type:"시급",insurance:"단기(3.3%)",days:["화","수"],lunchTime:"-",dinnerTime:"16:30–21:30",phone:"",contractFile:null,memo:"",color:"#ce93d8",weeklyHours:10},
  {id:13,name:"호준",role:"홀",position:"hall",wage:11000,type:"시급",insurance:"단기(3.3%)",days:["목","금"],lunchTime:"-",dinnerTime:"16:30–21:30",phone:"",contractFile:null,memo:"",color:"#a5d6a7",weeklyHours:10},
];

const EXCEL_SALES = {
  "2025-1-1":{hall:40.9,baemin:76.0,coupang:0},"2025-1-2":{hall:46.5,baemin:25.9,coupang:0},
  "2025-1-3":{hall:96.8,baemin:31.1,coupang:0},"2025-1-4":{hall:60.0,baemin:50.2,coupang:0},
  "2025-1-6":{hall:82.4,baemin:49.2,coupang:0},"2025-1-7":{hall:66.6,baemin:37.5,coupang:0},
  "2025-1-8":{hall:58.1,baemin:53.6,coupang:59.4},"2025-1-9":{hall:102.0,baemin:53.3,coupang:17.3},
  "2025-1-10":{hall:55.1,baemin:46.6,coupang:48.1},"2025-1-11":{hall:60.0,baemin:63.3,coupang:47.5},
  "2025-1-13":{hall:50.0,baemin:32.4,coupang:35.8},"2025-1-14":{hall:72.5,baemin:45.3,coupang:27.3},
  "2025-1-15":{hall:79.3,baemin:40.2,coupang:22.7},"2025-1-16":{hall:79.4,baemin:32.5,coupang:28.0},
  "2025-1-17":{hall:50.5,baemin:67.4,coupang:51.3},"2025-1-18":{hall:72.4,baemin:84.9,coupang:31.3},
  "2025-1-20":{hall:61.7,baemin:52.2,coupang:42.1},"2025-1-21":{hall:75.5,baemin:68.2,coupang:42.8},
  "2025-1-22":{hall:91.5,baemin:53.5,coupang:44.6},"2025-1-23":{hall:65.4,baemin:55.5,coupang:69.7},
  "2025-1-24":{hall:80.9,baemin:70.1,coupang:66.2},"2025-1-25":{hall:52.7,baemin:80.9,coupang:68.8},
  "2025-1-27":{hall:44.6,baemin:49.7,coupang:37.5},"2025-1-28":{hall:61.5,baemin:37.4,coupang:48.9},
  "2025-1-29":{hall:72.5,baemin:49.6,coupang:35.5},"2025-1-30":{hall:57.7,baemin:42.6,coupang:47.7},
  "2025-1-31":{hall:70.1,baemin:74.8,coupang:60.4},
  "2025-2-1":{hall:60.7,baemin:70.6,coupang:35.2},"2025-2-3":{hall:32.4,baemin:42.7,coupang:42.1},
  "2025-2-4":{hall:63.3,baemin:71.9,coupang:28.9},"2025-2-5":{hall:73.8,baemin:45.6,coupang:55.3},
  "2025-2-6":{hall:46.1,baemin:33.1,coupang:44.8},"2025-2-7":{hall:51.3,baemin:63.5,coupang:83.3},
  "2025-2-8":{hall:70.0,baemin:70.0,coupang:74.3},"2025-2-10":{hall:83.1,baemin:108.1,coupang:31.8},
  "2025-2-11":{hall:49.1,baemin:83.8,coupang:58.8},"2025-2-12":{hall:72.3,baemin:29.6,coupang:45.3},
  "2025-2-13":{hall:67.9,baemin:67.0,coupang:41.5},"2025-2-14":{hall:67.0,baemin:67.9,coupang:41.5},
  "2025-2-15":{hall:34.2,baemin:35.9,coupang:66.1},"2025-2-18":{hall:98.8,baemin:45.8,coupang:48.9},
  "2025-2-19":{hall:48.9,baemin:36.6,coupang:43.2},"2025-2-20":{hall:82.4,baemin:39.7,coupang:32.1},
  "2025-2-21":{hall:86.4,baemin:68.8,coupang:50.8},"2025-2-22":{hall:62.0,baemin:55.8,coupang:36.4},
  "2025-2-24":{hall:63.9,baemin:58.3,coupang:33.3},"2025-2-25":{hall:79.4,baemin:87.5,coupang:39.5},
  "2025-2-26":{hall:56.8,baemin:52.4,coupang:34.2},"2025-2-27":{hall:95.0,baemin:37.8,coupang:49.7},
  "2025-2-28":{hall:68.3,baemin:51.7,coupang:27.6},
  "2025-3-1":{hall:98.0,baemin:74.8,coupang:54.2},"2025-3-3":{hall:109.2,baemin:41.7,coupang:31.7},
  "2025-3-4":{hall:62.6,baemin:44.5,coupang:30.7},"2025-3-5":{hall:72.7,baemin:34.8,coupang:58.3},
  "2025-3-6":{hall:24.2,baemin:50.5,coupang:58.2},"2025-3-7":{hall:52.3,baemin:46.3,coupang:49.6},
  "2025-3-8":{hall:107.0,baemin:68.4,coupang:50.8},"2025-3-10":{hall:63.8,baemin:62.8,coupang:32.4},
  "2025-3-11":{hall:60.5,baemin:51.1,coupang:20.8},"2025-3-12":{hall:55.4,baemin:44.6,coupang:20.0},
  "2025-3-13":{hall:57.0,baemin:34.3,coupang:42.6},"2025-3-14":{hall:88.0,baemin:55.7,coupang:45.7},
  "2025-3-15":{hall:64.0,baemin:73.3,coupang:50.9},"2025-3-17":{hall:57.3,baemin:59.2,coupang:51.1},
  "2025-3-18":{hall:81.9,baemin:65.0,coupang:44.2},"2025-3-19":{hall:58.8,baemin:22.7,coupang:22.2},
  "2025-3-20":{hall:91.8,baemin:25.9,coupang:47.1},"2025-3-21":{hall:65.5,baemin:46.3,coupang:81.1},
  "2025-3-22":{hall:64.7,baemin:49.8,coupang:71.2},"2025-3-24":{hall:64.6,baemin:46.4,coupang:27.7},
  "2025-3-25":{hall:56.2,baemin:24.2,coupang:29.4},"2025-3-26":{hall:100.0,baemin:44.5,coupang:48.9},
  "2025-3-27":{hall:91.3,baemin:20.6,coupang:38.7},"2025-3-28":{hall:83.1,baemin:46.2,coupang:75.6},
  "2025-3-29":{hall:34.9,baemin:76.8,coupang:77.5},"2025-3-31":{hall:70.0,baemin:30.9,coupang:35.2},
  "2025-4-1":{hall:71.2,baemin:42.4,coupang:48.4},"2025-4-2":{hall:91.3,baemin:42.0,coupang:31.7},
  "2025-4-3":{hall:79.2,baemin:29.1,coupang:51.3},"2025-4-4":{hall:48.6,baemin:46.5,coupang:78.9},
  "2025-4-5":{hall:59.0,baemin:52.4,coupang:68.1},"2025-4-7":{hall:54.7,baemin:24.9,coupang:54.1},
  "2025-4-8":{hall:58.6,baemin:35.5,coupang:44.0},"2025-4-9":{hall:47.3,baemin:21.3,coupang:32.6},
  "2025-4-10":{hall:60.4,baemin:37.0,coupang:33.1},"2025-4-11":{hall:74.7,baemin:39.6,coupang:42.6},
  "2025-4-12":{hall:91.4,baemin:64.0,coupang:61.2},"2025-4-14":{hall:95.9,baemin:19.3,coupang:32.2},
  "2025-4-15":{hall:74.9,baemin:28.8,coupang:38.8},"2025-4-16":{hall:74.4,baemin:31.3,coupang:59.2},
  "2025-4-17":{hall:57.7,baemin:53.7,coupang:29.2},"2025-4-18":{hall:87.5,baemin:57.5,coupang:65.1},
  "2025-4-19":{hall:88.5,baemin:57.7,coupang:71.4},"2025-4-21":{hall:67.6,baemin:22.0,coupang:30.4},
  "2025-4-22":{hall:116.5,baemin:37.6,coupang:52.6},"2025-4-23":{hall:76.4,baemin:56.2,coupang:45.8},
  "2025-4-24":{hall:77.0,baemin:24.8,coupang:45.4},"2025-4-25":{hall:127.2,baemin:41.6,coupang:60.4},
  "2025-4-26":{hall:74.2,baemin:50.4,coupang:48.0},"2025-4-28":{hall:54.8,baemin:46.4,coupang:55.3},
  "2025-4-29":{hall:44.9,baemin:38.0,coupang:42.5},"2025-4-30":{hall:81.0,baemin:31.6,coupang:51.6},
  "2025-5-1":{hall:69.6,baemin:58.9,coupang:86.6},"2025-5-2":{hall:69.6,baemin:46.8,coupang:41.1},
  "2025-5-3":{hall:38.1,baemin:44.4,coupang:63.8},"2025-5-4":{hall:31.4,baemin:72.9,coupang:97.0},
  "2025-5-5":{hall:37.6,baemin:34.2,coupang:39.2},"2025-5-6":{hall:70.2,baemin:15.3,coupang:24.5},
  "2025-5-8":{hall:80.0,baemin:30.0,coupang:28.0},"2025-5-9":{hall:53.0,baemin:30.0,coupang:63.0},
  "2025-5-10":{hall:85.4,baemin:33.3,coupang:57.2},
  "2026-7-1":{hall:89,baemin:40,coupang:42},"2026-7-3":{hall:87,baemin:25,coupang:35},
  "2026-7-4":{hall:53,baemin:44,coupang:18},"2026-7-5":{hall:42,baemin:59,coupang:80},
  "2026-7-6":{hall:42,baemin:60,coupang:80},"2026-7-7":{hall:74,baemin:32,coupang:52},
  "2026-7-8":{hall:30,baemin:30,coupang:50},"2026-7-9":{hall:29,baemin:28,coupang:55},
  "2026-7-10":{hall:37,baemin:18,coupang:75},"2026-7-11":{hall:60,baemin:60,coupang:75},
  "2026-7-12":{hall:55,baemin:37,coupang:77},"2026-7-13":{hall:77,baemin:78,coupang:46},
  "2026-7-14":{hall:36,baemin:37,coupang:46},"2026-7-15":{hall:104,baemin:46,coupang:30},
  "2026-7-16":{hall:37,baemin:30,coupang:48},"2026-7-17":{hall:51,baemin:29,coupang:37},
  "2026-7-18":{hall:63,baemin:43,coupang:50},
};

const C={bg:"#101418",surface:"#181c20",s2:"#1e2228",s3:"#252b32",border:"#2e3540",
  accent:"#ff6b35",accent2:"#ffb347",text:"#eef0f2",text2:"#8a9bb0",text3:"#4a5568",
  green:"#3dba7a",blue:"#4a9eff",red:"#f05c5c"};

function calcPay(s){
  if(!s||s.type==="사장") return {gross:0,net:0,deduct:0,empAdd:0,weeklyPay:0};
  if(s.type==="월급"){
    const g=s.wage,pen=Math.round(g*.045),hea=Math.round(g*.03545),
      car=Math.round(hea*.1295),emp=Math.round(g*.009),inc=46820,loc=Math.round(inc*.1);
    const deduct=pen+hea+car+emp+inc+loc;
    return {gross:g,net:g-deduct,deduct,empAdd:Math.round(g*.09),weeklyPay:0};
  }
  const hrs=s.weeklyHours*4.345;
  const g=Math.round(hrs*s.wage);
  const weekly=s.weeklyHours>=15?Math.round((s.weeklyHours/40)*8*s.wage*4.345):0;
  const gross=g+weekly;
  const deduct=s.insurance==="4대보험"?Math.round(gross*.094):Math.round(gross*.033);
  return {gross,net:gross-deduct,deduct,empAdd:s.insurance==="4대보험"?Math.round(gross*.09):0,weeklyPay:weekly};
}

const byId=(list,id)=>(id==null||id===-1)?null:(list.find(s=>s.id===id)||null);

// ==================== 외부 컴포넌트 (포커스 버그 수정) ====================

function StaffCard({s,updateStaff,removeStaff}){
  const p=calcPay(s);
  const [open,setOpen]=useState(false);
  return (
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,marginBottom:10,overflow:"hidden"}}>
      <div onClick={()=>setOpen(o=>!o)} style={{padding:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:38,height:38,borderRadius:"50%",background:`${s.color}25`,border:`2px solid ${s.color}`,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
            {s.position==="hall"?"🙋":s.type==="사장"?"👨‍🍳":s.position==="manager"?"👑":"🍳"}
          </div>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:s.color,display:"flex",alignItems:"center",gap:5}}>
              {s.name}
              {s.type==="사장"&&<span style={{fontSize:9,padding:"2px 6px",borderRadius:6,background:C.accent+"22",color:C.accent,fontWeight:700}}>사장</span>}
            </div>
            <div style={{fontSize:11,color:C.text2}}>{s.role} · {s.insurance}</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:2,marginTop:2}}>
              {s.days.map(d=><span key={d} style={{fontSize:9,padding:"1px 5px",borderRadius:4,background:`${s.color}22`,color:s.color}}>{d}</span>)}
            </div>
          </div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          {s.type!=="사장"&&<><div style={{fontSize:14,fontWeight:700,color:s.color}}>{(p.net/10000).toFixed(1)}만</div><div style={{fontSize:9,color:C.text2}}>실수령</div></>}
          <div style={{fontSize:11,color:C.text3,marginTop:2}}>{open?"▲":"▼"}</div>
        </div>
      </div>
      {open&&(
        <div style={{padding:"0 14px 14px",borderTop:`1px solid ${C.border}`}}>
          {s.type!=="사장"&&(
            <div style={{background:C.s3,borderRadius:10,padding:12,marginTop:12,marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:600,color:C.text2,marginBottom:8}}>💰 월 급여</div>
              {[
                ["근무",s.type==="월급"?`${(s.wage/10000).toFixed(0)}만/월`:`${s.wage.toLocaleString()}원/시`],
                ["주 시간",`${s.weeklyHours}h`],
                ...(p.weeklyPay>0?[["주휴수당",`+${(p.weeklyPay/10000).toFixed(1)}만`]]:[]),
                ["지급 총액",`${(p.gross/10000).toFixed(1)}만원`],
                [s.insurance==="4대보험"?"공제(9.4%)":"공제(3.3%)",`-${(p.deduct/10000).toFixed(1)}만원`],
                ["실수령",`${(p.net/10000).toFixed(1)}만원`],
                ...(p.empAdd>0?[["사업주 부담",`+${(p.empAdd/10000).toFixed(1)}만원`]]:[]),
              ].map(([l,v],i,arr)=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",
                  borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none",
                  fontSize:l==="실수령"?14:12,fontWeight:l==="실수령"?700:400,
                  color:l.includes("공제")?C.red:l==="실수령"?s.color:l.includes("사업주")?C.text3:C.text}}>
                  <span style={{color:C.text2}}>{l}</span><span>{v}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{background:C.s3,borderRadius:10,padding:12,marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:600,color:C.text2,marginBottom:8}}>📅 근무 요일 <span style={{fontSize:9,color:C.text3}}>(변경 → 근무표 자동 반영)</span></div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
              {DAYS_ALL.map(d=>{
                const active=s.days.includes(d);
                return (
                  <button key={d} onClick={()=>{
                    const nd=active?s.days.filter(x=>x!==d):[...s.days,d].sort((a,b)=>DAYS_ALL.indexOf(a)-DAYS_ALL.indexOf(b));
                    updateStaff(s.id,{days:nd});
                  }} style={{padding:"6px 10px",borderRadius:8,fontSize:12,cursor:"pointer",
                    border:`1px solid ${active?s.color:C.border}`,
                    background:active?s.color+"22":"transparent",
                    color:active?s.color:C.text3,fontWeight:active?700:400}}>{d}</button>
                );
              })}
            </div>
            {s.type!=="사장"&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div>
                  <div style={{fontSize:10,color:C.text2,marginBottom:3}}>{s.type==="월급"?"월급(원)":"시급(원)"}</div>
                  <input type="number" defaultValue={s.wage} onBlur={e=>updateStaff(s.id,{wage:parseFloat(e.target.value)||0})}
                    style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:6,padding:"7px 8px",color:C.text,fontSize:12,outline:"none"}}/>
                </div>
                <div>
                  <div style={{fontSize:10,color:C.text2,marginBottom:3}}>주 근무시간</div>
                  <input type="number" defaultValue={s.weeklyHours} onBlur={e=>updateStaff(s.id,{weeklyHours:parseFloat(e.target.value)||0})}
                    style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:6,padding:"7px 8px",color:C.text,fontSize:12,outline:"none"}}/>
                </div>
              </div>
            )}
          </div>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:11,color:C.text2,marginBottom:4}}>📞 연락처</div>
            <div style={{display:"flex",gap:8}}>
              <input defaultValue={s.phone} onBlur={e=>updateStaff(s.id,{phone:e.target.value})} placeholder="010-0000-0000"
                style={{flex:1,background:C.s3,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 10px",color:C.text,fontSize:13,outline:"none"}}/>
              {s.phone&&<a href={`tel:${s.phone}`}
                style={{background:C.green,color:"white",borderRadius:8,padding:"9px 14px",fontSize:13,textDecoration:"none",display:"flex",alignItems:"center"}}>📞</a>}
            </div>
          </div>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:11,color:C.text2,marginBottom:4}}>📝 메모</div>
            <textarea defaultValue={s.memo} onBlur={e=>updateStaff(s.id,{memo:e.target.value})} rows={2}
              style={{width:"100%",background:C.s3,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",color:C.text,fontSize:12,resize:"none",outline:"none"}}/>
          </div>
          <div>
            <div style={{fontSize:11,color:C.text2,marginBottom:4}}>📄 근로계약서</div>
            {s.contractFile
              ?<div style={{display:"flex",alignItems:"center",gap:8,background:C.s3,borderRadius:8,padding:"9px 12px"}}>
                  <a href={supabase.storage.from("photos").getPublicUrl(s.contractFile).data.publicUrl} target="_blank" rel="noreferrer"
                    style={{fontSize:12,color:C.green,flex:1,textDecoration:"underline"}}>📄 {s.contractFile.split("/").pop()} (보기)</a>
                  <button onClick={()=>updateStaff(s.id,{contractFile:null})}
                    style={{background:C.red,color:"white",border:"none",borderRadius:6,padding:"4px 8px",fontSize:10,cursor:"pointer"}}>삭제</button>
                </div>
              :<label style={{display:"block",background:C.s3,border:`2px dashed ${C.border}`,borderRadius:8,padding:14,textAlign:"center",cursor:"pointer"}}>
                  <input type="file" accept="image/*,.pdf" style={{display:"none"}}
                    onChange={async(e)=>{
                      const f=e.target.files[0]; if(!f) return;
                      const safe=f.name.replace(/[^\w.\-가-힣]/g,"_");
                      const path=`contracts/${s.id}_${Date.now()}_${safe}`;
                      const {error}=await supabase.storage.from("photos").upload(path,f,{contentType:f.type});
                      if(error){alert("업로드 실패: "+error.message);return;}
                      updateStaff(s.id,{contractFile:path});
                      e.target.value="";
                    }}/>
                  <div style={{fontSize:12,color:C.text2}}>📎 근로계약서 파일 업로드 (사진/PDF)</div>
                </label>
            }
          </div>
          <div style={{display:"flex",gap:8,marginTop:12,alignItems:"center"}}>
            <button onClick={()=>{
              if(s.type==="사장"){updateStaff(s.id,{type:"시급",insurance:"단기(3.3%)"});}
              else{updateStaff(s.id,{type:"사장",insurance:"-"});}
            }} style={{flex:1,padding:"9px 10px",borderRadius:8,fontSize:11,cursor:"pointer",
              border:`1px solid ${s.type==="사장"?C.accent:C.border}`,
              background:s.type==="사장"?C.accent+"22":C.s3,
              color:s.type==="사장"?C.accent:C.text2,fontWeight:600}}>
              {s.type==="사장"?"👨‍🍳 사장 (인건비 미포함)":"사장으로 지정"}
            </button>
            {removeStaff&&<button onClick={()=>removeStaff(s.id)}
              style={{padding:"9px 12px",borderRadius:8,fontSize:11,cursor:"pointer",
                border:`1px solid ${C.red}44`,background:"transparent",color:C.red}}>
              삭제
            </button>}
          </div>
        </div>
      )}
    </div>
  );
}

function CellEditModal({modal,staff,onSelect,onClose}){
  if(!modal) return null;
  const {posKey,day,staffId}=modal;
  const current=byId(staff,staffId);
  return <>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:100}}/>
    <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,
      background:C.surface,borderRadius:"20px 20px 0 0",padding:"16px 20px 28px",zIndex:101}}>
      <div style={{width:40,height:4,background:C.border,borderRadius:2,margin:"0 auto 14px"}}/>
      <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>{posKey} · {day}요일</div>
      <div style={{fontSize:11,color:C.text3,marginBottom:14}}>현재: <span style={{color:current?.color||C.text2,fontWeight:600}}>{current?.name||"공석"}</span></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
        <button onClick={()=>onSelect(-1)}
          style={{padding:"10px 6px",borderRadius:8,border:`1px solid ${C.border}`,background:C.s3,color:C.text3,cursor:"pointer",fontSize:12}}>공석</button>
        {staff.map(s=>(
          <button key={s.id} onClick={()=>onSelect(s.id)}
            style={{padding:"10px 6px",borderRadius:8,border:`1px solid ${s.id===staffId?s.color:C.border}`,
              background:s.id===staffId?s.color+"22":C.s3,color:s.color,cursor:"pointer",fontSize:12,fontWeight:s.id===staffId?700:400}}>
            {s.name}
          </button>
        ))}
      </div>
      <button onClick={onClose}
        style={{width:"100%",padding:12,marginTop:14,borderRadius:10,border:`1px solid ${C.border}`,background:C.s2,color:C.text,cursor:"pointer"}}>취소</button>
    </div>
  </>;
}

function SchedDayModal({modal,staff,getDateSchedule,dayOverride,onCellChange,overrides,onSaveMemo,onClose}){
  const [changes,setChanges]=useState("");
  const [note,setNote]=useState("");
  const [pickPos,setPickPos]=useState(null);

  useEffect(()=>{
    if(modal){
      const ov=overrides[modal.dateKey]||{};
      setChanges(ov.changes||""); setNote(ov.note||""); setPickPos(null);
    }
  },[modal?.dateKey]);

  if(!modal) return null;
  const {day,dateKey,y,m}=modal;
  const dow=new Date(y,m,day).getDay();
  const ds=getDateSchedule(dateKey);

  return <>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:100}}/>
    <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,
      background:C.surface,borderRadius:"20px 20px 0 0",padding:"16px 20px 24px",zIndex:101,maxHeight:"85vh",overflowY:"auto"}}>
      <div style={{width:40,height:4,background:C.border,borderRadius:2,margin:"0 auto 14px"}}/>
      <div style={{fontSize:16,fontWeight:700,marginBottom:2}}>{m+1}월 {day}일 ({DOW_KR[dow]})</div>
      <div style={{fontSize:11,color:C.text3,marginBottom:14}}>포지션 탭 → 그날만 근무자 변경 (고정 스케줄 유지)</div>

      {POSITIONS.map(pos=>{
        const sid=ds[pos.key];
        const s=byId(staff,sid);
        const isChanged=dayOverride[dateKey]?.[pos.key]!==undefined;
        const isPicking=pickPos===pos.key;
        return (
          <div key={pos.key}>
            <div onClick={()=>setPickPos(isPicking?null:pos.key)}
              style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                padding:"8px 10px",background:C.s3,borderRadius:isPicking?"8px 8px 0 0":8,marginBottom:isPicking?0:4,
                border:`1px solid ${isChanged?C.accent2:isPicking?C.accent:C.border}`,cursor:"pointer"}}>
              <div>
                <div style={{fontSize:10,color:C.text3}}>{pos.section} {pos.role}</div>
                <div style={{fontSize:13,fontWeight:600,color:s?s.color:C.text3}}>{s?s.name:"공석"}</div>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                {isChanged&&<span style={{fontSize:9,color:C.accent2,padding:"2px 6px",borderRadius:6,background:C.accent2+"22"}}>변동</span>}
                <span style={{fontSize:11,color:C.text3}}>{isPicking?"▲":"▼"}</span>
              </div>
            </div>
            {isPicking&&(
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4,
                padding:8,background:C.s2,borderRadius:"0 0 8px 8px",marginBottom:4,
                border:`1px solid ${C.accent}`,borderTop:"none"}}>
                <button onClick={()=>{onCellChange(dateKey,pos.key,-1);setPickPos(null);}}
                  style={{padding:"7px 4px",borderRadius:6,border:`1px solid ${C.border}`,background:C.s3,color:C.text3,cursor:"pointer",fontSize:11}}>공석</button>
                {staff.map(st=>(
                  <button key={st.id} onClick={()=>{onCellChange(dateKey,pos.key,st.id);setPickPos(null);}}
                    style={{padding:"7px 4px",borderRadius:6,border:`1px solid ${st.id===sid?st.color:C.border}`,
                      background:st.id===sid?st.color+"22":C.s3,color:st.color,cursor:"pointer",fontSize:11}}>
                    {st.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div style={{marginTop:12}}>
        <div style={{fontSize:11,color:C.text2,marginBottom:4}}>변동 메모</div>
        <input value={changes} onChange={e=>setChanges(e.target.value)} placeholder="예: 정희 결석 → 대타 홍길동"
          style={{width:"100%",background:C.s3,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.text,fontSize:13,outline:"none",marginBottom:8}}/>
        <div style={{fontSize:11,color:C.text2,marginBottom:4}}>기타 메모</div>
        <textarea value={note} onChange={e=>setNote(e.target.value)} rows={2}
          style={{width:"100%",background:C.s3,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.text,fontSize:13,outline:"none",resize:"none"}}/>
      </div>
      <div style={{display:"flex",gap:8,marginTop:14}}>
        <button onClick={onClose}
          style={{flex:1,padding:12,borderRadius:10,border:`1px solid ${C.border}`,background:C.s2,color:C.text,cursor:"pointer"}}>닫기</button>
        <button onClick={()=>{onSaveMemo(dateKey,{changes,note});onClose();}}
          style={{flex:2,padding:12,borderRadius:10,border:"none",background:C.accent,color:"white",fontWeight:600,cursor:"pointer"}}>저장</button>
      </div>
    </div>
  </>;
}

function SalesModal({modal,calDate,sales,onSave,onClose}){
  const [form,setForm]=useState({hall:"",baemin:"",coupang:""});
  useEffect(()=>{
    if(modal){
      const key=`${calDate.getFullYear()}-${calDate.getMonth()+1}-${modal}`;
      const sd=sales[key]||{};
      setForm({hall:sd.hall||"",baemin:sd.baemin||"",coupang:sd.coupang||""});
    }
  },[modal]);
  if(!modal) return null;
  return <>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:100}}/>
    <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,
      background:C.surface,borderRadius:"20px 20px 0 0",padding:"16px 20px 28px",zIndex:101}}>
      <div style={{width:40,height:4,background:C.border,borderRadius:2,margin:"0 auto 16px"}}/>
      <div style={{fontSize:16,fontWeight:700,marginBottom:16}}>{calDate.getMonth()+1}월 {modal}일 매출 입력</div>
      {[["hall","홀 매출",C.blue],["baemin","배달의민족",C.green],["coupang","쿠팡이츠",C.accent2]].map(([k,l,c])=>(
        <div key={k} style={{marginBottom:12}}>
          <div style={{fontSize:12,color:C.text2,marginBottom:4,display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:c}}/>{l} (만원)
          </div>
          <input type="number" step="0.1" inputMode="decimal" placeholder="0" value={form[k]}
            onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}
            style={{width:"100%",background:C.s3,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 14px",color:C.text,fontSize:15,outline:"none"}}/>
        </div>
      ))}
      <div style={{background:C.s3,borderRadius:10,padding:"10px 14px",margin:"8px 0 16px",display:"flex",justifyContent:"space-between"}}>
        <span style={{fontSize:12,color:C.text2}}>합계</span>
        <span style={{fontSize:18,fontWeight:700,color:C.accent}}>
          {((parseFloat(form.hall)||0)+(parseFloat(form.baemin)||0)+(parseFloat(form.coupang)||0)).toFixed(1)}만원
        </span>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={onClose} style={{flex:1,padding:12,borderRadius:10,border:`1px solid ${C.border}`,background:C.s2,color:C.text,cursor:"pointer"}}>취소</button>
        <button onClick={()=>onSave(form)} style={{flex:2,padding:12,borderRadius:10,border:"none",background:C.accent,color:"white",fontWeight:600,cursor:"pointer"}}>저장</button>
      </div>
    </div>
  </>;
}


// ==================== 사진 관리 (Supabase Storage) ====================
const PHOTO_CAT = { "매출":"sales", "클레임":"claim", "영수증":"receipt" };

function PhotoManager({category}){
  const [photos,setPhotos]=useState([]);
  const [uploading,setUploading]=useState(false);
  const [viewer,setViewer]=useState(null);
  const folder=PHOTO_CAT[category];

  const load=async()=>{
    const {data,error}=await supabase.storage.from("photos")
      .list(folder,{limit:200,sortBy:{column:"created_at",order:"desc"}});
    if(!error) setPhotos((data||[]).filter(f=>f.name!==".emptyFolderPlaceholder"));
  };
  useEffect(()=>{load();},[category]);

  const publicUrl=(name)=>supabase.storage.from("photos").getPublicUrl(`${folder}/${name}`).data.publicUrl;

  const onFile=async(e)=>{
    const files=[...e.target.files]; if(!files.length) return;
    setUploading(true);
    for(const f of files){
      const safe=f.name.replace(/[^\w.\-가-힣]/g,"_");
      const path=`${folder}/${Date.now()}_${safe}`;
      const {error}=await supabase.storage.from("photos").upload(path,f,{contentType:f.type});
      if(error) alert("업로드 실패: "+error.message);
    }
    setUploading(false); e.target.value=""; load();
  };

  const del=async(name)=>{
    if(!confirm("이 사진을 삭제할까요?")) return;
    await supabase.storage.from("photos").remove([`${folder}/${name}`]);
    load();
  };

  return (
    <div>
      <label style={{display:"block",background:C.s2,border:`2px dashed ${C.border}`,borderRadius:12,
        padding:24,textAlign:"center",cursor:"pointer",marginBottom:12}}>
        <input type="file" accept="image/*" multiple capture="environment" onChange={onFile} style={{display:"none"}}/>
        <div style={{fontSize:28,marginBottom:6}}>{uploading?"⏳":"📸"}</div>
        <div style={{fontSize:13,color:C.text2}}>{uploading?"업로드 중...":`${category} 사진 추가 (카메라/갤러리)`}</div>
      </label>

      {photos.length===0&&!uploading&&(
        <div style={{textAlign:"center",padding:20,fontSize:12,color:C.text3}}>아직 사진이 없어요</div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
        {photos.map(p=>(
          <div key={p.name} style={{position:"relative",aspectRatio:"1",borderRadius:10,overflow:"hidden",
            border:`1px solid ${C.border}`,background:C.s3}}>
            <img src={publicUrl(p.name)} alt={p.name} loading="lazy"
              onClick={()=>setViewer(p.name)}
              style={{width:"100%",height:"100%",objectFit:"cover",cursor:"pointer"}}/>
            <button onClick={()=>del(p.name)}
              style={{position:"absolute",top:4,right:4,width:22,height:22,borderRadius:"50%",
                background:"rgba(0,0,0,.6)",border:"none",color:"#fff",fontSize:11,cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          </div>
        ))}
      </div>

      {viewer&&<>
        <div onClick={()=>setViewer(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:300,
          display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
          <img src={publicUrl(viewer)} style={{maxWidth:"95%",maxHeight:"90%",borderRadius:8}}/>
          <div style={{position:"absolute",top:16,right:16,color:"#fff",fontSize:24}}>✕</div>
        </div>
      </>}
    </div>
  );
}

// ==================== 메인 앱 ====================
export default function App(){
  const [page,setPage]=useState("dash");
  if(!configOk){
    return (
      <div style={{background:"#101418",color:"#eef0f2",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Apple SD Gothic Neo',sans-serif"}}>
        <div style={{maxWidth:400,textAlign:"center"}}>
          <div style={{fontSize:40,marginBottom:16}}>🍱</div>
          <div style={{fontSize:18,fontWeight:700,marginBottom:12}}>Supabase 설정이 필요해요</div>
          <div style={{fontSize:13,color:"#8a9bb0",lineHeight:1.8}}>
            Vercel 환경변수에<br/>
            <code style={{color:"#ffb347"}}>VITE_SUPABASE_URL</code><br/>
            <code style={{color:"#ffb347"}}>VITE_SUPABASE_ANON_KEY</code><br/>
            를 추가한 뒤 Redeploy 해주세요.<br/><br/>
            자세한 방법은 README.md 참고
          </div>
        </div>
      </div>
    );
  }
  const [staff,setStaff]=useState(INIT_STAFF);
  const [schedule,setSchedule]=useState(INIT_SCHEDULE);
  const [sales,setSales]=useState(EXCEL_SALES);
  const [calDate,setCalDate]=useState(new Date(2026,6,1));
  const [salesModal,setSalesModal]=useState(null);
  const [overrides,setOverrides]=useState({});
  const [dayOverride,setDayOverride]=useState({});
  const [schedCalDate,setSchedCalDate]=useState(new Date(2026,6,1));
  const [schedModal,setSchedModal]=useState(null);
  const [cellModal,setCellModal]=useState(null);
  const [photoTab,setPhotoTab]=useState("매출");
  const [ready,setReady]=useState(false);

  useEffect(()=>{
    (async()=>{
      try{
        const [r,rs,rsc,rov,rdov]=await Promise.all([
          kvGet("dc5-sales"),kvGet("dc5-staff"),kvGet("dc5-sched"),kvGet("dc5-ov"),kvGet("dc5-dov")
        ]);
        if(r) setSales({...EXCEL_SALES,...r});
        if(rs) setStaff(rs);
        if(rsc) setSchedule(rsc);
        if(rov) setOverrides(rov);
        if(rdov) setDayOverride(rdov);
      }catch(e){console.error("로드 실패:",e);}
      setReady(true);
    })();
  },[]);

  const save=(k,v)=>{kvSet(k,v).catch(e=>console.error("저장 실패:",e));};

  const updateStaff=useCallback((id,updates)=>{
    setStaff(prev=>{
      const ns=prev.map(s=>s.id===id?{...s,...updates}:s);
      save("dc5-staff",ns);
      if(updates.days){
        setSchedule(prevSched=>{
          const nsc=JSON.parse(JSON.stringify(prevSched));
          POSITIONS.forEach(pos=>{
            DAYS_ALL.forEach(day=>{
              if(nsc[pos.key]?.[day]===id){
                const st=ns.find(x=>x.id===id);
                if(st&&!st.days.includes(day)) nsc[pos.key][day]=-1;
              }
            });
          });
          save("dc5-sched",nsc);
          return nsc;
        });
      }
      return ns;
    });
  },[]);

  const updateCell=(posKey,day,staffId)=>{
    setSchedule(prev=>{
      const ns={...prev,[posKey]:{...prev[posKey],[day]:staffId}};
      save("dc5-sched",ns);
      return ns;
    });
    setCellModal(null);
  };

  const updateDayCell=(dateKey,posKey,staffId)=>{
    setDayOverride(prev=>{
      const ns={...prev,[dateKey]:{...prev[dateKey],[posKey]:staffId}};
      save("dc5-dov",ns);
      return ns;
    });
  };

  const saveMemo=(dateKey,val)=>{
    setOverrides(prev=>{
      const ns={...prev,[dateKey]:val};
      save("dc5-ov",ns);
      return ns;
    });
  };

  const getDateSchedule=(dateKey)=>{
    const result={};
    const dt=new Date(dateKey.replace(/-/g,'/'));
    const dayName=DOW_KR[dt.getDay()];
    POSITIONS.forEach(pos=>{
      const baseId=schedule[pos.key]?.[dayName];
      const ovId=dayOverride[dateKey]?.[pos.key];
      result[pos.key]=ovId!==undefined?ovId:baseId;
    });
    return result;
  };

  // 자동정렬: 점심+저녁 연속 근무자를 상단 슬롯으로 (역할은 유동적, 슬롯 번호는 편의상)
  const autoArrange=()=>{
    const KL=["점심-주방1","점심-주방2"];
    const KD=["저녁-주방1","저녁-주방2","저녁-주방3"];
    const ns=JSON.parse(JSON.stringify(schedule));
    DAYS_ALL.forEach(day=>{
      const lunchIds=KL.map(k=>ns[k][day]).filter(id=>id!=null);
      const dinnerIds=KD.map(k=>ns[k][day]).filter(id=>id!=null);
      const valid=id=>id!=null&&id!==-1;
      const cont=lunchIds.filter(id=>valid(id)&&dinnerIds.includes(id));
      const lunchRest=lunchIds.filter(id=>!cont.includes(id));
      const dinnerRest=dinnerIds.filter(id=>!cont.includes(id));
      const newLunch=[...cont,...lunchRest].slice(0,KL.length);
      while(newLunch.length<KL.length)newLunch.push(-1);
      const newDinner=[...cont,...dinnerRest].slice(0,KD.length);
      while(newDinner.length<KD.length)newDinner.push(-1);
      KL.forEach((k,i)=>ns[k][day]=newLunch[i]);
      KD.forEach((k,i)=>ns[k][day]=newDinner[i]);
    });
    setSchedule(ns); save("dc5-sched",ns);
  };

  // 직원 추가 / 삭제
  const PALETTE=["#3dba7a","#4fc3f7","#b39ddb","#80cbc4","#ff8a65","#f06292","#ffd54f","#4dd0e1","#ce93d8","#a5d6a7","#ffb74d","#ef9a9a","#90caf9","#80deea","#e6ee9c","#bcaaa4"];
  const addStaff=()=>{
    const name=prompt("새 직원 이름을 입력하세요");
    if(!name) return;
    const usedColors=staff.map(s=>s.color);
    const color=PALETTE.find(c=>!usedColors.includes(c))||PALETTE[Math.floor(Math.random()*PALETTE.length)];
    const newId=Math.max(...staff.map(s=>s.id),0)+1;
    const ns=[...staff,{id:newId,name,role:"주방",position:"kitchen",wage:12000,type:"시급",insurance:"단기(3.3%)",days:[],lunchTime:"-",dinnerTime:"16:30–21:30",phone:"",contractFile:null,memo:"",color,weeklyHours:0}];
    setStaff(ns); save("dc5-staff",ns);
  };
  const removeStaff=(id)=>{
    if(!confirm("이 직원을 삭제할까요? 근무표에서도 제거됩니다.")) return;
    const ns=staff.filter(s=>s.id!==id);
    setStaff(ns); save("dc5-staff",ns);
    setSchedule(prev=>{
      const nsc=JSON.parse(JSON.stringify(prev));
      POSITIONS.forEach(pos=>DAYS_ALL.forEach(day=>{if(nsc[pos.key][day]===id)nsc[pos.key][day]=-1;}));
      save("dc5-sched",nsc);
      return nsc;
    });
  };

  const laborCost=staff.filter(s=>s.type!=="사장").reduce((sum,s)=>sum+calcPay(s).gross/10000,0);

  const monthStats=(y,m)=>{
    let total=0,cnt=0;
    Object.keys(sales).filter(k=>k.startsWith(`${y}-${m+1}-`)).forEach(k=>{
      const d=sales[k],t=(d.hall||0)+(d.baemin||0)+(d.coupang||0);
      if(t>0){total+=t;cnt++;}
    });
    const net=(total*0.65)-FIXED_TOTAL-laborCost;
    return {total,cnt,avg:cnt?total/cnt:0,net};
  };
  const st=monthStats(calDate.getFullYear(),calDate.getMonth());

  const saveSalesData=(form)=>{
    const key=`${calDate.getFullYear()}-${calDate.getMonth()+1}-${salesModal}`;
    const ns={...sales,[key]:{hall:parseFloat(form.hall)||0,baemin:parseFloat(form.baemin)||0,coupang:parseFloat(form.coupang)||0}};
    setSales(ns); save("dc5-sales",ns); setSalesModal(null);
  };

  const exportData=()=>{
    const data={staff,schedule,sales,overrides,dayOverride,exportedAt:new Date().toISOString()};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url; a.download=`donkachun_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const today=new Date();
  const todayKey=`${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`;
  const todaySd=sales[todayKey];

  const chartData=(()=>{
    const y=calDate.getFullYear(),m=calDate.getMonth(),last=new Date(y,m+1,0).getDate();
    return Array.from({length:last},(_,i)=>i+1).map(d=>{
      const sd=sales[`${y}-${m+1}-${d}`];
      if(!sd) return null;
      const t=(sd.hall||0)+(sd.baemin||0)+(sd.coupang||0);
      return t>0?{name:`${d}`,홀:sd.hall||0,배민:sd.baemin||0,쿠팡:sd.coupang||0,합계:t}:null;
    }).filter(Boolean);
  })();

  // ── 근무표 그리드 (인라인) ──
  const renderScheduleGrid=()=>{
    const SECTIONS=[
      {label:"점심",icon:"🌞",time:"10:00–15:00",color:C.accent2,rows:["점심-주방1","점심-주방2","점심-홀"]},
      {label:"저녁",icon:"🌆",time:"16:30–21:30",color:C.blue,rows:["저녁-주방1","저녁-주방2","저녁-주방3","저녁-홀"]},
    ];
    const ROW_LABEL={"점심-주방1":"주방①","점심-주방2":"주방②","점심-홀":"홀","저녁-주방1":"주방①","저녁-주방2":"주방②","저녁-주방3":"주방③","저녁-홀":"홀"};
    const LD={"점심-주방1":"저녁-주방1","점심-주방2":"저녁-주방2","점심-홀":"저녁-홀"};
    const H=34,GAP=2;

    const getHSpans=(rowKey)=>{
      const arr=DAYS_ALL.map(d=>byId(staff,schedule[rowKey]?.[d]));
      const spans=[]; let i=0;
      while(i<arr.length){
        const s=arr[i];
        if(!s){spans.push({s:null,start:i,count:1});i++;continue;}
        let j=i+1;
        while(j<arr.length&&arr[j]?.id===s.id) j++;
        spans.push({s,start:i,count:j-i}); i=j;
      }
      return spans;
    };
    const isVS=(lk,di)=>{
      const dk=LD[lk]; if(!dk) return false;
      const a=byId(staff,schedule[lk]?.[DAYS_ALL[di]]),b=byId(staff,schedule[dk]?.[DAYS_ALL[di]]);
      return a&&b&&a.id===b.id;
    };
    const isVSkip=(rk,di)=>{
      const pair=Object.entries(LD).find(([l,d])=>d===rk);
      return pair?isVS(pair[0],di):false;
    };

    return (
      <div style={{overflowX:"auto"}}>
        <div style={{minWidth:320}}>
          <div style={{fontSize:10,color:C.text3,marginBottom:6}}>셀 탭 → 고정 스케줄 근무자 변경</div>
          <div style={{display:"flex",paddingLeft:38,gap:GAP,marginBottom:4}}>
            {DAYS_ALL.map(d=>(
              <div key={d} style={{flex:1,textAlign:"center",fontSize:11,fontWeight:700,padding:"3px 0",
                color:d==="토"?C.blue:d==="일"?"#f05c5c":C.text2,
                background:(d==="토"||d==="일")?"#4a9eff15":"transparent",borderRadius:5}}>{d}</div>
            ))}
          </div>
          {SECTIONS.map(sec=>(
            <div key={sec.label} style={{marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",
                background:`${sec.color}18`,border:`1px solid ${sec.color}40`,borderRadius:8,marginBottom:3}}>
                <span>{sec.icon}</span>
                <span style={{fontSize:12,fontWeight:700,color:sec.color}}>{sec.label}</span>
                <span style={{fontSize:10,color:C.text2}}>{sec.time}</span>
              </div>
              {sec.rows.map(rowKey=>{
                const spans=getHSpans(rowKey);
                return (
                  <div key={rowKey} style={{display:"flex",gap:GAP,paddingLeft:38,position:"relative",marginBottom:GAP}}>
                    <div style={{position:"absolute",left:0,top:0,bottom:0,width:36,display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:4}}>
                      <span style={{fontSize:9,color:C.text3,fontWeight:600}}>{ROW_LABEL[rowKey]}</span>
                    </div>
                    {spans.map((sp,si)=>{
                      const {s,start,count}=sp;
                      const vspan=s&&LD[rowKey]&&isVS(rowKey,start);
                      const vskip=s&&isVSkip(rowKey,start);
                      const col=s?s.color:"#333";
                      if(vskip) return <div key={si} style={{flex:count,height:H}}/>;
                      return (
                        <div key={si} onClick={()=>setCellModal({posKey:rowKey,day:DAYS_ALL[start],staffId:s?.id??-1})}
                          style={{flex:count,height:vspan?H*2+GAP:H,
                            background:s?col+"28":"#1e2228",
                            borderLeft:s?`3px solid ${col}`:`1px dashed #333`,
                            borderRadius:vspan?"6px 6px 0 0":6,
                            display:"flex",alignItems:"center",justifyContent:"center",
                            cursor:"pointer",position:"relative",
                            ...(vspan?{zIndex:2}:{})}}>
                          {s
                            ?<span style={{fontSize:9,fontWeight:700,color:col,textAlign:"center",padding:"0 2px",lineHeight:1.3}}>{s.name}</span>
                            :<span style={{fontSize:9,color:"#444"}}>공석</span>}
                          {vspan&&<div style={{position:"absolute",left:4,right:0,top:"50%",height:1,background:`${col}30`}}/>}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
          <div style={{paddingLeft:38,marginTop:8,display:"flex",flexWrap:"wrap",gap:6}}>
            {staff.map(s=>(
              <div key={s.id} style={{display:"flex",alignItems:"center",gap:3,fontSize:10}}>
                <div style={{width:8,height:8,borderRadius:2,background:s.color}}/>
                <span style={{color:s.color}}>{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── 근태 캘린더 (인라인) ──
  const renderSchedCalendar=()=>{
    const y=schedCalDate.getFullYear(),m=schedCalDate.getMonth();
    const first=new Date(y,m,1).getDay(),last=new Date(y,m+1,0).getDate();
    const cells=[];
    for(let i=0;i<first;i++) cells.push(<div key={`e${i}`}/>);
    for(let d=1;d<=last;d++){
      const dateKey=`${y}-${m+1}-${d}`;
      const dow=new Date(y,m,d).getDay();
      const hasChange=overrides[dateKey]||dayOverride[dateKey];
      const isToday=y===today.getFullYear()&&m===today.getMonth()&&d===today.getDate();
      const ds=getDateSchedule(dateKey);
      const ids=[...new Set(Object.values(ds).filter(id=>id!=null&&id!==-1))];
      const workers=ids.map(id=>byId(staff,id)).filter(Boolean);
      cells.push(
        <div key={d} onClick={()=>setSchedModal({day:d,dateKey,y,m})}
          style={{background:isToday?"#1c1400":C.s2,
            border:`1px solid ${isToday?C.accent:hasChange?C.accent2:C.border}`,
            borderRadius:8,padding:"4px 3px",minHeight:58,cursor:"pointer"}}>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:10,color:dow===0?"#f05c5c":dow===6?C.blue:C.text2,fontWeight:isToday?700:400}}>{d}</span>
            {hasChange&&<span style={{fontSize:11,color:C.accent2,fontWeight:700}}>!</span>}
          </div>
          {workers.slice(0,3).map(w=>(
            <div key={w.id} style={{fontSize:7,color:w.color,fontWeight:600,lineHeight:1.4}}>{w.name}</div>
          ))}
          {workers.length>3&&<div style={{fontSize:7,color:C.text3}}>+{workers.length-3}</div>}
        </div>
      );
    }
    return (
      <div style={{marginTop:20}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <button onClick={()=>setSchedCalDate(new Date(y,m-1,1))}
            style={{background:C.s2,border:`1px solid ${C.border}`,color:C.text,padding:"5px 10px",borderRadius:8,cursor:"pointer"}}>‹</button>
          <div style={{fontSize:14,fontWeight:700}}>{y}년 {m+1}월 근태</div>
          <button onClick={()=>setSchedCalDate(new Date(y,m+1,1))}
            style={{background:C.s2,border:`1px solid ${C.border}`,color:C.text,padding:"5px 10px",borderRadius:8,cursor:"pointer"}}>›</button>
        </div>
        <div style={{fontSize:10,color:C.text3,marginBottom:6}}>날짜 탭 → 근무자 확인·변동 지정 · <span style={{color:C.accent2}}>!</span> 변동</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:2}}>
          {["일","월","화","수","목","금","토"].map((d,i)=>(
            <div key={d} style={{textAlign:"center",fontSize:10,fontWeight:600,padding:"3px 0",color:i===0?"#f05c5c":i===6?C.blue:C.text3}}>{d}</div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>{cells}</div>
      </div>
    );
  };

  const NAV=[{id:"dash",icon:"📊",label:"홈"},{id:"sales",icon:"💰",label:"매출"},
    {id:"schedule",icon:"📅",label:"근무표"},{id:"staff",icon:"👥",label:"직원"},
    {id:"fixed",icon:"🧾",label:"고정비"},{id:"photo",icon:"📷",label:"사진"}];

  return (
    <div style={{background:C.bg,color:C.text,minHeight:"100vh",fontFamily:"'Apple SD Gothic Neo','Noto Sans KR',sans-serif",maxWidth:480,margin:"0 auto",paddingBottom:72}}>
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"13px 16px 10px",position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:16,fontWeight:800}}>🍱 돈카춘 광주고산점</div>
            <div style={{fontSize:11,color:C.text2}}>{today.getFullYear()}.{String(today.getMonth()+1).padStart(2,"0")}.{String(today.getDate()).padStart(2,"0")} {DOW_KR[today.getDay()]}요일</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:10,color:C.text3}}>이번달 예상수입</div>
            <div style={{fontSize:15,fontWeight:700,color:st.net>=0?C.green:C.red}}>{st.net.toFixed(0)}만원</div>
          </div>
        </div>
      </div>

      <div style={{padding:16}}>
        {page==="dash"&&<>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            {[["이번달 총매출",st.total.toFixed(1)+"만원",C.accent],["일 평균",st.avg.toFixed(1)+"만원",C.text],
              ["사장 예상수입",st.net.toFixed(1)+"만원",st.net>=0?C.green:C.red],["고정+인건비",(FIXED_TOTAL+laborCost).toFixed(0)+"만원",C.text2],
            ].map(([l,v,c])=>(
              <div key={l} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:12}}>
                <div style={{fontSize:10,color:C.text2,marginBottom:3}}>{l}</div>
                <div style={{fontSize:15,fontWeight:700,color:c}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:14,marginBottom:12}}>
            <div style={{fontSize:11,color:C.text2,marginBottom:6}}>수입 계산식</div>
            <div style={{fontSize:12,color:C.text3,lineHeight:2}}>
              (월총매출 × 0.65) − 고정비 − 인건비<br/>
              = ({st.total.toFixed(1)} × 0.65) − {FIXED_TOTAL.toFixed(1)} − {laborCost.toFixed(1)}<br/>
              <span style={{color:st.net>=0?C.green:C.red,fontWeight:700,fontSize:15}}>= {st.net.toFixed(1)} 만원</span>
            </div>
          </div>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:14,marginBottom:12}}>
            <div style={{fontSize:12,color:C.text2,marginBottom:10}}>오늘 매출</div>
            <div style={{display:"flex",marginBottom:12}}>
              {[["홀",todaySd?.hall,C.blue],["배민",todaySd?.baemin,C.green],["쿠팡",todaySd?.coupang,C.accent2]].map(([l,v,c],i)=>(
                <div key={l} style={{flex:1,textAlign:"center",borderRight:i<2?`1px solid ${C.border}`:"none"}}>
                  <div style={{fontSize:10,color:c,marginBottom:2}}>{l}</div>
                  <div style={{fontSize:18,fontWeight:700}}>{v>0?v+"만":"—"}</div>
                </div>
              ))}
            </div>
            <button onClick={()=>{setPage("sales");setSalesModal(today.getDate());setCalDate(new Date(today.getFullYear(),today.getMonth(),1));}}
              style={{width:"100%",padding:12,background:C.accent,color:"white",border:"none",borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer"}}>오늘 매출 입력</button>
          </div>
          <button onClick={exportData}
            style={{width:"100%",padding:11,background:C.s2,color:C.text2,border:`1px solid ${C.border}`,borderRadius:10,fontSize:12,cursor:"pointer"}}>
            💾 전체 데이터 백업 (JSON 다운로드)
          </button>
        </>}

        {page==="sales"&&<>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <button onClick={()=>setCalDate(new Date(calDate.getFullYear(),calDate.getMonth()-1,1))}
              style={{background:C.s2,border:`1px solid ${C.border}`,color:C.text,padding:"6px 12px",borderRadius:8,cursor:"pointer",fontSize:16}}>‹</button>
            <div style={{fontSize:17,fontWeight:700}}>{calDate.getFullYear()}년 {calDate.getMonth()+1}월</div>
            <button onClick={()=>setCalDate(new Date(calDate.getFullYear(),calDate.getMonth()+1,1))}
              style={{background:C.s2,border:`1px solid ${C.border}`,color:C.text,padding:"6px 12px",borderRadius:8,cursor:"pointer",fontSize:16}}>›</button>
          </div>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:14,marginBottom:12}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:8}}>
              {[["총매출",st.total.toFixed(1)+"만",C.accent],["일평균",st.avg.toFixed(1)+"만",C.text],["예상수입",st.net.toFixed(1)+"만",st.net>=0?C.green:C.red]].map(([l,v,c])=>(
                <div key={l} style={{textAlign:"center"}}>
                  <div style={{fontSize:10,color:C.text2}}>{l}</div>
                  <div style={{fontSize:14,fontWeight:700,color:c}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:10,color:C.text3,borderTop:`1px solid ${C.border}`,paddingTop:8}}>
              (총매출 × 0.65) − 고정비({FIXED_TOTAL.toFixed(0)}만) − 인건비({laborCost.toFixed(0)}만)
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:2}}>
            {["일","월","화","수","목","금","토"].map((d,i)=>(
              <div key={d} style={{textAlign:"center",fontSize:10,fontWeight:600,padding:"3px 0",color:i===0?"#f05c5c":i===6?C.blue:C.text3}}>{d}</div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:14}}>
            {(()=>{
              const y=calDate.getFullYear(),m=calDate.getMonth();
              const first=new Date(y,m,1).getDay(),last=new Date(y,m+1,0).getDate();
              const cells=[];
              for(let i=0;i<first;i++) cells.push(<div key={`e${i}`}/>);
              for(let d=1;d<=last;d++){
                const dow=(first+d-1)%7;
                const sd=sales[`${y}-${m+1}-${d}`];
                const total=sd?(sd.hall||0)+(sd.baemin||0)+(sd.coupang||0):0;
                const isToday=y===today.getFullYear()&&m===today.getMonth()&&d===today.getDate();
                cells.push(
                  <div key={d} onClick={()=>setSalesModal(d)} style={{
                    background:isToday?"#2a1a0f":C.s2,border:`1px solid ${isToday?C.accent:C.border}`,
                    borderRadius:8,padding:"4px 3px",minHeight:62,cursor:"pointer"}}>
                    <div style={{fontSize:10,color:dow===0?"#f05c5c":dow===6?C.blue:C.text2,fontWeight:isToday?700:400,marginBottom:2}}>{d}</div>
                    {sd&&total>0&&<>
                      <div style={{height:3,background:C.blue,borderRadius:2,marginBottom:1,width:`${Math.min(100,(sd.hall||0)/1.5)}%`,minWidth:(sd.hall||0)>0?3:0}}/>
                      <div style={{height:3,background:C.green,borderRadius:2,marginBottom:1,width:`${Math.min(100,(sd.baemin||0)/1.5)}%`,minWidth:(sd.baemin||0)>0?3:0}}/>
                      <div style={{height:3,background:C.accent2,borderRadius:2,marginBottom:2,width:`${Math.min(100,(sd.coupang||0)/1.5)}%`,minWidth:(sd.coupang||0)>0?3:0}}/>
                      <div style={{fontSize:8,color:C.accent2,fontWeight:700}}>{total.toFixed(0)}만</div>
                    </>}
                  </div>
                );
              }
              return cells;
            })()}
          </div>
          {chartData.length>0&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:14}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>홀 · 배민 · 쿠팡이츠 · 합계</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{top:5,right:8,left:-22,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                <XAxis dataKey="name" tick={{fontSize:9,fill:C.text3}} tickLine={false}/>
                <YAxis tick={{fontSize:9,fill:C.text3}} tickLine={false} axisLine={false}/>
                <Tooltip contentStyle={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,fontSize:11}}
                  labelStyle={{color:C.text}} formatter={(v,n)=>[v.toFixed(1)+"만",n]}/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:10,paddingTop:8}}/>
                <Line type="monotone" dataKey="홀" stroke={C.blue} strokeWidth={2} dot={{r:2}} activeDot={{r:4}}/>
                <Line type="monotone" dataKey="배민" stroke="#f05c5c" strokeWidth={2} dot={{r:2}} activeDot={{r:4}}/>
                <Line type="monotone" dataKey="쿠팡" stroke={C.accent2} strokeWidth={2} dot={{r:2}} activeDot={{r:4}}/>
                <Line type="monotone" dataKey="합계" stroke={C.green} strokeWidth={2.5} dot={{r:2}} activeDot={{r:4}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>}
        </>}

        {page==="schedule"&&<>
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:18,fontWeight:700}}>주간 근무표</div>
                <div style={{fontSize:11,color:C.text2,marginTop:2}}>주방①②③은 편의상 슬롯 번호 · 역할은 유동적</div>
              </div>
              <button onClick={autoArrange}
                style={{background:C.s2,border:`1px solid ${C.accent}`,color:C.accent,borderRadius:10,padding:"8px 12px",fontSize:11,fontWeight:600,cursor:"pointer",flexShrink:0}}>
                ↕ 자동정렬
              </button>
            </div>
            <div style={{fontSize:10,color:C.text3,marginTop:4}}>자동정렬: 점심~저녁 연속 근무자를 상단 슬롯으로 이동</div>
          </div>
          {renderScheduleGrid()}
          {renderSchedCalendar()}
        </>}

        {page==="staff"&&<>
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:18,fontWeight:700}}>직원 관리</div>
                <div style={{fontSize:11,color:C.text2,marginTop:2}}>근무일 변경 → 근무표 자동 반영</div>
              </div>
              <button onClick={addStaff}
                style={{background:C.accent,border:"none",color:"white",borderRadius:10,padding:"9px 14px",fontSize:12,fontWeight:600,cursor:"pointer",flexShrink:0}}>
                + 직원 추가
              </button>
            </div>
          </div>
          {staff.map(s=><StaffCard key={s.id} s={s} updateStaff={updateStaff} removeStaff={removeStaff}/>)}
        </>}

        {page==="fixed"&&<>
          <div style={{marginBottom:12}}><div style={{fontSize:18,fontWeight:700}}>월 고정비용</div></div>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:16,marginBottom:12}}>
            <div style={{fontSize:11,color:C.text2,marginBottom:4}}>고정비 합계</div>
            <div style={{fontSize:26,fontWeight:800,color:C.red}}>{FIXED_TOTAL.toFixed(1)}<span style={{fontSize:14,fontWeight:400}}>만원</span></div>
            <div style={{fontSize:11,color:C.text3,marginTop:4}}>인건비 {laborCost.toFixed(1)}만 · 총 {(FIXED_TOTAL+laborCost).toFixed(1)}만원</div>
          </div>
          {FIXED_COSTS.map(({label,amount})=>(
            <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"10px 14px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,marginBottom:6}}>
              <span style={{fontSize:13,color:C.text2}}>{label}</span>
              <span style={{fontSize:14,fontWeight:600}}>{amount.toFixed(1)}<span style={{fontSize:11,color:C.text3}}>만</span></span>
            </div>
          ))}
        </>}

        {page==="photo"&&<>
          <div style={{marginBottom:12}}><div style={{fontSize:18,fontWeight:700}}>사진 보관함</div></div>
          <div style={{display:"flex",gap:6,marginBottom:12}}>
            {["매출","클레임","영수증"].map(t=>(
              <button key={t} onClick={()=>setPhotoTab(t)}
                style={{flex:1,padding:9,borderRadius:10,fontSize:12,cursor:"pointer",
                  border:`1px solid ${photoTab===t?C.accent:C.border}`,
                  background:photoTab===t?C.accent:C.s2,color:photoTab===t?"white":C.text2}}>
                {t==="매출"?"📈 매출":t==="클레임"?"⚠️ 클레임":"🧾 영수증"}
              </button>
            ))}
          </div>
          <PhotoManager category={photoTab}/>
        </>}
      </div>

      <SalesModal modal={salesModal} calDate={calDate} sales={sales} onSave={saveSalesData} onClose={()=>setSalesModal(null)}/>
      <CellEditModal modal={cellModal} staff={staff} onSelect={(id)=>updateCell(cellModal.posKey,cellModal.day,id)} onClose={()=>setCellModal(null)}/>
      <SchedDayModal modal={schedModal} staff={staff} getDateSchedule={getDateSchedule} dayOverride={dayOverride}
        onCellChange={updateDayCell} overrides={overrides} onSaveMemo={saveMemo} onClose={()=>setSchedModal(null)}/>

      <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,
        background:C.surface,borderTop:`1px solid ${C.border}`,display:"flex",zIndex:50}}>
        {NAV.map(({id,icon,label})=>(
          <button key={id} onClick={()=>setPage(id)}
            style={{flex:1,padding:"10px 2px 8px",background:"none",border:"none",
              color:page===id?C.accent:C.text2,cursor:"pointer",fontSize:10,textAlign:"center",
              borderTop:page===id?`2px solid ${C.accent}`:"2px solid transparent"}}>
            <div style={{fontSize:19,marginBottom:2}}>{icon}</div>{label}
          </button>
        ))}
      </nav>

      {!ready&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}>
        <div style={{color:"white",fontSize:14}}>데이터 동기화 중...</div>
      </div>}
    </div>
  );
}
