# Implementierungsplan: Mathe-Quiz Webanwendung

## 1. Aktueller Stand

Das Projekt befindet sich nicht mehr in der reinen Konzeptionsphase. Der aktuelle Stand umfasst bereits:

- React-Frontend mit Login, Dashboard und Trainingsseiten
- Fastify-Backend mit Auth, Sessions, Aufgaben-Generierung und Verlauf
- PostgreSQL via Prisma
- internen Algebra-Validator auf Basis von FastAPI und SymPy
- drei lauffaehige Module: Algebra, Kopfrechnen und Brueche
- Docker-Compose-Betrieb fuer die komplette lokale Entwicklungsumgebung

Der momentane Stand auf Commit `239b7ae` ist ein funktionierender MVP-Kern mit offenen Ausbau- und Hardening-Themen.

## 2. Zielbild

Es entsteht eine responsive Webanwendung fuer mathematisches Training mit drei Produktzielen:

- schnelle, fokussierte Trainingssessions
- didaktisch sauberes Feedback
- messbarer Lernfortschritt pro Modul

Die Architektur bleibt bewusst einfach:

- React im Frontend
- Node.js mit TypeScript als Haupt-API
- SymPy nur fuer algebraische Validierung, angebunden ueber einen internen Python-Service
- PostgreSQL als primaere Datenbank
- Deployment auf dem bestehenden Hetzner-Multi-App-Server

---

## 3. Verbindliche Architekturentscheidungen

| Bereich             | Entscheidung                                | Begruendung                                                      |
| ------------------- | ------------------------------------------- | ---------------------------------------------------------------- |
| Frontend            | React + TypeScript + Vite                   | schnell, komponentenbasiert, mobile und Desktop gut abbildbar    |
| UI-Styling          | Tailwind CSS                                | schnelle Iteration, gute Responsive-Grundlage                    |
| API-Backend         | Node.js + TypeScript mit Fastify            | einheitliche Hauptsprache, guter Durchsatz, einfache Typisierung |
| Algebra-Validierung | interner Python-Service mit FastAPI + SymPy | SymPy ist fuer symbolische Algebra die robusteste Option         |
| Datenbank           | PostgreSQL                                  | stabile relationale Basis fuer Nutzer, Sessions und Metriken     |
| Cache/Queue         | zunaechst ohne Redis, spaeter optional      | MVP erst mit moeglichst wenig Infrastruktur bewegen              |
| Deployment          | Docker Compose + Host-Nginx auf Hetzner     | passt exakt zu deinem Multi-App-Standard                         |

### 3.1 Architekturprinzip

Node.js ist das fuehrende Backend. Der Python-Service ist kein zweites Produkt-Backend, sondern ausschliesslich eine interne Fachkomponente fuer Algebra.

### 3.2 Was explizit nicht Teil des Plans ist

Diese Optionen werden weiterhin nicht verfolgt:

- reines Python-Hauptbackend
- SQLAlchemy als primaere ORM-Schicht
- Alembic-Migrationen
- Pydantic als API-Standard fuer das Hauptbackend
- app-internes oeffentliches Nginx auf Port 80 oder 443

---

## 4. Produktreihenfolge

Die Reihenfolge der Umsetzung bleibt fachlich nachvollziehbar:

- Algebra wurde zuerst Ende-zu-Ende gebaut, weil dort Parser, Schrittvalidierung und Fehlerklassifikation am schwierigsten sind.
- Danach wurden Kopfrechnen und Brueche auf derselben Plattform ergaenzt.
- Die naechsten Schritte liegen nun vor allem in Adaption, Export, Pflichtseiten und Hardening.

---

## 5. Ziel-Scope des MVP

Der aktuelle Stand bezogen auf den Ziel-Scope ist:

- Login und Benutzerkonto: umgesetzt
- Trainingsoberflaeche fuer Mobile und Desktop: umgesetzt, weiter polishbar
- Algebra vollstaendig: umgesetzt
- Kopfrechnen als direktes Antwortmodul: umgesetzt
- Brueche und Prozent als direktes Antwortmodul: umgesetzt
- adaptives Basis-Leveling: nur in Basisform vorhanden, noch ausbaubar
- Session-Feedback: umgesetzt
- Dashboard mit Kernmetriken: umgesetzt
- Impressum und Datenschutzerklaerung: offen
- Deployment auf Hetzner unter eigener Frontend- und API-Subdomain: vorbereitet, nicht final abgeschlossen

Nicht Bestandteil des MVP bleiben:

