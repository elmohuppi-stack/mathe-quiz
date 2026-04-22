# Implementierungsplan: Mathe-Quiz Webanwendung

## 1. Zielbild

Es entsteht eine responsive Webanwendung fuer mathematisches Training mit drei Produktzielen:

- schnelle, fokussierte Trainingssessions
- didaktisch sauberes Feedback
- messbarer Lernfortschritt pro Modul

Die Architektur wird bewusst einfach gehalten:

- React im Frontend
- Node.js mit TypeScript als Haupt-API
- SymPy nur fuer die algebraische Validierung, angebunden ueber einen internen Python-Service
- PostgreSQL als primaere Datenbank
- Deployment auf dem bestehenden Hetzner-Multi-App-Server

---

## 2. Verbindliche Architekturentscheidungen

| Bereich             | Entscheidung                                | Begruendung                                                      |
| ------------------- | ------------------------------------------- | ---------------------------------------------------------------- |
| Frontend            | React + TypeScript + Vite                   | schnell, komponentenbasiert, mobile und Desktop gut abbildbar    |
| UI-Styling          | Tailwind CSS                                | schnelle Iteration, gute Responsive-Grundlage                    |
| API-Backend         | Node.js + TypeScript mit Fastify            | einheitliche Hauptsprache, guter Durchsatz, einfache Typisierung |
| Algebra-Validierung | interner Python-Service mit FastAPI + SymPy | SymPy ist fuer symbolische Algebra die robusteste Option         |
| Datenbank           | PostgreSQL                                  | stabile relationale Basis fuer Nutzer, Sessions und Metriken     |
| Cache/Queue         | zunaechst ohne Redis, spaeter optional      | MVP erst mit moeglichst wenig Infrastruktur bewegen              |
| Deployment          | Docker Compose + Host-Nginx auf Hetzner     | passt exakt zu deinem Multi-App-Standard                         |

### 2.1 Architekturprinzip

Node.js ist das fuehrende Backend. Der Python-Service ist kein zweites Produkt-Backend, sondern ausschliesslich eine interne Fachkomponente fuer Algebra.

### 2.2 Was explizit nicht mehr Teil des Plans ist

Diese Optionen werden nicht weiter verfolgt:

- reines Python-Hauptbackend
- SQLAlchemy als primaere ORM-Schicht
- Alembic-Migrationen
- Pydantic als API-Standard fuer das Hauptbackend
- app-internes oeffentliches Nginx auf Port 80 oder 443

---

## 3. Produktreihenfolge

Der MVP bleibt fachlich bei drei Modulen, aber technisch wird das Risiko gestaffelt umgesetzt.

### 3.1 Technischer MVP

Zuerst wird Algebra Ende-zu-Ende gebaut, weil dort Parser, Schrittvalidierung und Fehlerklassifikation am schwierigsten sind.

### 3.2 Produkt-MVP

Sobald Algebra stabil laeuft, werden Kopfrechnen und Brueche auf derselben Plattform ergaenzt. Dadurch bleibt die Architektur einheitlich und die schwerste Domaenenlogik wird zuerst geloest.

---

## 4. Ziel-Scope des MVP

Zum MVP-Release muessen vorhanden sein:

- Login und Benutzerkonto
- Trainingsoberflaeche fuer Mobile und Desktop
- Algebra vollstaendig
- Kopfrechnen als direktes Antwortmodul
- Brueche & Prozent als direktes Antwortmodul
- adaptives Basis-Leveling
- Session-Feedback
- Dashboard mit Kernmetriken
- Impressum und Datenschutzerklaerung
- Deployment auf Hetzner unter eigener Frontend- und API-Subdomain

Nicht Bestandteil des MVP:

- Lehrer- oder Klassenraumfunktionen
- Mehrmandantenfaehigkeit
- komplexe Echtzeitfunktionen
- Offline-First
- Gamification-Mechaniken als Kernsystem

### 4.1 Rechtlicher Mindestumfang zum Livegang

Vor dem produktiven Livegang in Deutschland muessen mindestens umgesetzt sein:

- Impressum als eigene Seite
- Datenschutzerklaerung als eigene Seite
- Footer-Links auf beide Seiten
- datensparsame Standardkonfiguration ohne nicht notwendige Tracker
- dokumentierte Liste eingesetzter Dienstleister
- Loesch- und Exportprozess fuer Benutzerdaten

---

## 5. Projektparameter

| Parameter       | Wert                          |
| --------------- | ----------------------------- |
| APP_SLUG        | `mathe-quiz`                  |
| FRONTEND_DOMAIN | `mathe-quiz.elmarhepp.de`     |
| API_DOMAIN      | `mathe-quiz-api.elmarhepp.de` |
| WEB_PORT        | `3031`                        |
| API_PORT        | `3032`                        |
| DEPLOY_PATH     | `/var/www/mathe-quiz`         |

Wenn du spaeter eine kuerzere Domain wie `quiz.elmarhepp.de` moechtest, darf sich nur diese Parametertabelle aendern. Der Rest des Plans bleibt gleich.

