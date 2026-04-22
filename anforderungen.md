# Anforderungen: Mathe-Quiz Webanwendung

## 1. Ziel des Systems

Ein interaktives Mathe-Trainingssystem (kein reines Quiz), das gezielt folgende Fähigkeiten verbessert:

- Automatisierung grundlegender Rechenoperationen
- Reduktion von Flüchtigkeitsfehlern
- Erhöhung der Verarbeitungsgeschwindigkeit
- Saubere Anwendung von Umformungsregeln in der Algebra

Das System muss **adaptiv**, **messbar** und **erweiterbar** sein.

---

## 2. Kernfunktionale Anforderungen

### 2.1 Aufgabenmodule (Module-System)

Das System muss modular aufgebaut sein. Jedes Modul hat:

- Eigene Aufgabentypen
- Eigene Bewertungslogik
- Eigene Metriken

#### Pflicht-Module (MVP):

**A. Kopfrechnen**

- Addition, Subtraktion, Multiplikation, Division
- Zahlenbereiche konfigurierbar

**B. Brüche & Prozent**

- Brüche addieren/subtrahieren
- Kürzen/Erweitern
- Prozent von X
- Prozentuale Veränderung

**C. Algebra – Gleichungen umformen (Kernmodul)**

- Lineare Gleichungen
- Fokus: Schritt-für-Schritt-Umformung

### 2.2 Aufgabentypen (pro Modul)

| Typ                            | Beschreibung                                       | Eingabe                              | Validierung                             |
| ------------------------------ | -------------------------------------------------- | ------------------------------------ | --------------------------------------- |
| **Typ 1: Direktantwort**       | Einfache Aufgabe mit Endergebnis                   | Numerisch oder algebraisch           | Richtig/Falsch + Lösung                 |
| **Typ 2: Schritt-für-Schritt** | (Algebra) User gibt nächsten Umformungsschritt ein | Algebraischer Schritt                | Validierung jedes Schritts einzeln      |
| **Typ 3: Regel-Erkennung**     | Frage: „Welche Regel wurde angewendet?"            | Multiple Choice                      | Richtig/Falsch                          |
| **Typ 4: Valid / Invalid**     | Zwei Gleichungen gegeben                           | Benutzer entscheidet: korrekt/falsch | Ist die Umformung mathematisch korrekt? |
| **Typ 5: Speed-Drill**         | Viele Aufgaben hintereinander                      | Schnelle numerische Eingabe          | Fokus: Reaktionszeit                    |

---

## 3. Gleichungsumformung – Spezifikation

### 3.1 Unterstützte Regeln

Das System MUSS folgende Regeln explizit modellieren:

- Addition/Subtraktion auf beiden Seiten
- Multiplikation/Division auf beiden Seiten
- Klammern auflösen (Distributivgesetz)
- Terme zusammenfassen
- Variable isolieren

### 3.2 Validierungslogik (Konkrete Implementierung)

Für jeden Schritt müssen folgende Prüfungen erfolgen:

1. **Äquivalenz-Test**: `simplify(eq1_lhs - eq1_rhs) == simplify(eq2_lhs - eq2_rhs)`
   - Falls FALSE: Gleichung ist nicht äquivalent → **Fehler!**

2. **Regelkonsistenz**: War die angewendete Operation auf BEIDE Seiten angewendet?
   - Beispiel: `2x+3=11` → `2x=8`: Operation `-3` muss auf beiden Seiten sein

3. **Simplification Check**: Sind unnötige Komplexitäten vorhanden?
   - Beispiel: `2x-2x=0` statt `0=0` (nicht vereinfacht)

#### Fehlerklassifikation (detailliert):

| Fehlertyp                         | Beschreibung                      | Beispiel                              |
| --------------------------------- | --------------------------------- | ------------------------------------- |
| **Regelverletzung**               | Operation nicht auf beiden Seiten | Nur rechts -3 statt auf beiden Seiten |
| **Vorzeichenfehler**              | Vorzeichen umgedreht              | `+3` statt `-3` beim Verschieben      |
| **Unvollständige Transformation** | Nicht vollständig durchgeführt    | Klammern nur teilweise aufgelöst      |
| **Falsche Vereinfachung**         | Mathematisch falsch kombiniert    | `2x + x ≠ 2x` (falsch) statt `= 3x`   |
| **Zu großer Schritt**             | Mehrere Operationen auf einmal    | `-3` UND `÷2` in einem Schritt        |

