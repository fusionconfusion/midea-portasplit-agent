# ❄️ Agent Midea PortaSplit — Surveillance de stock

Agent autonome qui vérifie toutes les **15 minutes** la disponibilité du Midea PortaSplit sur **10 sites web** et **11 magasins** autour de Nanterre. Tourne gratuitement sur GitHub Actions et envoie des alertes par **email** et **notification push** (Mac/iPhone).

---

## 🚀 Mise en place (15 minutes)

### Étape 1 — Créer le dépôt GitHub

1. Va sur [github.com/new](https://github.com/new)
2. Crée un dépôt **privé** nommé `midea-portasplit-agent`
3. Upload les 3 fichiers : `agent.js`, `package.json`, `.github/workflows/stock-check.yml`

### Étape 2 — Configurer les secrets GitHub

Dans ton dépôt → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret | Valeur |
|--------|--------|
| `ANTHROPIC_API_KEY` | Ta clé API Anthropic (console.anthropic.com) |
| `EMAIL_FROM` | Ton adresse Gmail (ex: `moncompte@gmail.com`) |
| `EMAIL_TO` | Adresse de réception (ex: `mlaroche@coyote-group.com`) |
| `GMAIL_APP_PASS` | Mot de passe d'application Gmail (voir ci-dessous) |
| `NTFY_TOPIC` | Un nom unique ex: `midea-matthieu-2026` |

#### Obtenir le mot de passe d'application Gmail
1. Compte Google → **Sécurité** → **Validation en 2 étapes** (doit être activée)
2. **Mots de passe des applications** → Créer → Nom : "Agent Midea"
3. Copier le mot de passe généré (16 caractères) → `GMAIL_APP_PASS`

#### Configurer ntfy.sh (notifications Mac/iPhone)
1. Sur Mac : `brew install ntfy` ou télécharger l'app [ntfy.sh](https://ntfy.sh)
2. S'abonner au topic : `ntfy subscribe midea-matthieu-2026`
3. Sur iPhone : installer l'app **ntfy** → ajouter le topic

---

### Étape 3 — Activer GitHub Actions

1. Dans ton dépôt → onglet **Actions**
2. Accepter l'activation des workflows
3. Cliquer **Run workflow** pour tester immédiatement

---

## 📅 Planning de surveillance

L'agent tourne automatiquement **toutes les 15 minutes** de **7h à 22h** (heure de Paris).

Pour modifier la fréquence, édite le fichier `.github/workflows/stock-check.yml` :
```yaml
# Toutes les 15 min (défaut)
- cron: "0,15,30,45 5-20 * * *"

# Toutes les 30 min
- cron: "0,30 5-20 * * *"

# Toutes les heures
- cron: "0 5-20 * * *"
```

> ⚠️ GitHub Actions gratuit = 2 000 minutes/mois. Toutes les 15 min sur 15h/jour = ~675 min/mois. Largement dans les limites.

---

## 🔍 Suivi des résultats

- Onglet **Actions** de ton dépôt → chaque run affiche les logs complets
- En cas de stock trouvé : email + notification push envoyés
- En cas d'erreur : le run est marqué en rouge dans Actions

---

## 📍 Magasins surveillés

| Magasin | Distance |
|---------|----------|
| Leroy Merlin Nanterre | ~1 km |
| Darty La Défense | ~3 km |
| Boulanger Levallois | ~4 km |
| Leroy Merlin Rueil-Malmaison | ~5 km |
| Castorama Cormeilles-en-Parisis | ~9 km |
| Darty Sartrouville | ~10 km |
| Leroy Merlin Montigny-lès-Cormeilles | ~11 km |
| Castorama Pierrelaye | ~17 km |
| Boulanger Parly 2 (Le Chesnay) | ~19 km |
| Darty Cergy | ~22 km |
| Leroy Merlin Bois-d'Arcy (Versailles) | ~25 km |


