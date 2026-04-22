# Anforderungen: Mathe-Quiz Webanwendung

## 1. Ziel des Systems

Ein interaktives Mathe-Trainingssystem, das kein reines Quiz ist, sondern gezielt folgende Faehigkeiten verbessert:

- Automatisierung grundlegender Rechenoperationen
- Reduktion von Fluechtigkeitsfehlern
- Erhoehung der Verarbeitungsgeschwindigkeit
- saubere Anwendung von Umformungsregeln in der Algebra

Das System muss adaptiv, messbar und erweiterbar sein.

---

## 2. Kernfunktionale Anforderungen

### 2.1 Module-System

Das System muss modular aufgebaut sein. Jedes Modul besitzt:

- eigene Aufgabentypen
- eigene Bewertungslogik
- eigene Metriken
- eigene Schwierigkeitsstufen

### 2.2 Pflicht-Module im MVP

#### A. Kopfrechnen

- Addition
- Subtraktion
- Multiplikation
- Division
- konfigurierbare Zahlenbereiche

#### B. Brueche und Prozent

- Brueche addieren und subtrahieren
- Kuerzen und Erweitern
- Prozent von X
- prozentuale Veraenderung

#### C. Algebra - Gleichungen umformen

- lineare Gleichungen
- Fokus auf Schritt-fuer-Schritt-Umformung
- Validierung des naechsten korrekten Schritts

### 2.3 Mindestumfang pro Modul im MVP

| Modul               | Muss im MVP koennen                                                      |
| ------------------- | ------------------------------------------------------------------------ |
| Kopfrechnen         | Direktantwort, Speed-Drill, Basis-Leveling                               |
| Brueche und Prozent | Direktantwort, Basis-Feedback, Basis-Leveling                            |
| Algebra             | Direktantwort, Schritt-fuer-Schritt, Valid/Invalid, Fehlerklassifikation |

---

## 3. Aufgabentypen

| Typ                  | Beschreibung                                  | Eingabe                               | Erwartetes Verhalten                                  |
| -------------------- | --------------------------------------------- | ------------------------------------- | ----------------------------------------------------- |
| Direktantwort        | Aufgabe mit eindeutigem Endergebnis           | numerisch oder algebraisch            | Antwort pruefen, Loesung anzeigen, Metriken speichern |
| Schritt-fuer-Schritt | Benutzer gibt genau den naechsten Schritt ein | algebraischer Ausdruck oder Gleichung | Schritt validieren, Regel benennen, Feedback geben    |
| Regel-Erkennung      | Benutzer erkennt angewendete Regel            | Multiple Choice                       | richtige Regel oder Fehlklassifikation anzeigen       |
| Valid/Invalid        | Benutzer bewertet eine Umformung              | korrekt oder falsch                   | mathematische und regelbasierte Bewertung anzeigen    |
| Speed-Drill          | Folge kurzer Aufgaben ohne Unterbrechung      | kurze numerische Eingabe              | Fokus auf Antwortzeit und Serienleistung              |

### 3.1 Verbindliches Task-Datenmodell

Jede generierte Aufgabe muss mindestens folgende Felder besitzen:

```json
{
  "task_id": "uuid",
  "module": "algebra",
  "task_type": "step_by_step",
  "difficulty_level": "L2",
  "prompt": "2x + 3 = 11",
  "expected_answer": "2x = 8",
  "validation_mode": "next_step",
  "metadata": {
    "rule": "subtract_both_sides",
    "time_limit_ms": null
  }
}
```

---

## 4. Algebra-Spezifikation

### 4.1 Unterstuetzte Regeln

Das System muss im MVP folgende Regeln explizit modellieren:

- Addition oder Subtraktion auf beiden Seiten
- Multiplikation oder Division auf beiden Seiten
- Klammern aufloesen mit Distributivgesetz
- Terme zusammenfassen
- Variable isolieren

### 4.2 Begriffsabgrenzung

| Begriff                     | Bedeutung                                                           | Beispiel                  |
| --------------------------- | ------------------------------------------------------------------- | ------------------------- |
| Aequivalente Terme          | Zwei Ausdruecke mit identischem Wert fuer gleiche Variablenbelegung | `2x + 3` und `3 + 2x`     |
| Aequivalente Gleichungen    | Zwei Gleichungen mit identischer Loesungsmenge                      | `2x + 3 = 11` und `x = 4` |
| Korrekter naechster Schritt | Eine zulaessige Einzeloperation aus dem aktuellen Zustand           | `2x + 3 = 11` -> `2x = 8` |