### 3.3 Eingabeformat (Konkrete Spezifikation)

#### Erlaubte Syntax:

- **Zahlen**: `1`, `2`, `-3`, `0.5`, Brüche `(1/2)`
- **Variable**: `x`, `y`, `z` (Kleinbuchstaben)
- **Operatoren**: `+`, `-`, `*`, `/`, `^` (für Potenzen)
- **Klammern**: `()`, auch verschachtelt
- **Leerzeichen**: beliebig (`2x + 3` = `2x+3`)
- **Gleichheit**: `=` trennt linke/rechte Seite

#### Gültige Beispiele:

```
2x+3=11
(x+1)*2=10
x^2-4=0
-3x+5-x=2
```

#### Parser-Implementierung (MUSS):

- **SymPy** zur symbolischen Verarbeitung
- **Äquivalenzprüfung**: `lhs - rhs = 0` vor/nach Schritt (`simplify()`)
- **Erkennung äquivalenter Formen**: `2x+3 ≡ 3+2x`, `x ≡ 4` (wenn Lösung)
- **Normalisierte Ausgabe** für Vergleiche

---

## 4. Adaptives Schwierigkeitssystem

### 4.1 Eingangsparameter pro Aufgabe

- Antwortzeit (ms)
- Korrektheit (ja/nein)
- Anzahl Fehlversuche

### 4.2 Anpassungslogik (Konkrete Schwellenwerte)

#### Klassifikation pro Aufgabe:

- **Schnell**: Antwortzeit < Median_Zeit - 1σ (oberes Quartil)
- **Langsam**: Antwortzeit > Median_Zeit + 1σ
- **Mittel**: Dazwischen

#### Anpassungslogik:

| Ergebnis                   | Aktion                                     |
| -------------------------- | ------------------------------------------ |
| ✓ Korrekt + Schnell        | Level +1 (schwerer)                        |
| ✓ Korrekt + Mittel         | Gleiches Level beibehalten                 |
| ✓ Korrekt + Langsam        | 50% Wahrscheinlichkeit Level -1            |
| ✗ Falsch                   | Level -1 oder ähnliche Aufgabe wiederholen |
| ✗ Falsch + 2x Fehlversuche | Level -1 + Hinweis auf Regelbruch          |

#### Schwellenwerte (pro Session initialisieren):

- **Ausgangs-Median**: Durchschnittliche Zeit der letzten 5 korrekten Aufgaben
- **Neuberechnung**: Alle 10 Aufgaben

### 4.3 Schwierigkeitsebenen (Konkrete Definition)

Jedes Modul benötigt interne Level mit konkreten Regeln:

#### Kopfrechnen:

| Level | Zahlenbereich | Operationen              |
| ----- | ------------- | ------------------------ |
| L1    | 1-10          | Addition, Subtraktion    |
| L2    | 1-20          | Alle Operationen         |
| L3    | 1-100         | Multiplikation, Division |
| L4    | -100 bis 100  | Gemischte Operationen    |

#### Brüche & Prozent:

| Level | Anforderung                                |
| ----- | ------------------------------------------ |
| L1    | Brüche addieren/subtrahieren (gleichnamig) |
| L2    | Brüche mit verschiedenen Nennern (bis 12)  |
| L3    | Kürzen/Erweitern (Nenner bis 20)           |
| L4    | Prozent von X (Zahlen bis 1000)            |
| L5    | Prozentuale Veränderung (mit Bruchteilen)  |

#### Algebra – Gleichungen umformen:

| Level | Beispiel              | Eigenschaften              |
| ----- | --------------------- | -------------------------- |
| L1    | `2x + 3 = 11`         | Einfache lineare Gleichung |
| L2    | `-2x + 5 = -3`        | Negative Koeffizienten     |
| L3    | `2x + 3x + 1 = 10`    | Mehrere Terme mit x        |
| L4    | `2(x + 3) = 14`       | Einfache Klammer           |
| L5    | `(2x + 1)*3 = 15 + x` | Komplexere Umformung       |

---

## 5. Wiederholungslogik (Spaced Repetition)

### Fehlerhafte Aufgaben:

