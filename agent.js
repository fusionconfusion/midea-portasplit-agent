// ============================================================
//  Midea PortaSplit — Agent de surveillance de stock
//  Tourne via GitHub Actions (cron), notifie par email + ntfy
// ============================================================

const nodemailer = require("nodemailer");
const https = require("https");

// ── Configuration ────────────────────────────────────────────
const CONFIG = {
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  emailFrom:    process.env.EMAIL_FROM,      // ex: moncompte@gmail.com
  emailTo:      process.env.EMAIL_TO,        // ex: mlaroche@coyote-group.com
  gmailPass:    process.env.GMAIL_APP_PASS,  // mot de passe d'application Gmail
  ntfyTopic:    process.env.NTFY_TOPIC,      // ex: midea-matthieu-2026 (unique)
};

// ── Sites web à surveiller ───────────────────────────────────
const ONLINE_TARGETS = [
  { id: "manomano",    name: "ManoMano",           url: "https://www.manomano.fr/p/midea-climatiseur-split-mobile-reversible-froid-chaud-3500w12000btu-wifi-deshumidificateur-ventilateur-jusqua-40m2-kit-fenetre-inclus-83810402" },
  { id: "amazon",      name: "Amazon.fr",           url: "https://www.amazon.fr/dp/B0CY2YW8BT" },
  { id: "boulanger",   name: "Boulanger",           url: "https://www.boulanger.com/ref/1216685" },
  { id: "darty",       name: "Darty",               url: "https://www.darty.com/nav/recherche?text=midea+portasplit" },
  { id: "leroymerlin", name: "Leroy Merlin",        url: "https://www.leroymerlin.fr/produits/climatiseur-split-mobile-reversible-portasplit-midea-par-optimea-93857579.html" },
  { id: "castorama",   name: "Castorama",           url: "https://www.castorama.fr/climatiseur-portasplit-midea-reversible-3500w/8431312260509_CAFR.prd" },
  { id: "bricoman",    name: "Bricoman/Tecnomat",   url: "https://www.bricoman.fr/produits/climatiseur-mobile-reversible-portasplit-midea-25088072.html" },
  { id: "optimea",     name: "Optimea.fr",          url: "https://www.optimea.fr/product/climatiseur-split-mobile-midea-silencieux-reversible-sans-installation/" },
  { id: "ventigo",     name: "Ventigo.fr",          url: "https://www.ventigo.fr/fr_FR/p/climatiseur-mobile-split-midea-portasplit-35-kw/38775/" },
  { id: "groupsumi",   name: "GroupSumi.fr",        url: "https://groupsumi.fr/hauffage/climatisation/climatiseur-mobile/climatiseur-et-deshumidificateur-portable-4-en-1-midea-portasplit-3-5-kw-13907811" },
];

// ── Magasins physiques à surveiller ─────────────────────────
const STORE_TARGETS = [
  { id: "lm_nanterre",      name: "Leroy Merlin Nanterre",              distance: "~1 km",  query: "Leroy Merlin Nanterre stock Midea PortaSplit disponibilité magasin" },
  { id: "darty_defense",    name: "Darty La Défense (4 Temps)",         distance: "~3 km",  query: "Darty La Défense 4 Temps stock Midea PortaSplit disponibilité magasin" },
  { id: "boulanger_lev",    name: "Boulanger Levallois (So Ouest)",     distance: "~4 km",  query: "Boulanger Levallois So Ouest stock Midea PortaSplit disponibilité magasin" },
  { id: "lm_rueil",         name: "Leroy Merlin Rueil-Malmaison",       distance: "~5 km",  query: "Leroy Merlin Rueil-Malmaison stock Midea PortaSplit disponibilité magasin" },
  { id: "casto_cormeilles", name: "Castorama Cormeilles-en-Parisis",    distance: "~9 km",  query: "Castorama Cormeilles-en-Parisis stock Midea PortaSplit disponibilité magasin" },
  { id: "darty_sart",       name: "Darty Sartrouville",                 distance: "~10 km", query: "Darty Sartrouville stock Midea PortaSplit disponibilité magasin" },
  { id: "lm_montigny",      name: "Leroy Merlin Montigny-lès-Cormeilles", distance: "~11 km", query: "Leroy Merlin Montigny-lès-Cormeilles Herblay stock Midea PortaSplit disponibilité magasin" },
  { id: "casto_pierrelaye", name: "Castorama Pierrelaye",               distance: "~17 km", query: "Castorama Pierrelaye stock Midea PortaSplit disponibilité magasin" },
  { id: "boulanger_parly2", name: "Boulanger Parly 2 (Le Chesnay)",    distance: "~19 km", query: "Boulanger Parly 2 Le Chesnay stock Midea PortaSplit disponibilité magasin" },
  { id: "darty_cergy",      name: "Darty Cergy (3 Fontaines)",         distance: "~22 km", query: "Darty Cergy 3 Fontaines stock Midea PortaSplit disponibilité magasin" },
  { id: "lm_boisdarcy",     name: "Leroy Merlin Bois-d'Arcy (Versailles)", distance: "~25 km", query: "Leroy Merlin Bois-d'Arcy Versailles stock Midea PortaSplit disponibilité magasin" },
];

