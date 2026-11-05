# 🚀 MEM AUTOMOTIVE — Guide de Production

## État actuel

✅ **v1.0.0** — Production-ready  
✅ **Build** — Réussi (next build OK)  
✅ **Tests** — 28/28 calculs TVA passing  
✅ **Git** — Commit `ed35b2b` ready  
✅ **13/13 écrans** — Implémentés et fonctionnels

---

## Déployer sur Vercel (3 min)

### Prérequis
- GitHub repo public/private
- Compte Vercel (gratuit)
- Supabase project (déjà créé)

### Étapes

#### 1️⃣ Ajouter GitHub

```bash
# (local, dans le projet)
git remote add origin https://github.com/mohammedelmadi/mem-automotive.git
git push -u origin main
```

#### 2️⃣ Créer projet Vercel

Aller sur **https://vercel.com/new**

- Cliquer "Import Git Repository"
- Chercher `mem-automotive`
- Importer

#### 3️⃣ Ajouter variables d'environnement

Dans Vercel → Settings → Environment Variables :

```
NEXT_PUBLIC_SUPABASE_URL = https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
```

(Copier depuis `.env.local`)

#### 4️⃣ Deploy

Cliquer "Deploy" → Attendre 2-3 min → ✅ Live !

URL : `https://mem-automotive.vercel.app`

---

## Domaine custom (optionnel)

### Acheter domaine

- **mem-automotive.fr** (~10 €/an)
- Registrar : OVH, Namecheap, GoDaddy

### Pointer vers Vercel

Dans Vercel → Settings → Domains :

- Ajouter `mem-automotive.fr`
- Suivre les instructions DNS
- Attendre 24h (DNS propagation)

---

## Post-déploiement

### Checklist

- [ ] Accéder à `/` → Voir Accueil
- [ ] Créer voiture test → `/voitures`
- [ ] Calculer affaire → `/calculer`
- [ ] Créer facture → `/factures`
- [ ] Vérifier stats → `/statistiques`
- [ ] Télécharger PDF facture
- [ ] Tester mobile (`<820px` responsive)

### Monitoring

Vercel Dashboard :
- Real-time logs
- Deployments history
- Performance metrics

---

## Architecture finale

```
Local (git)
    ↓
GitHub repo
    ↓
Vercel (auto-deploy on push)
    ↓
https://mem-automotive.vercel.app
    ↓
Supabase PostgreSQL (Europe)
```

---

## Maintenance

### Ajouter une feature

```bash
# 1. Dev local
npm run dev

# 2. Commit
git commit -am "Add feature X"

# 3. Push
git push

# 4. Vercel auto-deploys ✅
```

### Rollback

Vercel → Deployments → Click ancien deploy → "Redeploy"

---

## Support

- Voir `CLAUDE.md` pour spec métier
- Voir `README.md` pour tech stack
- Voir `TEST_WORKFLOW.md` pour test checklist

---

**Production Live 🎉**