- Sofort erneut anbieten (nächste Aufgabe in gleicher Session)
- Dann nach 2-3 weitere richtige Aufgaben erneut
- Dann nach ~15 min (nächste Session)

### Langsame Aufgaben (Hesitation):

- Markieren wenn Zeit > 2× Durchschnitt für Level
- In nächster Session zu 30% erneut anbieten

### Ähnliche Aufgaben generieren:

- Gleiche Struktur, unterschiedliche Zahlen
- Beispiel: L2 (ax + b = c) → nächste Zahlen im gleichen Bereich

### Tracking-Datenstruktur:

```
failed_tasks: [(task_id, timestamp), ...]
slow_tasks: [(task_id, timestamp, avg_time), ...]
```

### Priorisierungsreihenfolge:

1. Fehler < 2 min alt (sofort erneut)
2. Fehler 2-15 min alt (Priorität +2)
3. Langsame Aufgaben (Priorität +1)
4. Neue Aufgaben (Priorität 0)

---

## 6. Metriken & Tracking

### 6.1 Pro Aufgabe speichern:

- Aufgabentyp
- Modul
- Schwierigkeitslevel
- Antwortzeit (ms)
- Korrekt/Falsch
- Fehlertyp (falls falsch)
- Zeitstempel

### 6.2 Aggregierte Metriken:

- **Genauigkeit** (%) pro Modul
- **Durchschnittliche Antwortzeit** (ms) pro Level
- **Zeit pro Aufgabentyp**
- **Fehlerverteilung** nach Kategorie
- **Fortschritt** pro Level über Zeit

### 6.3 Erweiterte Metriken:

- **Hesitation Score**: % Aufgaben mit Zeit > 2× Durchschnitt
- **Stabilität**: Varianz der Antwortzeiten (niedrig = konsistent)

---

## 7. Trainingsmodi

Das System muss mehrere Modi unterstützen:

| Modus                   | Eigenschaften                        | Fokus                  |
| ----------------------- | ------------------------------------ | ---------------------- |
| **Accuracy Mode**       | Kein Zeitlimit                       | Korrekte Lösungen      |
| **Speed Mode**          | Zeitlimit pro Aufgabe (~5-10s)       | Schnelle Reaktionen    |
| **Mixed Mode**          | Kombination aus Accuracy + Speed     | Balanciertes Training  |
| **Step Mode** (Algebra) | Schrittweise Eingabe mit Validierung | Verständnis der Regeln |

---

## 8. Aufgaben-Generierung

### 8.1 Anforderungen:

- Aufgaben müssen parametrisch generiert werden
- Parameter pro Level definiert (Zahlenbereich, Operationen)
- Keine identischen Aufgaben in einer Session

### 8.2 Generierungs-Algorithmus:

```pseudocode
generate_algebra_task(level):
  if level == 1:
    return f"{rand(1,10)}x + {rand(1,20)} = {rand(1,50)}"
  if level == 2:
    return f"{rand(-5,5)}x + {rand(-20,20)} = {rand(-50,50)}"
  if level == 3:
    return f"{rand(1,5)}x + {rand(1,5)}x + {rand(1,10)} = {rand(10,50)}"
  ...

  Constraints:
  - Lösung muss ganze Zahl oder einfacher Bruch sein
  - Keine Division durch 0
  - Zahlenbereich begrenzen
```

### 8.3 Validierung:

- Generierte Aufgabe lösen (mit SymPy)
- Falls keine einfache Lösung → verwerfen, neu generieren
- **Deduplizierung**: In Session nicht zweimal die gleiche Aufgabe

### 8.4 Variationen für Schritt-für-Schritt-Aufgaben:

#### Korrekte Schritte generieren:

```
eq1 = "2x + 3 = 11"
step1 = "2x = 8"        # Regel: beide Seiten -3
step2 = "x = 4"         # Regel: beide Seiten ÷2
```

#### Fehlerhafte Schritte (für Valid/Invalid Aufgaben):

```
wrong1 = "2x = 8"        # Regel verletzt (nur eine Seite -3)
wrong2 = "2x = 14"       # Vorzeichenfehler (+3 statt -3)
wrong3 = "x = 8"         # Zu großer Schritt (beide Operationen auf einmal)
```

---

## 9. Feedback-System

### 9.1 Sofort-Feedback (nach jeder Aufgabe):

**Bei korrekt:**

```
✓ Richtig! Zeit: 2.3s
Nächste Aufgabe wird schwerer.
```

