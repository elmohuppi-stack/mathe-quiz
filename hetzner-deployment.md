# Hetzner Multi-App Deployment Standard

Diese Vorlage ist der verbindliche Standard fuer neue Apps auf deinem bestehenden Hetzner-Server.

## 1. Ziel

- ein gemeinsamer Hetzner-Server
- mehrere Apps parallel ueber Subdomains
- Host-Nginx als zentraler Router
- pro App ein eigenes `docker compose`
- TLS ueber Let's Encrypt und Certbot
- DNS bei Spaceship ueber `A @` und `A *`

---

## 2. Werte pro App

Fuer jede App werden genau diese Werte festgelegt:

| Variable          | Beschreibung                         | Beispiel                |
| ----------------- | ------------------------------------ | ----------------------- |
| `APP_SLUG`        | technischer Projektname              | `todo-app`              |
| `FRONTEND_DOMAIN` | oeffentliche Frontend-Domain         | `todo.elmarhepp.de`     |
| `API_DOMAIN`      | oeffentliche API-Domain              | `todo-api.elmarhepp.de` |
| `WEB_PORT`        | interner Frontend-Port auf localhost | `3011`                  |
| `API_PORT`        | interner API-Port auf localhost      | `3012`                  |
| `DEPLOY_PATH`     | Pfad auf dem Server                  | `/var/www/todo-app`     |

Ports muessen pro App eindeutig sein.

### 2.1 Optionaler interner Service

Falls eine App einen rein internen Fachservice benoetigt, zum Beispiel einen SymPy-Validator, gilt:

- keine eigene oeffentliche Domain
- keine Host-Port-Freigabe
- nur Zugriff im Compose-Netzwerk

---

## 3. DNS-Annahmen bei Spaceship

Empfohlenes Basis-Setup:

| Typ | Host | Wert           |
| --- | ---- | -------------- |
| `A` | `@`  | `<hetzner-ip>` |
| `A` | `*`  | `<hetzner-ip>` |

Damit zeigen alle Subdomains auf denselben Server. Welche App ausgeliefert wird, entscheidet der Host-Nginx auf Hetzner.

---

## 4. Erwartete Produktions-Umgebung

### 4.1 Root `.env.production`

```env
NODE_ENV=production
WEB_PORT=<WEB_PORT>
API_PORT=<API_PORT>
VALIDATOR_INTERNAL_PORT=8001
POSTGRES_DB=mathe_quiz
POSTGRES_USER=mathe_user
POSTGRES_PASSWORD=<SET_STRONG_POSTGRES_PASSWORD>
JWT_SECRET=<SET_LONG_RANDOM_JWT_SECRET>
FRONTEND_ORIGIN=https://<FRONTEND_DOMAIN>
VALIDATOR_URL=http://validator:8001
VITE_API_BASE_URL=https://<API_DOMAIN>
VITE_LEGAL_NAME=<LEGAL_NAME>
VITE_LEGAL_EMAIL=<LEGAL_EMAIL>
VITE_LEGAL_ADDRESS_LINE_1=<LEGAL_ADDRESS_LINE_1>
VITE_LEGAL_ADDRESS_LINE_2=<LEGAL_ADDRESS_LINE_2>
VITE_LEGAL_COUNTRY=Deutschland
VITE_LEGAL_CONTENT_RESPONSIBLE=<LEGAL_CONTENT_RESPONSIBLE>
```

Bei einem Compose-Deployment wird diese Root-Datei direkt von `docker compose --env-file .env.production` ausgewertet. Separate `backend/.env.production`- oder `frontend/.env.production`-Dateien werden dabei nicht automatisch eingelesen.

### 4.5 Datenschutzrelevante Betriebsdaten

Fuer den produktiven Betrieb in Deutschland sollte pro App dokumentiert werden:

- welcher Hosting-Anbieter eingesetzt wird
- welche Domains verarbeitet werden
- welche Logs anfallen
- welche weiteren Drittanbieter eingebunden sind

Diese Informationen werden spaeter fuer die Datenschutzerklaerung und die interne Betriebsdokumentation benoetigt.

---

## 5. Docker-Compose-Konvention

Die App darf keine oeffentlichen Ports `80` oder `443` direkt belegen.

Erlaubt sind nur localhost-Bindings fuer Frontend und API:

```yaml
services:
  api:
    ports:
      - "127.0.0.1:<API_PORT>:3000"

  web:
    ports:
      - "127.0.0.1:<WEB_PORT>:3000"
```

Fuer interne Services gilt:

```yaml
services:
  validator:
    expose:
      - "8001"
```

`expose` bedeutet hier nur interne Erreichbarkeit im Compose-Netzwerk.

---

## 6. Nginx-Template auf Hetzner

Datei:

```bash
/etc/nginx/sites-available/<APP_SLUG>.conf
```

Inhalt:

