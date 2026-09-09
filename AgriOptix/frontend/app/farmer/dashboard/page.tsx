"use client";
import {useEffect, useState} from "react";
import {Leaf, LayoutDashboard, Sprout, Route, Truck, Wallet, Brain, Mic, Upload, CheckCircle2, ArrowRight, ShieldCheck} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Buyer = {name:string;price:number;distance_km:number;transport:number;loss:number;demand:string;quality:string;delivery:string;reliability:number;net_per_kg?:number};

export default function Home(){
 const [data,setData]=useState<any>(null), [buyers,setBuyers]=useState<Buyer[]>([]), [tab,setTab]=useState("dashboard");
 const [loading,setLoading]=useState(false), [accepted,setAccepted]=useState(false), [status,setStatus]=useState("PLANNED");

 async function loadDemo(){
   setLoading(true);
   const [h,b,o,k]=await Promise.all([
     fetch(API+"/api/harvests").then(r=>r.json()),
     fetch(API+"/api/buyers").then(r=>r.json()),
     fetch(API+"/api/optimization/run",{method:"POST"}).then(r=>r.json()),
     fetch(API+"/api/operations/kpis").then(r=>r.json())
   ]);
   setData({harvest:h[0],opt:o,kpis:k}); setBuyers(b); setLoading(false);
 }
 useEffect(()=>{loadDemo()},[]);

 async function accept(){
   await fetch(API+"/api/orders",{method:"POST"});
   setAccepted(true); setStatus("PICKUP_ASSIGNED");
 }
 async function advance(){
   const next:any={PICKUP_ASSIGNED:"PICKED_UP",PICKED_UP:"IN_TRANSIT",IN_TRANSIT:"DELIVERED",DELIVERED:"VERIFIED",VERIFIED:"SETTLED"};
   const s=next[status]; if(!s)return;
   await fetch(API+"/api/orders/1/status",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:s})});
   setStatus(s);
 }
 const opt=data?.opt;

 return <div className="shell">
  <aside className="sidebar">
   <div className="brand"><div className="brandmark"><Leaf size={21}/></div><div><b>AgriOptix</b><small>Farm-to-market intelligence</small></div></div>
   <nav>{[
    ["dashboard","Overview",LayoutDashboard],["harvest","My Harvest",Sprout],["markets","Markets",Route],
    ["execution","Execution",Truck],["settlement","Settlement",Wallet],["learning","Learning",Brain]
   ].map(([id,label,I]:any)=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}><I size={18}/>{label}</button>)}</nav>
   <div className="demo-note"><ShieldCheck size={17}/><div><b>DEMO MODE</b><span>Simulated intelligence is clearly labelled.</span></div></div>
  </aside>

  <main>
   <header><div><span className="eyebrow">AI-POWERED FARM COMMERCE</span><h1>{tab==="dashboard"?"What should you do with this harvest?":tab.replace("_"," ").replace(/^\w/,c=>c.toUpperCase())}</h1></div><button className="voice"><Mic size={18}/> Ask AgriOptix</button></header>

   {tab==="dashboard" && <section className="content">
    <div className="hero-grid">
      <div className="card harvest-card">
       <div className="card-head"><span>Your harvest</span><span className="pill green">Ready</span></div>
       <div className="crop"><div className="crop-icon">🍅</div><div><h2>{data?.harvest?.crop||"Tomato"}</h2><b>{data?.harvest?.quantity_kg||1550} kg</b><span>Grade A · 92% confidence</span></div></div>
       <div className="stats"><div><small>Remaining shelf life</small><strong>3.2 days</strong></div><div><small>Urgency</small><strong className="danger">HIGH</strong></div></div>
       <div className="quality"><CheckCircle2/> AI quality: Good color · Uniform appearance · Low visible defects</div>
      </div>
      <div className="card recommendation">
       <div className="card-head"><span>Recommended selling plan</span><span className="pill">OPTIMIZED</span></div>
       <h2>{opt?.selected_buyer||"Buyer B"}</h2>
       <div className="plan-row"><b>{opt?.quantity_kg||1550} kg</b><span>•</span><span>2 × 1-ton vehicles</span></div>
       <div className="route"><span>Farm</span><ArrowRight size={16}/><span>Aggregation</span><ArrowRight size={16}/><span>Buyer B</span></div>
       <div className="net"><small>Expected net realized return</small><strong>₹{(opt?.net_realized_return||34300).toLocaleString("en-IN")}</strong></div>
       <button className="primary" onClick={accept} disabled={accepted}>{accepted?"Plan Accepted ✓":"Accept Plan"}</button>
      </div>
    </div>

    <div className="section-title"><div><span className="eyebrow">DECISION ENGINE</span><h2>Market intelligence</h2></div><button className="ghost" onClick={loadDemo}>{loading?"Optimizing…":"Run optimization ↗"}</button></div>
    <div className="buyers">{buyers.map((b,i)=><div className={"card buyer "+(b.name==="Buyer B"?"selected":"")} key={b.name}>
      <div className="buyer-top"><div><b>{b.name}</b><span>{b.demand} demand · {b.quality}</span></div>{b.name==="Buyer B"&&<span className="pill green">Recommended</span>}</div>
      <div className="price">₹{b.price}<small>/kg quoted</small></div>
      <div className="buyer-grid"><span>{b.distance_km} km</span><span>₹{b.transport}/kg transport</span><span>{b.loss}/kg value loss</span><span>{b.reliability}% reliable</span></div>
      <div className="realized"><small>Expected realized</small><b>₹{(b.net_per_kg ?? (b.price-b.transport-b.loss)).toFixed(1)}/kg</b></div>
    </div>)}</div>

    <div className="why card">
      <div><span className="eyebrow">EXPLAINABILITY</span><h2>Why this plan?</h2><p>Highest quoted price ≠ highest realized value.</p></div>
      <div className="why-list">{(opt?.why||["Better quality-price fit","Lower transport cost","Vehicle capacity feasible","Delivery within shelf-life window","Lower expected value loss"]).map((x:string)=><span key={x}><CheckCircle2 size={17}/>{x}</span>)}</div>
      <div className="rejected"><b>Why not Buyer A?</b> Higher quote, but longer transport, higher logistics cost and higher expected value loss.</div>
    </div>
   </section>}

   {tab==="harvest" && <section className="content"><div className="card form-card"><span className="eyebrow">HARVEST INPUT</span><h2>Add harvested produce</h2><label>Crop<input defaultValue="Tomato"/></label><label>Quantity (kg)<input defaultValue="1550" type="number"/></label><label>Harvest date/time<input type="datetime-local"/></label><label>Location<input defaultValue="Hyderabad, Telangana"/></label><div className="upload"><Upload/><b>Upload produce image</b><span>JPG / PNG · demo CV pipeline</span></div><button className="primary">Analyze Harvest</button></div></section>}

   {tab==="markets" && <section className="content"><div className="section-title"><div><span className="eyebrow">MARKET MATCHING</span><h2>Available buyers</h2></div></div><div className="buyers">{buyers.map(b=><div className="card buyer" key={b.name}><div className="buyer-top"><b>{b.name}</b><span>{b.delivery}</span></div><div className="price">₹{b.price}<small>/kg</small></div><div className="buyer-grid"><span>{b.distance_km} km</span><span>{b.demand} demand</span><span>Grade {b.quality}</span><span>{b.reliability}% reliable</span></div></div>)}</div></section>}

   {tab==="execution" && <section className="content"><div className="card execution-card"><span className="eyebrow">ORDER EXECUTION</span><h2>Farm → Aggregation → Buyer</h2><div className="timeline">{["PLANNED","PICKUP_ASSIGNED","PICKED_UP","IN_TRANSIT","DELIVERED","VERIFIED","SETTLED"].map((s,i)=><div className={status===s?"step current":i<["PLANNED","PICKUP_ASSIGNED","PICKED_UP","IN_TRANSIT","DELIVERED","VERIFIED","SETTLED"].indexOf(status)?"step done":"step"} key={s}><i>{i+1}</i><span>{s.replaceAll("_"," ")}</span></div>)}</div><button className="primary" onClick={advance} disabled={!accepted||status==="SETTLED"}>{status==="SETTLED"?"Completed":"Advance order"}</button></div></section>}

   {tab==="settlement" && <section className="content"><div className="card settlement"><span className="eyebrow">DIGITAL SETTLEMENT LEDGER</span><h2>Settlement {status==="SETTLED"?"Completed":"Pending"}</h2><div className="ledger"><span>Sale value</span><b>₹40,300</b><span>Logistics cost</span><b>− ₹4,200</b><span>Handling</span><b>− ₹700</b><hr/><span>Net settlement</span><strong>₹35,400</strong></div></div></section>}

   {tab==="learning" && <section className="content"><div className="card learning"><span className="eyebrow">CONTINUOUS LEARNING</span><h2>Predicted → Actual → Error → Learning</h2><div className="learning-grid"><div><b>Predicted price</b><strong>₹26/kg</strong></div><div><b>Actual price</b><strong>₹26.4/kg</strong></div><div><b>Prediction error</b><strong>₹0.4/kg</strong></div><div><b>Next model action</b><strong>Recalibrate</strong></div></div><p>Every completed transaction feeds actual price, quality, shelf-life, transport and delivery outcomes back into the learning layer.</p></div></section>}
  </main>
 </div>
}
