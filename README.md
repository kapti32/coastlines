# Coastlines: Coastal Community Erosion and Sea Level Change Reporting Portal

A seven-page website for reporting and mapping shoreline erosion, flooding and sea level changes along the
**whole Indian coast**: the nine coastal states (Gujarat, Maharashtra, Goa, Karnataka, Kerala, Tamil Nadu,
Andhra Pradesh, Odisha, West Bengal) and the four coastal union territories (Daman and Diu, Puducherry,
Lakshadweep, Andaman and Nicobar Islands). It is plain HTML, CSS and JavaScript. There is nothing to install
or build.

## What is in it

* **24 press reports**, each taken from a published article (Down To Earth, DredgeWire, OdishaBytes, Onmanorama, Scroll.in, The Goan, The Statesman) and each linking to
  the original. There are **no sample or generated reports** and no community reports until people submit them.
  Coverage is deepest in West Bengal, Odisha, Kerala and Goa: Mandarmani and Digha (West Bengal), Odisha (Satabhaya, Puri),
  Kerala (Chellanam, Shanghumugham, Valiyathura, Ambalappuzha) and Goa (Majorda, Mandrem, Candolim, Colva),
  plus Uppada and Kalingapatnam in Andhra Pradesh. See "Press sources" below.
* **52 monitored coastal sites** across every state and union territory. **13** have a rating taken
  from those reports. The others read **Not assessed**: they are listed so people can report on them, but nothing
  has been published or verified about them here, so no condition or severity is invented.
* **Beach photographs** on the dashboard ("Beaches") and in the site block of the report details page, for the
  sites that have them.