- Lehrer- oder Klassenraumfunktionen
- Mehrmandantenfaehigkeit
- komplexe Echtzeitfunktionen
- Offline-First
- Gamification-Mechaniken als Kernsystem

### 5.1 Rechtlicher Mindestumfang zum Livegang

Vor dem produktiven Livegang in Deutschland muessen mindestens umgesetzt sein:

- Impressum als eigene Seite
- Datenschutzerklaerung als eigene Seite
- Footer-Links auf beide Seiten
- datensparsame Standardkonfiguration ohne nicht notwendige Tracker
- dokumentierte Liste eingesetzter Dienstleister
- Loesch- und Exportprozess fuer Benutzerdaten

---

## 6. Projektparameter

| Parameter       | Wert                          |
| --------------- | ----------------------------- |
| APP_SLUG        | `mathe-quiz`                  |
| FRONTEND_DOMAIN | `mathe-quiz.elmarhepp.de`     |
| API_DOMAIN      | `mathe-quiz-api.elmarhepp.de` |
| WEB_PORT        | `3031`                        |
| API_PORT        | `3032`                        |
| DEPLOY_PATH     | `/var/www/mathe-quiz`         |

---

## 7. Zielarchitektur

```text
Browser
  -> React Frontend
  -> Host-Nginx auf Hetzner
  -> Fastify API (Node.js)
      -> PostgreSQL
      -> interner Validator-Service (FastAPI + SymPy)
```

### 7.1 Verantwortlichkeiten

#### Frontend

- Darstellung von Aufgaben
- Eingabe und Session-Fluss
- sofortiges UI-Feedback auf Basis der API-Antwort
- Dashboard und Verlaufsansichten

#### Node.js API

- Authentifizierung
- Session-Steuerung
- Aufgaben-Generierung
- Antwortspeicherung
- Metriken und spaetere Schwierigkeitsanpassung
- Ansteuerung des Algebra-Validator-Service

#### Python-Validator-Service

- Parsing algebraischer Eingaben
- Aequivalenzpruefung
- regelbasierte Schrittvalidierung
- Rueckgabe strukturierter Fehlercodes

Der Python-Service ist nur intern im Compose-Netzwerk erreichbar und bekommt keine eigene oeffentliche Domain.

---

## 8. Repository-Struktur

```text
mathe-quiz/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── i18n/
│   │   ├── lib/
│   │   ├── pages/
│   │   └── store/
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── algebra-generator.ts
│   │   ├── answers.ts
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   ├── server.ts
│   │   ├── sessions.ts
│   │   ├── tasks.ts
│   │   ├── validator-client.ts
│   │   └── validator.ts
│   └── package.json
├── validator/
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml
├── README.md
└── implementierungsplan.md
```

---

## 9. Datenmodell

### 9.1 Kern-Tabellen

| Tabelle         | Zweck                                           |
| --------------- | ----------------------------------------------- |
| users           | Benutzerkonto und Login                         |
| sessions        | Trainingssitzungen                              |
| answers         | einzelne Antworten inklusive Zeit und Fehlertyp |
| module_progress | aktueller Stand pro Modul                       |

Das aktuell implementierte Prisma-Modell ist bewusst schlank und enthaelt keinen separaten `user_profiles`- oder `task_patterns`-Layer.

### 9.2 Minimales Prisma-Modell

```text
User 1---n Session
User 1---n Answer
User 1---n ModuleProgress
Session 1---n Answer
```

### 9.3 Warum kein separates Task-Archiv im MVP

Generierte Aufgaben werden aktuell als JSON-Snapshot an der Antwort gespeichert. Das reduziert Komplexitaet und reicht fuer Replays, Debugging und Statistiken aus.

---

## 10. API-Schnittstellen

### 10.1 Aktuell vorhandene Produkt-Endpunkte

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

### 10.2 Noch nicht umgesetzt, aber weiterhin im Plan

- `GET /profile`
- `PATCH /profile`
- Export-Endpunkte fuer Benutzerdaten

### 10.3 Interne Schnittstelle zum Validator

Der Validator ist intern ueber den Node-Client angebunden und uebernimmt:

- Algebra-Aequivalenzpruefung
- Ausdrucksvalidierung
- Schrittvalidierung mit Fehlerklassifikation

Beispielantwort des Validators:

```json
{
  "is_valid": false,
  "is_equivalent": false,
  "error_code": "SIGN_ERROR",
  "message": "Beim Umformen wurde das Vorzeichen falsch behandelt.",
  "normalized_input": "2*x = 14"
}
```