---

## 6. Zielarchitektur

```text
Browser
  -> React Frontend
  -> Host-Nginx auf Hetzner
  -> Fastify API (Node.js)
      -> PostgreSQL
      -> interner Validator-Service (FastAPI + SymPy)
```

### 6.1 Verantwortlichkeiten

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
- Metriken und Schwierigkeitsanpassung
- Ansteuerung des Algebra-Validator-Service

#### Python-Validator-Service

- Parsing algebraischer Eingaben
- Aequivalenzpruefung
- regelbasierte Schrittvalidierung
- Rueckgabe strukturierter Fehlercodes

Der Python-Service ist nur intern im Compose-Netzwerk erreichbar und bekommt keine eigene oeffentliche Domain.

---

## 7. Repository-Struktur

```text
mathe-quiz/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── training/
│   │   │   ├── dashboard/
│   │   │   └── settings/
│   │   ├── lib/
│   │   └── routes/
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── training/
│   │   │   ├── stats/
│   │   │   └── health/
│   │   ├── services/
│   │   ├── clients/
│   │   │   └── validatorClient.ts
│   │   ├── db/
│   │   └── shared/
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
├── validator/
│   ├── app/
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml
├── docker-compose.prod.yml
└── .github/workflows/
```

---

## 8. Datenmodell

### 8.1 Kern-Tabellen

| Tabelle         | Zweck                                           |
| --------------- | ----------------------------------------------- |
| users           | Benutzerkonto und Login                         |
| user_profiles   | Profil, Praeferenzen, Trainingsziele            |
| sessions        | Trainingssitzungen                              |
| answers         | einzelne Antworten inklusive Zeit und Fehlertyp |
| module_progress | aktueller Stand pro Modul                       |
| task_patterns   | optionale Referenz auf Aufgabenmuster           |

### 8.2 Minimales Prisma-Modell

```text
User 1---n Session
User 1---n Answer
User 1---n ModuleProgress
Session 1---n Answer
```

### 8.3 Warum kein separates Task-Archiv im MVP

Generierte Aufgaben werden zunaechst als JSON-Snapshot an der Antwort gespeichert. Das reduziert Komplexitaet und reicht fuer Replays, Debugging und Statistiken aus.

---

## 9. API-Schnittstellen

### 9.1 Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

### 9.2 Training

- `POST /sessions/start`
- `GET /tasks/next?module=algebra&mode=step`
- `POST /answers/submit`
- `POST /sessions/:id/end`

### 9.3 Dashboard

- `GET /stats/overview`
- `GET /stats/module/:module`
- `GET /stats/session/:sessionId`
- `GET /profile`
- `PATCH /profile`

### 9.4 Interne Schnittstelle zum Validator

- `POST /validate/expression`
- `POST /validate/equation`
- `POST /validate/step`

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

## 10. Umsetzungsphasen

## Phase 1: Plattform und Grundgeruest

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

### Inhalte

- Kopfrechnen-Modul ergaenzen
- Brueche-&-Prozent-Modul ergaenzen
- adaptive Logik auf Basis von Antwortzeit und Korrektheit einfuehren
- Wiederholungslogik fuer Fehler und langsame Muster ergaenzen

### Ergebnis

Alle drei MVP-Module laufen auf derselben Plattform, und die Schwierigkeit reagiert auf das Verhalten des Benutzers.

### Exit-Kriterien

- drei Module sind im UI auswaehlbar
- pro Modul wird Fortschritt gespeichert
- falsche Aufgabenmuster werden erneut priorisiert
- Levelwechsel sind nachvollziehbar

---

## Phase 4: Dashboard, Profil, Export

### Inhalte

- Dashboard mit Kernmetriken
- Profilseite und Einstellungen
- Session-Historie
- einfacher CSV- oder JSON-Export
- Benutzerprozess fuer Datenauskunft und Datenexport vorbereiten

### Ergebnis

Der Benutzer sieht seinen Fortschritt und kann seine Daten exportieren.

### Exit-Kriterien

- Uebersicht mit Genauigkeit und Antwortzeit vorhanden
- Session-Details abrufbar
- Profil editierbar
- Export funktioniert
- Benutzerkoennen ihre Kernprofildaten einsehen und exportieren

---

## Phase 5: Responsive UX und Hardening

### Inhalte

- mobile Eingabe ueberarbeiten
- Layouts fuer Mobile, Tablet und Desktop finalisieren
- Fehlerfaelle sauber behandeln
- Ladezeiten und Interaktion optimieren
- Tests fuer Kernpfade ergaenzen
- Impressum und Datenschutzerklaerung als statische oder CMS-gestuetzte Seiten integrieren
- Footer und Routing fuer Pflichtseiten ergänzen
- Cookie- und Tracking-Konzept fuer den MVP festlegen

### Ergebnis

Die Anwendung ist stabil, gut bedienbar und fuer den ersten echten Einsatz geeignet.

### Exit-Kriterien

