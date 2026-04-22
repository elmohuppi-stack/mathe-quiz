# Mathe-Quiz

Mathe-Quiz ist als responsive Webanwendung fuer adaptives Mathe-Training geplant. Der Fokus liegt nicht auf einem klassischen Quiz, sondern auf gezieltem Training mathematischer Mikro-Skills mit messbarem Lernfortschritt, schneller Rueckmeldung und didaktisch sauberer Validierung.

Der aktuelle Repository-Stand ist bewusst dokumentationsgetrieben: Die fachlichen Anforderungen, der Implementierungsplan und der Deployment-Standard sind definiert, die eigentliche Anwendung ist noch nicht implementiert.

## Projektziel

Die Anwendung soll insbesondere diese Bereiche abdecken:

- Kopfrechnen
- Brueche und Prozent
- Algebra mit Schritt-fuer-Schritt-Validierung

Zentrale Produktziele:

- schnelle, fokussierte Trainingssessions
- Reduktion von Fluechtigkeitsfehlern
- adaptive Schwierigkeit auf Basis von Korrektheit und Antwortzeit
- nachvollziehbares Feedback und Fehlerklassifikation
- responsive Nutzung auf Mobile und Desktop

## Geplante Architektur

Die Zielarchitektur fuer den MVP ist:

- Frontend: React + TypeScript + Vite
- Styling: Tailwind CSS
- Haupt-Backend: Node.js + TypeScript + Fastify
- Algebra-Validierung: interner Python-Service mit FastAPI + SymPy
- Datenbank: PostgreSQL
- Deployment: Docker Compose hinter zentralem Host-Nginx auf Hetzner

Architekturprinzip:

- Node.js ist das fuehrende Produkt-Backend.
- Der Python-Service dient ausschliesslich als interne Fachkomponente fuer symbolische Algebra.
- Oeffentliche Exposition erfolgt nur ueber Frontend- und API-Subdomain.

## MVP-Scope

Zum geplanten MVP gehoeren:

- Benutzerkonto mit Login
- Trainingsoberflaeche fuer Mobile und Desktop
- Algebra-Modul mit Schrittvalidierung
- Kopfrechnen-Modul
- Brueche-und-Prozent-Modul
- adaptives Basis-Leveling
- Session-Feedback und Kernmetriken
- Impressum und Datenschutzerklaerung

Nicht Teil des MVP sind unter anderem:

- Lehrer- oder Klassenraumfunktionen
- Mehrmandantenfaehigkeit
- komplexe Echtzeitfunktionen
- Gamification als Kernsystem

## Repository-Inhalt

Der aktuelle Stand besteht aus den Planungs- und Referenzdokumenten:

- [anforderungen.md](anforderungen.md): fachliche Anforderungen und Akzeptanzkriterien
- [implementierungsplan.md](implementierungsplan.md): technische Architektur, Phasen und MVP-Zielbild
- [hetzner-deployment.md](hetzner-deployment.md): verbindlicher Multi-App-Deployment-Standard fuer Hetzner

## Deployment-Ziel

Die produktive Zielumgebung ist bereits festgelegt:

- Frontend-Domain: `mathe-quiz.elmarhepp.de`
- API-Domain: `mathe-quiz-api.elmarhepp.de`
- Deploy-Pfad: `/var/www/mathe-quiz`
- Web-Port intern: `3031`
- API-Port intern: `3032`

Der Betrieb soll auf einem bestehenden Hetzner-Multi-App-Server mit zentralem Nginx und TLS via Certbot erfolgen.

## Rechtlicher Rahmen

Fuer den geplanten produktiven Einsatz in Deutschland sind bereits als Anforderungen aufgenommen:

- Impressum
- Datenschutzerklaerung
- datensparsame Standardkonfiguration
- dokumentierte Dienstleister und Hosting-Angaben
- Export- und Loeschprozess fuer Benutzerdaten

## Status

Aktuell befindet sich das Projekt in der Planungs- und Spezifikationsphase.

Bereits vorhanden:

- konsolidierte Anforderungen
- abgestimmter Implementierungsplan
- definierter Hetzner-Deployment-Standard

Noch ausstehend:

- Repository-Struktur und Quellcode
- Frontend- und Backend-Implementierung
- Datenbankmodell und Migrationen
- Validator-Service
- CI/CD-Setup und produktiver Rollout

## Naechste Schritte

Die naechste sinnvolle Umsetzungsreihenfolge ist:

1. Monorepo-Struktur anlegen
2. Fastify-Backend mit Auth und Prisma aufsetzen
3. React-Frontend mit Trainingsshell anlegen
4. Algebra-Validator-Service mit SymPy integrieren
5. Algebra-Ende-zu-Ende bauen
6. weitere Module, Dashboard und Deployment ergaenzen
