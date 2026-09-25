# StudyForge

A personal technical learning and interview-preparation platform.

The backend includes a tested health endpoint and the Milestone 2 database
foundation: SQLAlchemy models and Alembic migrations for PostgreSQL on Supabase.
The React dashboard reads and writes learning paths through FastAPI and
Supabase PostgreSQL. Each path now supports ordered topics with editable
details and progress status. Topics also have persistent Markdown notes.

## Run the application

Requires Node.js 22.13 or newer. First configure `backend/.env` as described
below and apply the Alembic migration. Start FastAPI in one terminal from
`backend`:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Then start the frontend in another terminal from the repository root:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open the local address printed by Vite (normally <http://127.0.0.1:5173>).
On Windows, `npm.cmd` avoids PowerShell script-policy restrictions. On macOS or
Linux, use `npm` instead.

This milestone includes a responsive dashboard, collapsible desktop sidebar,
mobile navigation drawer, search/status filters/sorting, learning-path creation,
editing and confirmed deletion. Open a learning path to add, edit, and delete
topics or set each topic to Not started, In progress, or Completed. New topics
append in order. Path progress updates from saved topic statuses. Changes persist
after refresh through FastAPI. A new database begins with an empty dashboard.
Open a topic to create, edit, preview, and delete notes. Each note can use Plain
text or Markdown; switching modes keeps the content. Choose Write Only, Split
View, or Preview Only without changing the note. Split View stacks its panes on
small screens. Markdown supports GitHub-style tables and task lists plus fenced
code highlighting, language labels, and a Copy Code action. Add up to 30 links
to articles, repositories, videos, or other learning material. Links open in a
new tab and are saved with the note.

Notes autosave shortly after editing while retaining the manual Save button and
Ctrl/Cmd+S shortcut. Saves run serially so an older request cannot overwrite a
newer draft. The editor warns before leaving while changes remain unsaved. An
optional, collapsible Learning Check stores a key takeaway, a question to revisit,
and a confidence level alongside the note.

The UI uses React, TypeScript, React Router, Vite, Tailwind CSS, Lucide icons, and
Radix dialogs/menus for keyboard navigation and focus handling. Design styles
live in `frontend/src/styles.css`; the API client lives in
`frontend/src/services/paths.ts`. Vite proxies `/api` requests to FastAPI on
port 8000 during development. DM Sans and Manrope load from Google Fonts,
with system font fallbacks when offline. No account or sign-in is simulated.

Verify the frontend from `frontend`:

```powershell
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Component tests cover path and topic create/edit/delete, status updates, failed
requests, filtering, search, navigation, and Escape/focus behavior. Browser
tests use a local API fixture to cover desktop CRUD, topic and note persistence,
safe Markdown preview, mobile navigation, deep-link refresh, and horizontal overflow. Backend tests use an
empty, disposable PostgreSQL instance.
Screenshots are written
to the ignored `frontend/test-results` folder. The browser test command starts
and stops Vite automatically, using the appropriate npm command for your OS.

To verify manually, create a path, edit its title from its menu, filter the
dashboard, open a path, add topics, change their statuses, and inspect the
updated progress. Resize below 640px to inspect the single-column layout.
Refresh to confirm topics and progress persist. The
API contract is available at <http://127.0.0.1:8000/docs>.

The learning-path API provides `GET`/`POST /api/paths` and
`GET`/`PATCH`/`DELETE /api/paths/{path_id}`. List responses are bounded to 100
items per page, with `limit` and `offset` parameters. The dashboard follows
all pages. Each response includes topic counts and completion progress. Empty
or whitespace-only titles return 422, missing paths return 404, and creation
returns 201. Deleting a path also deletes its topics and notes.

Topic endpoints: `GET`/`POST /api/paths/{path_id}/topics` and
`GET`/`PATCH`/`DELETE /api/topics/{topic_id}`. Topic lists are bounded to 100
items per page; the frontend follows all pages. Topics are appended under a
valid learning path and listed by position. Invalid status values return 422;
missing parents or topics return 404. Deleting a topic also deletes its notes.

Note endpoints: `GET`/`POST /api/topics/{topic_id}/notes` and
`GET`/`PATCH`/`DELETE /api/notes/{note_id}`. Lists are paginated to 100 notes
per page, newest first. Note titles are required and limited to 200 characters;
content is limited to 200,000 characters. Notes have a `format` of `markdown`
or `plain` and a `links` array of up to 30 optional-label HTTP(S) URLs. Existing
notes default to Markdown with no links when migration `0002` is applied.
Migration `0003` adds nullable `key_takeaway`, `revisit_question`, and
`confidence` fields for the optional Learning Check.
Markdown preview does not render raw HTML, and unsafe link schemes are filtered
by the renderer.

## Requirements

- Python 3.11 or newer (verified with Python 3.13)
- Git
- A dedicated Supabase project for database-backed features

## Set up the backend

Run these commands in PowerShell from the StudyForge repository root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
```

The virtual environment keeps this project's dependencies separate from other
Python projects. Using its Python executable directly avoids needing to activate
the environment or change PowerShell execution policies. The editable install
(`-e`) lets code changes take effect without reinstalling the project; `[dev]`
also installs the testing dependencies.

## Run locally

From `backend`:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Uvicorn serves the FastAPI application. `app.main:app` points to the `app` object
in `app/main.py`; `--reload` restarts the server when code changes during development.
Press Ctrl+C to stop it.

- Health endpoint: <http://127.0.0.1:8000/api/health>
- Interactive API documentation: <http://127.0.0.1:8000/docs>

In a second PowerShell window, verify the endpoint:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
```

The endpoint returns HTTP `200` and JSON `{"status":"ok"}`. PowerShell displays
the parsed response as a table. This check confirms that the API is running;
it does not check a database or other services.

## Run tests

From `backend`:

```powershell
.\.venv\Scripts\python.exe -m pytest
```

The health test checks the HTTP status and response body using FastAPI's
`TestClient`. It runs in-process, so no separate server or database is needed.

## Files

```text
backend/
  app/
    __init__.py
    main.py               # FastAPI app, response schema, and health endpoint
  tests/
    test_health.py        # Health endpoint contract test
  pyproject.toml          # Package metadata, dependencies, and test configuration
.gitignore                # Excludes local environments, secrets, and generated files
README.md                 # Setup, run, and verification instructions
```

The initial endpoint and its Pydantic response schema live together to keep this
milestone small. Feature routes, schemas, and database code will get their own
modules as those features are introduced.

## Connect Supabase (Milestone 2)

1. In your Supabase project's **Connect** panel, select **Session pooler**.
   This supports IPv4 on port 5432. Copy the exact host and username shown there;
   the username typically contains your project reference.
2. From `backend`, copy `.env.example` to `.env` if it does not already exist.
   Fill in `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` locally.
   Keep `DB_SSLMODE=require` for the encrypted Supabase connection. The password
   is your database password, not an API key. Separate fields avoid having to
   URL-encode password characters. Do not share or commit `.env`.
3. Use the project's database administrator connection for the initial migrations.
   The application currently assumes a single local user; keep FastAPI bound to
   localhost. Database credentials remain on the backend.
4. From `backend`, run:

```powershell
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.db.check
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
```

Expected: revision `0001`, the three notebook tables plus `alembic_version`, and
no pending model changes. Tables are created by migrations, never automatically
at server startup. `/api/health` remains a server-only check and works without
database credentials. Restart the server after changing `.env`.

Supabase's project URL and service-role key authenticate its HTTP Data API.
They cannot replace the PostgreSQL credentials used by SQLAlchemy and Alembic.
No Supabase SDK is needed for this architecture.

The initial migration enables row-level security on notebook tables without
browser-access policies. The backend's administrator connection can access them;
this is not multi-user authorization. Since the frontend will call FastAPI,
you can also disable Supabase's unused Data API in the project settings.

### Database design

- `app/core/config.py`: reads environment settings and builds a password-safe URL.
- `app/db/base.py`: shared model metadata and timezone-aware timestamps.
- `app/db/session.py`: synchronous engine and a session dependency for future routes.
- `app/models/`: learning paths, topics, and notes with integer primary keys.
- `alembic/versions/0001_notebook_tables.py`: the initial versioned schema.
- `app/db/check.py`: verifies connectivity and the presence of migrated tables.

Foreign keys enforce parent relationships. Deleting a learning path cascades to
its topics and notes; deleting a topic cascades to its notes. Titles are limited
to 200 characters and cannot be blank. Topic status is constrained to the three
supported values. Positions are nonnegative and sorting uses position then ID;
automatic append positions will be assigned by the future topic service.
SQLAlchemy updates `updated_at` on application-issued updates; direct SQL edits
must set it explicitly. Progress will be calculated from topics, not stored.

Alembic autogeneration is restricted to StudyForge's three tables so unrelated
Supabase tables are not proposed for deletion. Always review a generated migration.
Downgrading to `base` deletes all notebook tables and their data; use that only
on disposable databases.

### Database tests

Normal `pytest` runs health, configuration, and offline migration checks.
Database integration cases are skipped unless `TEST_DATABASE_URL` is set to an **empty,
disposable PostgreSQL database** (using the `postgresql+psycopg://` URL scheme).
Tests refuse a database with existing public tables and roll back their schema
and data changes. They never fall back to the development `.env` connection.

Integration tests check migration upgrade/downgrade, model/schema agreement,
timestamps, ordering, default status, invalid records, database cascades, and
learning-path API behavior.
Use an isolated local test database rather than your Supabase development project.

Connection troubleshooting: confirm the project is running, use the exact
session-pooler host and username, and verify the database password. Direct
connections may require IPv6. A project URL or service-role key is not a database
connection credential.

References: [Supabase connections](https://supabase.com/docs/guides/database/connecting-to-postgres),
[Supabase API security](https://supabase.com/docs/guides/api/securing-your-api),
[Alembic migrations](https://alembic.sqlalchemy.org/en/latest/tutorial.html).
