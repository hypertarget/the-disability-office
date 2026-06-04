/* Satellite Delight — shared engine: header/footer/sticky injection + config-driven quiz. */
(function(){
  "use strict";

  /* ===== Config (edit when live services are ready) ===== */
  var PHONE_NUMBER = window.SITE_PHONE || "";              // e.g. "(844) 555-0199" (Ringba/Retreaver). Empty = placeholder UI.
  var NON_CONSENT_PHONE = window.SITE_NONCONSENT_PHONE || ""; // line for info without consenting to automated calls.
  var SUBMIT_ENDPOINT = "/api/submit";
  var BUYER_CAP = 4;
  // TrustedForm: on by default (set window.SITE_TRUSTEDFORM=false to disable). Captures a
  // tamper-proof consent certificate URL that materially raises lead value + TCPA defensibility.
  var TRUSTEDFORM = (window.SITE_TRUSTEDFORM !== false);
  var RF = { active:false, idx:0, data:{}, cfg:null }; // quiz state for browser-back support

  // Persistent hidden cert fields, present from page load (the quiz is an SPA and the
  // contact step only renders at the end — TrustedForm needs the field to exist early
  // so its SDK can populate it. These live on <body> and survive step re-renders).
  function ensureTFFields(){
    if(!TRUSTEDFORM || document.getElementById("xxTrustedFormCertUrl")) return;
    // TrustedForm's SDK only writes the cert URL into fields that live inside a <form>.
    var f=document.createElement("form"); f.id="tf-cert-form"; f.style.display="none";
    f.setAttribute("aria-hidden","true"); f.onsubmit=function(){return false;};
    ["xxTrustedFormCertUrl","xxTrustedFormPingUrl"].forEach(function(n){
      var i=document.createElement("input"); i.type="hidden"; i.name=n; i.id=n; f.appendChild(i);
    });
    document.body.appendChild(f);
  }

  function injectTrustedForm(){
    if(!TRUSTEDFORM || window.__rf_tf) return; window.__rf_tf = true;
    try{
      var tf = document.createElement("script");
      tf.async = true;
      tf.src = (("https:"===document.location.protocol)?"https":"http") +
        "://api.trustedform.com/trustedform.js?field=xxTrustedFormCertUrl&use_tagged_consent=true&l=" +
        (new Date().getTime()) + Math.random();
      var s = document.getElementsByTagName("script")[0];
      s.parentNode.insertBefore(tf, s);
    }catch(e){}
  }

  var telHref = function(n){ return "tel:+1" + (n||"").replace(/\D/g,""); };

  var LOGO = '<svg viewBox="0 0 64 64" fill="none" aria-label="The Disability Office"><path d="M32 48C18 38 12 28 16 21C19 16 27 16 32 23C37 16 45 16 48 21C52 28 46 38 32 48Z" fill="#1E6E5C"/><path d="M24 31l5.5 5.5L41 26" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M53 11c.85 3.2 1.25 3.6 4.45 4.45-3.2.85-3.6 1.25-4.45 4.45-.85-3.2-1.25-3.6-4.45-4.45 3.2-.85 3.6-1.25 4.45-4.45Z" fill="#E07A5F"/></svg>';

  var CK = '<svg class="ck" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  var SHIELD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 7.7-8 9-4.5-1.3-8-4-8-9V6z"/></svg>';
  var LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  var STAR = '<svg viewBox="0 0 24 24" fill="#FBBF24" stroke="none"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 18.9 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';
  // Friendly concierge avatar (brand gradient) for the conversational quiz framing.
  var AVATAR = '<span class="qavatar"><svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="24" fill="#1E6E5C"/><circle cx="24" cy="19" r="7" fill="#fff"/><path d="M11 40c1.5-7 6.8-11 13-11s11.5 4 13 11" fill="#fff"/></svg><span class="qonline"></span></span>';

  var NAV = [["Who qualifies","#qualify"],["How it works","#how"],["Conditions","#conditions"],["FAQ","#faq"]];

  /* Conversational helper line shown under each question (per-step override wins). */
  function helperFor(step, idx, total){
    if(step.helper) return step.helper;
    if(step.type==="zip" || step.type==="address") return "We use this only to match you with a disability representative near you — never shared publicly.";
    if(step.type==="contact") return "Last step — where should we send your free evaluation? Your information is private and secure.";
    if(idx===0) return "Hi! Let’s see if you may qualify — about a minute:";
    if(idx>=total-2) return "Almost there — just a couple more quick questions.";
    if(step.type==="multi") return "Pick anything that applies, or skip. There are no wrong answers.";
    return "Great — thanks! Next quick question:";
  }

  function phoneCTA(cls){
    if(PHONE_NUMBER) return '<a class="'+cls+'" href="'+telHref(PHONE_NUMBER)+'"><small>CALL NOW</small>'+PHONE_NUMBER+'</a>';
    return '<span class="'+cls+'" style="opacity:.55" title="Phone number coming soon"><small>CALL NOW</small>(XXX) XXX-XXXX</span>';
  }

  /* ===== Header ===== */
  function header(){
    var h=document.createElement("header"); h.className="site";
    var nav=(window.SITE_VARIANT==="denied")?[["Why denied","#why"],["Appeal odds","#appeals"],["2025 SSA cuts","#cuts"],["FAQ","#faq"]]:NAV;
    h.innerHTML='<div class="topbar">Not affiliated with the Social Security Administration — a free, private service.</div>'+
      '<div class="wrap bar"><a class="logo" href="/">'+LOGO+'<span class="word"><span class="r">The Disability Office</span><span class="h">A PRIVATE BENEFITS SERVICE</span></span></a>'+
      '<nav>'+nav.map(function(n){return '<a class="navlink" href="'+n[1]+'">'+n[0]+'</a>';}).join('')+
      phoneCTA("phone")+
      '<a class="btn btn-grad" style="padding:12px 20px;font-size:14.5px" href="/#quiz">Free Evaluation</a></nav></div>';
    return h;
  }

  /* ===== Footer ===== */
  function footer(){
    var f=document.createElement("footer"); f.className="site";
    var nonconsent = NON_CONSENT_PHONE
      ? 'To request information without consenting to automated calls or texts, call '+NON_CONSENT_PHONE+'.'
      : 'To request information without consenting to automated calls or texts, call (XXX) XXX-XXXX.';
    f.innerHTML='<div class="wrap"><div class="ftop">'+
      '<div class="fbrand">'+LOGO+'<span><span class="r">The Disability Office</span><span class="h">A PRIVATE BENEFITS SERVICE</span></span></div>'+
      '<nav><a href="/privacy-policy">Privacy Policy</a><a href="/terms-and-conditions">Terms &amp; Conditions</a><a href="/california-privacy-notice">California Privacy Notice</a><a href="/partners">Marketing Partners</a><a href="/do-not-sell-or-share">Do Not Sell or Share My Personal Information</a></nav>'+
      '</div>'+
      '<p class="disc">The Disability Office is a privately owned advertising and referral service. We are not the Social Security Administration (SSA), the U.S. government, or a law firm, and we are not affiliated with or endorsed by any government agency. We charge you nothing. Social Security Disability benefits and applications are available for free directly from the SSA at SSA.gov. Submitting a request is not an application for benefits, does not create an attorney-client relationship, and is not legal advice. If you request a free consultation, you may be contacted by an independent attorney or non-attorney advocate who can assist with your claim. '+nonconsent+'</p>'+
      '<div class="copy">&copy; '+new Date().getFullYear()+' The Disability Office &middot; A free, private disability benefits referral service &middot; <span class="dom">THEDISABILITYOFFICE.COM</span></div>'+
      '</div>';
    return f;
  }

  /* ===== Sticky mobile CTA ===== */
  function sticky(){
    var s=document.createElement("div"); s.className="sticky";
    var qHref = "/#quiz";
    var qTxt = "Free Evaluation";
    var call = PHONE_NUMBER ? '<a class="btn btn-call" href="'+telHref(PHONE_NUMBER)+'">Call Now</a>'
                            : '<a class="btn btn-call" href="'+qHref+'">Call Now</a>';
    s.innerHTML=call+'<a class="btn btn-grad" href="'+qHref+'">'+qTxt+'</a>';
    return s;
  }

  /* ===== Quiz engine (vertical pages) ===== */
  function buildVertical(){
    var cfg = (window.SITE_VERTICALS||{})[window.SITE_VERTICAL];
    var app = document.getElementById("app");
    if(!cfg || !app) return;
    var city = window.SITE_CITY || null; // {name:"Austin, TX", metro:"Austin", state:"TX"}

    var headline = cfg.headline, sub = cfg.sub, title = cfg.title;
    var variant = (window.SITE_VARIANT==="denied") ? "denied" : "eligibility";
    var eyebrow, points;
    if(variant==="denied"){
      headline = "Denied Social Security Disability? You may have just 60 days to protect what you’re owed.";
      sub = "About 64% of first-time claims are denied — but a denial is rarely the end. Approval rates jump from roughly 16% at reconsideration to about 50% at the hearing, especially with a representative. The catch: you generally have just 60 days to appeal before you may have to start over. A free review takes about a minute.";
      title = "Denied Social Security Disability in 2026? Here’s Why — and How to Appeal | The Disability Office";
      eyebrow = "Denied? You still have options";
      points = '<li>'+CK+' Free case review — about a minute</li>'+
               '<li>'+CK+' Representatives paid only if you win (fee capped by law)</li>'+
               '<li>'+CK+' Help meeting your 60-day appeal deadline</li>';
    } else {
      eyebrow = "Free Disability Benefits Evaluation";
      points = '<li>'+CK+' No upfront cost — representatives are paid only if you win</li>'+
               '<li>'+CK+' Free, confidential evaluation in about a minute</li>'+
               '<li>'+CK+' Help with first-time claims and denied appeals</li>';
    }
    document.title = title || ("The Disability Office — "+cfg.name);

    app.innerHTML =
      '<section class="splithero">'+
        '<div class="split-copy"><div class="inner">'+
          '<span class="eyebrow">'+eyebrow+'</span>'+
          '<h1 class="head">'+headline+'</h1>'+
          '<p class="lead">'+sub+'</p>'+
          '<ul class="hero-points">'+points+'</ul></div></div>'+
        '<div class="split-quiz"><div class="inner"><div id="quiz"><div class="card" id="quizcard"></div></div></div></div>'+
      '</section>'+
      statStrip()+
      (variant==="denied" ? deniedSupport(cfg) : supportHtml(cfg, city));

    RF.active = true; RF.cfg = cfg;
    injectTrustedForm();
    ensureTFFields();
    try{ history.replaceState({rf:0}, ""); }catch(e){}
    renderStep(cfg, 0, {});
    var qc = document.getElementById("quiz");
    if(qc) qc.addEventListener("focusin", function(){ document.body.classList.add("quiz-engaged"); });
    wireFaq();
  }

  /* ===== Denied / appeal advertorial (verified figures only) ===== */
  function deniedSupport(cfg){
    var cta = function(label){ return '<p class="adcta"><a class="btn btn-grad" href="#quiz">'+(label||'Get my free case review')+' &rsaquo;</a></p>'; };
    var faqs = (cfg.faqs||[]).map(function(f){ return '<details><summary>'+f.q+'</summary><div class="a">'+f.a+'</div></details>'; }).join('');
    return ''+
      '<section id="why"><div class="wrap seo-wrap">'+byline()+
        '<div class="seclabel">Why claims get denied</div>'+
        '<h2 class="sec-h">Why your claim was probably denied (and why that’s good news)</h2>'+
        '<div class="seo-body"><p>Most denials aren’t because you don’t have a real disability — they’re about paperwork and procedure. The most common reasons:</p></div>'+
        '<div class="ptypes">'+
          '<div class="ptype">'+CKp()+'<div><strong>Insufficient medical evidence</strong><span>The #1 reason — records that don’t clearly show how your condition stops you from working.</span></div></div>'+
          '<div class="ptype">'+CKp()+'<div><strong>Filing new instead of appealing</strong><span>A new claim resets the clock and weakens your case. Appealing is almost always the right move.</span></div></div>'+
          '<div class="ptype">'+CKp()+'<div><strong>Earning over the limit</strong><span>More than the SSA’s “substantial gainful activity” limit ($1,690/mo in 2026) can disqualify you regardless of your condition.</span></div></div>'+
          '<div class="ptype">'+CKp()+'<div><strong>Condition not matching SSA criteria</strong><span>You can still qualify — it takes the right medical argument tied to the SSA’s “Blue Book.”</span></div></div>'+
          '<div class="ptype">'+CKp()+'<div><strong>Not enough work credits</strong><span>You may still qualify for SSI; a representative can evaluate both programs.</span></div></div>'+
        '</div>'+
        '<p class="seo-body">Good news: every one of these is something a representative can address on appeal.</p>'+cta('Was my denial improper? Get my free review')+
      '</div></section>'+

      '<section id="appeals" style="background:var(--soft)"><div class="wrap seo-wrap">'+
        '<div class="seclabel">Where appeals are won</div>'+
        '<h2 class="sec-h">Approval rates climb sharply on appeal</h2>'+
        '<table class="adtable"><thead><tr><th>Stage</th><th>Approx. approval</th><th>What it means</th></tr></thead><tbody>'+
          '<tr><td>Initial application</td><td>~36%</td><td>Most are denied here</td></tr>'+
          '<tr><td>Reconsideration</td><td>~16%</td><td>The hardest stage — don’t stop</td></tr>'+
          '<tr class="hot"><td><strong>ALJ hearing</strong></td><td><strong>~50%</strong></td><td><strong>Where approvals outpace denials — and representation matters most</strong></td></tr>'+
          '<tr><td>Appeals Council</td><td>~1–2%</td><td>Mostly sets up federal court</td></tr>'+
        '</tbody></table>'+
        '<p class="seo-body">The hearing stage is where most successful appeals are won — approval jumps from roughly 16% at reconsideration to about half at the hearing (FY2025), and that’s where having a representative makes the biggest measurable difference.</p>'+
      '</div></section>'+

      '<section id="cuts"><div class="wrap seo-wrap">'+
        '<div class="seclabel">2025–26 SSA cuts</div>'+
        '<h2 class="sec-h">What the recent SSA cuts mean for your claim</h2>'+
        '<div class="seo-body"><p>In 2025 the SSA cut roughly <strong>7,500 employees (about 13% of staff)</strong> — the largest staffing reduction in its history — and reduced field-office service. The result: initial decisions now average <strong>6–8 months</strong>, hearings can take a year or more, and the pending-case backlog keeps growing. Translation: the system is slower and less forgiving than ever, and a missed deadline is harder to recover from. The single most important thing you can do is <strong>not miss your 60-day appeal window.</strong></p></div>'+cta('Protect my appeal deadline')+
      '</div></section>'+

      '<section style="background:var(--soft)"><div class="wrap seo-wrap">'+
        '<div class="seclabel">What it could be worth</div>'+
        '<h2 class="sec-h">How much could you be owed?</h2>'+
        '<div class="seo-body"><p>If approved, you may receive monthly benefits of <strong>up to $4,152 (2026)</strong> based on your work history — <strong>plus back pay</strong> dating to your eligibility, which can add up to thousands of dollars in a lump sum. (The average SSDI benefit is about $1,630/mo; amounts depend on your record.) A free review is the fastest way to find out what your claim may be worth.</p></div>'+
      '</div></section>'+

      '<section><div class="wrap seo-wrap">'+
        '<div class="seclabel">No upfront cost</div>'+
        '<h2 class="sec-h">How representation changes your odds — at no upfront cost</h2>'+
        '<div class="seo-body"><p>Disability representatives work on <strong>contingency</strong>: their fee is <strong>capped by federal law</strong> (25% of past-due benefits, up to $9,200) and they’re <strong>paid only if you win</strong>. There is <strong>never an upfront bill to you.</strong> They strengthen your medical evidence, prepare your testimony, meet every deadline, and argue your case at the hearing — exactly where unrepresented claimants tend to lose.</p></div>'+cta('See if a representative can help — free')+
      '</div></section>'+

      '<section id="faq"><div class="wrap"><div class="center"><div class="seclabel">Questions</div><h2 class="sec-h">Denied SSDI — common questions</h2></div>'+
        '<div class="faq" style="margin-top:24px">'+faqs+'</div></div></section>'+

      '<section class="ssa-disc"><div class="wrap"><p class="box"><strong>The Disability Office is not the Social Security Administration (SSA) or any government agency,</strong> and is not affiliated with or endorsed by SSA. We are a free, privately owned service that connects people with independent disability representatives. You can apply for benefits and appeal for free, directly with the SSA at SSA.gov. This website does not provide legal advice.</p></div></section>'+

      '<section class="band cta-band"><div class="wrap"><h2 class="sec-h">Was your denial improper? Find out free.</h2>'+
        '<p class="sec-sub">A free case review takes about a minute — and your 60-day window won’t wait.</p>'+
        '<a class="btn btn-grad btn-lg" href="#quiz">Start My Free Case Review</a></div></section>';
  }
  function CKp(){ return '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'; }

  function supportHtml(cfg, city){
    var chk = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
    var quals = (cfg.qualify||[]).map(function(q){ return '<div class="qitem"><span class="qmark">'+chk+'</span><div><strong>'+q.h+'</strong><span>'+q.p+'</span></div></div>'; }).join('');
    var process = (cfg.process||[]).map(function(s,i){ return '<div class="vstep"><div class="vn">'+(i+1)+'</div><div class="vtx"><h3>'+s.h+'</h3><p>'+s.p+'</p></div></div>'; }).join('');
    var conds = (cfg.conditions||[]).map(function(c){ return '<div class="cond">'+chk+'<span>'+c+'</span></div>'; }).join('');
    var faqs = (cfg.faqs||[]).map(function(f){ return '<details><summary>'+f.q+'</summary><div class="a">'+f.a+'</div></details>'; }).join('');
    return ''+
      '<section id="qualify"><div class="wrap center"><div class="seclabel">Who may qualify</div>'+
        '<h2 class="sec-h">You may qualify if&hellip;</h2>'+
        '<p class="sec-sub">SSDI is for people who worked and paid into Social Security but can no longer work because of a medical condition. A few signs you may be eligible:</p>'+
        '<div class="qualify">'+quals+'</div></div></section>'+
      '<section id="how" style="background:var(--soft)"><div class="wrap center"><div class="seclabel">How it works</div>'+
        '<h2 class="sec-h">Getting help is simple</h2>'+
        '<div class="vtimeline">'+process+'</div></div></section>'+
      '<section id="conditions"><div class="wrap center"><div class="seclabel">Conditions that may qualify</div>'+
        '<h2 class="sec-h">Hundreds of conditions can qualify</h2>'+
        '<p class="sec-sub">Physical or mental — if your condition keeps you from working, it may qualify. A few common examples:</p>'+
        '<div class="conds">'+conds+'</div></div></section>'+
      '<section class="reassure"><div class="wrap"><div class="rgrid">'+
        '<div><div class="seclabel">No upfront cost</div><h2>You pay nothing out of pocket</h2>'+
          '<p>Disability representatives work on contingency: their fee is set and capped by federal law — a percentage of your back pay, only if you&rsquo;re approved. There is never an upfront bill to you.</p>'+
          '<p>Already denied? You&rsquo;re not alone — most first-time claims are denied, and a representative can handle your appeal.</p></div>'+
        '<div class="rcard"><div class="big">$0</div><div class="lbl">Upfront cost to you</div><hr>'+
          '<div class="big">25%</div><div class="lbl">Federal cap on representative fees — charged only if you win</div></div>'+
        '</div></div></section>'+
      seoHtml(cfg, city)+
      '<section id="faq"><div class="wrap"><div class="center"><div class="seclabel">Questions</div><h2 class="sec-h">Disability benefits — common questions</h2></div>'+
        '<div class="faq" style="margin-top:24px">'+faqs+'</div></div></section>'+
      '<section class="ssa-disc"><div class="wrap"><p class="box"><strong>The Disability Office is not the Social Security Administration (SSA) or any government agency,</strong> and is not affiliated with or endorsed by SSA. We are a free, privately owned service that connects people with independent disability representatives. You can apply for benefits for free, directly with the SSA at SSA.gov. This website does not provide legal advice.</p></div></section>'+
      '<section class="band cta-band"><div class="wrap"><h2 class="sec-h">See if you may qualify today</h2>'+
        '<p class="sec-sub">Free, confidential, and takes about a minute. No obligation.</p>'+
        '<a class="btn btn-grad btn-lg" href="#quiz">Start My Free Evaluation</a></div></section>';
  }

  /* SEO content block: intro + cost factors + options/types. Drawn from cfg.seo. */
  function seoHtml(cfg, city){
    var seo = cfg.seo; if(!seo) return "";
    var area = city ? (city.metro+', '+city.state) : "your area";
    var lead = (seo.lead||[]).map(function(p){
      return '<p>'+p.replace(/\{area\}/g, area).replace(/\{metro\}/g, city?city.metro:"your area")+'</p>';
    }).join('');
    var factors = (seo.factors||[]).map(function(f){
      return '<div class="factor"><h3>'+f.h+'</h3><p>'+f.p+'</p></div>';
    }).join('');
    var typesList = (seo.types||[]).map(function(t){
      return '<div class="ptype">'+CK+'<div><strong>'+t.h+'</strong><span>'+t.p+'</span></div></div>';
    }).join('');
    var heading = city ? (cfg.name+' in '+city.metro+', '+city.state) : seo.heading;
    return '<section><div class="wrap seo-wrap">'+
        '<div class="seclabel">'+(seo.label||'Project guide')+'</div>'+
        '<h2 class="sec-h">'+heading+'</h2>'+
        '<div class="seo-body">'+lead+'</div>'+
        (factors?'<h3 class="seo-sub">What affects the cost</h3><div class="factors">'+factors+'</div>':'')+
        (typesList?'<h3 class="seo-sub">Popular options</h3><div class="ptypes">'+typesList+'</div>':'')+
        '<p class="seo-cta"><a class="btn btn-grad" href="#quiz">See your '+cfg.word+' options &rsaquo;</a></p>'+
      '</div></section>';
  }

  /* Project gallery: styled, captioned tiles. Real photos drop into /assets/<vertical>/N.jpg;
     until then a tasteful labelled placeholder renders (no broken images, nothing fake-claimed). */
  function galleryHtml(cfg){
    var g = cfg.gallery; if(!g || !g.length) return "";
    var v = window.SITE_VERTICAL;
    var imgs = (window.SITE_IMAGES||{})[v] || [];
    var tiles = g.map(function(cap, i){
      // Free, commercially-licensed Unsplash photos (Unsplash License). A local
      // /assets/<vertical>/<n>.jpg overrides if present; gradient placeholder is the final fallback.
      var src = imgs[i] ? (imgs[i]+"?auto=format&fit=crop&w=800&h=600&q=72") : ("/assets/"+v+"/"+(i+1)+".jpg");
      return '<figure class="gtile g'+((i%5)+1)+'">'+
        '<img src="'+src+'" alt="'+esc(cap)+'" loading="lazy" '+
          'onerror="this.style.display=\'none\';this.parentNode.classList.add(\'noimg\')">'+
        '<figcaption>'+cap+'</figcaption></figure>';
    }).join('');
    return '<section style="background:var(--soft)"><div class="wrap"><div class="center">'+
        '<div class="seclabel">Project inspiration</div>'+
        '<h2 class="sec-h">'+cfg.name+' projects &amp; ideas</h2></div>'+
        '<div class="gallery">'+tiles+'</div>'+
        '<p class="gnote center">Examples of the kinds of '+cfg.word+' projects local pros in our network take on.</p>'+
      '</div></section>';
  }

  function renderStep(cfg, idx, data){
    var steps = cfg.steps;
    var card = document.getElementById("quizcard");
    if(!card) return;
    RF.idx = idx; RF.data = data; RF.cfg = cfg;
    var total = steps.length;
    var pctNum = Math.round((idx/total)*100);
    var step = steps[idx];
    var h = '<div class="progress"><div class="ptrack"><div class="pfill" style="width:'+pctNum+'%"></div></div><div class="pct">Step '+(idx+1)+' of '+total+'</div></div><div class="pest">~1 minute left</div>';
    if(idx>0) h += '<button class="back" type="button" data-back="1">&lsaquo; Back</button>';
    h += '<div class="qrow">'+AVATAR+'<div class="qbubble">'+helperFor(step, idx, total)+'</div></div>';
    h += '<div class="q">'+step.q+'</div>'+(step.sub?'<p class="qsub">'+step.sub+'</p>':'');

    if(step.type==="zip"){
      h+='<div class="field"><input id="f_zip" inputmode="numeric" pattern="[0-9]*" maxlength="5" placeholder="ZIP Code" value="'+(data.zip||'')+'"></div>'+
         '<button class="btn btn-grad btn-lg" type="button" data-zip="1">Continue &rsaquo;</button>';
    } else if(step.type==="single"){
      h+='<div class="opts">'+step.options.map(function(o,i){return '<button class="opt" type="button" data-pick="'+i+'"><span>'+o+'</span><span class="dot"></span></button>';}).join('')+'</div>';
    } else if(step.type==="multi"){
      h+='<div class="opts" id="multi">'+step.options.map(function(o,i){return '<button class="opt" type="button" data-multi="'+i+'"><span>'+o+'</span><span class="dot"></span></button>';}).join('')+'</div>'+
         '<button class="btn btn-grad btn-lg" style="margin-top:12px" type="button" data-multinext="1">Continue &rsaquo;</button>';
    } else if(step.type==="address"){
      h+='<div class="field"><input id="f_addr" placeholder="Street address" value="'+(data.address||'')+'"></div>'+
         '<button class="btn btn-grad btn-lg" type="button" data-addr="1">Continue &rsaquo;</button>';
    } else if(step.type==="contact"){
      // TrustedForm tagged consent (use_tagged_consent=true): roles let lead buyers run Verify checks.
      h+='<div class="two"><div class="field"><input id="f_first" placeholder="First name" data-tf-element-role="consent-grantor-name" value="'+(data.first||'')+'"></div>'+
         '<div class="field"><input id="f_last" placeholder="Last name" value="'+(data.last||'')+'"></div></div>'+
         '<div class="field"><input id="f_email" type="email" inputmode="email" placeholder="Email address" data-tf-element-role="consent-grantor-email" value="'+(data.email||'')+'"></div>'+
         '<div class="field"><input id="f_phone" type="tel" inputmode="tel" placeholder="Phone number" data-tf-element-role="consent-grantor-phone" value="'+(data.phone||'')+'"></div>'+
         '<label class="consentbox" data-tf-element-role="consent-language"><input type="checkbox" id="f_consent"> <span>By checking this box, I agree to be contacted by <span data-tf-element-role="consent-advertiser-name">The Disability Office and the independent disability advocates, attorneys, and <a href="/partners" target="_blank" rel="noopener">marketing partners</a> it works with</span> by <span data-tf-element-role="contact-method">phone call, text message, and email</span> about Social Security Disability benefits and related services at the number and email I provide, <span data-tf-element-role="consent-grantor-waived-regulated-technologies">including through automated dialing technology, prerecorded messages, and artificial or AI-generated voice</span>, <span data-tf-element-role="consent-grantor-waived-dnc">even if my number is on a federal, state, or internal Do-Not-Call list</span>. <span data-tf-element-role="consent-grantor-waived-purchase-condition">Consent is not required to get help and is not a condition of any purchase or services.</span> Message and data rates may apply; reply STOP to opt out. See our <a href="/privacy-policy" target="_blank">Privacy Policy</a> and <a href="/terms-and-conditions" target="_blank">Terms &amp; Conditions</a>.</span></label>'+
         '<button class="btn btn-grad btn-lg" type="button" data-submit="1" data-tf-element-role="submit" disabled>See If I Qualify &rsaquo;</button>'+
         '<input type="hidden" id="leadid_token" name="universal_leadid" />'+
         '<p class="consent disclaim">The Disability Office is a free, privately owned referral service. We are not the Social Security Administration (SSA), a government agency, or a law firm, and we are not affiliated with or endorsed by any government agency. Social Security Disability benefits are available for free directly from the SSA at SSA.gov. Submitting this form is not an application for benefits and does not guarantee approval or any particular outcome. If you request a consultation, you may be contacted by an independent attorney or non-attorney advocate.</p>';
    }

    h += '<div class="err" id="err"></div>'+
      '<div class="trustcues">'+
        '<span>'+LOCK+' 256-bit SSL secured</span>'+
        '<span>'+SHIELD+' Your info is private</span>'+
        '<span>'+CK+' No spam — ever</span>'+
        (TRUSTEDFORM?'<span>'+CK+' TrustedForm&reg; verified</span>':'')+
      '</div>';
    card.innerHTML = h;
    // TrustedForm "offer" wraps the consent area + submit — only on the contact step.
    if(step.type==="contact"){ card.setAttribute("data-tf-element-role","offer"); }
    else { card.removeAttribute("data-tf-element-role"); }

    // wire
    var back = card.querySelector("[data-back]"); if(back) back.onclick=function(){ if(history.state && typeof history.state.rf==="number" && history.state.rf>0){ history.back(); } else { renderStep(cfg, idx-1, data); } };
    var errEl = function(m){ var e=document.getElementById("err"); if(e) e.textContent=m||""; };
    var next = function(nd){ document.body.classList.add("quiz-engaged"); var d=Object.assign({}, data, nd||{}); if(idx<total-1){ try{ history.pushState({rf:idx+1}, ""); }catch(e){} renderStep(cfg, idx+1, d); } else doSubmit(cfg, d); };

    if(step.type==="single"){
      Array.prototype.forEach.call(card.querySelectorAll("[data-pick]"), function(b){
        b.onclick=function(){ var v=step.options[+b.getAttribute("data-pick")]; var nd={}; nd[step.id]=v; setTimeout(function(){ next(nd); },140); b.classList.add("sel"); };
      });
    }
    if(step.type==="multi"){
      var chosen=[];
      Array.prototype.forEach.call(card.querySelectorAll("[data-multi]"), function(b){
        b.onclick=function(){ var v=step.options[+b.getAttribute("data-multi")]; b.classList.toggle("sel"); var k=chosen.indexOf(v); if(k>-1) chosen.splice(k,1); else chosen.push(v); };
      });
      card.querySelector("[data-multinext]").onclick=function(){ var nd={}; nd[step.id]=chosen.join(", "); next(nd); };
    }
    if(step.type==="zip"){
      card.querySelector("[data-zip]").onclick=function(){ var el=document.getElementById("f_zip"); var v=(el.value||"").trim(); if(!/^\d{5}$/.test(v)){ el.classList.add("bad"); return errEl("Please enter a valid 5-digit ZIP code."); } next({zip:v}); };
    }
    if(step.type==="address"){
      card.querySelector("[data-addr]").onclick=function(){ var el=document.getElementById("f_addr"); var v=(el.value||"").trim(); if(v.length<5){ el.classList.add("bad"); return errEl("Please enter your project address."); } next({address:v}); };
    }
    if(step.type==="contact"){
      var subBtn=card.querySelector("[data-submit]"), cbox=document.getElementById("f_consent");
      if(cbox&&subBtn) cbox.addEventListener("change", function(){ subBtn.disabled=!cbox.checked; });
      if(subBtn) subBtn.onclick=function(){ submitContact(cfg, idx, data, this); };
    }
  }

  function submitContact(cfg, idx, data, btn){
    var first=val("f_first"), last=val("f_last"), email=val("f_email"), phone=val("f_phone");
    var err=function(m,id){ var e=document.getElementById("err"); if(e)e.textContent=m; if(id){var x=document.getElementById(id); if(x)x.classList.add("bad");} };
    document.getElementById("err").textContent="";
    if(!first){ return err("Please enter your first name.","f_first"); }
    if(!last){ return err("Please enter your last name.","f_last"); }
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ return err("Please enter a valid email address.","f_email"); }
    if(phone.replace(/\D/g,"").length<10){ return err("Please enter a valid phone number.","f_phone"); }
    var cbx=document.getElementById("f_consent");
    if(cbx && !cbx.checked){ return err("Please check the box to agree to be contacted so a representative can reach you."); }
    if(btn.dataset.busy==="1") return; // double-submit guard
    btn.dataset.busy="1"; btn.disabled=true; btn.textContent="Submitting…";
    // Qualification gate — don't ping-post obviously unqualified leads (working full-time / already receiving / past retirement age).
    var dq = (data.work==="No, I'm working full-time") || (data.receiving==="Yes, I already receive benefits") || (data.age==="Over 67");
    var lead = Object.assign({}, data, {first:first,last:last,email:email,phone:phone,vertical:window.SITE_VERTICAL,variant:(window.SITE_VARIANT||"eligibility"),qualified:!dq,consent:true,ts:Date.now()});
    lead.xxTrustedFormCertUrl = val("xxTrustedFormCertUrl");
    lead.xxTrustedFormPingUrl = val("xxTrustedFormPingUrl");
    lead.universal_leadid = val("leadid_token");
    lead.consentText = "I agree to be contacted by The Disability Office and the independent disability advocates, attorneys, and marketing partners it works with (up to "+BUYER_CAP+" companies) by phone, text, and email, including via automated dialing technology and prerecorded/AI voice, even if my number is on a Do-Not-Call list. Consent is not required to get help. Reply STOP to opt out.";
    lead.pageUrl = location.href;
    if(window.SITE_CITY) lead.city = window.SITE_CITY.name;
    doSubmit(cfg, lead, btn);
  }

  function doSubmit(cfg, lead, btn){
    var finish=function(callNumber){
      RF.active=false;
      var quiz=document.getElementById("quiz");
      var nm=lead.first?', '+esc(lead.first):'';
      var html;
      if(lead.qualified){
        html='<div class="thanks show"><div class="big"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>'+
          '<div class="q">Good news'+nm+' — you may qualify.</div>'+
          '<p class="qsub">Your free review request is in. An independent disability representative will call you shortly to go over your options. There’s no cost unless you win.</p>'+
          (callNumber?'<div class="callrow"><a class="btn btn-grad btn-lg" href="'+telHref(callNumber)+'">📞 Prefer to talk now? Call a representative</a></div>':'')+
          '<div class="trustcues" style="margin-top:16px"><span>Free &amp; confidential · No obligation · Not the SSA</span></div></div>';
      } else {
        html='<div class="thanks show"><div class="big" style="background:var(--accent)"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5h.01"/></svg></div>'+
          '<div class="q">Thanks'+nm+' — let’s point you the right way.</div>'+
          '<p class="qsub">Based on your answers, a standard SSDI claim may not be the best fit right now. You may still have options — for example <strong>SSI</strong>, a need-based program, or reapplying later. You can review your options and apply for free directly with the SSA at <a href="https://www.ssa.gov" target="_blank" rel="nofollow noopener">SSA.gov</a>.</p>'+
          '<div class="trustcues" style="margin-top:16px"><span>The Disability Office is a free service and is not the SSA.</span></div></div>';
      }
      quiz.innerHTML='<div class="card">'+html+'</div>';
      try{ if(window.dataLayer) window.dataLayer.push({event:'lead_submit', qualified:!!lead.qualified, variant:lead.variant}); }catch(e){}
      try{ if(window.gtag && lead.qualified) gtag('event','generate_lead',{items:[{item_category:window.SITE_VERTICAL}]}); }catch(e){}
      try{ if(window.fbq && lead.qualified) fbq('track','Lead'); }catch(e){}
      window.scrollTo({top:0,behavior:"smooth"});
    };
    var fail=function(){
      var e=document.getElementById("err");
      if(e) e.textContent="Sorry — something went wrong submitting your request. Please try again.";
      if(btn){ btn.disabled=false; btn.dataset.busy=""; btn.textContent="See If I Qualify ›"; }
    };
    fetch(SUBMIT_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(lead)})
      .then(function(r){ if(!r.ok) throw new Error("bad status"); return r.json(); })
      .then(function(j){ finish(j&&j.callNumber?j.callNumber:PHONE_NUMBER); })
      .catch(fail);
  }

  /* ===== Conversion chrome: urgency banner, stat strip, byline, exit-intent ===== */
  /* All figures are sourced/verified (FY2025 SSA data + 2026 COLA). Do not edit to unverified numbers. */
  var STATS = [
    {n:"~64%", l:"of first-time SSDI claims are denied"},
    {n:"~84%", l:"of reconsideration appeals are denied"},
    {n:"~50%", l:"approved at the ALJ hearing stage — higher with representation"},
    {n:"$4,152", l:"max monthly benefit in 2026 (avg ~$1,630)"},
    {n:"60 days", l:"to appeal each denial — don't miss it"},
    {n:"6–8 mo.", l:"average wait for an initial decision"}
  ];
  function statStrip(){
    return '<section class="stats"><div class="wrap"><div class="statgrid">'+
      STATS.map(function(s){return '<div class="stat"><div class="sn">'+s.n+'</div><div class="sl">'+s.l+'</div></div>';}).join('')+
      '</div><p class="statsrc">Sources: SSA FY2025 disability data &amp; 2026 COLA fact sheet. The Disability Office is not the SSA.</p></div></section>';
  }
  function byline(){
    return '<p class="byline">By <strong>The Disability Office Editorial Team</strong> &middot; Reviewed for accuracy &middot; Last updated June 2026</p>';
  }
  function urgencyBanner(){
    if(sessionStorage.getItem("rf_banner_x")==="1") return null;
    var b=document.createElement("div"); b.className="ubanner";
    b.innerHTML='<div class="wrap ubar"><span class="utext"><strong>SSA cuts have pushed disability waits to 6–8 months</strong> — and a denial gives you just 60 days to appeal. See what you may be owed — free, in about a minute.</span>'+
      '<a class="ucta" href="#quiz">Check Now →</a><button class="ux" type="button" aria-label="Dismiss">×</button></div>';
    b.querySelector(".ux").onclick=function(){ try{sessionStorage.setItem("rf_banner_x","1");}catch(e){} b.remove(); };
    return b;
  }
  /* Jornaya/LeadiD — second consent certificate. Off unless window.SITE_JORNAYA_CAMPAIGN is set. */
  function injectJornaya(){
    var camp = window.SITE_JORNAYA_CAMPAIGN; if(!camp || window.__rf_jornaya) return; window.__rf_jornaya=true;
    try{
      var s=document.createElement("script"); s.id="LeadiDscript_campaign"; s.type="text/javascript"; s.async=true;
      s.src="//create.lidstatic.com/campaign/"+camp+".js?snippet_version=2";
      var f=document.getElementsByTagName("script")[0]; f.parentNode.insertBefore(s,f);
    }catch(e){}
  }
  /* Exit-intent / abandonment recovery: capture a callback number with explicit consent. */
  function exitIntent(){
    if(sessionStorage.getItem("rf_exit")==="1") return;
    var shown=false;
    var show=function(){
      if(shown || document.body.classList.contains("quiz-engaged")) return; shown=true;
      try{sessionStorage.setItem("rf_exit","1");}catch(e){}
      var o=document.createElement("div"); o.className="exitmodal";
      o.innerHTML='<div class="exitcard"><button class="exitx" type="button" aria-label="Close">×</button>'+
        '<h3>Before you go — don’t lose your appeal window</h3>'+
        '<p>Leave your number and an independent representative can call you for a free review. No cost, no obligation.</p>'+
        '<div class="field"><input id="ex_phone" type="tel" inputmode="tel" placeholder="Your phone number"></div>'+
        '<label class="exconsent"><input type="checkbox" id="ex_consent"> <span>I agree to be contacted by The Disability Office and the independent representatives &amp; <a href="/partners" target="_blank" rel="noopener">marketing partners</a> it works with by phone, text, and email (including autodialed/prerecorded/AI voice), even if on a Do-Not-Call list. Consent isn’t required to get help. Reply STOP to opt out.</span></label>'+
        '<button class="btn btn-grad btn-lg" id="ex_go" type="button">Have a representative call me</button>'+
        '<p class="exfine">You can also apply free at SSA.gov. We are not the SSA.</p></div>';
      document.body.appendChild(o);
      var close=function(){ o.remove(); };
      o.querySelector(".exitx").onclick=close; o.onclick=function(e){ if(e.target===o) close(); };
      o.querySelector("#ex_go").onclick=function(){
        var p=(document.getElementById("ex_phone").value||"").replace(/\D/g,"");
        if(p.length<10){ document.getElementById("ex_phone").classList.add("bad"); return; }
        if(!document.getElementById("ex_consent").checked){ document.getElementById("ex_consent").parentNode.style.color="#b5512f"; return; }
        var lead={phone:p,source:"exit-intent",vertical:window.SITE_VERTICAL,variant:window.SITE_VARIANT||"eligibility",consent:true,ts:Date.now(),pageUrl:location.href,xxTrustedFormCertUrl:val("xxTrustedFormCertUrl")};
        try{ fetch(SUBMIT_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(lead)}); }catch(e){}
        try{ if(window.fbq) fbq('track','Lead',{source:'exit_intent'}); }catch(e){}
        o.querySelector(".exitcard").innerHTML='<button class="exitx" type="button" aria-label="Close">×</button><h3>Thank you — you’re on the list.</h3><p>An independent representative will reach out shortly for your free review.</p>';
        o.querySelector(".exitx").onclick=close;
      };
    };
    document.addEventListener("mouseout", function(e){ if(e.clientY<=0 && !e.relatedTarget) show(); });
    setTimeout(function(){ if(window.matchMedia && window.matchMedia("(max-width:780px)").matches) show(); }, 30000);
  }

  function wireFaq(){ /* native <details>; nothing needed */ }
  function val(id){ var e=document.getElementById(id); return e?(e.value||"").trim():""; }
  function esc(s){ return (s||"").replace(/[<>&"]/g,function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c];}); }

  /* ===== Boot ===== */
  function boot(){
    document.body.insertBefore(header(), document.body.firstChild);
    var ub=urgencyBanner(); if(ub) document.body.insertBefore(ub, document.body.firstChild);
    if(window.SITE_PAGE==="vertical") buildVertical();
    document.body.appendChild(footer());
    document.body.appendChild(sticky());
    injectJornaya(); exitIntent();
    window.addEventListener("popstate", function(e){
      if(!RF.active || !RF.cfg) return;
      var t = (e.state && typeof e.state.rf === "number") ? e.state.rf : null;
      if(t === null) return;
      renderStep(RF.cfg, t, RF.data);
    });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
