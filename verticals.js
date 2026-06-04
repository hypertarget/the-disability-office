/* The Disability Office — SSDI eligibility funnel content. Plain-language qualifier (easy first,
   contact last), reassurance modules, and SEO. No outcome promises; positioned as a private service. */
(function(){
  window.SITE_VERTICALS = {
    ssdi:{
      name:"Social Security Disability (SSDI)", word:"benefits",
      title:"Social Security Disability (SSDI) Benefits — Free Evaluation | The Disability Office",
      headline:"You may be eligible for monthly disability benefits",
      sub:"Many Americans who can no longer work because of a medical condition qualify for Social Security Disability (SSDI) — but most are denied the first time. See if you may qualify in about a minute. Free, confidential, no obligation.",
      steps:[
        {id:"work", type:"single", q:"Are you currently unable to work because of a medical condition?", options:["Yes — I can't work at all","I can only work part-time","No, I'm working full-time"]},
        {id:"duration", type:"single", q:"How long has your condition affected your ability to work?", options:["Less than 12 months","12 months or longer","Expected to last 12+ months or is terminal"]},
        {id:"receiving", type:"single", q:"Are you currently receiving disability benefits?", options:["No, not yet","Yes, I already receive benefits","I'm not sure"]},
        {id:"age", type:"single", q:"What is your age range?", options:["Under 50","50 to 59","60 to 67","Over 67"]},
        {id:"applied", type:"single", q:"Have you applied for disability before?", options:["No — this would be my first time","Yes, and I was denied","Yes, it's currently pending"]},
        {id:"zip", type:"zip", q:"What's your ZIP code?", sub:"We use it only to match you with a disability representative near you — never shared publicly."},
        {id:"contact", type:"contact", q:"Where should we send your free evaluation?", sub:"Your information is private, secure, and confidential."}
      ],
      qualify:[
        {h:"You worked and paid into Social Security", p:"SSDI is based on the work credits you earned — generally about 5 of the last 10 years."},
        {h:"A condition keeps you from working", p:"Physical or mental — if it prevents you from holding a job, it may qualify."},
        {h:"It has lasted (or will last) 12+ months", p:"SSDI is for long-term disabilities, not short-term illness or injury."},
        {h:"You're under full retirement age", p:"SSDI generally applies before retirement age, then converts to retirement benefits."},
        {h:"You're not already receiving SSDI", p:"If you've been approved, you're set. This is for new claims and appeals."},
        {h:"You were denied before", p:"Most first-time claims are denied — a representative can help you appeal, and many cases are won on appeal."}
      ],
      process:[
        {h:"Take the free evaluation", p:"Answer a few quick questions — about a minute — to see if you may qualify. No cost, no obligation."},
        {h:"Talk with a representative", p:"If you may qualify, we connect you with an independent disability advocate or attorney for a free consultation."},
        {h:"They handle the paperwork", p:"Your representative helps gather medical records, file your claim, and meet every SSA deadline."},
        {h:"Appeal if you're denied", p:"Most claims are denied at first. Your representative manages the appeal — where many claims are ultimately won."},
        {h:"Receive your benefits", p:"If approved, you get monthly benefits plus any back pay you're owed. Representatives are paid only if you win."}
      ],
      conditions:["Back & spine conditions","Arthritis & joint problems","Heart conditions","Cancer","Depression & anxiety","PTSD","Diabetes & complications","COPD & respiratory","Neurological disorders","Autoimmune diseases","Chronic pain / fibromyalgia","Vision or hearing loss"],
      faqs:[
        {q:"What is SSDI?", a:"Social Security Disability Insurance (SSDI) pays monthly benefits to people who worked and paid Social Security taxes but can no longer work because of a qualifying disability expected to last at least 12 months. It's a federal program run by the Social Security Administration."},
        {q:"Does it cost anything to apply or to get help?", a:"You can apply for free directly with the SSA at SSA.gov. The Disability Office is also free — we never charge you. If you choose to work with a disability representative, they are paid only if your claim is approved, and the fee is capped by federal law (a percentage of back pay)."},
        {q:"How much could I receive?", a:"Monthly amounts depend on your work history and earnings; many recipients also receive past-due (back) benefits for the months their claim was pending. A representative can estimate your situation during your free consultation."},
        {q:"I was already denied — can I still get benefits?", a:"Yes. Most first-time claims are denied, and a large share of denials are later approved on appeal. A representative can review your denial and handle the appeal process for you."},
        {q:"How long does the process take?", a:"It varies. Initial decisions often take several months, and appeals can take longer. Having an experienced representative helps avoid delays from missing paperwork or deadlines."},
        {q:"Do I need a lawyer?", a:"You're not required to have one, but many people choose a representative — an attorney or qualified non-attorney advocate — to handle the paperwork, evidence, and appeals. Because they're paid only if you win, there's no upfront cost."},
        {q:"Are you the government or the Social Security Administration?", a:"No. The Disability Office is a privately owned, free referral service. We are not the SSA, not a government agency, and not a law firm, and we are not affiliated with or endorsed by any government agency. You can always apply for free directly at SSA.gov."}
      ],
      seo:{
        label:"Disability benefits guide", heading:"Social Security Disability (SSDI): what to know",
        lead:[
          "Social Security Disability Insurance helps people who built up a work history but can no longer earn a living because of a serious medical condition. Eligibility generally depends on your work credits, the severity and expected length of your condition (at least 12 months), and whether you're earning above the SSA's limits. The rules are detailed, and small mistakes on an application are a common reason claims are denied.",
          "Because the process is paperwork-heavy and most first-time claims are denied, many people work with an independent disability representative who handles the filing and any appeals — paid only if the claim is approved, with fees capped by federal law. The Disability Office is a free service that helps you check whether you may qualify and connects you with a representative if you'd like one. We are not the SSA; you can also apply for free at SSA.gov."
        ]
      }
    }
  };
})();
