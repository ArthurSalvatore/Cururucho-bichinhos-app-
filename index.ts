// Função "push" dos Bichinhos (Supabase Edge Function)
// Manda as notificações: recado/cartinha/presente pra ela, aviso de diário pra você,
// lembrete diário de saudade e um teste quando alguém ativa as notificações.
//
// Segredos necessários (Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (ex.: mailto:seu@email.com), CRON_SECRET
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já vêm prontos no Supabase.
// Ao publicar, desligue "Verify JWT" (a função confere quem chamou por conta própria).

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") ?? "mailto:bichinhos@example.com",
  Deno.env.get("VAPID_PUBLIC_KEY") ?? "",
  Deno.env.get("VAPID_PRIVATE_KEY") ?? "",
);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const REMINDERS = [
  "Tô com saudade... vem me ver? 🥺",
  "A casa tá quietinha sem você. 🐾",
  "Guardei uma coisa bonita pra te dizer hoje. 💜",
  "Já cuidou de mim hoje? Tô te esperando na janela.",
  "Tem cartinha nova esperando por você. 💌",
];

async function isAdminEmail(email) {
  if (!email) return false;
  const { data } = await db.from("app_admins").select("email").ilike("email", email).maybeSingle();
  return !!data;
}

async function send(subs, payload) {
  let sent = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
      );
      sent++;
    } catch (e) {
      const code = e && e.statusCode;
      if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
    }
  }
  return sent;
}

const titleCache = new Map();
async function petTitle(userId) {
  if (!userId) return "Seu bichinho 🐾";
  if (titleCache.has(userId)) return titleCache.get(userId);
  const { data } = await db.from("larth_state").select("data").eq("user_id", userId).maybeSingle();
  const d = (data && data.data) || {};
  const t = d.petName ? `${d.petName} 🐾` : "Seu bichinho 🐾";
  titleCache.set(userId, t);
  return t;
}
async function sendEach(subs, payloadFn) {
  let sent = 0;
  for (const s of subs ?? []) sent += await send([s], await payloadFn(s));
  return sent;
}

async function adminSubs() {
  const { data: subs } = await db.from("push_subscriptions").select("*").eq("is_admin", true);
  const out = [];
  for (const s of subs ?? []) {
    const { data } = await db.auth.admin.getUserById(s.user_id);
    if (data && data.user && (await isAdminEmail(data.user.email))) out.push(s);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = await req.json().catch(() => ({}));
    const type = body.type;

    // lembrete diário (chamado pelo cron, com o segredo)
    if (type === "reminder") {
      if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET) return json({ error: "forbidden" }, 403);
      const since = new Date(Date.now() - 20 * 3600 * 1000).toISOString();
      const { data: states } = await db.from("larth_state").select("user_id").lt("updated_at", since);
      let sent = 0;
      for (const st of states ?? []) {
        const { data: subs } = await db.from("push_subscriptions").select("*").eq("user_id", st.user_id).eq("is_admin", false);
        const text = REMINDERS[Math.floor(Math.random() * REMINDERS.length)];
        sent += await send(subs, { title: await petTitle(st.user_id), body: text, url: "./", tag: "lembrete" });
      }
      return json({ ok: true, sent });
    }

    // eventos da agenda e aniversários (chamado pelo cron, com o segredo)
    if (type === "events") {
      if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET) return json({ error: "forbidden" }, 403);
      const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map((x) => [x.type, x.value]));
      const key = `${parts.year}-${parts.month}-${parts.day}`, md = key.slice(5);
      const { data: states } = await db.from("larth_state").select("user_id,data");
      let sent = 0;
      for (const st of states ?? []) {
        const d = st.data || {};
        const msgs = [];
        if (d.birthday && d.birthday === md) msgs.push(`🎂 Feliz aniversário${d.name ? ", " + d.name : ""}! A casa tá em festa.`);
        for (const ev of d.events || []) {
          if (!ev.notify) continue;
          const hit = ev.yearly ? String(ev.date).slice(5) === md : ev.date === key;
          if (hit) msgs.push(`📌 Hoje: ${ev.title}`);
        }
        if (!msgs.length) continue;
        const { data: subs } = await db.from("push_subscriptions").select("*").eq("user_id", st.user_id).eq("is_admin", false);
        for (const m of msgs) sent += await send(subs, { title: await petTitle(st.user_id), body: m, url: "./", tag: "evento" + m.length });
      }
      return json({ ok: true, sent });
    }

    // daqui pra baixo, precisa estar logado
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "unauthorized" }, 401);
    const { data: auth, error: authErr } = await db.auth.getUser(token);
    const user = auth && auth.user;
    if (authErr || !user) return json({ error: "unauthorized" }, 401);

    if (type === "message") {
      if (!(await isAdminEmail(user.email))) return json({ error: "forbidden" }, 403);
      const { data: msg } = await db.from("messages").select("*").eq("id", body.id).maybeSingle();
      if (!msg) return json({ error: "not found" }, 404);
      let q = db.from("push_subscriptions").select("*").eq("is_admin", false);
      if (msg.to_user) q = q.eq("user_id", msg.to_user);
      const { data: subs } = await q;
      const label = {
        recado: "Chegou um recadinho dele 💬",
        cartinha: "Chegou uma cartinha nova dele 💌",
        presente: "Chegou um presente pra você 🎁",
      }[msg.kind] ?? "Chegou uma coisa dele 💌";
      return json({ ok: true, sent: await sendEach(subs, async (s) => ({ title: await petTitle(s.user_id), body: label, url: "./", tag: "correio" })) });
    }

    if (type === "diary") {
      const { data: row } = await db.from("diary").select("id,mood").eq("id", body.id).eq("user_id", user.id).maybeSingle();
      if (!row) return json({ error: "not found" }, 404);
      const { data: st } = await db.from("larth_state").select("data").eq("user_id", user.id).maybeSingle();
      const nm = (st && st.data && st.data.name) || "Ela";
      const txt = row.mood === "memoria" ? `${nm} respondeu uma memória 💭` : `${nm} escreveu uma página nova no diário 📔`;
      const subs = await adminSubs();
      return json({ ok: true, sent: await send(subs, { title: "Painel 🎁", body: txt, url: "./admin.html", tag: "diario" }) });
    }

    if (type === "test") {
      const { data: subs } = await db.from("push_subscriptions").select("*").eq("user_id", user.id);
      return json({ ok: true, sent: await send(subs, { title: await petTitle(user.id), body: "Oi! Agora eu consigo te chamar. 💛", url: "./", tag: "teste" }) });
    }

    return json({ error: "tipo desconhecido" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