**Bei falsch:**

```
✗ Nicht richtig.
Fehler: Operation wurde nicht auf beide Seiten angewendet.
Richtig: 2x + 3 = 11 → 2x = 11 - 3 = 8
(beide Seiten -3)
```

### 9.2 Fehlerfeedback (spezifisch pro Fehlertyp):

- **Regelverletzung**: „Die Operation muss auf BEIDEN Seiten erfolgen!"
- **Vorzeichenfehler**: „Achtung: +3 wird zu -3 beim Verschieben!"
- **Unvollständig**: „Klammer noch nicht vollständig aufgelöst."
- **Falsche Vereinfachung**: „2x + x ergibt 3x, nicht 2x!"

### 9.3 Session-Feedback (Zusammenfassung):

```
=== Session Summary ===
Modul: Algebra - Gleichungen umformen
Genauigkeit: 85% (17/20 richtig)
Ø Antwortzeit: 3.2s

Fortschritt:
✓ Schnelle Lösungen: 6 → Level +1
⚠ Langsame Lösungen: 3 → nächstes Mal üben

Häufigste Fehler:
1. Vorzeichenfehler (5x)
2. Regelverletzung (2x)
```

---

## 10. Benutzeroberfläche (UX-Anforderungen)

- **Minimale Latenz**: < 200ms zwischen Aufgaben
- **Tastatureingabe** priorisiert (Fokus auf Input)
- **Keine unnötigen Animationen** (Performance)
- **Klare, reduzierte Darstellung** (Fokus auf Aufgabe)
- **Responsive Design**: Funktioniert auf Mobile/Tablet/Desktop

---

## 11. Technische Anforderungen

### 11.1 Architektur:

Das System muss modular sein mit klarer Trennung:

- **Aufgabenlogik**: Generator, Validierung
- **Bewertungslogik**: Scoring, Level-Anpassung
- **Persistierung**: Datenbank, Speicherung
- **UI-Layer**: React Frontend (nur Daten empfangen/senden)

### 11.2 Algebra-Engine (KONKRET):

**MUSS verwenden:**

- **SymPy**: Symbolische Verarbeitung, Äquivalenzprüfung
- **Parsing**: `SymPy.sympify()` für Input-Parsing
- **Äquivalenztest**: `simplify(eq1 - eq2) == 0`
- **AST-Struktur**: SymPy-Expr für Regelvalidation

**Nicht-Ziel**: Vollständiges CAS (Computer Algebra System) – SymPy reicht aus

### 11.3 Datenhaltung:

