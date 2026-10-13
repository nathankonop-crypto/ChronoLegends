# ChronoLegends — prototype

Jeu de cartes à collectionner sur l'histoire mondiale. Ce prototype permet d'ouvrir des boosters et de consulter sa collection (extension 1 : Antiquité, 35 cartes).

## Structure

```
index.html   La page (structure)
style.css    Le style des cartes et du site
cartes.js    Les DONNÉES : raretés, régions, époques, liste des cartes
app.js       La LOGIQUE : tirage des boosters, collection, affichage
images/      Les illustrations (une par carte)
```

Pas de framework ni d'outil à installer : HTML, CSS et JavaScript, rien d'autre. Pour l'essayer en local, double-cliquez sur `index.html`.

## Règles du tirage (dans `app.js`)

- 1 booster = 5 cartes : 3 ordinaires, 1 rare, puis 1 carte spéciale (rare 65 %, épique 26 %, légendaire 8 %, mythique 1 %).
- Raretés, de la plus courante à la plus rare : Ordinaire, Rare, Épique, Légendaire, Mythique.
- Une carte de la région du joueur a 3 fois plus de chances de sortir (`BONUS_REGION`). La région est devinée à partir du fuseau horaire, sans demander d'autorisation, et le joueur peut la changer.
- 3 boosters offerts à la première visite, puis 1 booster par jour.
- Pour l'instant, la sauvegarde reste dans le navigateur (localStorage).

## Ajouter une carte

Dans `cartes.js`, copiez une ligne `{ id: ..., nom: ..., ... }` et modifiez-la.
Vérifiez : le personnage est décédé, le ton est neutre et factuel, le texte fait moins de 170 caractères.

## Ajouter une illustration

1. Générez l'image avec le prompt ci-dessous (format 4:3, par exemple 1200 × 900).
2. Enregistrez-la dans `images/`, au format WebP de préférence, en la nommant comme l'`id` (ex. `images/cesar.webp`).
3. Dans `cartes.js`, remplacez `image: null` par `image: "images/cesar.webp"`.

### Direction artistique (même base pour toutes les cartes)

> Portrait of [PERSONNAGE], [époque, région, vêtements et attributs historiquement documentés], head and shoulders, three-quarter view, calm neutral expression, classical oil painting in the style of a museum portrait, soft chiaroscuro lighting from the upper left, muted earthy palette with deep blue-black background and subtle gold highlights, fine visible brushwork, dignified and factual, no text, no frame, no weapons raised, no heroic pose, 4:3 composition, centered subject.

Gardez **exactement** la même formulation de style d'une carte à l'autre et ne changez que la partie entre crochets : c'est ce qui donne une collection homogène. Pour les personnages sans portrait d'époque, appuyez-vous sur l'archéologie (vêtements, coiffures, objets) et restez sobre.

## Mise en ligne gratuite (GitHub Pages)

1. Fusionnez cette branche dans `main` (via la Pull Request sur GitHub).
2. Sur GitHub, ouvrez le dépôt, puis **Settings → Pages**.
3. Dans **Source**, choisissez *Deploy from a branch*, puis la branche `main` et le dossier `/ (root)`, et cliquez sur **Save**.
4. Une à deux minutes plus tard, le site est en ligne à l'adresse :
   `https://nathankonop-crypto.github.io/chronica/`

## Étapes suivantes envisagées

1. Illustrations IA pour les 35 cartes.
2. Comptes joueurs et sauvegarde en ligne (Supabase, offre gratuite).
3. Monnaie, vente directe, puis enchères. Ces opérations devront être validées côté serveur pour empêcher la triche.
4. Nouvelles extensions (Moyen Âge, Temps modernes…).
5. Cartes physiques avec code à saisir sur le site.
