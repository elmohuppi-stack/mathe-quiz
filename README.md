# Mathe-Quiz

Mathe-Quiz ist eine responsive Webanwendung fuer adaptives Mathe-Training. Der Schwerpunkt liegt auf kurzen Trainingssessions, didaktisch sauberem Feedback und sichtbar gespeichertem Lernfortschritt pro Modul.

Der aktuelle Repository-Stand ist kein reines Planungsdokument mehr: Frontend, Backend, Datenbankanbindung, Algebra-Validator und die drei Kernmodule sind bereits implementiert und lokal per Docker Compose lauffaehig.

## Aktueller Funktionsumfang

Bereits umgesetzt sind:

- Benutzerkonto mit Registrierung, Login und Token-Pruefung
- Trainingsmodule fuer Kopfrechnen, Brueche und Algebra
- Algebra mit Schritt-fuer-Schritt-Validierung ueber SymPy
- Dashboard mit Modulfortschritt und gespeicherter Verlaufshistorie
- Speicherung einzelner Antworten inklusive Aufgaben-Snapshot und Antwortzeit
- Deutsch- und Englisch-Uebersetzungen
- Docker-Compose-Setup fuer Frontend, Backend, PostgreSQL und Validator

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
docker compose up -d --build
```

Danach sind die Services standardmaessig erreichbar unter:

- Frontend: `http://localhost:3031`
- Backend: `http://localhost:3032`
- Validator: `http://localhost:3001`
- PostgreSQL: `localhost:5432`

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
- `GET /answers/history/:module`

## Status

Der aktuelle Status auf Commit `239b7ae` ist:

- Kernplattform laeuft lokal stabil
- Authentifizierung ist implementiert
- Algebra ist Ende-zu-Ende integriert
- Kopfrechnen und Brueche sind als direkte Antwortmodule vorhanden
- Dashboard und Verlauf sind produktiv nutzbar
- Validator- und Frontend-Regressionen wurden bereits abgesichert

Noch offen oder nur teilweise umgesetzt sind:

- weitergehende adaptive Logik pro Modul
- Profilseite, Export und Datenschutz-Prozesse
- Impressum und Datenschutzerklaerung im UI
- CI/CD-Hardening und finaler Hetzner-Rollout
- breitere automatisierte Testabdeckung fuer UI- und Integrationspfade

## Deployment-Ziel

Die produktive Zielumgebung bleibt:

- Frontend-Domain: `mathe-quiz.elmarhepp.de`
- API-Domain: `mathe-quiz-api.elmarhepp.de`
- Deploy-Pfad: `/var/www/mathe-quiz`
- Web-Port intern: `3031`
- API-Port intern: `3032`

Der finale produktive Betrieb soll weiterhin auf dem bestehenden Hetzner-Multi-App-Server mit zentralem Host-Nginx und TLS via Certbot erfolgen.

## Naechste sinnvolle Schritte

Die naechsten realistischen Ausbaustufen sind:

1. adaptives Leveling und Wiederholungslogik pro Modul ausbauen
2. Session-Abschluss und Profil/Export vervollstaendigen
3. Impressum, Datenschutzerklaerung und Pflichtlinks integrieren
4. weitere automatische Tests fuer Trainings- und Dashboard-Flows ergaenzen
5. produktionsnahes Deployment und CI/CD finalisieren
