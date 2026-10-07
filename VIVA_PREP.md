# Gaming Portal — Viva Prep

## Project ni 30 seconds lo cheppadam

“Idi Playroom ane gaming portal. First login page vastundi; correct demo email, password enter chesaka games portal open avuthundi. Frontend HTML, CSS, JavaScript tho undi. Node.js lo Express server run avuthundi. Login sessions mariyu games data MongoDB lo store avuthayi. Game meeda Play click chesthe database lo launch count peruguthundi.”

## Project flow

1. Browser lo http://127.0.0.1:3000 open chestham; login page vastundi.
2. Demo email, password submit chesthe browser POST /api/auth/login ki request pampisthundi.
3. Node.js server MongoDB users collection lo account check chesthundi; password ni scrypt tho verify chesthundi.
4. Login correct ayithe server session create chesi HttpOnly cookie set chesthundi; app /portal.html ki velluthundi.
5. Portal lo browser GET /api/games ki request pampisthundi; games MongoDB nunchi JSON ga vastayi.
6. JavaScript aa JSON ni game cards ga screen meeda chupisthundi.
7. Play click ayithe POST /api/games/:slug/play MongoDB lo launches count ni okati penchuthundi.
8. Logout click ayithe session remove ayyi login page ki tirigi vasthundi.

## File roles

- public/index.html: first-page login form.
- public/login.css: login page colors, layout, and responsive rules.
- public/login.js: demo form fill, password visibility, login request, page transition.
- public/portal.html: second-page portal sections and game-card container.
- public/styles.css: portal colors, layout, cards, mobile screen kosam responsive rules.
- public/app.js: games API requests, search, genre filters, game cards, play and logout actions.
- server.js: Express web server, login/session APIs, password hashing, MongoDB connection, starter game data.
- package.json: app peru, npm start command, Express/MongoDB dependencies.
- .vscode/tasks.json: VS Code nunchi MongoDB mariyu portal ni start cheyyadaniki tasks.

## Viva questions — short answers

### 1. Node.js ante enti?

Node.js JavaScript ni browser bayata, server side lo run chesthundi. Ee project lo API server Node.js meeda run avuthundi.

### 2. Express enduku vadaru?

Express Node.js meeda web framework. Static files serve cheyyadam, URL routes create cheyyadam easy chesthundi.

### 3. MongoDB lo em store avuthundi?

playroom_portal database lo games, users, sessions collections untayi. Game document lo title, genre, description, rating, launches lanti fields untayi; user account mariyu temporary login sessions kuda ikkade untayi.

### 4. API ante enti?

Frontend mariyu backend madhya request/response margam. Udaharanaki GET /api/games games list ni pampisthundi.

### 5. Game count ela peruguthundi?

Play click ayinappudu browser POST /api/games/<slug>/play ki request pampisthundi. Server MongoDB $inc operation tho launches ni 1 penchuthundi.

### 6. First time games ela vastayi?

Server start ayinappudu collection empty ga unte starter games insert chesthundi. Collection lo data unte malli insert cheyyadu.

### 7. Search and genre filter ekkada jaruguthayi?

Browser JavaScript search/genre values ni API request lo pampisthundi. Server MongoDB query ni aa values tho filter chesthundi.

### 8. Mobile lo layout ela adjust avuthundi?

CSS lo @media rules unnayi. Screen width tagginappudu sidebar/menu, cards, spacing maruthayi.

### 9. Ee demo game button actual game ni launch chesthunda?

Ledu. Ee prototype Play click ni simulate chesi database lo launch count save chesthundi. Actual third-party games integration ledu.

### 10. Login tarvata second page ela open avuthundi?

Login API correct response ichaka browser `/portal.html` ki velluthundi. Login session cookie lekapothe server aa page ni chupinchakunda login page ki redirect chesthundi.

### 11. Password ni plain text ga save chesthama?

Ledu. Server `scrypt` tho salt use chesi hash chesthundi; database lo original password store cheyyadu.

### 12. Session cookie enduku?

Login tarvata browser cookie ni request-latho pampisthundi. Server aa cookie token ni MongoDB session record tho match chesi user login ayyi unnada ani telusukuntundi. Cookie HttpOnly ga untundi.

### 13. Demo login enti?

Email `player@playroom.test`, password `playroom123`. Ee credentials local class demo kosam maatrame.

### 14. MongoDB run avvakapothe?

Portal demo login tho open avuthundi; MongoDB connect ayithe games, users, sessions, play counts database lo save avuthayi. Connect kakapothe demo memory mode lo run avuthundi, app restart ayyaka aa temporary data malli reset avuthundi.

## Demo mundu practice

1. VS Code lo gaming-portal.code-workspace open cheyyi.
2. Ctrl+Shift+P press chesi Tasks: Run Task > Gaming Portal: Start select cheyyi. Ee task Node server tho paatu local MongoDB ni kuda start chesthundi.
3. Browser lo http://127.0.0.1:3000 open cheyyi.
4. Demo email/password tho login chesi portal page chupinchu.
5. Search chesi, oka genre filter select chesi, game meeda Play click cheyyi; tarvata logout try cheyyi.
6. Code lo HTML, CSS, JavaScript, server roles ni file-by-file chupinchi explain cheyyi.

## Nee own changes

Viva mundu konni choti changes chesi, enduku marchavo gurthu pettuko:

- public/index.html lo portal peru leka welcome text marchu.
- server.js lo starter game title, genre, description marchu.
- public/styles.css lo theme color values ni marchu.
- public/app.js lo play-button flow ni chaduvi, API request ela velluthundo cheppu.

Change chesina prathi item ni app lo run chesi choodu; nee own words lo explain cheyyagaligite viva lo easy ga untundi.

## Authorship gurinchi

Ee codebase ni starter project ga prepare chesaru. Course rules AI assistance ni disclose cheyyamani chepthe, alane cheyyi. Viva lo system flow ni ardham chesukoni cheppu; nuvvu chesina changes ni kuda exact ga chupinchi vivarinchu.