- Mobile-Layout ist ohne horizontales Scrollen nutzbar
- Tastatur-Flow funktioniert in Trainingsansichten
- kritische Flows sind automatisch getestet
- keine Blocker in Login, Training, Dashboard
- Impressum und Datenschutzerklaerung sind im UI erreichbar

---

## Phase 6: Hetzner-Deployment und Betrieb

### Inhalte

- Produktions-Compose nach Hetzner-Standard erstellen
- Host-Nginx-Site konfigurieren
- GitHub Actions Deployment einrichten
- Healthchecks und Logs ueberpruefen
- Hosting- und Drittanbieter-Dokumentation fuer Datenschutz vorbereiten
- Logging auf Datensparsamkeit pruefen

### Ergebnis

Die App laeuft unter deinen Subdomains auf dem bestehenden Hetzner-Server.

### Exit-Kriterien

- Frontend unter `https://mathe-quiz.elmarhepp.de` erreichbar
- API unter `https://mathe-quiz-api.elmarhepp.de/health` erreichbar
- Deployment laeuft ohne manuelle Nacharbeit
- Rollback ueber Git und Compose moeglich
- rechtliche Pflichtseiten sind produktiv verlinkt

---

## 11. Hetzner-Deployment-Standard fuer dieses Projekt

Fuer dieses Projekt gilt verbindlich der Standard aus der Deployment-Vorlage:

- Deploy-Pfad: `/var/www/mathe-quiz`
- zentraler Host-Nginx auf dem Server
- App selbst belegt nicht Port 80 oder 443
- Compose bindet nur an `127.0.0.1:3031` und `127.0.0.1:3032`
- Validator-Service bleibt intern ohne oeffentliche Portfreigabe

### 11.1 Erwartete Compose-Konvention

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

### 11.2 CI/CD-Konvention

Deployment-Zielpfad in GitHub Actions:

```bash
cd /var/www/mathe-quiz
git pull origin main
docker compose up -d --build
docker compose exec api npx prisma migrate deploy
```

---

## 12. Lokale Entwicklung

### 12.1 Empfohlener lokaler Workflow

```bash
# Terminal 1
cd frontend
npm install
npm run dev

# Terminal 2
cd backend
npm install
npm run dev

# Terminal 3
cd validator
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

### 12.2 Alternativ per Docker Compose

Lokales Compose ist erlaubt, aber kein Muss. Fuer reine Frontend- oder API-Arbeit soll der direkte Dev-Workflow bevorzugt werden.

---

## 13. Qualitaets- und Sicherheitsanforderungen

### 13.1 Qualitaet

- Typisierung in Frontend und Backend
- automatisierte Tests fuer Login, Taskfluss und Algebra-Validierung
- klare Fehlercodes vom Validator
- Healthchecks fuer API und Validator

### 13.2 Sicherheit

- JWT mit sinnvoller Ablaufzeit
- Passwort-Hashing mit bcrypt oder argon2
- CORS nur fuer Frontend-Domain in Produktion
- Secrets nur ueber Environment-Variablen
- serverseitige Validierung aller Nutzereingaben

### 13.3 Datenschutz und Compliance

- standardmaessig keine nicht notwendigen Cookies oder Tracker im MVP
- falls spaeter Analytics oder Marketing-Tools eingesetzt werden, nur mit Einwilligungsmechanismus
- Impressum und Datenschutzerklaerung versionierbar pflegen
- Datenexport fuer Benutzer vorsehen
- Account-Loeschprozess definieren
- Hetzner als Hosting-Dienstleister in der Datenschutzerklaerung beruecksichtigen

---

## 14. Risiken und Gegenmassnahmen

| Risiko                                          | Bedeutung             | Gegenmassnahme                                                       |
| ----------------------------------------------- | --------------------- | -------------------------------------------------------------------- |
| Algebra-Validierung wird komplexer als erwartet | Gefahr fuer Zeitplan  | Algebra zuerst bauen, andere Module spaeter ergaenzen                |
| Mobile Eingabe ist zu umstaendlich              | schlechte Nutzbarkeit | fruehe mobile Tests und einfache Input-Syntax                        |
| Adaptionslogik fuehlt sich unfair an            | falsches Lerngefuehl  | konservative MVP-Logik, Level-Abstieg erst nach Wiederholungsfehlern |
| Zu viel Infrastruktur im MVP                    | langsamer Start       | Redis und weitere Services erst spaeter hinzufuegen                  |

---

## 15. Reihenfolge der ersten Implementierung

Die konkrete Bau-Reihenfolge sollte so aussehen:

1. Fastify-API mit Auth und Prisma
2. React-Frontend mit Login und Trainingsshell
3. SymPy-Validator-Service
4. Algebra-Ende-zu-Ende
5. Kopfrechnen und Brueche
6. Dashboard und Export
7. Hetzner-Deployment

---

## 16. Fazit

Der Plan ist jetzt auf eine einzige Zielarchitektur festgezogen: React im Frontend, Node.js als Hauptbackend, SymPy als interne Fachkomponente und Deployment nach deinem bestehenden Hetzner-Multi-App-Standard.
