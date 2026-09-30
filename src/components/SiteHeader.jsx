import React from 'react';
import { NavLink } from 'react-router-dom';
import useHeaderImage from '../lib/useHeaderImage';
export default function SiteHeader() {
 const image = useHeaderImage();
 return <header className="site-header border-b border-slate-800">
  <div className="max-w-7xl mx-auto px-4 pt-5">
   <div className="flex items-start gap-4 mb-4 min-w-0">
    {image && <img src={image} alt="Happy Fun League Logo" className="h-24 md:h-28 w-auto max-w-24 object-contain shrink-0" />}
    <h1 className="text-[2rem] leading-[2.25rem] md:text-[3.5rem] md:leading-[3rem] font-black tracking-tight min-w-0">
     <span className="block">Happy Fun League</span>
     <span className="block"><span className="text-fuchsia-400">Records of Glory</span> & <span className="text-rose-400">Shame</span></span>
    </h1>
   </div>
   <nav aria-label="Main navigation" className="grid grid-cols-3 md:flex gap-3 md:gap-6">
    <NavLink to="/weekly" className={({isActive})=>'site-tab '+(isActive?'active':'')}>Weekly Summaries</NavLink>
    <NavLink to="/season" className={({isActive})=>'site-tab '+(isActive?'active':'')}>Current Season</NavLink>
    <NavLink to="/history" className={({isActive})=>'site-tab '+(isActive?'active':'')}>League History</NavLink>
   </nav>
  </div>
 </header>;
}