**Struktur:**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2026-04-22T10:00:00Z"
  },
  "session_history": [
    {
      "date": "2026-04-22",
      "module": "algebra",
      "accuracy": "85%",
      "avg_time_ms": 3200
    }
  ],
  "task_history": [
    {
      "task_id": "uuid",
      "timestamp": "2026-04-22T10:05:00Z",
      "correct": true,
      "time_ms": 2300,
      "error_type": null
    }
  ],
  "level_progress": {
    "kopfrechnen": "L2",
    "brüche": "L1",
    "algebra": "L3"
  }
}
```

**Deduplizierung:**

- Keine identischen Aufgaben in einer Session
- Tracking: `Hash(task_content)` → `task_id`

---

## 12. Erweiterbarkeit

Das System muss später erweiterbar sein für:

- Weitere mathematische Gebiete (Geometrie, Statistik, etc.)
- Neue Aufgabentypen
- Zusätzliche Metriken und Visualisierungen
- Mehrsprachigkeit
- Multi-User-Features (Klassenzimmer, Leaderboards)

---

## 13. Nicht-Ziele (Abgrenzung)

- ❌ Kein Fokus auf komplexe Textaufgaben
- ❌ Keine visuelle Spielerei / Gamification als Kernfeature
- ❌ Kein vollständiges CAS (Computer Algebra System)
- ❌ Keine AI-basierte Personalisierung (außerhalb der Anforderungen)

---

## Fazit

Das System ist **kein klassisches Quiz**, sondern ein:

> **Adaptives, regelbasiertes Trainingssystem für mathematische Mikro-Skills**

mit fokussiertem Design auf schnelle Feedbackschleifen, kontinuierliche Schwierigkeitsanpassung und detailliertes Fehlertracking.

2. Kernfunktionale Anforderungen
   2.1 Aufgabenmodule (Module-System)

Das System muss modular aufgebaut sein. Jedes Modul hat:

eigene Aufgabentypen
eigene Bewertungslogik
eigene Metriken
Pflicht-Module (MVP)

A. Kopfrechnen

Addition, Subtraktion, Multiplikation, Division
Zahlenbereiche konfigurierbar

B. Brüche & Prozent

Brüche addieren/subtrahieren
Kürzen/Erweitern
Prozent von X
Prozentuale Veränderung

C. Algebra – Gleichungen umformen (Kernmodul)

Lineare Gleichungen
Fokus: Schritt-für-Schritt-Umformung
2.2 Aufgabentypen (pro Modul)
Typ 1: Direktantwort
Eingabe: numerisch oder algebraisch
Output: richtig/falsch + Lösung
Typ 2: Schritt-für-Schritt (Algebra)
User gibt nächsten Umformungsschritt ein
System validiert jeden Schritt einzeln
Typ 3: Regel-Erkennung
Frage: „Welche Regel wurde angewendet?“
Multiple Choice
Typ 4: Valid / Invalid
Zwei Gleichungen gegeben
User entscheidet, ob Umformung korrekt ist
Typ 5: Speed-Drill
Viele Aufgaben hintereinander ohne Unterbrechung
Fokus: Reaktionszeit 3. Gleichungsumformung – Spezifikation
3.1 Unterstützte Regeln

Das System MUSS folgende Regeln explizit modellieren:

Addition/Subtraktion auf beiden Seiten
Multiplikation/Division auf beiden Seiten
Klammern auflösen (Distributivgesetz)
Terme zusammenfassen
Variable isolieren
3.2 Validierungslogik (Konkrete Implementierung)

Für jeden Schritt muss geprüft werden:

1. Äquivalenz: simplify(eq1_lhs - eq1_rhs) == simplify(eq2_lhs - eq2_rhs)
   - Wenn FALSE: Gleichung ist nicht äquivalent → Fehler!
2. Regelkonsistenz: War die angewendete Operation auf BEIDE Seiten angewendet?
   - z.B. „2x+3=11" → „2x=8": Operation „-3" muss auf beiden Seiten sein
3. Simplification Check: Sind unnötige Komplexitäten vorhanden?
   - z.B. „2x-2x=0" statt „0=0" (nicht vereinfacht)

Fehlerklassifikation (detailliert):

Regelverletzung: Operation nicht auf beiden Seiten
Vorzeichenfehler: Vorzeichen umgedreht (z.B. +3 statt -3)
Unvollständige Transformation: z.B. Klammern teilweise ausgekl ammert
Falsche Vereinfachung: z.B. 2x+x ≠ 2x (falsch) statt =3x
Zu großer Schritt: Mehrere Operationen auf einmal (z.B. -3 UND ÷2 in einem Schritt)
3.3 Eingabeformat (Konkrete Spezifikation)

Erlaubte Syntax:

- Zahlen: 1, 2, -3, 0.5, Brüche (1/2)
- Variable: x, y, z (Kleinbuchstaben)
- Operatoren: +, -, \*, /, ^ (für Potenzen)
- Klammern: (), auch verschachtelt
- Leerzeichen: beliebig („2x + 3" = „2x+3")
- Gleichheit: „=" trennt linke/rechte Seite

Gültige Beispiele:

- 2x+3=11
- (x+1)\*2=10
- x^2-4=0
- -3x+5-x=2

Parser-Implementierung (MUSS):

- SymPy zur symbolischen Verarbeitung
- Äquivalenzprüfung: lhs - rhs = 0 vor/nach Schritt (simplify())
- Erlaubt Erkennung: 2x+3 ≡ 3+2x, x ≡ 4 (wenn Lösung)
- Normalisierte Ausgabe für Vergleiche

4. Adaptives Schwierigkeitssystem
   4.1 Eingangsparameter pro Aufgabe
   Antwortzeit
   Korrektheit
   Anzahl Fehlversuche
   4.2 Anpassungslogik (Konkrete Schwellenwerte)

Klassifikation pro Aufgabe:

- **Schnell**: Antwortzeit < Median_Zeit - 1 Std.abw. (oberes Quartil)
- **Langsam**: Antwortzeit > Median_Zeit + 1 Std.abw.
- **Mittel**: Dazwischen

Anpassungslogik:

✓ Korrekt + Schnell → Level +1 (schwerer)
✓ Korrekt + Mittel → gleiches Level
✓ Korrekt + Langsam → 50% Wahrscheinlichkeit Level wiederholen
✗ Falsch → Level -1 (leichter) oder ähnliche Aufgabe wiederholen
✗ Falsch + 2x Fehlversuche → Level -1 + Hinweis auf Regelbruch

Schwellenwerte (pro Session initialisieren):

- Ausgangs-Median: Durchschnittliche Zeit der letzten 5 korrekten Aufgaben
- Neu berechnen: Alle 10 Aufgaben
  4.3 Schwierigkeitsebenen (Konkrete Definition)

Jedes Modul benötigt interne Level mit konkreten Regeln:

**Kopfrechnen:**

- L1: Zahlenbereich 1-10, nur Addition/Subtraktion
- L2: Zahlenbereich 1-20, alle Operationen
- L3: Zahlenbereich 1-100, Multiplikation/Division
- L4: Zahlenbereich -100 bis 100, gemischte Operationen

**Brüche & Prozent:**

- L1: Brüche addieren/subtrahieren (gleichnamig)
- L2: Brüche mit verschiedenen Nennern (bis 12)
- L3: Kürzen/Erweitern (Nenner bis 20)
- L4: Prozent von X (Zahlen bis 1000)
- L5: Prozentuale Veränderung (mit Bruchteilen)

**Algebra – Gleichungen umformen:**

- L1: ax + b = c (z.B. 2x + 3 = 11), Lösung: x = 4
- L2: ax + b = c (mit negativen Koeffizienten, z.B. -2x + 5 = -3)
- L3: ax + bx + c = d (mehrere Terme mit x)
- L4: a(x + b) = c (einfache Klammer)
- L5: (ax + b)(c) = d + ex (komplexere Umformung)

5. Wiederholungslogik (Spaced Repetition – Konkrete Implementierung)

Das System muss:

**Fehlerhafte Aufgaben:**

- Sofort erneut anbieten (nächste Aufgabe in gleicher Session)
- Dann nach 2-3 weitere richtige Aufgaben erneut
- Dann nach ~15 min (nächste Session)

**Langsame Aufgaben (Hesitation):**

- Markieren wenn Zeit > 2 x Durchschnitt für Level
- In nächster Session zu 30% erneut anbieten

**Ähnliche Aufgaben generieren:**

- Gleiche Struktur, unterschiedliche Zahlen
- z.B. Level 2 (ax + b = c): nächste Zahlen im gleichen Bereich

Tracking (Datenstruktur):

```
failed_tasks: [(task_id, timestamp), ...]
slow_tasks: [(task_id, timestamp, avg_time), ...]
```

Priorisierungsreihenfolge:

1. Fehler < 2 min alt (erneut)
2. Fehler 2-15 min alt (priorität +2)
3. Langsame Aufgaben (priorität +1)
4. Neue Aufgaben (priorität 0)
5. Metriken & Tracking
   6.1 Pro Aufgabe speichern
   Aufgabentyp
   Modul
   Schwierigkeit
   Antwortzeit (ms)
   korrekt/falsch
   Fehlertyp (falls falsch)
   6.2 Aggregierte Metriken
   Genauigkeit (%)
   Durchschnittliche Antwortzeit
   Zeit pro Aufgabentyp
   Fehlerverteilung nach Kategorie
   Fortschritt pro Level
   6.3 Erweiterte Metriken
   Hesitation Score (Zeit > Schwellenwert)
   Stabilität (Varianz der Antwortzeiten)
6. Trainingsmodi

Das System muss mehrere Modi unterstützen:

A. Accuracy Mode

kein Zeitlimit
Fokus: korrekte Lösungen

B. Speed Mode

Zeitlimit pro Aufgabe
Fokus: schnelle Antworten

C. Mixed Mode

Kombination

D. Step Mode (Algebra)

schrittweise Eingabe 8. Aufgaben-Generierung (Konkrete Spezifikation)

8.1 Anforderungen
Aufgaben müssen parametrisch generiert werden
Parameter pro Level definiert (Zahlenbereich, Operationen)
Keine identischen Aufgaben in einer Session
8.2 Generierungs-Algorithmus

```
generate_algebra_task(level):
  if level == 1: return f"{rand(1,10)}x + {rand(1,20)} = {rand(1,50)}"
  if level == 2: return f"{rand(-5,5)}x + {rand(-20,20)} = {rand(-50,50)}"
  if level == 3: return f"{rand(1,5)}x + {rand(1,5)}x + {rand(1,10)} = {rand(10,50)}"
  ...

  constraints:
  - Lösung muss ganze Zahl oder einfacher Bruch sein
  - Keine Division durch 0
  - Zahlenbereich begrenzen
