# 🧪 Test Workflow Complet

## 1. Vérifier les données existantes

### Accueil
- [ ] Aller sur [http://localhost:3000](http://localhost:3000)
- [ ] Voir les KPIs : Total voitures, Solde banque, Ventes du mois
- [ ] Cliquer sur "Voitures" depuis les raccourcis

### Voitures
- [ ] [http://localhost:3000/voitures](http://localhost:3000/voitures)
- [ ] Voir **Berlingo 1.6 HDI** importé (1 voiture)
- [ ] Cliquer sur la fiche → voir les 6 papiers, dépenses, stage

---

## 2. Créer une nouvelle affaire (Calculer)

### Étape 1 : Calculer une affaire
- [ ] Aller sur [http://localhost:3000/calculer](http://localhost:3000/calculer)
- [ ] Remplir :
  - **Nom** : "Renault Clio 1.5 DCI NL"
  - **Pays** : Pays-Bas 🇳🇱
  - **Régime** : TVA Marge
  - **Prix d'achat** : 1200 €
  - **Frais** : 
    - Carburant: 50 € TTC
    - Trajet: 30 € TTC
    - CT: 150 € TTC
    - Mécanique: 100 € TTC
    - Total: 330 €
- [ ] **Marge** : Garder 1500 € (profit visé)
- [ ] Voir le prix de vente calculé ≈ 3150 € (après arrondi 90)
- [ ] Voir **Marge HT** ≈ 1 520 € (spec conforme)
- [ ] Cliquer **"💾 Enregistrer l'affaire"**

### Étape 2 : Vérifier sur Accueil
- [ ] Retourner [http://localhost:3000](http://localhost:3000)
- [ ] Voir "Affaires en cours" : Renault Clio 1200 → 3150

---

## 3. Tester Argent (Soldes + TVA)

### Dépenses
- [ ] Aller [http://localhost:3000/argent](http://localhost:3000/argent)
- [ ] Bouton "+ Dépense"
  - Type: **Mécanique**
  - Montant: 200 € TTC
  - TVA: 20 %
  - Mode: **Banque**
- [ ] Voir la dépense s'ajouter au total du mois

### TVA
- [ ] Observer la TVA du mois (collectée / déductible / nette)
- [ ] Basculer "Ce mois" ↔ "Ce trimestre"

### Solde
- [ ] Voir le solde bancaire recalculé (4989 € − dépenses)
- [ ] Cliquer "Recaler" → entrer le solde réel du relevé

---

## 4. Créer une Facture

### Nouvelle facture
- [ ] Aller [http://localhost:3000/factures](http://localhost:3000/factures)
- [ ] Bouton "+ Nouvelle"
- [ ] Remplir :
  - **Type** : TVA sur marge (pour la Clio)
  - **Voiture** : (pas lié)
  - **Client** : "Mohamed" (nouveau contact)
  - **Date** : Aujourd'hui
  - **Ligne 1** : "Renault Clio 1.5 DCI" × 1 = 3150 €
  - **Acompte** : 500 €
  - **Mode** : Virement
- [ ] Cliquer **"Brouillon"** → sauvegarde (non numérotée)
- [ ] Cliquer **"Émettre"** → F-2026-003 généré, verrouillé
- [ ] Voir le badge "✓ Payée" si tu coches dans la liste

### PDF
- [ ] Cliquer "Voir / Imprimer" sur la facture
- [ ] Voir le détail : client, lignes, TVA, mentions légales
- [ ] Cliquer "📄 Télécharger PDF" → télécharge F-2026-003.pdf

---

## 5. Créer une Tâche

### Tâche urgente
- [ ] Aller [http://localhost:3000/taches](http://localhost:3000/taches)
- [ ] Nouvelle tâche :
  - **Texte** : "Passer la Clio au CT"
  - **Priorité** : 🔴 Urgent
  - **Échéance** : Demain
- [ ] Cocher pour complèter

---

## 6. Vérifier Statistiques

### KPIs
- [ ] Aller [http://localhost:3000/statistiques](http://localhost:3000/statistiques)
- [ ] Voir :
  - **Vendues (mois)** : 0 (pas encore vendu)
  - **Achetées (mois)** : 0 (affaire pas encore transformée en achat)
  - **Marge totale** : 0 (aucune vente finalisée)

### Période
- [ ] Basculer "Mois" → "Trimestre" → "Année"
- [ ] Observer la redistribution des stats

---

## 7. Ajouter des Contacts

### Vendeur
- [ ] Aller [http://localhost:3000/contacts](http://localhost:3000/contacts)
- [ ] "+ Nouveau"
  - **Nom** : "Garage Auto Benoit"
  - **Email** : benoit@garage.nl
  - **Téléphone** : +31 612 345 678
  - **Adresse** : "Amsterdam, NL"
  - **Type** : 🚗 Vendeur

### Acheteur
- [ ] "+ Nouveau"
  - **Nom** : "Marie Dupont"
  - **Email** : marie@email.fr
  - **Type** : 👤 Acheteur

---

## 8. Livre de Police

### Export
- [ ] Aller [http://localhost:3000/police](http://localhost:3000/police)
- [ ] Voir : (vide si aucune voiture "Vendue" enregistrée)
- [ ] Cliquer "📄 PDF" ou "📊 Excel" → télécharge l'export
- [ ] Vérifier que c'est immutable (mention légale)

---

## ✅ Checklist Succès

Si tous les items ci-dessous sont vrais, l'app est **production-ready** :

- [ ] Accueil affiche les KPIs corrects
- [ ] Calculer : Marge HT ≈ 1500 € pour Clio
- [ ] Argent : Solde se recalcule après dépense
- [ ] Facture : Numérotation F-2026-XXX séquentielle
- [ ] Facture : PDF télécharge et s'affiche
- [ ] Tâches : Priorités colorées, échéances visibles
- [ ] Contacts : CRUD fonctionne
- [ ] Statistiques : ROI et taux marge calculés
- [ ] Police : Exports fonctionnent

---

## 🐛 Bugs connus ?

Note ici les problèmes rencontrés pendant le test :

- [ ] 
- [ ] 
- [ ] 