---

## 11. Umsetzungsphasen

## Phase 1: Plattform und Grundgeruest

Status: weitgehend abgeschlossen

### Inhalte

- Monorepo-Struktur anlegen
- React-Frontend bootstrappen
- Fastify-API bootstrappen
- PostgreSQL anbinden
- Prisma einrichten
- Login und Registrierung bauen
- Healthcheck-Endpunkt bauen

### Ergebnis

Die Anwendung startet lokal vollstaendig, Nutzer koennen sich registrieren, und Backend plus Datenbank sind lauffaehig.

### Exit-Kriterien

- Frontend startet lokal
- Backend startet lokal
- Datenbankmigration laeuft durch
- Login funktioniert
- `GET /health` antwortet erfolgreich

---

## Phase 2: Algebra Ende-zu-Ende

Status: abgeschlossen

### Inhalte

- internen Validator-Service mit SymPy aufsetzen
- Node-Client zum Validator bauen
- Algebra-Taskgenerator erstellen
- Schritt-fuer-Schritt-Validierung implementieren
- Fehlerklassifikation integrieren
- Training-Ansicht fuer Algebra umsetzen

### Ergebnis

Ein Benutzer kann eine Algebra-Session vollstaendig absolvieren und erhaelt korrektes Feedback inklusive Fehlertyp.

### Exit-Kriterien

- Algebra-Aufgabe wird generiert
- Benutzer kann naechsten Schritt eingeben
- Validator bewertet Syntax, Aequivalenz und Regelkonsistenz
- Session-Feedback funktioniert fuer Algebra

---

## Phase 3: Weitere Module und Basis-Adaption

Status: in grossem Teil umgesetzt

### Inhalte

- Kopfrechnen-Modul ergaenzen
- Brueche-und-Prozent-Modul ergaenzen
- adaptive Logik auf Basis von Antwortzeit und Korrektheit einfuehren
- Wiederholungslogik fuer Fehler und langsame Muster ergaenzen

### Ergebnis

Alle drei MVP-Module laufen auf derselben Plattform. Die adaptive Logik ist bislang einfacher als urspruenglich geplant und bleibt ein offener Ausbaupunkt.

### Exit-Kriterien

- drei Module sind im UI auswaehlbar
- pro Modul wird Fortschritt gespeichert
- Levelwechsel und Wiederholungslogik koennen als naechster Schritt vertieft werden

---

## Phase 4: Dashboard, Profil, Export

Status: teilweise umgesetzt

### Inhalte

- Dashboard mit Kernmetriken
- Profilseite und Einstellungen
- Session-Historie
- einfacher CSV- oder JSON-Export
- Benutzerprozess fuer Datenauskunft und Datenexport vorbereiten

### Ergebnis

Der Benutzer sieht bereits seinen Fortschritt und die Verlaufshistorie pro Modul. Profilbearbeitung und Export sind noch offen.

### Exit-Kriterien

- Uebersicht mit Genauigkeit und Antwortzeit vorhanden
- Modulverlauf und letzte Aufgaben sind sichtbar
- Profil editierbar: offen
- Export funktioniert: offen
- Benutzer koennen ihre Kernprofildaten exportieren: offen

---

## Phase 5: Responsive UX und Hardening

Status: teilweise umgesetzt

### Inhalte

- mobile Eingabe ueberarbeiten
- Layouts fuer Mobile, Tablet und Desktop finalisieren
- Fehlerfaelle sauber behandeln
- Ladezeiten und Interaktion optimieren
- Tests fuer Kernpfade ergaenzen
- Impressum und Datenschutzerklaerung als statische oder CMS-gestuetzte Seiten integrieren
- Footer und Routing fuer Pflichtseiten ergaenzen
- Cookie- und Tracking-Konzept fuer den MVP festlegen

### Ergebnis

Die Anwendung ist deutlich stabiler und besser bedienbar als in der Startphase. Vor dem ersten echten Livegang fehlen aber noch rechtliche Seiten, weitere Tests und letzter UX-Feinschliff.

### Exit-Kriterien

- Mobile-Layout ist ohne horizontales Scrollen nutzbar
- Tastatur-Flow funktioniert in Trainingsansichten
- kritische Flows sind automatisch getestet
- keine Blocker in Login, Training, Dashboard
- Impressum und Datenschutzerklaerung sind im UI erreichbar

---

## Phase 6: Hetzner-Deployment und Betrieb

Status: vorbereitet, nicht abgeschlossen

### Inhalte