### 4.3 Validierungslogik

Fuer Schritt-fuer-Schritt-Aufgaben muessen drei Pruefungen erfolgen:

1. Syntaxpruefung
2. mathematische Aequivalenzpruefung
3. regelbasierte Schrittpruefung

#### 4.3.1 Syntaxpruefung

Die Eingabe muss als algebraischer Ausdruck oder als Gleichung parsebar sein.

#### 4.3.2 Mathematische Aequivalenzpruefung

Referenzimplementierung im MVP:

- symbolische Pruefung mit SymPy
- Gleichungen werden in Normalform gebracht
- Aequivalenztest erfolgt ueber identische Loesungsmenge oder symbolische Vereinfachung

Beispielansatz:

```text
simplify(lhs1 - rhs1) und simplify(lhs2 - rhs2)
```

#### 4.3.3 Regelbasierte Schrittpruefung

Selbst wenn zwei Gleichungen aequivalent sind, darf der Schritt in Schritt-fuer-Schritt-Aufgaben abgelehnt werden, wenn:

- mehrere Operationen gleichzeitig ausgefuehrt wurden
- die verlangte Regel nicht angewendet wurde
- der Schritt didaktisch zu gross ist

### 4.4 Fehlerklassifikation

| Fehlertyp                      | Bedeutung                                               | Beispiel                                |
| ------------------------------ | ------------------------------------------------------- | --------------------------------------- |
| Regelverletzung                | Operation nicht korrekt auf beide Seiten angewendet     | nur rechts `-3` statt auf beiden Seiten |
| Vorzeichenfehler               | Vorzeichen beim Umformen falsch behandelt               | `+3` statt `-3`                         |
| Unvollstaendige Transformation | zulaessiger Schritt nicht vollstaendig ausgefuehrt      | Klammer nur teilweise aufgeloest        |
| Falsche Vereinfachung          | Terme mathematisch falsch zusammengefasst               | `2x + x = 2x`                           |
| Zu grosser Schritt             | mehrere Einzelschritte in einem Schritt zusammengezogen | `2x + 3 = 11` -> `x = 4`                |
| Syntaxfehler                   | Eingabe ist nicht parsebar                              | unvollstaendige Gleichung               |

### 4.5 Eingabeformat

#### Erlaubte Syntax

- Zahlen: `1`, `2`, `-3`, `0.5`, `1/2`
- Variablen: `x`, `y`, `z`
- Operatoren: `+`, `-`, `*`, `/`, `^`
- Klammern: `()`
- Leerzeichen: optional
- Gleichheitszeichen: genau ein `=` bei Gleichungen

#### Gueltige Beispiele

```text
2x+3=11
(x+1)*2=10
-3x+5-x=2
```

#### Nicht Teil des MVP

- Gleichungssysteme
- Funktionen mit mehreren Variablen in einer Aufgabe
- Trigonometrie
- Wurzeln, Logarithmen und symbolische Spezialfaelle ausserhalb linearer Gleichungen

---

## 5. Adaptives Schwierigkeitssystem

### 5.1 Eingangsparameter

Fuer jede beantwortete Aufgabe muessen mindestens erfasst werden:

- Antwortzeit in Millisekunden
- Korrektheit
- Anzahl Fehlversuche
- aktuelles Modul
- aktueller Level

### 5.2 Antwortzeit-Klassifikation

Fuer den MVP werden drei Klassen verwendet:

- schnell
- normal
- langsam

Die Schwellenwerte werden pro Modul und Level aus den letzten korrekten Antworten des Benutzers berechnet.

Empfohlene MVP-Regel:

- schnell: Zeit kleiner als persoenlicher Median
- normal: Zeit zwischen Median und Median + 50 Prozent
- langsam: Zeit groesser als Median + 50 Prozent

### 5.3 Anpassungslogik

| Zustand                    | Aktion                                                                        |
| -------------------------- | ----------------------------------------------------------------------------- |
| korrekt + schnell          | naechstes Muster leicht schwerer oder gleicher Level mit haerteren Parametern |
| korrekt + normal           | gleicher Level                                                                |
| korrekt + langsam          | gleiches Muster wiederholen                                                   |
| falsch beim ersten Versuch | aehnliche Aufgabe priorisieren                                                |
| falsch mehrfach            | auf einfacheres Muster zurueckgehen                                           |

Ein einzelner langsamer, aber korrekter Versuch darf im MVP nicht automatisch zu einem Level-Abstieg fuehren.