```nginx
server {
    listen 80;
    server_name <FRONTEND_DOMAIN>;
    return 301 https://$host$request_uri;
}

server {
    listen 80;
    server_name <API_DOMAIN>;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name <FRONTEND_DOMAIN>;

    ssl_certificate /etc/letsencrypt/live/<FRONTEND_DOMAIN>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<FRONTEND_DOMAIN>/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://127.0.0.1:<WEB_PORT>;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl;
    server_name <API_DOMAIN>;

    ssl_certificate /etc/letsencrypt/live/<FRONTEND_DOMAIN>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<FRONTEND_DOMAIN>/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://127.0.0.1:<API_PORT>;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 6.1 Zertifikats-Hinweis

Das oben gezeigte Zertifikatspfad-Muster funktioniert, wenn Certbot ein gemeinsames SAN-Zertifikat mit

```bash
certbot --nginx -d <FRONTEND_DOMAIN> -d <API_DOMAIN>
```

erstellt. Dann liegt das Zertifikat unter dem Pfad des ersten Domainnamens. Wenn getrennte Zertifikate erzeugt werden, muessen die Pfade je Serverblock angepasst werden.

### 6.2 Aktivierung

```bash
ln -s /etc/nginx/sites-available/<APP_SLUG>.conf /etc/nginx/sites-enabled/<APP_SLUG>.conf
nginx -t
systemctl reload nginx
certbot --nginx -d <FRONTEND_DOMAIN> -d <API_DOMAIN>
```

---

## 7. Standard-Deploy-Ablauf

Fuer neue Projekte ist das der Zielablauf:

1. Repository nach `/var/www/<APP_SLUG>` deployen
2. Produktions-Umgebungsvariablen setzen
3. `docker compose --env-file .env.production up -d --build`
4. Nginx-Site anlegen
5. HTTPS mit Certbot aktivieren
6. technisch verifizieren
7. Datenschutz- und Pflichtseiten pruefen

### 7.1 Verifikation

```bash
curl -I https://<FRONTEND_DOMAIN>/
curl -i https://<API_DOMAIN>/health
docker compose ps
nginx -t
```

Zusatzcheck vor Livegang:

- Impressum verlinkt und erreichbar
- Datenschutz verlinkt und erreichbar
- keine ungewollten Drittanbieter-Skripte im Frontend-Bundle
- Logging und Retention dokumentiert

---

## 8. GitHub-Actions-Konvention

Der Deployment-Workflow soll sich an diesem Muster orientieren:

```bash
cd /var/www/<APP_SLUG>
git pull origin main
docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production exec api <migration-command>
```

Wichtig:

- kein Deployment nach `~/appname`
- immer in den festen Pfad unter `/var/www`
- Migrationen ueber das Haupt-Backend ausfuehren

---

## 9. Prompt-Vorlage fuer neue Projekte

```text
Diese App soll nach meinem Hetzner-Multi-App-Standard deployed werden.

Rahmenbedingungen:
- zentraler Host-Nginx auf Hetzner
- DNS bei Spaceship mit Wildcard auf die Server-IP
- keine App darf direkt 80/443 belegen
- Deployment-Pfad: /var/www/<APP_SLUG>
- Frontend-Domain: https://<FRONTEND_DOMAIN>
- API-Domain: https://<API_DOMAIN>
- interne Ports: WEB=<WEB_PORT>, API=<API_PORT>
- interne Fachservices duerfen nicht oeffentlich freigegeben werden
- HTTPS via certbot --nginx

Bitte richte Docker Compose, Produktions-Env, Host-Nginx und die Verifikationsschritte entsprechend ein.
```

---

## 10. Konkrete Werte fuer Mathe-Quiz

| Variable          | Wert                          |
| ----------------- | ----------------------------- |
| `APP_SLUG`        | `mathe-quiz`                  |
| `FRONTEND_DOMAIN` | `mathe-quiz.elmarhepp.de`     |
| `API_DOMAIN`      | `mathe-quiz-api.elmarhepp.de` |
| `WEB_PORT`        | `3041`                        |
| `API_PORT`        | `3042`                        |
| `DEPLOY_PATH`     | `/var/www/mathe-quiz`         |

Falls ein interner Validator-Service genutzt wird, bleibt er ausschliesslich im Compose-Netzwerk und erhaelt keine oeffentliche Weiterleitung im Host-Nginx.

---

## 11. Empfehlung fuer das Domain-Schema

Fuer mehrere Apps bleibt dieses Muster sauber und skalierbar:

- `benzin.elmarhepp.de`
- `benzin-api.elmarhepp.de`
- `todo.elmarhepp.de`
- `todo-api.elmarhepp.de`
- `mathe-quiz.elmarhepp.de`
- `mathe-quiz-api.elmarhepp.de`

So bleibt `elmarhepp.de` selbst frei fuer Landingpage oder Portal.