// ── Appel API Claude ─────────────────────────────────────────
async function askClaude(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: prompt }],
    });

    const req = https.request({
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CONFIG.anthropicKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05",
      },
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          const text = parsed.content?.find(b => b.type === "text")?.text || "";
          resolve(text);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function parseJson(raw) {
  try {
    const m = raw.match(/\{[\s\S]*?\}/);
    return m ? JSON.parse(m[0]) : null;
  } catch { return null; }
}

// ── Check d'un site web ──────────────────────────────────────
async function checkOnline(target) {
  const prompt = `You are a stock-checking assistant. Search the web for the current stock status of "Midea PortaSplit" at:

URL: ${target.url}
Retailer: ${target.name}

CRITICAL:
1. Use web_search for fresh info.
2. IGNORE HTML meta tags / og:description — they are cached and unreliable.
3. Only trust body-level signals: active "Ajouter au panier" button, delivery date shown = in_stock. "Rupture", "Indisponible", "Me prévenir" = out_of_stock.
4. Default to "out_of_stock" if uncertain. Never return "in_stock" based on meta tags alone.

Reply ONLY with JSON: {"status":"in_stock"|"out_of_stock"|"unknown","detail":"courte phrase en français"}`;

  try {
    const raw = await askClaude(prompt);
    const result = parseJson(raw);
    return {
      id: target.id,
      name: target.name,
      url: target.url,
      type: "online",
      status: result?.status || "unknown",
      detail: result?.detail || "Résultat non interprétable",
    };
  } catch (e) {
    return { id: target.id, name: target.name, url: target.url, type: "online", status: "error", detail: e.message };
  }
}

// ── Check d'un magasin physique ──────────────────────────────
async function checkStore(target) {
  const prompt = `You are a stock-checking assistant for French physical retail stores.

Check if "Midea PortaSplit" is available IN-STORE (en magasin, pas en livraison) at:
Store: ${target.name} (${target.distance} from Nanterre)
Search query: "${target.query}"

INSTRUCTIONS:
1. Use web_search with the provided query.
2. Look for the brand's store stock checker for this specific location.
3. "Retrait en magasin disponible" or "Disponible en magasin" = in_stock.
4. "Indisponible en magasin" or "Rupture en magasin" = out_of_stock.
5. If you cannot confirm stock at THIS specific physical store, return "unknown".

Reply ONLY with JSON: {"status":"in_stock"|"out_of_stock"|"unknown","detail":"courte phrase en français"}`;

  try {
    const raw = await askClaude(prompt);
    const result = parseJson(raw);
    return {
      id: target.id,
      name: target.name,
      distance: target.distance,
      type: "store",
      status: result?.status || "unknown",
      detail: result?.detail || "Résultat non interprétable",
    };
  } catch (e) {
    return { id: target.id, name: target.name, distance: target.distance, type: "store", status: "error", detail: e.message };
  }
}

// ── Notification email ───────────────────────────────────────
async function sendEmail(findings) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: CONFIG.emailFrom, pass: CONFIG.gmailPass },
  });

  const rows = findings.map(f => `
    <tr style="background:${f.type==='store'?'#e8f4fd':'#f0fdf4'}">
      <td style="padding:10px 14px;font-weight:700">${f.type === 'store' ? '📍' : '🌐'} ${f.name}</td>
      ${f.distance ? `<td style="padding:10px 14px;color:#3b82f6">${f.distance}</td>` : '<td style="padding:10px 14px">—</td>'}
      <td style="padding:10px 14px;color:#16a34a;font-weight:700">✅ EN STOCK</td>
      <td style="padding:10px 14px;color:#555">${f.detail}</td>
      ${f.url ? `<td style="padding:10px 14px"><a href="${f.url}" style="color:#2563eb">→ Voir</a></td>` : '<td></td>'}
    </tr>`).join("");

  const html = `
    <div style="font-family:sans-serif;max-width:700px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#0d1b3e,#0a2540);padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="color:#fff;margin:0;font-size:22px">❄️ Midea PortaSplit — Stock disponible !</h1>
        <p style="color:#5b8fc7;margin:6px 0 0">Détecté le ${new Date().toLocaleString('fr-FR')}</p>
      </div>
      <div style="padding:24px 32px;background:#f8fafc;border:1px solid #e2e8f0">
        <p style="color:#1e293b;font-size:15px">🚨 <strong>${findings.length} source${findings.length > 1 ? 's' : ''}</strong> avec du stock disponible :</p>
        <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">
          <thead>
            <tr style="background:#1e3a5f;color:#fff">
              <th style="padding:10px 14px;text-align:left">Source</th>
              <th style="padding:10px 14px;text-align:left">Distance</th>
              <th style="padding:10px 14px;text-align:left">Statut</th>
              <th style="padding:10px 14px;text-align:left">Détail</th>
              <th style="padding:10px 14px;text-align:left">Lien</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color:#64748b;font-size:13px;margin-top:20px">
          ⚡ Alerte envoyée par l'agent Midea PortaSplit · GitHub Actions<br>
          Les stocks peuvent changer rapidement — vérifiez avant de vous déplacer.
        </p>
      </div>
    </div>`;

  await transporter.sendMail({
    from: `"Agent Midea PortaSplit" <${CONFIG.emailFrom}>`,
    to: CONFIG.emailTo,
    subject: `🎉 Midea PortaSplit EN STOCK — ${findings.map(f => f.name).join(", ")}`,
    html,
  });

  console.log(`📧 Email envoyé à ${CONFIG.emailTo}`);
}