- Produktions-Compose nach Hetzner-Standard erstellen
- Host-Nginx-Site konfigurieren
- GitHub Actions Deployment einrichten
- Healthchecks und Logs ueberpruefen
- Hosting- und Drittanbieter-Dokumentation fuer Datenschutz vorbereiten
- Logging auf Datensparsamkeit pruefen

### Ergebnis

Die App kann lokal vollstaendig laufen. Der finale produktive Rollout unter den Hetzner-Subdomains bleibt der naechste Infrastrukturschritt.

### Exit-Kriterien

- Frontend unter `https://mathe-quiz.elmarhepp.de` erreichbar
- API unter `https://mathe-quiz-api.elmarhepp.de/health` erreichbar
- Deployment laeuft ohne manuelle Nacharbeit
- Rollback ueber Git und Compose moeglich
- rechtliche Pflichtseiten sind produktiv verlinkt

---

## 12. Hetzner-Deployment-Standard fuer dieses Projekt

Fuer dieses Projekt gilt verbindlich der Standard aus der Deployment-Vorlage:

- Deploy-Pfad: `/var/www/mathe-quiz`
- zentraler Host-Nginx auf dem Server
- App selbst belegt nicht Port 80 oder 443
- Compose bindet nur an `127.0.0.1:3031` und `127.0.0.1:3032`
- Validator-Service bleibt intern ohne oeffentliche Portfreigabe

### 12.1 Erwartete Compose-Konvention

```yaml
services:
  api:
    ports:
      - "127.0.0.1:3032:3000"

  web:
    ports:
      - "127.0.0.1:3031:3000"

  validator:
    expose:
      - "8001"
```

### 12.2 CI/CD-Konvention

Deployment-Zielpfad in GitHub Actions:

```bash
cd /var/www/mathe-quiz
git pull origin main
docker compose up -d --build
docker compose exec api npx prisma migrate deploy
```

---

## 13. Lokale Entwicklung

### 13.1 Empfohlener lokaler Workflow

```bash
npm install

# Frontend
npm run dev --workspace=frontend

# Backend
npm run dev --workspace=backend

# Validator
cd validator
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

### 13.2 Alternativ per Docker Compose

Die aktuell praktischste lokale Variante ist:

```bash
docker compose up -d --build
```

Fuer reine Frontend- oder API-Arbeit kann weiterhin der direkte Dev-Workflow genutzt werden.

---

## 14. Qualitaets- und Sicherheitsanforderungen

### 14.1 Qualitaet

- Typisierung in Frontend und Backend
- automatisierte Tests fuer Generatoren, Algebra-Validierung und ausgewaehlte Frontend-Flows
- klare Fehlercodes vom Validator
- Healthchecks fuer API und Validator

### 14.2 Sicherheit

- JWT mit sinnvoller Ablaufzeit
- Passwort-Hashing mit bcrypt oder argon2
- CORS nur fuer Frontend-Domain in Produktion
- Secrets nur ueber Environment-Variablen
- serverseitige Validierung aller Nutzereingaben

### 14.3 Datenschutz und Compliance

- standardmaessig keine nicht notwendigen Cookies oder Tracker im MVP
- falls spaeter Analytics oder Marketing-Tools eingesetzt werden, nur mit Einwilligungsmechanismus
- Impressum und Datenschutzerklaerung versionierbar pflegen
- Datenexport fuer Benutzer vorsehen
- Account-Loeschprozess definieren
- Hetzner als Hosting-Dienstleister in der Datenschutzerklaerung beruecksichtigen

---

## 15. Risiken und Gegenmassnahmen

| Risiko                                                         | Bedeutung | Gegenmassnahme                                                               |
| -------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------- |
| Algebra-Validierung liefert didaktisch falsche Rueckmeldungen  | hoch      | Regressionstests, reale Beispielfaelle und schmale Validator-Aenderungen     |
| Frontend-Effects oder Session-Flows erzeugen Request-Schleifen | hoch      | kleine isolierte Komponenten, Build-Pruefungen und gezielte Regressionstests |
| Dashboard-Metriken laufen von gespeicherten Antworten weg      | mittel    | Modulfortschritt konsequent aus persisted answers synchronisieren            |
| Docker-Startprobleme maskieren Produktfehler                   | mittel    | Healthchecks, Build-Validierung und direkte Container-Logs nutzen            |
| Rechtliche Pflichtseiten verzoegern den Livegang               | hoch      | fruehzeitig als eigener Arbeitsblock vor Produktiv-Rollout einplanen         |
