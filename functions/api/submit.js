// Cloudflare Pages Function — POST /api/submit
// Receives the lead, (later) fraud-scores it, ping-posts to buyers, and returns a pay-per-call number.
// v1: validates + logs + echoes a call number if configured via env. Wire real services later.
//
// Set these in Cloudflare Pages → Settings → Environment variables:
//   LEAD_POST_URL, LEAD_POST_API_KEY, LEAD_BUYER_IDS, LEAD_MAX_BUYERS
//   CALL_NUMBER (static Ringba/Retreaver number to show on the thank-you screen)
//   ANURA_INSTANCE_ID / EHAWK_API_KEY (fraud scoring)

export async function onRequestPost({ request, env }) {
  let lead = {};
  try { lead = await request.json(); } catch (_) {}

  // basic server-side validation
  const phoneDigits = (lead.phone || "").replace(/\D/g, "");
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.email || "");
  if (!emailOk || phoneDigits.length < 10 || !/^\d{5}$/.test(lead.zip || "")) {
    return json({ ok: false, message: "Missing or invalid required fields" }, 400);
  }

  // Normalized lead record (includes consent proof for TCPA + buyer transmission).
  const record = {
    first: lead.first, last: lead.last, email: lead.email, phone: phoneDigits,
    zip: lead.zip, address: lead.address || "", vertical: lead.vertical || "",
    city: lead.city || "", answers: lead,                       // full quiz answers
    consent: lead.consent === true, consentText: lead.consentText || "",
    trustedFormCertUrl: lead.xxTrustedFormCertUrl || "",        // tamper-proof consent cert
    trustedFormPingUrl: lead.xxTrustedFormPingUrl || "",
    pageUrl: lead.pageUrl || "", ip: request.headers.get("CF-Connecting-IP") || "",
    userAgent: request.headers.get("User-Agent") || "", ts: Date.now(),
  };

  // INTEGRATE: fraud score (Anura/eHawk), phone/email verification.
  // INTEGRATE: ping-post to LEAD_POST_URL with LEAD_BUYER_IDS (Boberdoo/LeadProsper/Phonexa),
  //            forwarding record.trustedFormCertUrl so buyers can claim the consent cert.
  if (env && env.LEAD_POST_URL && env.LEAD_POST_API_KEY) {
    // await fetch(env.LEAD_POST_URL, { method:"POST", headers:{Authorization:`Bearer ${env.LEAD_POST_API_KEY}`}, body: JSON.stringify(record) });
  }

  const callNumber = (env && env.CALL_NUMBER) || "";
  return json({ ok: true, callNumber, soldTo: Number((env && env.LEAD_MAX_BUYERS) || 4) });
}

// Optional: respond to non-POST so the route exists
export async function onRequestGet() {
  return json({ ok: true, service: "renue-home lead endpoint", method: "POST" });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}