// ── Notification push (ntfy.sh → Mac/iPhone) ────────────────
async function sendPushNotification(findings) {
  const title = `❄️ PortaSplit EN STOCK (${findings.length} source${findings.length > 1 ? 's' : ''})`;
  const message = findings.map(f =>
    `${f.type === 'store' ? '📍' : '🌐'} ${f.name}${f.distance ? ` (${f.distance})` : ''}`
  ).join("\n");

  return new Promise((resolve, reject) => {
    const body = message;
    const req = https.request({
      hostname: "ntfy.sh",
      path: `/${CONFIG.ntfyTopic}`,
      method: "POST",
      headers: {
        "Title": title,
        "Priority": "urgent",
        "Tags": "snowflake,shopping_cart",
        "Content-Type": "text/plain",
      },
    }, (res) => {
      console.log(`🔔 Push ntfy.sh envoyé (status ${res.statusCode})`);
      resolve();
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── Fonction principale ──────────────────────────────────────
async function main() {
  console.log(`\n🚀 Agent Midea PortaSplit démarré — ${new Date().toLocaleString('fr-FR')}`);
  console.log(`   Vérification de ${ONLINE_TARGETS.length} sites + ${STORE_TARGETS.length} magasins\n`);

  const findings = [];
  const delay = ms => new Promise(r => setTimeout(r, ms));

  // Check sites web
  console.log("🌐 Vérification des sites web...");
  for (const target of ONLINE_TARGETS) {
    process.stdout.write(`   ${target.name}... `);
    const result = await checkOnline(target);
    console.log(result.status === "in_stock" ? "✅ EN STOCK !" : result.status === "out_of_stock" ? "❌ Rupture" : `⚠️  ${result.status}`);
    if (result.status === "in_stock") findings.push(result);
    await delay(1500); // éviter le rate limiting
  }

  // Check magasins physiques
  console.log("\n📍 Vérification des magasins physiques...");
  for (const target of STORE_TARGETS) {
    process.stdout.write(`   ${target.name} (${target.distance})... `);
    const result = await checkStore(target);
    console.log(result.status === "in_stock" ? "✅ EN STOCK !" : result.status === "out_of_stock" ? "❌ Rupture" : `⚠️  ${result.status}`);
    if (result.status === "in_stock") findings.push(result);
    await delay(1500);
  }

  // Résumé
  console.log(`\n📊 Résumé : ${findings.length} source(s) avec du stock`);

  if (findings.length === 0) {
    console.log("😴 Rien de disponible pour l'instant. À la prochaine vérification !");
    return;
  }

  // Alertes
  console.log("\n🚨 Stock trouvé ! Envoi des alertes...");
  findings.forEach(f => console.log(`   → ${f.type === 'store' ? '📍' : '🌐'} ${f.name} — ${f.detail}`));

  const errors = [];

  if (CONFIG.emailFrom && CONFIG.gmailPass) {
    try { await sendEmail(findings); }
    catch (e) { errors.push(`Email: ${e.message}`); console.error("❌ Erreur email:", e.message); }
  } else {
    console.log("⚠️  Email non configuré (EMAIL_FROM ou GMAIL_APP_PASS manquant)");
  }

  if (CONFIG.ntfyTopic) {
    try { await sendPushNotification(findings); }
    catch (e) { errors.push(`Push: ${e.message}`); console.error("❌ Erreur push:", e.message); }
  } else {
    console.log("⚠️  Push non configuré (NTFY_TOPIC manquant)");
  }

  if (errors.length > 0) process.exit(1);
  console.log("\n✅ Alertes envoyées avec succès !");
}

main().catch(e => { console.error("💥 Erreur fatale:", e); process.exit(1); });
