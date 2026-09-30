import React, { useState } from 'react';
export default function CopyIssueLink({ issueKey }) {
 const [status, setStatus] = useState('');
 async function copy() {
  try {
   const url = new URL(window.location.href);
   url.hash = '/weekly?issue=' + encodeURIComponent(issueKey);
   await navigator.clipboard.writeText(url.href);
   setStatus('Link copied!');
  } catch {
   setStatus('Could not copy. Use Link to this issue below.');
  }
 }
 return <div className="issue-share">
  <button onClick={copy}>Copy link to this issue</button>
  {status && <span role="status" className="text-xs text-emerald-300">{status}</span>}
  {status.startsWith('Could not') && <a href={'#/weekly?issue='+encodeURIComponent(issueKey)} className="text-sm underline">Link to this issue</a>}
 </div>;
}
