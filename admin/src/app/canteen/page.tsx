'use client';
import { useEffect,useState } from 'react';
const base=process.env.NEXT_PUBLIC_API_URL||'http://localhost:3000';
type Product={_id:string;name:string;price:number;stock:number;category:string};
export default function CanteenPage(){
 const [products,setProducts]=useState<Product[]>([]),[shift,setShift]=useState<any>(null),[cart,setCart]=useState<Record<string,number>>({});
 const [name,setName]=useState(''),[price,setPrice]=useState(''),[stock,setStock]=useState('');
 const [cash,setCash]=useState('0'),[payment,setPayment]=useState<'CASH'|'TRANSFER'>('CASH');
 const [msg,setMsg]=useState('');
 const token=()=>typeof window==='undefined'?'':localStorage.getItem('access_token')||'';
 async function req(path:string,method='GET',body?:any){
  const res=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token()},body:body?JSON.stringify(body):undefined});
  const json=await res.json().catch(()=>({}));if(!res.ok)throw Error(Array.isArray(json.message)?json.message.join(', '):(json.message||'HTTP '+res.status));return json;
 }
 async function refresh(){try{const [p,s]=await Promise.all([req('/canteen/products'),req('/canteen/shifts/current')]);setProducts(p);setShift(s);}catch(e:any){setMsg(e.message)}}
 useEffect(()=>{void refresh()},[]);
 async function action(f:()=>Promise<any>){try{await f();setMsg('Thao tác thành công');await refresh()}catch(e:any){setMsg('Lỗi: '+e.message)}}
 const total=products.reduce((a,p)=>a+p.price*(cart[p._id]||0),0);
 return <div className="p-6 space-y-6 text-slate-100"><h1 className="text-3xl font-bold">E06 · Căn tin / POS</h1><p className="text-slate-400">Bán hàng, quản lý tồn kho và ca thu ngân — dữ liệu thật từ MongoDB.</p>
 {msg&&<div className="rounded-lg bg-slate-800 p-3">{msg}</div>}
 <section className="p-4 rounded-xl bg-slate-900 space-y-3"><h2 className="text-xl font-semibold">Ca thu ngân</h2><p>{shift?'Đang mở: '+shift._id:'Chưa mở ca'}</p>
 <input className="bg-slate-800 rounded p-2" type="number" min="0" value={cash} onChange={e=>setCash(e.target.value)} aria-label="Tiền đầu hoặc cuối ca"/>
 {shift?<button className="ml-3 bg-rose-700 p-2 rounded" onClick={()=>action(()=>req('/canteen/shifts/'+shift._id+'/close','POST',{closingCash:Number(cash)}))}>Chốt ca</button>
 :<button className="ml-3 bg-emerald-700 p-2 rounded" onClick={()=>action(()=>req('/canteen/shifts/open','POST',{openingCash:Number(cash)}))}>Mở ca</button>}</section>
 <section className="p-4 rounded-xl bg-slate-900 space-y-3"><h2 className="text-xl font-semibold">Sản phẩm</h2>
 <div className="flex flex-wrap gap-2">{products.map(p=><div key={p._id} className="border border-slate-700 rounded p-3 min-w-48"><b>{p.name}</b><p>{p.price.toLocaleString('vi-VN')} đ · Tồn {p.stock}</p><input aria-label={'Số lượng '+p.name} className="bg-slate-800 rounded p-2 w-20" type="number" min="0" max={p.stock} value={cart[p._id]||0} onChange={e=>setCart(v=>({...v,[p._id]:Math.max(0,Math.min(p.stock,Number(e.target.value)||0))}))}/></div>)}</div>
 <p className="text-xl">Tổng cộng: <b>{total.toLocaleString('vi-VN')} đ</b></p>
 <select className="bg-slate-800 rounded p-2" value={payment} onChange={e=>setPayment(e.target.value as any)}><option value="CASH">Tiền mặt</option><option value="TRANSFER">Chuyển khoản (xác nhận thủ công)</option></select>
 <button disabled={!shift||!total} className="ml-3 p-2 bg-cyan-700 disabled:opacity-40 rounded" onClick={()=>action(async()=>{await req('/canteen/orders','POST',{paymentMethod:payment,items:Object.entries(cart).filter(([_,q])=>q>0).map(([productId,quantity])=>({productId,quantity}))});setCart({})})}>Thanh toán POS</button></section>
 <section className="p-4 rounded-xl bg-slate-900 space-y-3"><h2 className="text-xl font-semibold">Thêm sản phẩm (OWNER / ADMIN)</h2><div className="flex flex-wrap gap-2"><input className="bg-slate-800 rounded p-2" placeholder="Tên sản phẩm" value={name} onChange={e=>setName(e.target.value)}/><input className="bg-slate-800 rounded p-2" placeholder="Giá" type="number" value={price} onChange={e=>setPrice(e.target.value)}/><input className="bg-slate-800 rounded p-2" placeholder="Số lượng tồn" type="number" value={stock} onChange={e=>setStock(e.target.value)}/><button className="rounded bg-emerald-700 p-2" onClick={()=>action(async()=>{await req('/canteen/products','POST',{name,price:Number(price),stock:Number(stock)});setName('');setPrice('');setStock('')})}>Thêm</button></div></section></div>;
}
