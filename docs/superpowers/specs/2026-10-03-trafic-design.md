# Suivi du trafic — design

Date : 2026-10-03. Statut : validé en conversation.

## Objectif

Voir dans le dashboard admin qui vient sur le site, d'où, sur quel appareil et quelles pages, jour par jour, avec des graphiques — en particulier pendant la bêta. Les événements du funnel (`AnalyticsEvent`) restent inchangés : le trafic est une mesure à part.

Critères de réussite : chaque page publique vue est comptée une fois ; l'onglet « Trafic » affiche visiteurs, visites, pages vues, nouveaux visiteurs, graphiques par jour et par heure, et les répartitions par page, source, appareil, langue, pays ; aucune donnée personnelle (ni IP, ni user-agent complet, ni cookie).

Hors périmètre : temps passé sur la page, taux de rebond, parcours page par page, agrégations SQL (calcul en mémoire comme le reste du dashboard), purge automatique.

## Collecte

### Navigateur (`apps/web`)

- `lib/traffic.ts` :
  - `visitorId()` : UUID aléatoire dans `localStorage` (`ca-tient:visitor`), repli en mémoire si le stockage est bloqué ;
  - réutilise `sessionId()` de `lib/analytics.ts` (une visite = un onglet) ;
  - `deviceType(userAgent, maxTouchPoints)` → `mobile | tablet | desktop` (fonction pure : `iPad`, `Tablet`, Android sans `Mobile`, ou Mac tactile → tablet ; `Mobi`/`iPhone`/Android → mobile ; sinon desktop) ;
  - `isTrackingDisabled()` : vrai si `navigator.webdriver` ou si `localStorage["ca-tient:no-track"] === "1"` ;
  - `trackPageView(path, locale)` : fire-and-forget `POST /analytics/pageviews` avec `{ visitorId, sessionId, path, locale, device, timeZone, referrerHost?, utmSource? }` ; la source vient de `readAcquisition()` (première source de l'onglet).
- `components/analytics/PageViewTracker.tsx` (client, dans `app/[lang]/layout.tsx`) : envoie une vue à chaque changement de `usePathname()`. L'admin n'est pas sous `[lang]` : jamais compté.
- Admin : bouton « Ne pas compter mes visites » / « Recompter mes visites » dans l'onglet Trafic (pose ou retire `ca-tient:no-track` dans ce navigateur).

### API (`apps/api`)

- Modèle `PageView` : `id`, `visitorId`, `sessionId`, `path`, `locale`, `device`, `country String?`, `source String`, `createdAt` ; index sur `createdAt` et `visitorId`. Migration additive.
- `POST /analytics/pageviews` (204, 120 requêtes/min/IP) — `PageViewDto` :
  - `visitorId`, `sessionId` : `^[A-Za-z0-9-]{8,64}$` ;
  - `path` : `^/[a-z0-9/_-]*$`, 1 à 120 caractères ;
  - `locale` ∈ `fr|en` ; `device` ∈ `mobile|tablet|desktop` ;
  - `timeZone` facultatif, `^[A-Za-z_]+(/[A-Za-z0-9_+-]+){0,2}$`, ≤ 64 ;
  - `referrerHost` facultatif (`^[a-z0-9.-]+$`, ≤ 100) ; `utmSource` facultatif (≤ 100).
- Fonctions pures, testées (`analytics/traffic.ts`) :
  - `normalizePath(path)` : `/analyse/<id>` → `/analyse/:id`, `/en/analyse/<id>` → `/en/analyse/:id`, slash final retiré (sauf `/`) ;
  - `countryFromTimeZone(tz)` : table des fuseaux utiles (Afrique de l'Ouest et centrale, France, Belgique, Canada, etc.) → code pays, sinon `null` ;
  - `trafficSource({ utmSource, referrerHost })` : `utm_source` prioritaire (normalisé en minuscules), sinon hôte référent classé (`google`, `facebook`, `instagram`, `whatsapp`, `tiktok`, `linkedin`, `x`, `bing`, `youtube`, sinon l'hôte), sinon `direct`.
- Seuls le chemin normalisé, la langue, l'appareil, le pays estimé et la source sont stockés : jamais le fuseau, le référent complet ni l'IP.

## Restitution

- `GET /admin/traffic?period=7d|30d|90d|all` (clé admin, filtres de période seulement) → fonctions pures `trafficStats(views, firstSeen, from, to)` :
  - `kpis` : `visitors` (visitorId distincts), `visits` (sessionId distincts), `pageViews`, `pagesPerVisit`, `newVisitors` (visiteurs dont la toute première vue est dans la période) ;
  - `daily` : par jour UTC, `{ date, visitors, pageViews }` (jours sans visite à 0) ;
  - `hours` : vues par heure, heure du Bénin (UTC+1), 24 entrées ;
  - `pages` (vues + visiteurs, top 15), `sources` (visites), `devices`, `locales`, `countries` (visiteurs ; `null` → « Inconnu »).
- Page `apps/web/src/app/admin/trafic/page.tsx`, entrée « Trafic » dans la navigation admin (juste après « Vue d'ensemble ») :
  - 5 indicateurs ;
  - « Visiteurs par jour » et « Pages vues par jour » : deux graphiques à une seule série (`DailyChart`, émeraude) ;
  - « Affluence par heure (heure du Bénin) » : graphique en barres ;
  - `BarTable` : pages, sources, appareils, langues, pays (estimé) ;
  - bouton d'exclusion de son propre navigateur.

## Confidentialité

`/confidentialite` (FR et EN), section « Ce que nous enregistrons » : les statistiques de visite comptent les pages vues avec un identifiant aléatoire gardé dans le navigateur (pas de nom, pas d'IP, pas de cookie publicitaire), l'appareil, la langue, la source et le pays estimé à partir du fuseau horaire. Section « Cookies et stockage » mise à jour. `DECISIONS.md` et `ANALYTICS.md` complétés.

## Vérification

- API : DTO (valeurs refusées), `normalizePath`, `countryFromTimeZone`, `trafficSource`, `trafficStats` (distincts, nouveaux visiteurs, jours vides, heure du Bénin), intégration `POST /analytics/pageviews` → `GET /admin/traffic`.
- Web : `deviceType` (vitest).
- Chrome (3011/3012) : quelques visites desktop et mobile (avec `navigator.webdriver` neutralisé dans le script), puis lecture de l'onglet Trafic ; bouton d'exclusion efficace ; admin non compté ; contrôle des couleurs des graphiques (même émeraude déjà validée).
