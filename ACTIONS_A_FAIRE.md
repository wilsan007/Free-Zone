# FreeZone Market — Vos actions à faire (avec les angles morts)

> Document opérationnel — 7 juillet 2026
> Classement par priorité : **P0** = aujourd'hui, **P1** = cette semaine, **P2** = avant le lancement, **P3** = avant la mise à l'échelle.
> Les sections « angle mort » signalent ce qu'on oublie systématiquement dans ce genre de projet.

---

## 1. P0 — Sécurité de la base de données (à faire AUJOURD'HUI)

### 1.1 Réactiver le Row Level Security

Votre base est actuellement **ouverte en écriture à n'importe qui** possédant la clé publique
(elle est visible dans le code du navigateur — c'est prouvé par test, une insertion anonyme a fonctionné).

1. Ouvrez [supabase.com/dashboard](https://supabase.com/dashboard) → projet `mgjauqocfubhknfwftfd`.
2. Menu gauche → **SQL Editor** → **New query**.
3. Copiez tout le contenu de
   [`supabase/migration_v2_securite_transactions.sql`](supabase/migration_v2_securite_transactions.sql)
   et collez-le. (Ce script unique remplace les anciens `fix_rls.sql` et
   `migration_antifuite.sql` : RLS corrigé + anti-fuite + commandes atomiques.)
4. Cliquez **Run**.
5. Le résultat final doit lister toutes les tables avec `rowsecurity = true`.

### 1.2 Vérifier que la correction fonctionne

Dans un terminal, cette commande doit renvoyer **401 ou 403** (et non 201) :

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST \
  "https://mgjauqocfubhknfwftfd.supabase.co/rest/v1/categories" \
  -H "apikey: sb_publishable_Dj1gt7pDBPG-w9q3eblMTQ_KcsYJR2u" \
  -H "Content-Type: application/json" \
  -d '{"slug":"test","name_fr":"t","name_en":"t","name_am":"t","name_ar":"t"}'
```

Et celle-ci doit toujours renvoyer **200** (la lecture publique du catalogue doit continuer de marcher) :

```bash
curl -s -o /dev/null -w "%{http_code}" \
  "https://mgjauqocfubhknfwftfd.supabase.co/rest/v1/products?select=id&limit=1" \
  -H "apikey: sb_publishable_Dj1gt7pDBPG-w9q3eblMTQ_KcsYJR2u"
```

Puis rechargez le site en local (`npm run dev`) : le catalogue doit toujours afficher les 8 produits.

### 1.3 🕳️ Angle mort : la base a pu être altérée pendant que le RLS était désactivé

Entre l'exécution de `disable_rls.sql` et la correction, n'importe qui pouvait écrire.
Le risque réel est faible (l'URL du projet n'a pas été diffusée), mais vérifiez :

- **Table Editor** → parcourez `products`, `companies`, `profiles`, `categories` : les comptages
  attendus sont 8 produits, 3 entreprises, 3 profils, 5 catégories. Supprimez toute ligne suspecte.
- Vérifiez qu'aucune ligne n'existe dans `orders`, `disputes`, `audit_log` (elles doivent être vides).

### 1.4 🕳️ Angle mort : les clés déjà exposées

- La clé publiable et la clé anon sont **faites pour être publiques** — pas de panique.
- En revanche, la **clé `service_role`** (Dashboard → Settings → API) donne TOUS les droits :
  vérifiez que vous ne l'avez jamais collée dans un chat, un mail, un fichier committé ou un
  outil tiers. Au moindre doute : Dashboard → Settings → API → **Rotate** (ou révoquer les
  clés legacy JWT et ne garder que les nouvelles clés `sb_publishable_` / `sb_secret_`).
- Le fichier `.env.local` est bien exclu de Git (`.gitignore`) — ne changez jamais ça.

### 1.5 🕳️ Angle mort : visibilité du dépôt GitHub

Le dépôt [github.com/wilsan007/Free-Zone](https://github.com/wilsan007/Free-Zone) contient
`CONCEPT.md` (toute votre stratégie business, votre modèle économique, votre analyse des risques).
**Si le dépôt est public, vos concurrents peuvent tout lire.** Vérifiez : Settings → General →
Danger Zone → « Change repository visibility » → **Private** si ce n'est pas déjà le cas.

---

## 2. P1 — Configuration Supabase (cette semaine)

### 2.1 Authentification (avant de développer les espaces vendeur/acheteur)

Dashboard → **Authentication** :

- **Providers** : Email activé ; envisagez « Phone » (les commerçants de la région préfèrent
  souvent le téléphone à l'email — angle mort classique en Afrique de l'Est).
- **URL Configuration** : ajoutez `http://localhost:3000` et plus tard votre domaine de production
  dans les « Redirect URLs » (sinon les liens de confirmation échoueront silencieusement).
- **Email Templates** : traduisez-les en français (par défaut ils partent en anglais).
- **Rate limits + CAPTCHA (Attack protection)** : activez le captcha (hCaptcha/Turnstile) sur
  l'inscription — sinon des bots créeront des comptes en masse dès que le site sera indexé.

### 2.2 🕳️ Angle mort : l'email transactionnel

Supabase envoie les emails d'authentification via son SMTP partagé, limité à ~2 emails/heure
en production et souvent classé en spam. Avant tout lancement réel : configurez un **SMTP
personnalisé** (Resend, Brevo, Postmark…) dans Authentication → SMTP Settings, avec un domaine
vérifié (SPF/DKIM). Sans ça, vos vendeurs n'arriveront jamais à créer un compte.

### 2.3 Stockage des images produits

Les images actuelles pointent vers **Unsplash** (photos de démonstration, licence non prévue
pour un catalogue commercial — angle mort juridique). Avant le lancement :

1. Dashboard → **Storage** → créez un bucket `product-images` (public en lecture).
2. Ajoutez une policy : lecture publique, écriture réservée aux vendeurs authentifiés.
3. Remplacez les URLs Unsplash du seed par de **vraies photos des produits et entrepôts**
   (c'est aussi un argument de confiance central du concept — « l'acheteur doit voir »).
4. Retirez alors `images.unsplash.com` de [`next.config.ts`](next.config.ts).

### 2.4 Sauvegardes

- Plan gratuit Supabase : sauvegardes limitées, **pas de restauration point-in-time**.
- Dès que de vraies données commerciales entrent : passez au plan Pro (PITR) ou mettez en place
  un export régulier (`pg_dump` hebdomadaire au minimum).
- 🕳️ Angle mort : le schéma SQL est versionné dans Git, mais **les données ne le sont pas**.
  Un `DROP TABLE` accidentel dans le SQL Editor est irréversible sur le plan gratuit.

### 2.5 🕳️ Angle mort : le projet Supabase gratuit se met en pause

Les projets gratuits sont **suspendus après ~7 jours d'inactivité**. Si le site est en démo chez
un partenaire et que la base est en pause, tout paraîtra cassé. Soit vous passez au plan Pro,
soit vous mettez en place un ping régulier, soit vous surveillez le dashboard avant chaque démo.

---

## 3. P1 — Développement : prochaines étapes dans l'ordre

Chaque étape s'appuie sur la précédente ; ne sautez pas d'étape.

1. **Authentification** : pages inscription/connexion, création automatique du `profile` à
   l'inscription (trigger sur `auth.users`), middleware Next.js pour rafraîchir la session.
2. **Espace vendeur** : CRUD produits (le schéma et les policies RLS sont déjà prêts), upload photos.
3. **Tunnel de commande** : réservation de stock + création de commande.
4. **Moteur de groupage** : mise à jour de la jauge à chaque commande LTL payée.
5. **Espace transporteur** : offres de fret sur les expéditions.

### 🕳️ Angles morts techniques à imposer au développement

- **Toute opération stock/argent doit être une fonction PostgreSQL (RPC) transactionnelle**,
  jamais une suite d'appels depuis le navigateur. Exemple : « réserver 50 unités + créer la
  commande » = une seule fonction `create_order_with_reservation()` en base. Sinon deux acheteurs
  simultanés survendront le stock (c'est LE bug classique de marketplace).
- **Ne jamais faire confiance au prix envoyé par le client** : le serveur recalcule
  `qty × prix catalogue` ; le montant venant du navigateur est ignoré.
- **Expiration des réservations** : la table `stock_reservations` a un `expires_at`, mais rien
  ne libère les réservations expirées. Activez l'extension **pg_cron** dans Supabase et créez
  un job qui les purge toutes les 15 minutes — sinon le stock se retrouvera bloqué à jamais.
- **`fill_pct` des pools** : doit être recalculé par un trigger en base à chaque commande,
  jamais écrit par le client.
- **Transitions de statut des commandes** : contrôlez-les en base (une commande `delivered` ne
  peut pas redevenir `created`). Un trigger de validation des transitions suffit.
- Le champ `orders.shipment_id` et `shipments.order_id` se référencent mutuellement : choisissez
  UNE direction (recommandé : `shipments.order_id` uniquement) avant d'écrire le code des commandes,
  sinon les données divergeront.

---

## 4. P2 — Déploiement en production

1. **Hébergement** : Vercel est le chemin le plus court pour Next.js.
   - Importez le repo GitHub → les variables d'environnement (`NEXT_PUBLIC_SUPABASE_URL`,
     `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) se configurent dans Vercel → Settings →
     Environment Variables. **Elles ne viennent PAS du repo** (le `.env.local` n'est pas commité).
2. **Domaine** : achetez le domaine tôt (ex. `freezonemarket.dj` ou `.com`) — le `.dj` se
   réserve auprès de Djibouti Telecom et peut prendre du temps (angle mort administratif).
3. **HTTPS + redirect URLs** : ajoutez le domaine final dans Supabase Auth (cf. 2.1).
4. 🕳️ Angle mort : **testez depuis l'Éthiopie** avant de lancer (VPN ou partenaire sur place).
   Latence, blocages éventuels, poids des pages en 3G. Tout le concept vise des utilisateurs
   à Addis-Abeba — personne ne teste jamais depuis là-bas.
5. **Monitoring** : activez au minimum les logs Vercel + un uptime monitor gratuit
   (UptimeRobot) + Sentry pour les erreurs front. Sinon vous découvrirez les pannes par
   les clients.

---

## 5. P2 — Juridique et réglementaire (les plus gros angles morts du projet)

Ces points ne bloquent pas le développement, mais ils bloquent le **lancement**. Commencez-les
en parallèle car ils sont lents.

1. **Statut de la société** : immatriculez l'entité qui exploite la plateforme, idéalement avec
   une licence en zone franche (guichet DPFZA). La plateforme doit être un **intermédiaire/
   commissionnaire**, pas un acheteur-revendeur (sinon vous portez le risque douanier et
   marchandise).
2. **Avocat à Djibouti** : CGU tripartites (vendeur/acheteur/transporteur), contrat de
   commissionnaire, clause de médiation, signature électronique, droit applicable.
3. **Avocat/conseil en Éthiopie — LE point critique** : le contrôle des changes de la Banque
   Nationale d'Éthiopie. La plateforme doit s'articuler avec les paiements officiels (lettres de
   crédit, permis de devises) et **ne jamais** faciliter le marché parallèle du birr. Une
   validation écrite de ce montage avant de construire le module de paiement vous évitera de
   jeter des mois de travail.
4. **Banque partenaire pour l'escrow** : ouvrez la discussion tôt (BCIMR, CAC Bank, Salaam…) —
   un compte séquestre avec convention prend des mois, pas des semaines.
5. **KYC/AML** : dès que vous tenez des fonds en séquestre, vous avez des obligations de
   vigilance (identification des clients, seuils de déclaration). À cadrer avec l'avocat.
6. 🕳️ Angle mort : **protection des données personnelles** — vous collecterez des pièces
   d'identité et licences (KYB). Il faut une politique de confidentialité, un chiffrement au
   repos de ces documents (bucket privé, jamais public) et une durée de conservation définie.
7. 🕳️ Angle mort : **assurance responsabilité civile professionnelle** de la plateforme +
   conditions d'assurance marchandise pendant le transport (qui est responsable entre la sortie
   d'entrepôt et la livraison ? — à écrire noir sur blanc dans les CGU).

---

## 6. P2 — Contenu et qualité avant tout lancement

- 🕳️ **Traductions amhariques et arabes** : celles du seed et de l'interface ont été générées
  automatiquement. Faites-les **relire par des locuteurs natifs** (une interface en mauvais
  amharique détruit la crédibilité auprès de la cible principale). Le seed contient au moins
  une coquille en amharique.
- **Vraies données** : remplacez les 3 vendeurs et 8 produits fictifs par vos premiers
  vendeurs pilotes réels (avec licences DIFTZ réelles et photos d'entrepôts réelles).
- **Pages légales** : mentions légales, CGU, politique de confidentialité, page contact.
- **Page 404 et page d'erreur** personnalisées (actuellement celles par défaut de Next.js).
- 🕳️ **Support RTL pour l'arabe** : l'interface a les traductions arabes mais ne bascule pas
  en droite-à-gauche (`dir="rtl"`). À implémenter avant de mettre l'arabe en avant.

---

## 7. P3 — Validation terrain (rappel de la phase 0 du CONCEPT, toujours pas faite)

Le produit avance plus vite que la validation — c'est en soi un angle mort. Avant d'investir
davantage :

- [ ] 10 entretiens vendeurs zone franche (accepteraient-ils de publier leurs stocks ? à quelle commission ?)
- [ ] 10 entretiens importateurs éthiopiens (gros + petits — le groupage les intéresse-t-il vraiment ?)
- [ ] 5 entretiens transporteurs du corridor
- [ ] 1 transitaire agréé (circuit documentaire réel T1/e-CMR)
- [ ] 1 banque djiboutienne (faisabilité concrète du compte séquestre)
- [ ] 1 opérateur d'entreposage DIFTZ (l'entrepôt de groupage est indispensable au modèle LTL)

Utilisez le site actuel comme **support de démonstration** pendant ces entretiens — c'est
exactement ce à quoi un MVP sert.

---

## 8. Hygiène du projet (en continu)

- **Ne modifiez jamais la base directement en production** sans garder le SQL exécuté dans
  `supabase/` (versionné dans Git) — sinon le schéma réel et le schéma versionné divergent
  (c'est déjà arrivé avec `disable_rls.sql`).
- **Committez et poussez régulièrement** (`git add -A && git commit && git push`) — le dossier
  local sur ce Mac est actuellement l'unique copie de travail.
- Activez sur GitHub : Settings → Branches → **protection de `main`** (au minimum interdire le
  force-push) dès qu'une deuxième personne touche au code.
- Gardez `CONCEPT.md` comme référence : à chaque nouvelle fonctionnalité, vérifiez qu'elle
  correspond à une phase du concept — c'est votre garde-fou contre la dispersion.

---

## Récapitulatif : les 5 actions dans l'ordre si vous ne faites que 5 choses

| # | Action | Où | Durée |
|---|---|---|---|
| 1 | Exécuter `supabase/migration_v2_securite_transactions.sql` puis vérifier (4xx en écriture anonyme, 200 en lecture catalogue) | Supabase SQL Editor | 10 min |
| 2 | Passer le dépôt GitHub en privé | GitHub Settings | 2 min |
| 3 | Vérifier que la clé `service_role` n'a jamais fuité (sinon rotation) | Supabase Settings → API | 10 min |
| 4 | Lancer les rendez-vous : avocat Djibouti/Éthiopie + banque escrow | Terrain | démarrer cette semaine |
| 5 | Me demander de développer l'authentification + espaces par rôle | Ici | prochaine session |