### 5.4 Schwierigkeitsebenen

#### Kopfrechnen

| Level | Zahlenbereich | Fokus                      |
| ----- | ------------- | -------------------------- |
| L1    | 1-10          | Addition, Subtraktion      |
| L2    | 1-20          | gemischte Grundrechenarten |
| L3    | 1-100         | Multiplikation, Division   |
| L4    | -100 bis 100  | gemischte Aufgaben         |

#### Brueche und Prozent

| Level | Fokus                                      |
| ----- | ------------------------------------------ |
| L1    | gleichnamige Brueche                       |
| L2    | ungleichnamige Brueche mit kleinen Nennern |
| L3    | Kuerzen und Erweitern                      |
| L4    | Prozent von X                              |
| L5    | prozentuale Veraenderung                   |

#### Algebra

| Level | Muster              | Einschraenkung                 |
| ----- | ------------------- | ------------------------------ |
| L1    | `ax + b = c`        | positive Koeffizienten         |
| L2    | `ax + b = c`        | negative Koeffizienten erlaubt |
| L3    | `ax + bx + c = d`   | mehrere Terme auf einer Seite  |
| L4    | `a(x + b) = c`      | einfache Klammer               |
| L5    | `a(x + b) = cx + d` | Terme auf beiden Seiten        |

---

## 6. Wiederholungslogik

### 6.1 Ziel

Fehlerhafte oder auffaellig langsame Aufgaben sollen zeitnah erneut auftauchen, ohne den Trainingsfluss zu blockieren.

### 6.2 Prioritaeten im MVP

1. gerade falsch beantwortete Aufgabe oder sehr aehnliche Variation
2. Aufgabenmuster mit wiederholten Fehlern
3. Aufgabenmuster mit auffaellig hoher Antwortzeit
4. neue Aufgaben

### 6.3 Mindestverhalten

- fehlerhafte Aufgaben kurzfristig wiederholen
- langsame Aufgaben mit geringerer Prioritaet erneut einplanen
- aehnliche Aufgaben mit anderen Zahlen generieren

### 6.4 Minimales Queue-Modell

```json
{
  "failed_patterns": [{ "pattern": "ax_plus_b_equals_c", "priority": 10 }],
  "slow_patterns": [
    { "pattern": "fractions_unlike_denominators", "priority": 3 }
  ]
}
```

---

## 7. Aufgaben-Generierung

### 7.1 Allgemeine Anforderungen

- Aufgaben muessen parametrisch generiert werden
- Parameter haengen von Modul und Level ab
- identische Aufgaben duerfen in einer Session nicht doppelt auftauchen

### 7.2 Harte Generator-Constraints

Fuer algebraische Aufgaben im MVP gilt:

- kein Null-Koeffizient bei linearen Aufgaben
- keine Division durch 0
- eindeutige Loesung
- Loesung muss ganze Zahl oder einfacher Bruch sein
- keine unnoetig grossen Zahlen

### 7.3 Beispiel fuer Algebra-Generator

```pseudocode
generateAlgebraTask(level):
  choose coefficients according to level
  reject if a == 0
  reject if solution is not simple
  reject if task hash already exists in session
  return task
```

### 7.4 Korrekte Schrittbeispiele

```text
Ausgang: 2x + 3 = 11
korrekter naechster Schritt: 2x = 8
korrekter Folgeschritt: x = 4
```

### 7.5 Fehlerhafte Schrittbeispiele

```text
Ausgang: 2x + 3 = 11
Invalid 1: 2x + 3 = 8      # nur rechte Seite veraendert
Invalid 2: 2x = 14         # Vorzeichenfehler
Invalid 3: x = 4           # mathematisch aequivalent, aber als naechster Schritt zu gross
```

---

## 8. Metriken und Tracking

### 8.1 Pro Antwort speichern

- Benutzer-ID
- Aufgabe oder Aufgabenmuster
- Modul
- Aufgabentyp
- Schwierigkeitslevel
- Antwortzeit in Millisekunden
- korrekt oder falsch
- Fehlertyp
- Timestamp

### 8.2 Aggregierte Metriken

- Genauigkeit pro Modul
- durchschnittliche Antwortzeit pro Modul und Level
- Fehlerverteilung nach Kategorie
- Fortschritt pro Level
- Anteil langsamer Antworten

### 8.3 Session-Metriken

- Anzahl Aufgaben
- Genauigkeit
- durchschnittliche Zeit
- haeufigste Fehlertypen
- Level-Aenderung waehrend der Session

