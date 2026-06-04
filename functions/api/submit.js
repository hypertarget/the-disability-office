// Cloudflare Pages Function — POST /api/submit
// Receives the lead, (later) fraud-scores it, ping-posts QUALIFIED leads to buyers, and returns a
// pay-per-call number. v1: validates + echoes a call number if configured via env. Wire services later.
//
// Set these in Cloudflare Pages → Settings → Environment variables:
//   LEAD_POST_URL, LEAD_POST_API_KEY, LEAD_BUYER_IDS, LEAD_MAX_BUYERS
//   CALL_NUMBER (Ringba/Retreaver number for the qualified thank-you / warm transfer)
//   ANURA_INSTANCE_ID / EHAWK_API_KEY (fraud scoring)

export async function onRequestPost({ request, env }) {
  let lead = {};
  try { lead = await request.json(); } catch (_) {}

  const phoneDigits = (lead.phone || "").replace(/\D/g, "");
  const isExit = lead.source === "exit-intent";

  // Validation: full leads need email + phone + ZIP; exit-intent partials need a valid phone only.
  if (isExit) {
    if (phoneDigits.length < 10) return json({ ok: false, message: "Invalid phone" }, 400);
  } else {
    const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.email || "");
    if (!emailOk || phoneDigits.length < 10 || !/^\d{5}$/.test(lead.zip || "")) {
      return json({ ok: false, message: "Missing or invalid required fields" }, 400);
    }
  }

  // Normalized lead record (includes consent proof for TCPA + buyer transmission).
  const record = {
    first: lead.first || "", last: lead.last || "", email: lead.email || "", phone: phoneDigits,
    zip: lead.zip || "", vertical: lead.vertical || "ssdi", variant: lead.variant || "eligibility",
    source: lead.source || "funnel", qualified: lead.qualified !== false, // default true unless gated false
    answers: lead, consent: lead.consent === true, consentText: lead.consentText || "",
    trustedFormCertUrl: lead.xxTrustedFormCertUrl || "",        // tamper-proof consent cert
    trustedFormPingUrl: lead.xxTrustedFormPingUrl || "",
    universalLeadId: lead.universal_leadid || "",               // Jornaya/LeadiD token
    pageUrl: lead.pageUrl || "", ip: request.headers.get("CF-Connecting-IP") || "",
    userAgent: request.headers.get("User-Agent") || "", ts: Date.now(),
  };

  // INTEGRATE: fraud score (Anura/eHawk), phone/email verification, then ping-post to buyers.
  // GUARDRAIL: only ping-post QUALIFIED, full leads to buyers — never sell unqualified or partial
  // (exit-intent) leads. Capture everything for your own records/CRM regardless.
  const sellable = record.qualified && !isExit && record.consent;
  if (sellable && env && env.LEAD_POST_URL && env.LEAD_POST_API_KEY) {
    // await fetch(env.LEAD_POST_URL, { method:"POST",
    //   headers:{ Authorization:`Bearer ${env.LEAD_POST_API_KEY}` },
    //   body: JSON.stringify(record) });   // forwards trustedFormCertUrl + universalLeadId to buyers
  }
  // INTEGRATE (always, for your own CRM/records): store `record` regardless of sellability.

  // Only surface a call number to qualified leads (pay-per-call / warm transfer).
  const callNumber = record.qualified && !isExit ? ((env && env.CALL_NUMBER) || "") : "";
  return json({ ok: true, qualified: record.qualified, callNumber });
}

export async function onRequestGet() {
  return json({ ok: true, service: "the-disability-office lead endpoint", method: "POST" });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}
