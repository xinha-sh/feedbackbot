const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["chunks/screenshot.DWWgdcCw.js","chunks/chunk.C856ssQ1.js","chunks/preload-helper.eW-blah3.js"])))=>i.map(i=>d[i]);
import{t as Ne}from"./chunks/preload-helper.eW-blah3.js";var O,g,be,Ee,C,ae,ye,xe,q,z,E,ke,ee,K,V,De,B={},L=[],He=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,R=Array.isArray;function T(t,e){for(var n in e)t[n]=e[n];return t}function te(t){t&&t.parentNode&&t.parentNode.removeChild(t)}function we(t,e,n){var o,_,r,s={};for(r in e)r=="key"?o=e[r]:r=="ref"?_=e[r]:s[r]=e[r];if(arguments.length>2&&(s.children=arguments.length>3?O.call(arguments,2):n),typeof t=="function"&&t.defaultProps!=null)for(r in t.defaultProps)s[r]===void 0&&(s[r]=t.defaultProps[r]);return I(t,s,o,_,null)}function I(t,e,n,o,_){var r={type:t,props:e,key:n,ref:o,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:_??++be,__i:-1,__u:0};return _==null&&g.vnode!=null&&g.vnode(r),r}function U(t){return t.children}function F(t,e){this.props=t,this.context=e}function N(t,e){if(e==null)return t.__?N(t.__,t.__i+1):null;for(var n;e<t.__k.length;e++)if((n=t.__k[e])!=null&&n.__e!=null)return n.__e;return typeof t.type=="function"?N(t):null}function ze(t){if(t.__P&&t.__d){var e=t.__v,n=e.__e,o=[],_=[],r=T({},e);r.__v=e.__v+1,g.vnode&&g.vnode(r),ne(t.__P,r,e,t.__n,t.__P.namespaceURI,32&e.__u?[n]:null,o,n??N(e),!!(32&e.__u),_),r.__v=e.__v,r.__.__k[r.__i]=r,Ce(o,r,_),e.__e=e.__=null,r.__e!=n&&Se(r)}}function Se(t){if((t=t.__)!=null&&t.__c!=null)return t.__e=t.__c.base=null,t.__k.some(function(e){if(e!=null&&e.__e!=null)return t.__e=t.__c.base=e.__e}),Se(t)}function _e(t){(!t.__d&&(t.__d=!0)&&C.push(t)&&!j.__r++||ae!=g.debounceRendering)&&((ae=g.debounceRendering)||ye)(j)}function j(){try{for(var t,e=1;C.length;)C.length>e&&C.sort(xe),t=C.shift(),e=C.length,ze(t)}finally{C.length=j.__r=0}}function $e(t,e,n,o,_,r,s,l,p,i,f){var a,h,c,v,k,y,m,u=o&&o.__k||L,w=e.length;for(p=Ie(n,e,u,p,w),a=0;a<w;a++)(c=n.__k[a])!=null&&(h=c.__i!=-1&&u[c.__i]||B,c.__i=a,y=ne(t,c,h,_,r,s,l,p,i,f),v=c.__e,c.ref&&h.ref!=c.ref&&(h.ref&&re(h.ref,null,c),f.push(c.ref,c.__c||v,c)),k==null&&v!=null&&(k=v),(m=!!(4&c.__u))||h.__k===c.__k?(p=Te(c,p,t,m),m&&h.__e&&(h.__e=null)):typeof c.type=="function"&&y!==void 0?p=y:v&&(p=v.nextSibling),c.__u&=-7);return n.__e=k,p}function Ie(t,e,n,o,_){var r,s,l,p,i,f=n.length,a=f,h=0;for(t.__k=new Array(_),r=0;r<_;r++)(s=e[r])!=null&&typeof s!="boolean"&&typeof s!="function"?(typeof s=="string"||typeof s=="number"||typeof s=="bigint"||s.constructor==String?s=t.__k[r]=I(null,s,null,null,null):R(s)?s=t.__k[r]=I(U,{children:s},null,null,null):s.constructor===void 0&&s.__b>0?s=t.__k[r]=I(s.type,s.props,s.key,s.ref?s.ref:null,s.__v):t.__k[r]=s,p=r+h,s.__=t,s.__b=t.__b+1,l=null,(i=s.__i=Fe(s,n,p,a))!=-1&&(a--,(l=n[i])&&(l.__u|=2)),l==null||l.__v==null?(i==-1&&(_>f?h--:_<f&&h++),typeof s.type!="function"&&(s.__u|=4)):i!=p&&(i==p-1?h--:i==p+1?h++:(i>p?h--:h++,s.__u|=4))):t.__k[r]=null;if(a)for(r=0;r<f;r++)(l=n[r])!=null&&(2&l.__u)==0&&(l.__e==o&&(o=N(l)),Ae(l,l));return o}function Te(t,e,n,o){var _,r;if(typeof t.type=="function"){for(_=t.__k,r=0;_&&r<_.length;r++)_[r]&&(_[r].__=t,e=Te(_[r],e,n,o));return e}t.__e!=e&&(o&&(e&&t.type&&!e.parentNode&&(e=N(t)),n.insertBefore(t.__e,e||null)),e=t.__e);do e=e&&e.nextSibling;while(e!=null&&e.nodeType==8);return e}function Fe(t,e,n,o){var _,r,s,l=t.key,p=t.type,i=e[n],f=i!=null&&(2&i.__u)==0;if(i===null&&l==null||f&&l==i.key&&p==i.type)return n;if(o>(f?1:0)){for(_=n-1,r=n+1;_>=0||r<e.length;)if((i=e[s=_>=0?_--:r++])!=null&&(2&i.__u)==0&&l==i.key&&p==i.type)return s}return-1}function ie(t,e,n){e[0]=="-"?t.setProperty(e,n??""):t[e]=n==null?"":typeof n!="number"||He.test(e)?n:n+"px"}function H(t,e,n,o,_){var r,s;e:if(e=="style")if(typeof n=="string")t.style.cssText=n;else{if(typeof o=="string"&&(t.style.cssText=o=""),o)for(e in o)n&&e in n||ie(t.style,e,"");if(n)for(e in n)o&&n[e]==o[e]||ie(t.style,e,n[e])}else if(e[0]=="o"&&e[1]=="n")r=e!=(e=e.replace(ke,"$1")),s=e.toLowerCase(),e=s in t||e=="onFocusOut"||e=="onFocusIn"?s.slice(2):e.slice(2),t.l||(t.l={}),t.l[e+r]=n,n?o?n[E]=o[E]:(n[E]=ee,t.addEventListener(e,r?V:K,r)):t.removeEventListener(e,r?V:K,r);else{if(_=="http://www.w3.org/2000/svg")e=e.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if(e!="width"&&e!="height"&&e!="href"&&e!="list"&&e!="form"&&e!="tabIndex"&&e!="download"&&e!="rowSpan"&&e!="colSpan"&&e!="role"&&e!="popover"&&e in t)try{t[e]=n??"";break e}catch{}typeof n=="function"||(n==null||n===!1&&e[4]!="-"?t.removeAttribute(e):t.setAttribute(e,e=="popover"&&n==1?"":n))}}function se(t){return function(e){if(this.l){var n=this.l[e.type+t];if(e[z]==null)e[z]=ee++;else if(e[z]<n[E])return;return n(g.event?g.event(e):e)}}}function ne(t,e,n,o,_,r,s,l,p,i){var f,a,h,c,v,k,y,m,u,w,$,P,oe,D,J,S=e.type;if(e.constructor!==void 0)return null;128&n.__u&&(p=!!(32&n.__u),r=[l=e.__e=n.__e]),(f=g.__b)&&f(e);e:if(typeof S=="function")try{if(m=e.props,u=S.prototype&&S.prototype.render,w=(f=S.contextType)&&o[f.__c],$=f?w?w.props.value:f.__:o,n.__c?y=(a=e.__c=n.__c).__=a.__E:(u?e.__c=a=new S(m,$):(e.__c=a=new F(m,$),a.constructor=S,a.render=Be),w&&w.sub(a),a.state||(a.state={}),a.__n=o,h=a.__d=!0,a.__h=[],a._sb=[]),u&&a.__s==null&&(a.__s=a.state),u&&S.getDerivedStateFromProps!=null&&(a.__s==a.state&&(a.__s=T({},a.__s)),T(a.__s,S.getDerivedStateFromProps(m,a.__s))),c=a.props,v=a.state,a.__v=e,h)u&&S.getDerivedStateFromProps==null&&a.componentWillMount!=null&&a.componentWillMount(),u&&a.componentDidMount!=null&&a.__h.push(a.componentDidMount);else{if(u&&S.getDerivedStateFromProps==null&&m!==c&&a.componentWillReceiveProps!=null&&a.componentWillReceiveProps(m,$),e.__v==n.__v||!a.__e&&a.shouldComponentUpdate!=null&&a.shouldComponentUpdate(m,a.__s,$)===!1){e.__v!=n.__v&&(a.props=m,a.state=a.__s,a.__d=!1),e.__e=n.__e,e.__k=n.__k,e.__k.some(function(M){M&&(M.__=e)}),L.push.apply(a.__h,a._sb),a._sb=[],a.__h.length&&s.push(a);break e}a.componentWillUpdate!=null&&a.componentWillUpdate(m,a.__s,$),u&&a.componentDidUpdate!=null&&a.__h.push(function(){a.componentDidUpdate(c,v,k)})}if(a.context=$,a.props=m,a.__P=t,a.__e=!1,P=g.__r,oe=0,u)a.state=a.__s,a.__d=!1,P&&P(e),f=a.render(a.props,a.state,a.context),L.push.apply(a.__h,a._sb),a._sb=[];else do a.__d=!1,P&&P(e),f=a.render(a.props,a.state,a.context),a.state=a.__s;while(a.__d&&++oe<25);a.state=a.__s,a.getChildContext!=null&&(o=T(T({},o),a.getChildContext())),u&&!h&&a.getSnapshotBeforeUpdate!=null&&(k=a.getSnapshotBeforeUpdate(c,v)),D=f!=null&&f.type===U&&f.key==null?Pe(f.props.children):f,l=$e(t,R(D)?D:[D],e,n,o,_,r,s,l,p,i),a.base=e.__e,e.__u&=-161,a.__h.length&&s.push(a),y&&(a.__E=a.__=null)}catch(M){if(e.__v=null,p||r!=null)if(M.then){for(e.__u|=p?160:128;l&&l.nodeType==8&&l.nextSibling;)l=l.nextSibling;r[r.indexOf(l)]=null,e.__e=l}else{for(J=r.length;J--;)te(r[J]);Q(e)}else e.__e=n.__e,e.__k=n.__k,M.then||Q(e);g.__e(M,e,n)}else r==null&&e.__v==n.__v?(e.__k=n.__k,e.__e=n.__e):l=e.__e=We(n.__e,e,n,o,_,r,s,p,i);return(f=g.diffed)&&f(e),128&e.__u?void 0:l}function Q(t){t&&(t.__c&&(t.__c.__e=!0),t.__k&&t.__k.some(Q))}function Ce(t,e,n){for(var o=0;o<n.length;o++)re(n[o],n[++o],n[++o]);g.__c&&g.__c(e,t),t.some(function(_){try{t=_.__h,_.__h=[],t.some(function(r){r.call(_)})}catch(r){g.__e(r,_.__v)}})}function Pe(t){return typeof t!="object"||t==null||t.__b>0?t:R(t)?t.map(Pe):T({},t)}function We(t,e,n,o,_,r,s,l,p){var i,f,a,h,c,v,k,y=n.props||B,m=e.props,u=e.type;if(u=="svg"?_="http://www.w3.org/2000/svg":u=="math"?_="http://www.w3.org/1998/Math/MathML":_||(_="http://www.w3.org/1999/xhtml"),r!=null){for(i=0;i<r.length;i++)if((c=r[i])&&"setAttribute"in c==!!u&&(u?c.localName==u:c.nodeType==3)){t=c,r[i]=null;break}}if(t==null){if(u==null)return document.createTextNode(m);t=document.createElementNS(_,u,m.is&&m),l&&(g.__m&&g.__m(e,r),l=!1),r=null}if(u==null)y===m||l&&t.data==m||(t.data=m);else{if(r=r&&O.call(t.childNodes),!l&&r!=null)for(y={},i=0;i<t.attributes.length;i++)y[(c=t.attributes[i]).name]=c.value;for(i in y)c=y[i],i=="dangerouslySetInnerHTML"?a=c:i=="children"||i in m||i=="value"&&"defaultValue"in m||i=="checked"&&"defaultChecked"in m||H(t,i,null,c,_);for(i in m)c=m[i],i=="children"?h=c:i=="dangerouslySetInnerHTML"?f=c:i=="value"?v=c:i=="checked"?k=c:l&&typeof c!="function"||y[i]===c||H(t,i,c,y[i],_);if(f)l||a&&(f.__html==a.__html||f.__html==t.innerHTML)||(t.innerHTML=f.__html),e.__k=[];else if(a&&(t.innerHTML=""),$e(e.type=="template"?t.content:t,R(h)?h:[h],e,n,o,u=="foreignObject"?"http://www.w3.org/1999/xhtml":_,r,s,r?r[0]:n.__k&&N(n,0),l,p),r!=null)for(i=r.length;i--;)te(r[i]);l||(i="value",u=="progress"&&v==null?t.removeAttribute("value"):v!=null&&(v!==t[i]||u=="progress"&&!v||u=="option"&&v!=y[i])&&H(t,i,v,y[i],_),i="checked",k!=null&&k!=t[i]&&H(t,i,k,y[i],_))}return t}function re(t,e,n){try{if(typeof t=="function"){var o=typeof t.__u=="function";o&&t.__u(),o&&e==null||(t.__u=t(e))}else t.current=e}catch(_){g.__e(_,n)}}function Ae(t,e,n){var o,_;if(g.unmount&&g.unmount(t),(o=t.ref)&&(o.current&&o.current!=t.__e||re(o,null,e)),(o=t.__c)!=null){if(o.componentWillUnmount)try{o.componentWillUnmount()}catch(r){g.__e(r,e)}o.base=o.__P=null}if(o=t.__k)for(_=0;_<o.length;_++)o[_]&&Ae(o[_],e,n||typeof t.type!="function");n||te(t.__e),t.__c=t.__=t.__e=void 0}function Be(t,e,n){return this.constructor(t,n)}function Le(t,e,n){var o,_,r,s;e==document&&(e=document.documentElement),g.__&&g.__(t,e),_=(o=typeof n=="function")?null:n&&n.__k||e.__k,r=[],s=[],ne(e,t=(!o&&n||e).__k=we(U,null,[t]),_||B,B,e.namespaceURI,!o&&n?[n]:_?null:e.firstChild?O.call(e.childNodes):null,r,!o&&n?n:_?_.__e:e.firstChild,o,s),Ce(r,t,s)}O=L.slice,g={__e:function(t,e,n,o){for(var _,r,s;e=e.__;)if((_=e.__c)&&!_.__)try{if((r=_.constructor)&&r.getDerivedStateFromError!=null&&(_.setState(r.getDerivedStateFromError(t)),s=_.__d),_.componentDidCatch!=null&&(_.componentDidCatch(t,o||{}),s=_.__d),s)return _.__E=_}catch(l){t=l}throw t}},be=0,Ee=function(t){return t!=null&&t.constructor===void 0},F.prototype.setState=function(t,e){var n=this.__s!=null&&this.__s!=this.state?this.__s:this.__s=T({},this.state);typeof t=="function"&&(t=t(T({},n),this.props)),t&&T(n,t),t!=null&&this.__v&&(e&&this._sb.push(e),_e(this))},F.prototype.forceUpdate=function(t){this.__v&&(this.__e=!0,t&&this.__h.push(t),_e(this))},F.prototype.render=U,C=[],ye=typeof Promise=="function"?Promise.prototype.then.bind(Promise.resolve()):setTimeout,xe=function(t,e){return t.__v.__b-e.__v.__b},j.__r=0,q=Math.random().toString(8),z="__d"+q,E="__a"+q,ke=/(PointerCapture)$|Capture$/i,ee=0,K=se(!1),V=se(!0),De=0;var Y,b,G,le,X=0,Me=[],x=g,ce=x.__b,pe=x.__r,de=x.diffed,ue=x.__c,fe=x.unmount,he=x.__;function je(t,e){x.__h&&x.__h(b,t,X||e),X=0;var n=b.__H||(b.__H={__:[],__h:[]});return t>=n.__.length&&n.__.push({}),n.__[t]}function A(t){return X=1,Oe(Ue,t)}function Oe(t,e,n){var o=je(Y++,2);if(o.t=t,!o.__c&&(o.__=[n?n(e):Ue(void 0,e),function(l){var p=o.__N?o.__N[0]:o.__[0],i=o.t(p,l);p!==i&&(o.__N=[i,o.__[1]],o.__c.setState({}))}],o.__c=b,!b.__f)){var _=function(l,p,i){if(!o.__c.__H)return!0;var f=o.__c.__H.__.filter(function(h){return h.__c});if(f.every(function(h){return!h.__N}))return!r||r.call(this,l,p,i);var a=o.__c.props!==l;return f.some(function(h){if(h.__N){var c=h.__[0];h.__=h.__N,h.__N=void 0,c!==h.__[0]&&(a=!0)}}),r&&r.call(this,l,p,i)||a};b.__f=!0;var r=b.shouldComponentUpdate,s=b.componentWillUpdate;b.componentWillUpdate=function(l,p,i){if(this.__e){var f=r;r=void 0,_(l,p,i),r=f}s&&s.call(this,l,p,i)},b.shouldComponentUpdate=_}return o.__N||o.__}function Re(){for(var t;t=Me.shift();){var e=t.__H;if(t.__P&&e)try{e.__h.some(W),e.__h.some(Z),e.__h=[]}catch(n){e.__h=[],x.__e(n,t.__v)}}}x.__b=function(t){b=null,ce&&ce(t)},x.__=function(t,e){t&&e.__k&&e.__k.__m&&(t.__m=e.__k.__m),he&&he(t,e)},x.__r=function(t){pe&&pe(t),Y=0;var e=(b=t.__c).__H;e&&(G===b?(e.__h=[],b.__h=[],e.__.some(function(n){n.__N&&(n.__=n.__N),n.u=n.__N=void 0})):(e.__h.some(W),e.__h.some(Z),e.__h=[],Y=0)),G=b},x.diffed=function(t){de&&de(t);var e=t.__c;e&&e.__H&&(e.__H.__h.length&&(Me.push(e)!==1&&le===x.requestAnimationFrame||((le=x.requestAnimationFrame)||Je)(Re)),e.__H.__.some(function(n){n.u&&(n.__H=n.u),n.u=void 0})),G=b=null},x.__c=function(t,e){e.some(function(n){try{n.__h.some(W),n.__h=n.__h.filter(function(o){return!o.__||Z(o)})}catch(o){e.some(function(_){_.__h&&(_.__h=[])}),e=[],x.__e(o,n.__v)}}),ue&&ue(t,e)},x.unmount=function(t){fe&&fe(t);var e,n=t.__c;n&&n.__H&&(n.__H.__.some(function(o){try{W(o)}catch(_){e=_}}),n.__H=void 0,e&&x.__e(e,n.__v))};var me=typeof requestAnimationFrame=="function";function Je(t){var e,n=function(){clearTimeout(o),me&&cancelAnimationFrame(e),setTimeout(t)},o=setTimeout(n,35);me&&(e=requestAnimationFrame(n))}function W(t){var e=b,n=t.__c;typeof n=="function"&&(t.__c=void 0,n()),b=e}function Z(t){var e=b;t.__c=t.__(),b=e}function Ue(t,e){return typeof e=="function"?e(t):e}var qe="__FB_API_BASE__";async function Ge(t){const e={message:t.message,page_url:t.pageUrl,user_agent:t.userAgent,email:t.email??"",honeypot:"",want_screenshot_upload:!!t.screenshotDataUrl};try{const n=await fetch(`${qe}/api/ticket`,{method:"POST",credentials:"include",headers:{"content-type":"application/json"},body:JSON.stringify(e)});if(!n.ok)return{ok:!1,status:n.status,message:`HTTP ${n.status}`};const o=await n.json();return t.screenshotDataUrl&&o.screenshot_upload_url&&await Ke(o.screenshot_upload_url,t.screenshotDataUrl),{ok:!0,ticketId:o.ticket_id,routedTo:null}}catch(n){return{ok:!1,status:0,message:n instanceof Error?n.message:"network"}}}async function Ke(t,e){const n=await(await fetch(e)).blob();await fetch(t,{method:"PUT",headers:{"content-type":"image/png"},body:n}).catch(()=>{})}var Ve=0;function d(t,e,n,o,_,r){e||(e={});var s,l,p=e;if("ref"in p)for(l in p={},e)l=="ref"?s=e[l]:p[l]=e[l];var i={type:t,props:p,key:n,ref:s,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:--Ve,__i:-1,__u:0,__source:_,__self:r};if(typeof t=="function"&&(s=t.defaultProps))for(l in s)p[l]===void 0&&(p[l]=s[l]);return g.vnode&&g.vnode(i),i}var Qe=[{k:"auto",label:"auto",glyph:"⚡"},{k:"bug",label:"bug",glyph:"☒"},{k:"idea",label:"idea",glyph:"★"},{k:"ask",label:"ask",glyph:"?"}];function Ye(t){const[e,n]=A(!1),[o,_]=A("compose"),[r,s]=A("auto"),[l,p]=A(""),[i,f]=A(""),[a,h]=A(!0),[c,v]=A(null),k=()=>{n(!1),t.onClose?.()},y=()=>{_("compose"),p(""),v(null)},m=async()=>{_("sending"),v(null);let u;if(a){const{captureScreenshot:$}=await Ne(async()=>{const{captureScreenshot:P}=await import("./chunks/screenshot.DWWgdcCw.js");return{captureScreenshot:P}},__vite__mapDeps([0,1,2]));u=await $()??void 0}const w=await Ge({message:l,pageUrl:window.location.href,userAgent:navigator.userAgent,email:i||void 0,kind:r,screenshotDataUrl:u});w.ok||v(w.status===429?"Too many submissions — try again in a minute.":"Could not send. Try again."),_("sent")};return d("div",{class:`wrap ${t.theme==="dark"?"theme-dark":""}`,children:d("div",{class:"stack",children:[e&&d("div",{class:"panel",children:[d("div",{class:"head",children:[d("strong",{class:"title",children:"Send feedback"}),d("span",{class:"spacer"}),d("button",{class:"x",onClick:k,"aria-label":"close",children:"×"})]}),o==="compose"&&d("div",{class:"body",children:[d("div",{class:"kinds",children:Qe.map(u=>d("button",{class:r===u.k?"active":"",onClick:()=>s(u.k),type:"button",children:[d("span",{"aria-hidden":!0,children:u.glyph}),u.label]},u.k))}),d("div",{class:"textwrap",children:[d("textarea",{rows:4,value:l,onInput:u=>p(u.currentTarget.value),placeholder:"What's on your mind? We'll auto-classify."}),d("div",{class:"ctl",children:[d("label",{children:[d("span",{class:`check ${a?"on":""}`,children:a?"✓":""}),d("input",{type:"checkbox",checked:a,onChange:u=>h(u.currentTarget.checked),style:{display:"none"}}),"screenshot"]}),d("span",{class:"divider"}),d("span",{children:[l.length," / 2000"]}),d("span",{class:"spacer"}),d("span",{class:"tag",children:"markdown ok"})]})]}),d("div",{class:"email",children:[d("span",{class:"label",children:"reply to"}),d("input",{type:"email",value:i,onInput:u=>f(u.currentTarget.value),placeholder:"optional@email.com"})]}),d("div",{class:"foot",children:[d("span",{class:"brand",children:"▣ feedbackbot"}),d("span",{class:"spacer"}),d("button",{class:"btn primary",onClick:m,disabled:!l.trim(),type:"button",children:"send"})]})]}),o==="sending"&&d("div",{class:"pending",children:[d("div",{class:"hint",children:"routing"}),d("div",{class:"dots",children:[d("span",{}),d("span",{}),d("span",{})]})]}),o==="sent"&&d("div",{class:"sent",children:[d("div",{class:"badge","aria-hidden":!0,children:"✓"}),c?d(U,{children:[d("div",{class:"title",children:"Try again"}),d("div",{class:"err",children:c})]}):d(U,{children:[d("div",{class:"title",children:"Got it."}),d("div",{class:"sub",children:"Tagged and routed to your integrations."})]}),d("button",{class:"btn ghost",onClick:y,type:"button",children:"send another"})]})]}),d("button",{class:`bubble ${e?"open":""}`,onClick:()=>n(!e),"aria-label":"Feedback",type:"button",children:e?"×":"💬"})]})})}var Xe=`
:host { all: initial; }

.wrap {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 2147483647;
  font-family: 'Space Grotesk', system-ui, sans-serif;
  color: #0a0a0a;

  --bg: #ffffff;
  --surface: #ffffff;
  --fg: #0a0a0a;
  --fg-mute: #3a362e;
  --fg-faint: #7a7368;
  --border: #0a0a0a;
  --border-soft: #b8b0a0;
  --accent: #ffe24a;
  --accent-ink: #0a0a0a;
  --danger: #c0391c;
}
.wrap.theme-dark {
  color: #f4f1ea;
  --bg: #0b0b0a;
  --surface: #141312;
  --fg: #f4f1ea;
  --fg-mute: #c4bdb0;
  --fg-faint: #7a7368;
  --border: #f4f1ea;
  --border-soft: #3a362e;
  --danger: #ff6a4a;
}

.stack {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 14px;
}

.panel {
  width: 360px;
  background: var(--surface);
  border: 2px solid var(--border);
  box-shadow: 6px 6px 0 0 var(--border);
  animation: slide-in .24s ease-out;
}
@keyframes slide-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}

.head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--accent);
  color: var(--accent-ink);
  border-bottom: 2px solid var(--border);
}
.head .title { font-weight: 700; font-size: 14px; letter-spacing: -0.01em; }
.head .spacer { flex: 1; }
.head .x {
  width: 24px; height: 24px;
  display: flex; align-items: center; justify-content: center;
  border: 1.5px solid var(--accent-ink);
  background: transparent;
  color: var(--accent-ink);
  cursor: pointer;
}

.body { padding: 16px; }

.kinds {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border: 1.5px solid var(--border);
  margin-bottom: 14px;
}
.kinds button {
  padding: 8px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  border: none;
  background: var(--surface);
  color: var(--fg);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.04em; text-transform: uppercase;
  cursor: pointer;
}
.kinds button + button { border-left: 1.5px solid var(--border); }
.kinds button.active { background: var(--fg); color: var(--bg); }

.textwrap { border: 2px solid var(--border); background: var(--surface); }
.textwrap textarea {
  width: 100%;
  border: none; resize: none; outline: none;
  padding: 10px 12px;
  font-size: 14px; line-height: 1.45;
  font-family: 'Space Grotesk', system-ui, sans-serif;
  background: transparent; color: var(--fg);
  box-sizing: border-box;
}
.textwrap .ctl {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px;
  border-top: 1.5px solid var(--border-soft);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px; color: var(--fg-mute);
}
.ctl label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.ctl .check {
  width: 14px; height: 14px;
  border: 1.5px solid var(--border);
  display: flex; align-items: center; justify-content: center;
}
.ctl .check.on { background: var(--accent); }
.ctl .divider { width: 1px; height: 14px; background: var(--border-soft); }
.ctl .spacer { flex: 1; }
.ctl .tag { padding: 1px 6px; border: 1px solid var(--border-soft); }

.email {
  margin-top: 10px;
  display: flex; align-items: center; gap: 8px;
  border: 1.5px solid var(--border);
  padding: 8px 10px;
  background: var(--surface);
}
.email .label { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11px; color: var(--fg-faint); }
.email input {
  flex: 1; border: none; outline: none; background: transparent;
  font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px;
  color: var(--fg);
}

.foot {
  margin-top: 14px;
  display: flex; align-items: center; gap: 8px;
}
.foot .brand {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px; color: var(--fg-faint);
}
.foot .spacer { flex: 1; }

.btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 7px 14px;
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-weight: 600; font-size: 13px;
  border: 2px solid var(--border);
  background: var(--surface);
  color: var(--fg);
  box-shadow: 3px 3px 0 0 var(--border);
  cursor: pointer;
  white-space: nowrap;
  transition: transform .08s, box-shadow .08s;
}
.btn:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 0 var(--border); }
.btn:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 0 var(--border); }
.btn.primary {
  background: var(--accent); color: var(--accent-ink); border-color: var(--accent-ink);
  box-shadow: 3px 3px 0 0 var(--accent-ink);
}
.btn.primary:hover { box-shadow: 4px 4px 0 0 var(--accent-ink); }
.btn.primary:active { box-shadow: 1px 1px 0 0 var(--accent-ink); }
.btn.ghost { box-shadow: none; background: transparent; }
.btn[disabled] { opacity: 0.5; pointer-events: none; }

.pending { padding: 44px 16px; text-align: center; }
.pending .hint {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px; color: var(--fg-mute);
  letter-spacing: 0.1em; text-transform: uppercase;
}
.dots { margin-top: 10px; display: flex; justify-content: center; gap: 6px; }
.dots span {
  width: 8px; height: 8px; background: var(--fg);
  animation: bounce 1s infinite alternate;
}
.dots span:nth-child(2) { animation-delay: .12s; }
.dots span:nth-child(3) { animation-delay: .24s; }
@keyframes bounce { from { opacity: .2; } to { opacity: 1; } }

.sent { padding: 24px 16px 18px; text-align: center; }
.sent .badge {
  width: 44px; height: 44px; margin: 0 auto 10px;
  background: var(--accent); color: var(--accent-ink);
  border: 2px solid var(--accent-ink);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 3px 3px 0 0 var(--accent-ink);
}
.sent .title { font-size: 20px; font-weight: 700; letter-spacing: -0.03em; margin-bottom: 4px; }
.sent .sub { font-size: 13px; color: var(--fg-mute); margin-bottom: 14px; }
.sent .err { color: var(--danger); font-size: 13px; margin-bottom: 14px; }

.bubble {
  width: 56px; height: 56px;
  background: var(--accent); color: var(--accent-ink);
  border: 2px solid var(--border);
  box-shadow: 4px 4px 0 0 var(--border);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: transform .08s, box-shadow .08s;
}
.bubble.open { background: var(--surface); color: var(--fg); }
.bubble:active { transform: translate(2px, 2px); box-shadow: 2px 2px 0 0 var(--border); }
`,ge="data-feedbackbot";function ve(){if(document.querySelector(`[${ge}]`))return;const t=document.createElement("div");t.setAttribute(ge,"1"),document.body.appendChild(t);const e=t.attachShadow({mode:"open"}),n=document.createElement("style");n.textContent=Xe,e.appendChild(n);const o=document.createElement("div");e.appendChild(o),Le(we(Ye,{theme:document.documentElement.dataset.theme==="dark"?"dark":"light"}),o)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",ve,{once:!0}):ve();
