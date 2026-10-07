# Playroom Gaming Portal

A two-page gaming portal built with HTML, CSS, browser JavaScript, Node.js, Express, and MongoDB.

## Start in VS Code

1. Open this project folder in VS Code.
2. Press Ctrl+Shift+P.
3. Choose Tasks: Run Task, then Gaming Portal: Start.
4. Keep the task terminal open and visit http://127.0.0.1:3000 in Chrome or Edge on the same PC.

The server starts the local MongoDB executable from the portable-tools folder in your Windows user profile. Login opens first; a successful sign-in opens the gaming portal at /portal.html.

## Demo sign-in

- Email: player@playroom.test
- Password: playroom123

The demo account is stored in MongoDB when the database is available. Passwords are stored as salted scrypt hashes. Sessions use an HttpOnly cookie; session records are stored in MongoDB for the local demo.

## Page and data flow

1. The browser opens public/index.html, the sign-in page.
2. The login form sends the email and password to POST /api/auth/login.
3. The Node.js server checks the account and sets a session cookie.
4. On success the browser opens public/portal.html.
5. The portal asks GET /api/games for the catalog; Play buttons send POST /api/games/:slug/play to increment a MongoDB counter.

## Main files

- public/index.html and public/login.css: first page and sign-in design
- public/login.js: sign-in form actions and page transition
- public/portal.html, public/styles.css, and public/app.js: second page and portal interactions
- server.js: Express routes, password hashing, sessions, and MongoDB access
- .vscode/tasks.json: one-click VS Code task

This is a local class demo. The demo account is included for presentation and should not be used on a public server. The sample game buttons record play counts; they do not launch third-party games.

## Hosting note

GitHub Pages only serves static site files, so it cannot run this Express server or MongoDB database. The GitHub Pages version is a front-end demo: the demo sign-in and play counts are stored in the visitor's browser. The regular Node.js version continues to use the Express API and MongoDB when started locally.

The included GitHub Actions workflow publishes the `public` folder to GitHub Pages whenever a commit is pushed to `main`. In the repository settings, set Pages' build and deployment source to **GitHub Actions**. The live site URL follows the form `https://<GitHub-username>.github.io/gaming-portal/`.
