/**
 * Story 56.24: Agent Traffic Monitor JS Snippet
 *
 * Generates a lightweight JS snippet that merchants embed on their site.
 * Detects AI user-agents and AI referrals, then beacons events to the scanner service.
 */

const AI_AGENTS = [
  'GPTBot', 'ChatGPT-User', 'OAI-SearchBot',
  'ClaudeBot', 'Anthropic-AI',
  'PerplexityBot', 'Cohere-ai', 'Google-Extended',
  'Bytespider', 'CCBot', 'FacebookBot', 'Applebot-Extended',
];

const AI_REFERRALS = [
  'chat.openai.com', 'chatgpt.com', 'operator.chatgpt.com',
  'perplexity.ai', 'claude.ai',
  'gemini.google.com', 'copilot.microsoft.com',
  'you.com', 'phind.com',
];

export function generateSnippet(siteId: string, beaconUrl: string): string {
  // Build the regex pattern from agent list
  const agentPattern = AI_AGENTS.map(a => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const referralDomains = JSON.stringify(AI_REFERRALS);

  return `(function(){
"use strict";
if(window.__slyMonitorLoaded)return;
window.__slyMonitorLoaded=true;
try{
var ua=navigator.userAgent||"";
var ref=document.referrer||"";
var agentMatch=ua.match(/${agentPattern}/i);
var agentType=null;
var method=null;
if(agentMatch){
agentType=agentMatch[0].toLowerCase().replace(/[^a-z0-9]/g,"_");
method="user_agent";
}
if(!agentType&&ref){
var refDomains=${referralDomains};
try{
var refHost=new URL(ref).hostname;
for(var i=0;i<refDomains.length;i++){
if(refHost===refDomains[i]||refHost.endsWith("."+refDomains[i])){
agentType=refDomains[i].split(".")[0];
method="referral";
break;
}
}
}catch(e){}
}
if(!agentType)return;
var payload=JSON.stringify({
site_id:${JSON.stringify(siteId)},
page_path:location.pathname,
agent_type:agentType,
detection_method:method,
referrer:ref||undefined,
timestamp:new Date().toISOString()
});
var url=${JSON.stringify(beaconUrl)};
if(navigator.sendBeacon){
navigator.sendBeacon(url,payload);
}else{
var x=new XMLHttpRequest();
x.open("POST",url,true);
x.setRequestHeader("Content-Type","text/plain");
x.send(payload);
}
}catch(e){}
})();`;
}
