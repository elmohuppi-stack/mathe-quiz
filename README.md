# Mathe-Quiz

Mathe-Quiz ist eine responsive Webanwendung fuer adaptives Mathe-Training. Der Schwerpunkt liegt auf kurzen Trainingssessions, didaktisch sauberem Feedback und sichtbar gespeichertem Lernfortschritt pro Modul.

Der aktuelle Repository-Stand ist kein reines Planungsdokument mehr: Frontend, Backend, Datenbankanbindung, Algebra-Validator und die drei Kernmodule sind bereits implementiert und lokal per Docker Compose lauffaehig.

## Aktueller Funktionsumfang

Bereits umgesetzt sind:

- Benutzerkonto mit Registrierung, Login und Token-Pruefung
- Trainingsmodule fuer Kopfrechnen, Brueche und Algebra
- auswaehlbare und gespeicherte Schwierigkeitsstufen pro Modul
- Algebra mit Schritt-fuer-Schritt-Validierung ueber SymPy
- Dashboard mit Modulfortschritt und gespeicherter Verlaufshistorie
- Impressum und Datenschutzerklaerung mit Footer-Links
- Speicherung einzelner Antworten inklusive Aufgaben-Snapshot und Antwortzeit
- Deutsch- und Englisch-Uebersetzungen
- Docker-Compose-Setup fuer Frontend, Backend, PostgreSQL und Validator
- schneller Docker-Dev-Modus mit Live-Reload fuer Frontend, Backend und Validator

Die Produktziele des aktuellen Stands sind:

- schnelle, fokussierte Trainingssessions
- Reduktion von Fluechtigkeitsfehlern
- sichtbarer Fortschritt pro Modul
- strukturierte Rueckmeldung bei Algebra-Schritten
- nutzbare Oberflaechen fuer Mobile und Desktop

## Architektur

Die Anwendung besteht derzeit aus:

- Frontend: React, TypeScript, Vite, Tailwind CSS
- API-Backend: Node.js, TypeScript, Fastify, Prisma
- Algebra-Validierung: FastAPI, Pydantic, SymPy
- Datenbank: PostgreSQL
- Lokaler Betrieb und Ziel-Deployment: Docker Compose

Architekturprinzip:

- Node.js ist das fuehrende Produkt-Backend.
- Der Python-Service dient ausschliesslich als interne Fachkomponente fuer Algebra.
- Aufgaben, Sessions, Antworten und Modulfortschritt werden im Haupt-Backend verwaltet.

## Projektstruktur

Die wichtigsten Verzeichnisse sind aktuell:

- [frontend](frontend): React-Anwendung mit Login, Dashboard und Trainingsseiten
- [backend](backend): Fastify-API, Prisma-Modell, Taskgeneratoren und Statiklogik
- [validator](validator): interner Python-Service fuer Algebra-Auswertung
- [anforderungen.md](anforderungen.md): fachliche Anforderungen und Akzeptanzkriterien
- [implementierungsplan.md](implementierungsplan.md): technischer und produktseitiger Projektstand
- [hetzner-deployment.md](hetzner-deployment.md): Zielbild fuer den Hetzner-Rollout

## Lokale Entwicklung

### Docker Compose

Der schnellste lokale Start ist:

```bash
cp .env.example .env
docker compose up -d --build
```

Vor dem ersten Start muessen in `.env` mindestens `POSTGRES_PASSWORD` und `JWT_SECRET` gesetzt werden. Die Vorlage in `.env.example` enthaelt absichtlich nur Platzhalter und keine Repository-Secrets mehr.

Danach sind die Services standardmaessig erreichbar unter:

- Frontend: `http://localhost:3031`
- Backend: `http://localhost:3032`
- Validator: `http://localhost:3001`
- PostgreSQL: `localhost:5432`

Fuer den normalen Entwicklungsalltag mit vielen Codeaenderungen gibt es jetzt einen deutlich schnelleren Weg:

```bash
make dev-up
```

Der Dev-Modus nutzt dieselben Container, mountet aber Frontend-, Backend- und Validator-Code direkt als Volumes und startet die Prozesse im Watch-Modus. Das bedeutet:

- normale Codeaenderungen brauchen kein `make build`
- bei Frontend-, Backend- und Validator-Code reicht Speichern
- nur bei Aenderungen an Abhaengigkeiten, Dockerfiles oder Basis-Image-Schichten ist ein neuer Build noetig

Nuetzliche Dev-Befehle:

```bash
make dev-up
make dev-logs
make dev-restart
make dev-down
```

### Workspace-Skripte

Nuetzliche Befehle im Monorepo:

```bash
npm run build --workspace=frontend
npm run build --workspace=backend
npm run test --workspace=frontend
npm run test --workspace=backend
```

## Aktuelle API-Oberflaeche

Wichtige derzeit vorhandene Endpunkte sind:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /sessions/start`
- `POST /tasks/next`
- `POST /answers/submit`
- `POST /algebra/validate-step`
- `POST /sessions/end`
- `GET /modules/progress/:module`
- `PUT /modules/progress/:module/level`
- `GET /answers/history/:module`
- `GET /sessions/:sessionId/stats`

## Status

Der aktuelle Stand auf `main` ist:

- Kernplattform laeuft lokal stabil
- Authentifizierung ist implementiert
- Algebra ist Ende-zu-Ende integriert
- Kopfrechnen und Brueche sind als direkte Antwortmodule vorhanden
- Dashboard und Verlauf sind produktiv nutzbar
- Rechtsseiten und Pflichtlinks sind im UI integriert
- Schwierigkeitslevel koennen pro Modul direkt umgeschaltet werden
- Validator- und Frontend-Regressionen wurden bereits abgesichert

Noch offen oder nur teilweise umgesetzt sind:

- weitergehende adaptive Logik pro Modul inklusive Wiederholungslogik
- dedizierte Session-Zusammenfassung nach Trainingsende
- Profilseite, Datenexport und definierter Loeschprozess
- finale rechtliche Pruefung der Texte und Datenschutz-Prozesse fuer den Livegang
- CI/CD-Hardening und finaler Hetzner-Rollout
- breitere automatisierte Testabdeckung fuer UI- und Integrationspfade

## Deployment-Ziel

Die produktive Zielumgebung bleibt:

- Frontend-Domain: `mathe-quiz.elmarhepp.de`
- API-Domain: `mathe-quiz-api.elmarhepp.de`
- Deploy-Pfad: `/var/www/mathe-quiz`
- Web-Port intern: `3041`
- API-Port intern: `3042`

Der finale produktive Betrieb soll weiterhin auf dem bestehenden Hetzner-Multi-App-Server mit zentralem Host-Nginx und TLS via Certbot erfolgen.

Fuer den Produktionsstart auf Hetzner sollte das Compose-Setup mit der dedizierten Datei gestartet werden:

```bash
cp .env.production.example .env.production
docker compose --env-file .env.production up -d --build
```

Vor dem Start muessen in `.env.production` insbesondere `POSTGRES_PASSWORD` und `JWT_SECRET` durch echte Werte ersetzt werden.

## Naechste sinnvolle Schritte

Die naechsten realistischen Ausbaustufen sind:

1. adaptives Leveling und Wiederholungslogik pro Modul ausbauen
2. Session-Abschluss mit eigener Zusammenfassung vervollstaendigen
3. Profil, Datenexport und Loeschprozess ergaenzen
4. weitere automatische Tests fuer Trainings-, Dashboard- und Auth-Flows ergaenzen
5. produktionsnahes Deployment und CI/CD finalisieren
