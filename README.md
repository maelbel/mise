# Mise

Prepare the week before you cook, as in *mise en place*: plan meals, browse
recipes, track what is in storage, get a shopping list and suggestions from
Chef. Nuxt 4, Pinia, PostgreSQL (Drizzle ORM).

Each person logs in to their own account: their recipes, ingredients, storage,
week plan, shopping list and profile are theirs alone. The profile (body,
activity, goal, diet, foods to avoid) sets daily calorie and protein targets
that the week, the recipes and Chef use.

## Configuration

Copy `.env.example` to `.env` and fill it in. Every variable is described in
`.env.example`. `.env` is never committed and never copied into an image.

## Run with Docker (recommended)

Requires Docker Desktop and a PostgreSQL server reachable from this computer
(the one set in `.env`).

```bash
npm run docker:up      # build and start; open http://localhost:3000
npm run docker:logs    # follow the app's logs
npm run docker:down    # stop
```

`docker compose up` first runs `db-setup`, which creates the database if needed
and applies the migrations. Then `app` starts the dev server. Your files are mounted into the container, so edits
reload the page.

Inside the containers `POSTGRES_HOST` is set to `host.docker.internal`, because
`localhost` there means the container itself. The other values come from `.env`.

No PostgreSQL server? Start the bundled one, after setting `POSTGRES_PORT` in
`.env` to a free port:

```bash
docker compose --profile local-db up -d
```

## Accounts

Nobody can sign up: the family admin creates the accounts.

1. **Create the admin once**, from a terminal. It asks for an email, a first
   name and a password (typed hidden, never stored anywhere but as a hash):

   ```bash
   npm run docker:user:create -- --admin   # with Docker
   npm run user:create -- --admin          # without Docker
   ```

   If the database holds data from before accounts existed, the admin gets it.

2. **Add the family** from the app: *Family* in the menu (admin only). Each new
   account gets the starter recipes and a temporary password, shown once, that
   the person replaces with their own at first login. The admin can give a new
   temporary password or disable an account, but never sees anyone's meals or
   profile.

A session lasts 30 days on a device. Changing or resetting a password, or
disabling the account, ends the other sessions. After 5 wrong passwords an
account is locked for 15 minutes.

### Production image

```bash
npm run docker:build:prod   # builds mise:latest
docker run --env-file .env -e POSTGRES_HOST=host.docker.internal \
  --add-host host.docker.internal:host-gateway -p 3000:3000 mise:latest
```

The production image only holds the built server and runs as the `node` user.
Run the migrations (`db-setup`) before starting it on a new database.

To open it to the family, beyond this computer:

- set `NUXT_APP_SECRET` (see `.env.example`): the built server refuses to start
  without it;
- serve it over HTTPS, so the session cookie stays secure. On a trusted home
  network over plain HTTP, set `NUXT_SESSION_COOKIE_SECURE=false` instead;
- the login lockout counts failures per email and per client address. Behind a
  reverse proxy every request comes from the proxy's address, so only the
  per-email limit really applies.

## Run without Docker

```bash
npm install
npm run db:setup                 # create the database and migrate
npm run user:create -- --admin   # the first account
npm run dev                      # http://localhost:3000
```

## Tests

```bash
npm run typecheck
npm test                    # unit + Nuxt component/store tests
npm run test:integration    # services, accounts and API against POSTGRES_TEST_DB
```

The integration tests wipe and rebuild `POSTGRES_TEST_DB` on every run. Never
point it at real data.

## Database changes

Edit `server/db/schema.ts`, then:

```bash
npm run db:generate   # writes a migration to server/db/migrations
npm run db:migrate
```