---

## 9. Feedback-System

### 9.1 Sofort-Feedback

Nach jeder Aufgabe muss das System mindestens anzeigen:

- richtig oder falsch
- richtige Loesung oder korrekten naechsten Schritt
- kurze Fehlererklaerung bei falscher Antwort

### 9.2 Fehlerfeedback

Beispiele:

- Regelverletzung: Die Operation muss auf beiden Seiten ausgefuehrt werden.
- Vorzeichenfehler: Beim Verschieben von `+3` wird daraus `-3`.
- Unvollstaendig: Die Klammer wurde noch nicht vollstaendig aufgeloest.
- Falsche Vereinfachung: `2x + x` ergibt `3x`, nicht `2x`.

### 9.3 Session-Feedback

Am Ende einer Session muss das System zeigen:

- Genauigkeit
- durchschnittliche Antwortzeit
- haeufigste Fehlerkategorie
- Empfehlung fuer das naechste Training

---

## 10. Trainingsmodi

| Modus     | Beschreibung                                   | Muss im MVP enthalten sein |
| --------- | ---------------------------------------------- | -------------------------- |
| Accuracy  | kein Zeitlimit, Fokus auf korrekte Bearbeitung | ja                         |
| Speed     | Zeitlimit pro Aufgabe                          | ja                         |
| Mixed     | Mischung aus Accuracy und Speed                | optional                   |
| Step Mode | schrittweise Algebra-Eingabe                   | ja                         |

---

## 11. UX-Anforderungen

- geringe Latenz zwischen Aufgaben, Zielwert unter 200 ms im Normalfall
- Tastatureingabe priorisiert
- klare, reduzierte Darstellung
- responsive Layouts fuer Mobile, Tablet und Desktop
- kein animierter Overhead, der das Training verlangsamt
- mobile Algebra-Eingabe muss ohne Spezialtastatur bedienbar sein

---

## 12. Technische Anforderungen

### 12.1 Architekturprinzipien

- Trennung von UI, Aufgabenlogik, Bewertungslogik und Persistenz
- modulare Erweiterbarkeit pro Mathe-Bereich
- serverseitige Validierung der Antworten
- nachvollziehbare, testbare Regel-Engine fuer Algebra

### 12.2 Referenzimplementierung fuer den MVP

Eine empfohlene Referenzimplementierung fuer die Algebra-Validierung ist:

- Web-Frontend in React
- API-Backend in Node.js mit TypeScript
- symbolische Validierung mit SymPy, direkt oder ueber internen Python-Service

Wichtig ist die Faehigkeit, Regeln und Aequivalenz korrekt zu pruefen. Die konkrete Prozessgrenze ist Implementierungsdetail, solange die Schnittstelle stabil bleibt.

### 12.3 Datenhaltung

Das System muss mindestens speichern:

- Benutzerkonto
- Aufgabenhistorie
- Sessions
- Modul- und Level-Fortschritt
- Fehlermuster

Beispielstruktur:

```json
{
  "user_id": "uuid",
  "level_progress": {
    "mental_math": "L2",
    "fractions": "L1",
    "algebra": "L3"
  },
  "sessions": [],
  "answers": []
}
```

---

## 13. Rechtliche Anforderungen fuer Deutschland

Die Website muss fuer den Betrieb in Deutschland mindestens folgende rechtliche Anforderungen erfuellen.

### 13.1 Impressum

Die Website benoetigt ein leicht auffindbares Impressum nach deutschem Recht.

Mindestanforderungen:

- eigener, dauerhaft verfuegbarer Link `Impressum`
- auf jeder Seite erreichbar, spaetestens im Footer
- Name und ladungsfaehige Anschrift des Betreibers
- Kontaktmoeglichkeit, mindestens E-Mail-Adresse
- falls einschlaegig: Rechtsform, Vertretungsberechtigte, Umsatzsteuer-ID

### 13.2 Datenschutzerklaerung

Die Website benoetigt eine leicht auffindbare Datenschutzerklaerung.

Sie muss mindestens abdecken:

- verantwortliche Stelle
- welche personenbezogenen Daten verarbeitet werden
- zu welchen Zwecken die Daten verarbeitet werden
- Rechtsgrundlagen der Verarbeitung
- Speicherdauer oder Kriterien fuer die Speicherdauer
- Empfaenger oder Kategorien von Empfaengern
- Hosting und eingesetzte Drittanbieter
- Betroffenenrechte nach DSGVO
- Kontakt fuer Datenschutzanfragen