```

8.3 Validation

- Generierte Aufgabe lösen
- Falls kein einfache Lösung → verwerfen, neu generieren
- Deduplizierung: In Session nicht zweimal die gleiche Aufgabe

  8.4 Variationen
  Algebraische Umformung generieren:

```
eq1 = "2x + 3 = 11"
step1 = "2x = 8"        # Regel: beide Seiten -3
step2 = "x = 4"         # Regel: beide Seiten ÷2
```

Fehlerhafte Schritte (für Valid/Invalid Aufgaben):

```
wrong1 = "2x = 8"        # Regel verletzt (nur eine Seite -3)
wrong2 = "2x = 14"       # Vorzeichenfehler
wrong3 = "x = 8"         # Zu großer Schritt
```

9. Feedback-System
   9.1 Sofort-Feedback

Nach jeder Aufgabe:

korrekt/falsch
richtige Lösung
ggf. korrekter Umformungsschritt
9.2 Fehlerfeedback (spezifisch pro Fehlertyp)

Bei Fehlern konkrete Regelverletzung anzeigen:

- Regelverletzung: „Die Operation muss auf BEIDEN Seiten erfolgen!"
- Vorzeichenfehler: „Achtung: +3 wird zu -3 beim Verschieben!"
- Unvollständig: „Klammer noch nicht vollständig aufgelöst."
- Falsche Vereinfachung: „2x + x ergibt 3x, nicht 2x!"

  9.3 Session-Feedback (Zusammenfassung)

Nach Session anzeigen:

- Genauigkeit: % richtig (z.B. 85%)
- Durchschnittliche Antwortzeit (ms)
- Schwachstellenanalyse: häufigste Fehlertypen
- Level-Fortschritt: welche Level jetzt verfügbar

10. Benutzeroberfläche (UX-Anforderungen)
    minimale Latenz zwischen Aufgaben (<200ms)
    Tastatureingabe priorisiert
    keine unnötigen Animationen
    klare, reduzierte Darstellung
11. Technische Anforderungen
    11.1 Architektur
    Modular aufgebaut (Module unabhängig erweiterbar)
    Trennung von:

- Aufgabenlogik (Generator, Validierung)
- Bewertungslogik (Scoring, Level-Anpassung)
- Persistierung (Datenbank, Lokal-Storage)
- UI (React/Vue, nur Daten empfangen)

  11.2 Algebra-Engine (KONKRET)

MUSS verwenden:

- SymPy: Symbolische Verarbeitung, Äquivalenzprüfung
- Parsing: SymPy.sympify() für Input-Parsing
- Äquivalenztest: `simplify(eq1 - eq2) == 0`
- AST-Struktur: SymPy-Expr für Regelvalidation

Nicht-Ziel: Vollständiges CAS (SymPy reicht aus)

11.3 Datenhaltung
Speicherung (lokal oder Backend):

```
user/
  session_history: [{date, module, accuracy, avg_time}, ...]
  task_history: [{task_id, timestamp, correct, time_ms, error_type}, ...]
  level_progress: {kopfrechnen: L2, brüche: L1, algebra: L3}
```

Deduplizierung:

- Keine identischen Aufgaben in einer Session
- Tracking: Hash(task_content) → task_id

12. Erweiterbarkeit

Das System muss später erweiterbar sein für:

weitere mathematische Gebiete
neue Aufgabentypen
zusätzliche Metriken 13. Nicht-Ziele (wichtig zur Abgrenzung)
kein Fokus auf komplexe Textaufgaben
keine visuelle Spielerei / Gamification als Kernfeature
kein vollständiges CAS (Computer Algebra System)
Fazit

Das System ist kein klassisches Quiz, sondern ein:

adaptives, regelbasiertes Trainingssystem für mathematische Mikro-Skills