* The map shows the whole coast, with Lakshadweep and the Andaman and Nicobar Islands drawn in place. A **Zoom
  to** menu (and the report form's pin map) focuses on one part of the coast.
* **Coast now** on the dashboard is a live table: one monitored site per state or union territory with air
  temperature, wind, wave height and sea temperature. It loads when it scrolls into view.
* The reports page filters by source (press or community), type, severity, state and site, and searches the
  text, place and article title.
* When someone pins a place that is not a listed site, they choose its state or union territory. The position
  check is a rectangle around India's coast (6.4 to 25.0 N, 67.5 to 94.8 E), so it catches obvious mistakes
  but not every point just offshore or across a border.

## How the press reports were read (please read this)

Each press report has a **summary written in our own words**, the **publication date**, the **author where the
article names one**, and a link to the **original article**. Nothing is copied from the articles beyond short
facts. The article is always the authority; follow the link for the full story.

The **severity** and the **shoreline condition** shown for a report or site are an **editorial reading** of the
article, not a survey measurement. The rule used throughout:

| Severity | Meaning |
|---|---|
| 1 Minor | No damage reported, or the shore is described as stable or protected |
| 2 Moderate | Shoreline retreat or tidal flooding, with no lasting loss reported |
| 3 Serious | Homes, roads or infrastructure flooded, damaged or directly threatened |
| 4 Severe | Homes, villages or land permanently lost, or people displaced |
| Not rated | Nothing published or verified for the site yet |

* A site's condition and severity follow its **most recent report that describes the shoreline**. The site note
  says where sources disagree. Majorda stays **Not assessed**, because its reports are about tidal flooding only.
* Sources sometimes disagree with each other (for example on how many households Satabhaya has lost, or how much of
  Valiyathura's coast is affected). Each report states what **its own** source says, and the site's "Further
  reading" lists other articles, some of them undated. Where a page showed no publication date, the list says so.
* A site's condition describes what the press said at the time of the article, **not today's shoreline**. Do not
  use this site to plan, insure or build anything. Use official surveys (for example NCCR shoreline-change
  atlases and state coastal-zone authorities) for that.
* **Positions are approximate**: a village or town location, not a surveyed point on the shoreline.

## Photographs

The beach photographs are **hotlinked from Wikimedia Commons**, not stored in this folder. Each carries a link to
its Commons file page, where the photographer and licence are shown, and `assets/js/photos.js` reads the
photographer and licence from the Commons API and prints them in the credit line (falling back to "Photo:
Wikimedia Commons" if the lookup fails). Photos are file photographs of the place, not pictures of the events in
the reports, and the pages say so. If a photo cannot be loaded, it is hidden and the page carries on.
The site needs internet access to show them. To host the photos yourself instead, download them from Commons,
respect each licence's attribution terms, and change `photoSrc()` in `assets/js/app.js`.

## Opening animation

The sign-in page opens with a short animation: waves rolling onto a shore at sunrise, a loading bar, then bubbles
that rise and clear to the sign-in form. It takes about five seconds.

* It plays **once per browser session** (a new tab or window plays it again). **Skip intro**, a click or tap
  anywhere, or the Escape key ends it. A **Replay intro** button sits at the bottom left of the sign-in page.
* The bar follows the real page load (scripts, styles, fonts, first screen) but never finishes faster than the
  animation, so the whole scene is seen.
* It does not play for visitors who ask their device for reduced motion, who turned **Motion** off, who are already
  signed in, or who followed a link to an inner page (they go straight to sign-in).
* `?intro=1` on the sign-in address plays it, `?intro=0` skips it. In `assets/js/config.js`, `intro: false` removes it
  and `introReplay: false` hides only the replay button.
* Files: `assets/js/intro.js` (builds and runs the scene) and `assets/css/intro.css` (its look).

## The seven pages

| Page | File | What it does |
|---|---|---|
| 1. Login | `index.html` | Opening animation, then sign in or create an account (name, email, phone, location, password) |
| 2. Coastal Map Dashboard | `dashboard.html` | Map of reports and monitored sites, beach photographs, state chart, live "Coast now" table, site table, weather, Google Earth links |
| 3. Report Submission | `submit.html` | Choose a location or pin one on the map, describe the change, attach 1 to 3 photos or videos |
| 4. Community Reports | `reports.html` | Search and filter every report by source, type, severity, state and site |
| 5. Report Details | `report-details.html?id=R-P15` | One report: facts, source or evidence, map, Google Earth link, live weather, beach photos, further reading, review controls for admins |
| 6. User Profile | `profile.html` | Your details, your submitted reports and their status, change password |
| 7. Admin Panel | `admin.html` | Review queue (verify or reject with a note), site conditions, add sites, members, CSV and Google Earth KML export |

Every page except the login page needs a signed-in account.

## Open it

* **Easiest:** double-click `index.html`. This works in Chrome and Edge. Firefox treats each local file as a
  separate site, so use one of the options below there.
* **Local server:** in this folder run `python3 -m http.server 8000` and open http://localhost:8000
* **Put it online:** upload the folder to any static host (Netlify drag and drop, GitHub Pages, Cloudflare Pages,
  S3, your own web server). **Use https.** Browsers only allow the password hashing this site uses on https or
  on localhost.

## Accounts and admins

* **Member demo account** (shown on the sign-in page): `member@coastlines.example` / `Coastlines-Member-26`.
  It has no reports. Anyone can also create an account on the sign-in page.
* **There is no demo admin.** Nobody is an admin until you say so. Put the email addresses of your admins in
  `assets/js/config.js`:

  ```js
  adminEmails: ['you@example.org'],
  ```

  then create an account (or sign in) with that email. Admins verify or reject community reports, edit site
  conditions, add sites, see members and export data. Until a report is verified it is visible only to its author
  and to admins. Press reports are published as given and are not part of the review queue.
* `adminEmails` is read in the browser. It is a convenience for a static site with no server, and not a security
  boundary: anyone who can edit the page files or the browser's storage can make themselves an admin on their own
  copy. With a real server, assign the admin role there.
* Before you publish for real use, set `showDemoAccounts: false` in `assets/js/config.js`.

## Where the data lives (read this before deploying)

This copy keeps accounts and reports **in each visitor's own browser** (localStorage). That makes it run on any
static host with no server, but it also means:

* Data is **not shared** between people or devices. A report one person submits is not seen by another visitor,
  and one admin cannot review another browser's submissions. The press reports and sites are the same for everyone
  because they ship with the site.
* Storage is about 5 MB per browser. Photos are shrunk before saving, and one report is capped at about 180 KB of
  evidence, but a browser holding many reports with photos can fill up. The Admin page shows the space used.
* Passwords are salted and hashed (PBKDF2-SHA-256, 150,000 rounds) and are never kept as text. Login attempts
  are rate-limited. But anyone with access to the browser can still open its developer tools and change stored
  data, so treat this as a working prototype of the sign-in and moderation flow, not as server-grade security.

To share data between people, replace `assets/js/store.js` with calls to your own server and keep its function
names (`CLStore.db.collection/doc`, `register`, `login`, `logout`, `changePassword`, `user`). The pages do not
need to change. A real server must also repeat every check the pages make (validation, who may write what).

## Live weather

* Default: **Open-Meteo** (no key needed) for air temperature, wind, humidity and pressure, and **Open-Meteo
  Marine** for wave height, wave period and sea level.
* **OpenWeather:** paste your key into `openWeatherKey` in `assets/js/config.js` and air conditions come from
  OpenWeather instead. A key placed in a web page is visible to visitors, so restrict it to your domain in the
  OpenWeather dashboard, or call it through your own server.
* Weather appears on the dashboard side panel, in the "Coast now" table and on the report details page. If the weather service cannot be
  reached the rest of the page still works.
* Open-Meteo asks for attribution and free use is for non-commercial projects. The attribution is already shown
  under every weather card.

## Google Earth

Every report, site and the dashboard have **Open in Google Earth** links (earth.google.com/web) that open the
exact position. The Admin page exports all sites and reports (with their source columns) as a `.kml` file you can
import into Google Earth (File, Import KML), and as CSV.

## Files

```
index.html  dashboard.html  submit.html  reports.html  report-details.html  profile.html  admin.html
assets/css/style.css          all styling (light and dark themes)
assets/css/intro.css          the opening animation
assets/js/app.js              page logic, validation, maps, charts
assets/js/store.js            data and sign-in layer (the one file to replace for a real backend)
assets/js/seed.js             the press reports, monitored sites and photo file names
assets/js/photos.js           photo credits from Wikimedia Commons
assets/js/weather.js          live weather
assets/js/config.js           settings (weather key, intro, demo account, admin emails)
assets/js/ocean.js            the live ocean background (WebGL)
assets/js/intro.js            the opening animation (sign-in page only)
assets/vendor/three.min.js    three.js r128 (MIT licence), used by the ocean background
```

## Press sources

Reports, with the article each one is read from (R-P numbers are the report IDs):

* Down To Earth, "Playing with sea", 2013-01-14. R-P01 ([link](https://www.downtoearth.org.in/environment/playing-with-sea-40050))
* The Statesman, "Rising sea levels, erosion threaten Digha-Mandarmoni coastline", 2024-12-10. R-P02, R-P03 ([link](https://www.thestatesman.com/bengal/rising-sea-levels-erosion-threaten-digha-mandarmoni-coastline-1503374500.html))
* Down To Earth, "Odisha's climate refugees: Last man standing at Satabhaya", 2019-07-09. R-P04 ([link](https://www.downtoearth.org.in/news/climate-change/odisha-s-climate-refugees-last-man-standing-at-satabhaya-65531))
* The Statesman, "Odisha: Nature consumes last visible sign of human civilization in sea-erosion-battered Satabhaya", 2021-07-31. R-P05 ([link](https://www.thestatesman.com/cities/bhubaneshwar/odisha-nature-consumes-last-visible-sign-human-civilization-sea-erosion-battered-satabhaya-1502988437.html))
* OdishaBytes, "200 KM Odisha Coast To Face Erosion By 2050: New Study", 2023-03-13. R-P06, R-P10 ([link](https://odishabytes.com/200-km-odisha-coast-to-face-erosion-by-2050-new-study/))
* Down To Earth, "Environment in elections: Sea erosion is key election issue in Odisha's Satabhaya", 2024-04-22. R-P07 ([link](https://www.downtoearth.org.in/news/climate-change/environment-in-elections-sea-erosion-is-key-election-issue-in-odisha-s-satabhaya-95707))
* Down To Earth, "Illegal buildings trigger erosion, threaten Puri beach", 2007-11-15. R-P08 ([link](https://www.downtoearth.org.in/environment/illegal-buildings-trigger-erosion-threaten-puri-beach-6791))
* OdishaBytes, "Expert Teams To Visit Puri On Sept 5 To Inspect Coastline Erosion Near Swargadwar", 2018-09-04. R-P09 ([link](https://odishabytes.com/expert-teams-visit-puri-sept-5-inspect-coastline-erosion-near-swargadwar/))
* Scroll.in, "Along India's eastern shore, coastal erosion is forcing people to abandon their homes", 2022-02-14. R-P11, R-P12 ([link](https://scroll.in/article/1017277/along-indias-eastern-shore-coastal-erosion-is-forcing-people-to-abandon-their-homes))
* Onmanorama, "Land prices go up, residents return as sea-ravaged Kerala village Chellanam turns sought-after realty spot", 2026-02-02. R-P13 ([link](https://www.onmanorama.com/news/kerala/2026/02/02/chellanam-coastal-revival-tetrapod-seawall-residents-return-land-prices-up.html))
* Onmanorama, "Sea-erosion hit Chellanam residents petition CM seeking extension of seawall second phase to Kochi corp limits", 2026-06-27. R-P14 ([link](https://www.onmanorama.com/news/kerala/2026/06/27/sea-erosion-hit-chellanam-residents-petition-cm-seeking-extension-of-seawall.html))
* Onmanorama, "Heavy rains trigger severe sea erosion in Kochi's Chellanam; homes flooded, roads submerged", 2026-08-01. R-P15 ([link](https://www.onmanorama.com/news/kerala/2026/08/01/monsoon-flooding-coastal-impact-sea-tides.html))
* Onmanorama, "Thiruvananthapuram's famed beaches could vanish in just five years", 2022-07-26. R-P16, R-P17 ([link](https://www.onmanorama.com/news/kerala/2022/07/26/coastal-erosion-impact-thiruvananthapuram-beaches-five-year-warning.html))
* Onmanorama, "Ambalappuzha coastline under threat from swell waves, sea encroachment", 2026-09-28. R-P18 ([link](https://www.onmanorama.com/news/kerala/2026/09/28/coastline-in-crisis-ambalappuzha.html))
* The Goan, "Rising sea water inundates beach shacks along Salcete coast", 2024-10-18. R-P19 ([link](https://thegoan.net/goa-news/%EF%BB%BFrising-sea-water-inundates-beach-shacks-along-salcete-coast/120565.html))
* DredgeWire, "Goa's vanishing coastline: 27% of beaches severely eroded as tourism, climate pressures mount", 2025-04-14. R-P20, R-P23 ([link](https://dredgewire.com/goas-vanishing-coastline-27-of-beaches-severely-eroded-as-tourism-climate-pressures-mount/))
* DredgeWire, "WRD proposes comprehensive coastal protection plan as Goa's beaches face unprecedented erosion crisis", 2025-09-01. R-P21 ([link](https://dredgewire.com/wrd-proposes-comprehensive-coastal-protection-plan-as-goas-beaches-face-unprecedented-erosion-crisis/))
* The Goan, "Environmental concerns: NIO named to survey Candolim beach", 2024-06-13. R-P22 ([link](https://www.thegoan.net/goa-news/environmental-concerns-nio-named-to-survey-candolim-beach/114609.html))
* The Goan, "Monsoon triggers seasonal breach at Colva creek", 2026-06-23. R-P24 ([link](https://www.thegoan.net/goa-news/monsoon-triggers-seasonal-breach-at-colva-creek/150033.html))

## Notes

* The coastline on the map is schematic (a simplified outline, not a survey map).
* The animated ocean background uses WebGL and adapts its quality to the device. **Motion** in the header turns
  it off, and it stays still if the device asks for reduced motion. Without WebGL the page uses a plain blue
  gradient.
* Fonts load from Google Fonts. Offline, the site falls back to system fonts, and the beach photographs and live
  weather will not load.