### 13.3 Cookies, Analytics und Einwilligung

Fuer den MVP gilt:

- technisch nicht notwendige Cookies oder Tracker nur nach Einwilligung
- technisch notwendige Cookies duerfen ohne Opt-in eingesetzt werden, muessen aber in der Datenschutzerklaerung beschrieben sein
- wenn Analytics eingesetzt wird, muss vor Aktivierung eine wirksame Einwilligung eingeholt und protokolliert werden
- ohne Einwilligungsbanner duerfen im MVP nur technisch notwendige Cookies verwendet werden

### 13.4 Benutzerkonten und DSGVO

Wenn Benutzerkonten vorhanden sind, muss die Anwendung folgende Funktionen unterstuetzen oder organisatorisch absichern:

- Auskunft ueber gespeicherte personenbezogene Daten
- Korrektur von Stammdaten
- Loeschung des Kontos oder definierter Loeschprozess
- Export der eigenen Daten in maschinenlesbarer Form

### 13.5 Minderjaehrige und schulischer Kontext

Da die Anwendung fuer Lernzwecke gedacht ist, muss vor dem produktiven Einsatz geprueft werden:

- ob sich das Angebot an Minderjaehrige richtet
- ob eine Einwilligung der Erziehungsberechtigten oder eine schulische Rechtsgrundlage relevant wird
- ob zusaetzliche Informationspflichten fuer Schulen oder Bildungstraeger bestehen

Diese Pruefung ist spaetestens vor dem Livegang erforderlich.

### 13.6 Hosting und Auftragsverarbeitung

Bei produktivem Betrieb mit personenbezogenen Daten muessen die eingesetzten Dienstleister dokumentiert werden, insbesondere:

- Hosting bei Hetzner
- E-Mail-Dienstleister, falls verwendet
- Analyse- oder Fehlertracking-Dienste, falls verwendet

Falls rechtlich erforderlich, muessen Auftragsverarbeitungsvertraege abgeschlossen und dokumentiert werden.

### 13.7 Logging und Datensparsamkeit

Im MVP sollen nur die Daten gespeichert werden, die fuer Betrieb, Sicherheit und Lernfortschritt notwendig sind.

Das bedeutet:

- keine unnoetige Speicherung von IP-Adressen in der Anwendungsebene
- keine Tracking- oder Marketingdaten ohne klaren Zweck
- Log-Retention begrenzen
- sensible Daten nicht in Klartext loggen

### 13.8 Pflichtseiten im MVP

Vor dem Livegang muessen mindestens vorhanden sein:

- Seite oder Route `Impressum`
- Seite oder Route `Datenschutz`
- Links darauf im Footer

---

## 14. Erweiterbarkeit

Spaetere Erweiterungen sollen moeglich sein fuer:

- weitere mathematische Gebiete
- zusaetzliche Aufgabentypen
- mehrsprachige Oberflaechen
- tiefere Analytik
- Mehrbenutzer- und Lehrkraft-Funktionen

---

## 15. Nicht-Ziele

- kein Fokus auf komplexe Textaufgaben
- keine visuelle Spielerei oder Gamification als Kernfeature
- kein vollstaendiges CAS
- keine KI-basierte Personalisierung ausserhalb der beschriebenen Adaptionslogik

---

## 16. Akzeptanzkriterien fuer den MVP

Der MVP gilt als funktional, wenn folgende Punkte erfuellt sind:

1. Ein Benutzer kann sich registrieren und anmelden.
2. Alle drei Pflicht-Module koennen gestartet werden.
3. Algebra-Aufgaben koennen schrittweise validiert werden.
4. Fehler werden mindestens einer Kategorie zugeordnet.
5. Antwortzeit und Korrektheit werden gespeichert.
6. Die Schwierigkeit passt sich mindestens auf Basis von Korrektheit und Antwortzeit an.
7. Die Anwendung ist auf Mobile und Desktop nutzbar.
8. Nach einer Session wird eine Zusammenfassung angezeigt.
9. Impressum und Datenschutz sind produktiv erreichbar.

---

## 17. Fazit

Das System ist kein klassisches Quiz, sondern ein adaptives, regelbasiertes Trainingssystem fuer mathematische Mikro-Skills mit Fokus auf Lernfortschritt, Fehlerdiagnostik, schnelle Feedbackschleifen und rechtliche Mindestanforderungen fuer den Betrieb als Website in Deutschland.
