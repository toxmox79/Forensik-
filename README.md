# Forensik-Zentrale PWA v1.2

Eine gemeinsame, vollständig flache PWA mit drei Reitern:
- Medizin (Studien-Forensik v1.9)
- Alltag (Alltags-Forensik v1.1, Red Team / internationale Gegenrecherche)
- Nachrichten (Nachrichten-Forensik v1.0)

## Neu in v1.2: Hybridmodus
Jeder Reiter kann zwischen **Manuell** und **Integrierte KI** umgeschaltet werden.

### Manuell
Unverändert: Master-Prompt erzeugen → in eine externe KI kopieren → JSON einfügen → Bericht rendern.

### Integrierte KI
Die PWA kann den vorhandenen Master-Prompt selbst an folgende APIs senden:
- OpenRouter (Standardmodell `openrouter/free`)
- Google Gemini (Modellname frei änderbar)
- Groq (Modellname frei änderbar)

Optional kann Tavily vorab aktuelle Webquellen suchen. Bei aktivierter Red-Team-Option erfolgt anschließend eine zweite, eigenständige KI-Phase, die das Ergebnis der ersten Phase gezielt als möglicherweise falsch behandelt und zu widerlegen versucht.

## API-Schlüssel
Schlüssel sind **nicht** in den PWA-Dateien hinterlegt. Standardmäßig werden eingegebene Schlüssel nur im Sitzungsspeicher des Browsers gehalten. Dauerhaftes Speichern muss ausdrücklich aktiviert werden.

Für eine öffentlich bereitgestellte PWA wird ein eigener Proxy empfohlen. `worker-example.js` enthält eine optionale Cloudflare-Worker-Vorlage. Dort können die Secrets `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `TAVILY_API_KEY` und optional `ALLOWED_ORIGIN` gesetzt werden. Anschließend trägt man die Worker-URL in der PWA ein.

## Dateien
Alle Dateien liegen direkt im Hauptverzeichnis. Es gibt keine Unterordner.

Startdatei: `index.html`
