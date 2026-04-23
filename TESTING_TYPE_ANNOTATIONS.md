# Unit Tests für Typ-Annotation Fehler

## Übersicht

Diese Test-Suite dokumentiert zwei kritische Fehlertypen, die in diesem Projekt behoben wurden, und verhindert deren Wiederauftreten:

### 1. **TypeScript: Implizite `any`-Typen in Array-Callbacks**

- **Fehler**: TS7006 - Parameter hat implizit den Typ 'any'
- **Ursache**: Fehlende Typ-Annotation bei Array-Methoden wie `map()` in striktem Modus
- **Datei**: `backend/src/answers.test.ts`

### 2. **Pydantic v2: Ungültige optionale Feld-Syntax**

- **Fehler**: `"Input should be a valid string [type=string_type, input_value=None, input_type=NoneType]"`
- **Ursache**: Verwendung von `field: str = None` statt `field: Optional[str] = None`
- **Datei**: `validator/test_pydantic_types.py`

---

## Backend Unit Tests

**Datei**: `backend/src/answers.test.ts`

### Getestete Szenarien

| Test                                                       | Zweck                                                                     |
| ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| `array map callback has proper type annotation`            | Verifiziert, dass Map-Callbacks mit expliziter Typ-Annotation kompilieren |
| `inferred type in map callback from array type annotation` | Testet Typ-Inferenz bei Array-Methoden                                    |
| `map with explicit type assertion for tuple result`        | Validiert `typeof items[number]` Syntax                                   |
| `higher-order function callback types are safe`            | Prüft Typ-Sicherheit bei Callback-Funktionen                              |
| `destructured map callback parameters have types`          | Testet Destrukturierung mit Typ-Annotation                                |

**Ausführen**:

```bash
npm run test --workspace=backend
# oder
make test-unit
```

**Resultat**: 18/18 Tests bestanden ✓

---

## Python Unit Tests

**Datei**: `validator/test_pydantic_types.py`

### Getestete Szenarien

| Test                                         | Zweck                                                 |
| -------------------------------------------- | ----------------------------------------------------- |
| `test_optional_string_field_with_none_value` | Verifiziert `Optional[str]` akzeptiert None           |
| `test_incorrect_optional_syntax_fails`       | Dokumentiert, dass `str = None` ValidationError wirft |
| `test_multiple_optional_fields`              | Testet mehrere optionale Felder in einem Modell       |
| `test_optional_fields_with_mixed_values`     | Validiert Felder mit None und echten Werten           |
| `test_model_serialization_with_none_values`  | Prüft `model_dump()` mit None-Werten                  |
| `test_union_type_alternative_syntax`         | Testet moderne `str \| None` Syntax (Python 3.10+)    |

**Ausführen**:

```bash
cd validator && python3 test_pydantic_types.py -v
```

**Resultat**: 6/6 Tests bestanden ✓

---

## Fehlerbeispiele

### ❌ FALSCH - TypeScript

```typescript
// TS7006: Parameter implicitly has an 'any' type
const recentSteps = recentAnswers.map((answer) => {
  // ← ERROR
  return { id: answer.id };
});
```

### ✅ RICHTIG - TypeScript

```typescript
// Explizite Typ-Annotation erforderlich
const recentSteps = recentAnswers.map(
  (answer: (typeof recentAnswers)[number]) => {
    return { id: answer.id };
  },
);
```

---

### ❌ FALSCH - Pydantic v2

```python
from pydantic import BaseModel

class ExpressionValidation(BaseModel):
    result: str
    error_code: str = None  # ← WRONG (Pydantic v2)
```

Fehler beim Serialisieren:

```
ValidationError: 1 validation error for StepValidation
error_code
  Input should be a valid string [type=string_type, input_value=None]
```

### ✅ RICHTIG - Pydantic v2

```python
from typing import Optional
from pydantic import BaseModel

class ExpressionValidation(BaseModel):
    result: str
    error_code: Optional[str] = None  # ✓ CORRECT

# Oder mit Python 3.10+:
# error_code: str | None = None
```

---

## Integration in CI/CD

Die Tests laufen automatisch bei:

- `npm run test --workspace=backend` (TypeScript)
- Lokale Test-Ausführung: `python3 validator/test_pydantic_types.py`

**Empfehlung**: Diese Tests in das CI/CD-Pipeline integrieren, um ähnliche Fehler zukünftig zu verhindern.

---

## Best Practices

1. **TypeScript**: Immer `--strict` in `tsconfig.json` aktiviert lassen
2. **Pydantic v2**: Verwende `Optional[T]` oder `T | None` für optionale Felder
3. **Tests**: Dokumentiere Fehlertypen im Test-Code als Referenz für zukünftige Entwickler
