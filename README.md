# Homeview – lehed (GitHub Pages)

Avalik repo: siin on ainult see, mida brauser peab laadima. Majamudelite tööriistad ja iOS-i rakendus on privaatses repos `avatarapps/homeview-ios`.

```
engine/            ühine mootor kõigile klientidele
  configurator.js  kogu konfiguraatori loogika
  configurator.css kujundus
  options.js       ühine valikute teek (värvid, materjalid), rühmad, tekstid
  webar.js         Androidi AR-vaade (WebXR)
  tex/, sky.hdr    ühised tekstuurid ja taevas
  page.html        kliendi index.html mall (kõigil sama)
<kliendi kaust>/   üks kaust tootja kohta, nimi juhuslik (lehed on noindex)
  index.html       = engine/page.html
  client.js        majad, valikute erisused, tekstid
  *.glb, app/*.usdz mudelid (tehakse tööriistaga build.py)
demo/              meie oma näidismaja (homeview.secondsun.ee juur), privacy/, support/
```

Reeglid:
- Mootori muutus jõuab kõigile klientidele korraga. Kliendi erisus käib tema `client.js`-i, mitte mootorisse.
- Valikute nimekirju ainult täienda lõpust: salvestatud lingid viitavad valikutele järjekorranumbriga.
- Mudeli uuendamisel tõsta kliendi `client.js`-is `build` väärtust (brauseri vahemälu).
- `demo/tex/` ja `demo/app/metsamaja137_c0_p0_m1.usdz` jäävad alles: iOS-i rakendus 1.0 avab need otse.
- homeview.secondsun.ee: `/` → `demo/`, `/engine/` ja `/<kliendi kaust>/` otse (Cloudflare worker repos `secondsun`).
