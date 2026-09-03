(() => {
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const arr = v => Array.isArray(v) ? v : [];
const esc = v => String(v ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let currentData = null;
let deferredInstall = null;

const labels = {
  conflict:['Konflikt / Ereignis / Fragestellung','z. B. Ukrainekonflikt: Ursachen, Vorgeschichte, Verhandlungen, Interessen, Kriegsverlauf, Zahlen und widersprüchliche Darstellungen'],
  claim:['Zu prüfende Behauptung','z. B. „X hat Y zugesagt“ oder „Maßnahme Z senkte die Preise“'],
  media:['URL / Medienbericht / Video / Beitrag','z. B. https://... oder Titel eines Beitrags'],
  politics:['Politische Entscheidung / Gesetz / Vertrag','z. B. Minsker Abkommen, EU-Verordnung ..., Wahlrechtsreform ...'],
  person:['Person / Organisation / Unternehmen','z. B. Name + konkrete Fragestellung'],
  consumer:['Verbraucher- / Alltagsthema','z. B. Leitungswasser, Versicherung, Lebensmittelbehauptung, Energiepreis'],
  history:['Historische Behauptung / Ereignis','z. B. Ereignis, Zeitraum und strittige Aussage'],
  other:['Thema / Fragestellung','Beliebiges Thema, das quellenkritisch untersucht werden soll']
};

function goStep(n){
  $$('.step').forEach(x=>x.classList.toggle('active',Number(x.dataset.step)===n));
  $$('.step-panel').forEach(x=>x.classList.toggle('active',x.id===`step${n}`));
  window.scrollTo({top:0,behavior:'smooth'});
}
$$('.step').forEach(b=>b.addEventListener('click',()=>goStep(Number(b.dataset.step))));
$('#queryType').addEventListener('change',()=>{
  const [l,p]=labels[$('#queryType').value]; $('#queryLabel').textContent=l; $('#queryInput').placeholder=p;
});

function selectedChecks(){
  const map = [
    ['checkPrimary','Primärquellen, Originaldokumente und Rohdaten'],['checkTimeline','lückenlose Chronologie und Vorgeschichte'],['checkAllSides','Behauptungen aller relevanten Seiten'],['checkOmissions','Auslassungen, unterbelichtete Fakten und Informationslücken'],['checkInterests','politische, wirtschaftliche, militärische und persönliche Interessen'],['checkOwnership','Eigentümer, Finanzierung und Abhängigkeiten von Quellen'],['checkFraming','Framing, Euphemismen und emotionalisierende Sprache'],['checkPropaganda','Propaganda-, Desinformations- und Informationsoperations-Indizien'],['checkNumbers','Zahlen, Opferangaben, Umfragen und Statistikmethoden'],['checkLaw','Verträge, Gesetze, Resolutionen und Rechtspositionen im Original'],['checkOsint','Bild-/Video-/Satelliten-/OSINT-Provenienz'],['checkChanged','gelöschte, geänderte, korrigierte und archivierte Aussagen'],['checkCensorship','Zugangsbeschränkungen, Zensur und Plattformmoderation'],['checkHistory','historische Vorläufer, Zusagen und frühere Verhandlungen'],['checkEconomics','Geldflüsse, Sanktionen, Rohstoffe, Rüstung und wirtschaftliche Interessen'],['checkCounterevidence','aktive Suche nach den stärksten Gegenbelegen'],['checkRedTeam','verpflichtende zweite Red-Team-Recherchephase zur Widerlegung der eigenen ersten Schlussfolgerung'],['checkInternational','internationale, anderssprachige und alternative Quellenräume bei lückenhafter oder eingeschränkter Informationslage']
  ];
  return map.filter(([id])=>$('#'+id).checked).map(([,name])=>name);
}

function buildPrompt(){
  const q = $('#queryInput').value.trim();
  if(!q){ alert('Bitte zuerst ein Thema oder eine Behauptung eingeben.'); return; }
  const type = $('#queryType').options[$('#queryType').selectedIndex].text;
  const mode = $('#analysisMode').value==='max'?'FORENSISCH / MAXIMAL':'FORENSISCH / KOMPAKTER';
  const scope = $('#scopeInput').value.trim() || 'Kein zusätzlicher Zeitraum/Regionsrahmen angegeben – aus der Fragestellung ableiten und notwendige Vorgeschichte einbeziehen.';
  const focus = $('#focusInput').value.trim() || 'Kein zusätzlicher Schwerpunkt – vollständige Prüfung.';
  const checks = selectedChecks().map(x=>'- '+x+': JA').join('\n');
  const compact = $('#analysisMode').value==='compact' ? '\nHalte Nebenaspekte kompakter, aber lasse keine relevanten Gegenbelege oder Unsicherheiten weg.\n' : '';

  const prompt = `ROLLE\nDu bist ein interdisziplinäres forensisches Recherche- und OSINT-Prüfteam aus Quellenkritik, investigativem Journalismus, Geschichtswissenschaft, Politikwissenschaft, Völkerrecht, Statistik, Ökonomie, Militär-/Sicherheitsanalyse, Medienanalyse, Propagandaforschung, Open-Source-Intelligence, Archivarbeit und Faktenprüfung. Arbeite skeptisch, aber ergebnisoffen. Dein Auftrag ist weder Bestätigung noch Widerlegung einer politischen, medialen oder gesellschaftlichen Erzählung, sondern die möglichst vollständige Rekonstruktion des belastbar feststellbaren Sachverhalts.\n\nUNTERSUCHUNGSGEGENSTAND\nTyp: ${type}\nEingabe: ${q}\nZeitraum / Region: ${scope}\nZusätzlicher Fokus: ${focus}\nModus: ${mode}\n${compact}\nAKTIVIERTE FORENSISCHE PRÜFUNGEN\n${checks}\n\nZENTRALE GRUNDREGEL\n"Alle Fakten" bedeutet: alle mit legal zugänglichen Quellen belastbar auffindbaren und prüfbaren Fakten. Erfinde keine geheimen, nicht dokumentierten oder nicht zugänglichen Informationen. Wenn etwas öffentlich nicht feststellbar ist, schreibe ausdrücklich "unbekannt / aus öffentlich zugänglichen Quellen nicht feststellbar".\n\nEPISTEMISCHE STATUSKLASSEN\nOrdne jede wesentliche Tatsachenbehauptung genau einer Kategorie zu:\n- gesichert: mehrere belastbare, möglichst unabhängige Quellen oder eine starke Primärquelle bestätigen den Kern.\n- wahrscheinlich: gute Evidenz, aber relevante Restunsicherheit.\n- umstritten: belastbare Quellen widersprechen sich oder Interpretation hängt von strittigen Annahmen ab.\n- unbelegt: Behauptung existiert, aber belastbare Belege fehlen oder reichen nicht aus.\n- widerlegt: starke Gegenbelege zeigen, dass die Behauptung in wesentlichen Punkten falsch ist.\n- unbekannt: Daten fehlen oder sind nicht zugänglich; keine seriöse Entscheidung möglich.\nWICHTIG: "nicht untersucht / nicht auffindbar" ist NICHT gleich "falsch".\n\nRECHERCHESTRATEGIE\n1. Beginne nicht bei Kommentaren oder Meinungsartikeln, sondern rekonstruiere zuerst Primärquellen und Chronologie.\n2. Suche, soweit relevant und zugänglich, in Originalverträgen, Gesetzen, Resolutionen, Regierungsdokumenten, Parlamentsprotokollen, Gerichtsakten, offiziellen Statistiken, Haushalts-/Handelsdaten, Redemanuskripten, vollständigen Interviews, Pressekonferenzen, diplomatischen Dokumenten, Wahl-/Umfragedaten, Unternehmens-/Lobbyangaben, wissenschaftlicher Literatur, öffentlichen Archiven, archivierten Webseiten und seriösen OSINT-Auswertungen.\n3. Nutze Medienberichte als Hinweise und Sekundärquellen, nicht automatisch als Beweis.\n4. Prüfe Aussagen der unmittelbar beteiligten Parteien genauso streng wie Aussagen ihrer Gegner.\n5. Suche aktiv nach Gegenbelegen und nach Quellen, die der zunächst plausibelsten Erklärung widersprechen.\n6. Berücksichtige Quellen in relevanten Originalsprachen, wenn möglich; kennzeichne Übersetzungsunsicherheiten.\n7. Prüfe Veröffentlichungsdatum UND Datum des beschriebenen Ereignisses. Spätere Berichte dürfen nicht versehentlich frühere Wissensstände vortäuschen.\n8. Falls Quellen gelöscht/geändert wurden, suche nach öffentlich zugänglichen Archiven, Korrekturen, Screenshots oder Zitaten in Primärdokumenten; markiere die Provenienz.\n9. Zitiere oder verlinke die stärksten Quellen für jede zentrale Feststellung. Keine erfundenen URLs oder Quellen.\n\nPFLICHT: ZWEIPHASIGE RED-TEAM-RECHERCHE\nDie Analyse MUSS aus zwei getrennten Recherchephasen bestehen. Eine einzige Recherche mit einem kurzen Gegenargument am Ende reicht nicht.\n\nPHASE 1 – PRIMÄRANALYSE\n- Führe die vollständige Recherche nach den folgenden Regeln durch.\n- Formuliere danach eine VORLÄUFIGE Schlussfolgerung mit den wichtigsten Belegen und Unsicherheiten.\n- Fixiere diese vorläufige Schlussfolgerung, bevor Phase 2 beginnt.\n\nPHASE 2 – RED TEAM / FALSIFIKATION\nBehandle die eigene vorläufige Schlussfolgerung aus Phase 1 ausdrücklich als möglicherweise falsch. Dein Auftrag in Phase 2 ist NICHT, sie zu bestätigen, sondern sie möglichst ernsthaft zu widerlegen.\n- Formuliere die 3–10 stärksten prüfbaren Gegenhypothesen zur Phase-1-Schlussfolgerung.\n- Suche gezielt nach Primärquellen, Daten, Originalzitaten, Zeitpunkten, Dokumenten und Fachquellen, die diese Gegenhypothesen stützen könnten.\n- Suche bewusst in Quellenräumen, die in Phase 1 unterrepräsentiert waren: andere Länder, andere politische Lager, lokale Medien, Facharchive, Originalsprachen, oppositionelle wie staatliche Quellen, internationale Organisationen, Gerichts-/Parlaments-/Behördenquellen und öffentlich zugängliche Archive.\n- Prüfe die wichtigsten Phase-1-Belege erneut auf Fehlzitat, Kontextverlust, Abhängigkeit von derselben Ursprungsquelle, falsche Zeitordnung und alternative Erklärungen.\n- Prüfe bei Zahlen erneut Definition, Nenner, Zeitraum und Zählmethode.\n- Führe mindestens eine Suche durch, deren Suchbegriffe die gegenteilige Schlussfolgerung voraussetzen.\n- Dokumentiere auch dann ein Red-Team-Ergebnis, wenn keine starken Gegenbelege gefunden werden.\n\nABSCHLUSS NACH PHASE 2\n- Vergleiche Phase 1 und Phase 2 explizit.\n- Nenne neue Belege aus Phase 2, die Phase 1 schwächen, sowie neue Belege, die sie trotz Falsifikationsversuch überstanden hat.\n- Sage, ob und warum sich die Schlussfolgerung geändert hat.\n- Das endgültige Urteil darf erst NACH Phase 2 formuliert werden.\n- Hohe Sicherheit ist nur zulässig, wenn starke Gegenhypothesen aktiv geprüft wurden.\n\nINFORMATIONSZUGANG, ZUGRIFFSGRENZEN & INTERNATIONALE GEGENRECHERCHE\nWenn Informationen nicht zugänglich oder ungewöhnlich schwer auffindbar sind, kennzeichne die Ursache so präzise wie möglich. Unterscheide mindestens:\n- Quelle gelöscht oder nachträglich geändert\n- Website/Medium staatlich oder regional gesperrt\n- Plattformmoderation oder De-Indexierung\n- Paywall / Login / fehlende öffentliche Zugänglichkeit\n- technische Nichterreichbarkeit\n- fehlende Archivkopie\n- Suchmaschine/Tool findet die Quelle nicht\n- deine eigenen Werkzeug-, System- oder Sicherheitsgrenzen erlauben diesen Teil der Recherche nicht\n- Ursache unbekannt.\nWICHTIG: Nenne eine technische, rechtliche, plattformbedingte oder modellbedingte Beschränkung nicht automatisch „Zensur“. Verwende „Zensur“ nur, wenn eine dokumentierte kontrollierende Instanz Informationen tatsächlich unterdrückt, sperrt oder deren Verbreitung beschränkt.\n\nWenn die normale Quellenlage einseitig oder eingeschränkt ist:\n1. Suche in relevanten ausländischen und anderssprachigen Quellen.\n2. Bevorzuge zusätzlich Primärquellen im Herkunftsland: Behörden, Parlamente, Gerichte, Archive, Statistikämter, vollständige Reden/Interviews, lokale Dokumente.\n3. Nutze öffentlich zugängliche Webarchive und archivierte Versionen, wenn Originalseiten entfernt wurden.\n4. Vergleiche staatliche, private, oppositionelle, lokale und internationale Quellen, ohne eine Gruppe automatisch als wahr oder falsch einzustufen.\n5. Dokumentiere Sprache, Land, institutionelle Zugehörigkeit und mögliche Interessen der Quelle.\n6. Nutze nur legal und öffentlich zugängliche Wege. Umgehe keine Authentifizierung, Paywalls, Zugriffskontrollen oder sonstigen technischen Schutzmaßnahmen.\n7. Wenn deine eigenen Richtlinien oder Werkzeuge eine angeforderte Teilprüfung verhindern, sage transparent: „Dieser Teil konnte wegen Modell-/Werkzeug-/Richtliniengrenzen nicht geprüft werden.“ Erfinde keinen Ersatzbefund.\n8. Halte fest, welche alternativen Quellenräume du stattdessen durchsucht hast und ob dadurch die Lücke kleiner wurde.\n\nA. CHRONOLOGIE & VORGESCHICHTE\n- Erstelle eine möglichst lückenlose Zeitleiste, die weit genug vor dem sichtbaren Ausbruch des Ereignisses beginnt.\n- Trenne unmittelbare Auslöser von langfristigen Ursachen, strukturellen Bedingungen und späteren Rechtfertigungen.\n- Prüfe frühere Verhandlungen, Vereinbarungen, Zusagen, gebrochene Zusagen, Sicherheitsdoktrinen, Grenz-/Statusfragen, wirtschaftliche Veränderungen und relevante Regierungswechsel.\n- Zeige, welche Ereignisse in üblichen Kurzchronologien häufig fehlen und warum sie für die Kausalbewertung wichtig sein könnten.\n- Vermeide Monokausalität: liste konkurrierende Erklärungen und ihre Evidenz.\n\nB. BEHAUPTUNGSMATRIX ALLER SEITEN\nFür jede zentrale Behauptung:\n- exakter Kern der Behauptung\n- wer sie wann aufgestellt hat\n- Primärquelle der Aussage, wenn auffindbar\n- Belege dafür\n- Belege dagegen\n- unabhängige Bestätigung oder fehlende Unabhängigkeit\n- Statusklasse\n- was zur endgültigen Klärung fehlen würde\n- ob spätere Aussagen die ursprüngliche Behauptung verändert haben\n\nC. QUELLENFORENSIK\nBewerte jede wichtige Quelle getrennt nach:\n- Primärquelle / Sekundärquelle / Kommentar\n- Augenzeuge, Beteiligter, Institution, Journalist, Geheimdienst, NGO, Unternehmen, Forschung, anonyme Quelle etc.\n- Nähe zum Ereignis\n- Zugang zu den behaupteten Informationen\n- Eigentümer / Finanzierung / organisatorische Abhängigkeit\n- politische, wirtschaftliche oder militärische Interessen\n- bisherige Korrekturen oder nachweisbare Fehlbehauptungen, sofern belastbar dokumentiert\n- Unabhängigkeit von anderen Quellen: viele Artikel, die dieselbe Agenturmeldung kopieren, zählen NICHT als viele unabhängige Bestätigungen.\n- mögliche Selektions- oder Zugangsprobleme\nBewerte Quelle und einzelne Aussage getrennt: Eine parteiische Quelle kann einen wahren Primärbeleg enthalten; eine renommierte Quelle kann sich irren.\n\nD. AUSLASSUNGEN & INFORMATIONSLÜCKEN\nSuche ausdrücklich nach relevanten Tatsachen, die in verbreiteten Darstellungen fehlen oder nur selten vorkommen.\nFür jede Auslassung:\n- was fehlt?\n- warum ist es für das Verständnis relevant?\n- in welchen Quellen/Medienlagern fehlt es und wo wird es behandelt?\n- ist die Auslassung belegbar oder nur vermutet?\n- plausible harmlose Gründe (Platz, Aktualität, redaktionelle Auswahl) versus mögliche strategische Gründe\n- Einfluss der Auslassung auf das Gesamtbild\nKeine Absicht unterstellen, wenn nur eine Auslassung nachweisbar ist.\n\nE. INTERESSEN- & ANREIZANALYSE\nFür alle Hauptakteure:\n- öffentlich erklärte Ziele\n- materielle / wirtschaftliche Interessen\n- innenpolitische Interessen\n- Sicherheits-/Militärinteressen\n- Bündnisinteressen\n- Rohstoffe, Handelswege, Energie, Rüstung, Sanktionen, Wiederaufbau, Finanzflüsse, Subventionen oder Marktanteile, sofern relevant\n- Informationsinteressen: welches Narrativ nützt wem?\nTrenne dokumentierte Interessen von spekulativen Motiven.\n\nF. SPRACHE, FRAMING & PROPAGANDA\n- Vergleiche Schlüsselbegriffe verschiedener Seiten.\n- Zeige Euphemismen, Dysphemismen, moralisch aufgeladene oder entmenschlichende Begriffe.\n- Prüfe selektive Bilder, Ausschnitte, Wiederholungen, falsche Dichotomien, Schuld durch Assoziation, Berufung auf Autorität, emotionalen Druck und Auslassung relevanter Basisraten.\n- Prüfe Hinweise auf koordinierte Informationsoperationen, Bots/Netzwerke, gefälschte Dokumente oder manipulierte Medien NUR wenn belastbare Evidenz vorhanden ist.\n- Unterscheide Propaganda-Indiz, nachgewiesene Falschinformation und legitime politische Kommunikation.\n\nG. ZAHLENFORENSIK\nBei Opferzahlen, Verlusten, Flüchtlingen, Geldbeträgen, Umfragen, Wahlergebnissen, Wirtschaftsdaten usw.:\n- Werte verschiedener Quellen nebeneinander\n- Definitionen und Zählmethoden\n- Zeitraum und Abdeckungsgrad\n- bestätigte Fälle vs. Schätzungen\n- mögliche Doppelzählung / Untererfassung\n- Unsicherheitsbereich\n- bestmöglicher belastbarer Bereich statt scheinpräziser Einzelzahl\n- erkläre große Differenzen zwischen Quellen.\n\nH. RECHT, VERTRÄGE & VEREINBARUNGEN\n- Nutze Originaltexte.\n- Trenne Wortlaut, juristische Interpretation und politische Behauptung.\n- Zeige unterschiedliche Rechtspositionen fair.\n- Prüfe Ratifikation, Inkrafttreten, Vorbehalte, Zuständigkeit und tatsächliche Verpflichtungswirkung.\n- Zitiere keine "Zusagen" als Vertrag, wenn nur politische Aussagen oder Gesprächsnotizen existieren; stelle aber relevante nichtvertragliche Zusagen separat dar.\n\nI. BILD-, VIDEO- & OSINT-FORENSIK\nFalls visuelle Belege zentral sind:\n- Originalupload / früheste auffindbare Version\n- Datum, Geolokation, Chronolokation\n- Schnitt, Re-Upload, fehlender Kontext\n- Metadaten nur, wenn verlässlich vorhanden\n- Abgleich mit Satellitenbildern, Wetter, Schatten, Gelände, Gebäuden oder anderen offenen Daten, sofern seriös möglich\n- kennzeichne, ob eine OSINT-Auswertung unabhängig reproduzierbar ist.\n\nJ. GELÖSCHTE / GEÄNDERTE AUSSAGEN, KORREKTUREN & ZUGANGSBESCHRÄNKUNGEN\n- Dokumentiere relevante Änderungen, Korrekturen, gelöschte Beiträge, gesperrte Medien, Plattformmaßnahmen oder staatliche Zugangsbeschränkungen.\n- Trenne dokumentierte Entfernung von Spekulation über den Grund.\n- Zeige, ob dadurch die Quellenbasis asymmetrisch wird.
- Dokumentiere für jede wesentliche Zugriffslücke: genaue Ursache, Auswirkung auf die Beweislage, versuchte Alternativquellen, gefundene ausländische/anderssprachige Ersatzquellen und verbleibende Unsicherheit.
- Wenn ein KI-/Tool-/Richtlinienlimit die Recherche begrenzt, separat ausweisen; nicht mit externer Zensur vermischen.

K. MEDIENVERGLEICH\nVergleiche nicht nur "Westen vs. Russland" oder andere grobe Blöcke. Wähle mehrere möglichst unabhängige Quellen mit unterschiedlichen institutionellen Hintergründen.\n- Welche Fakten werden überall berichtet?\n- Welche nur in einzelnen Lagern?\n- Welche Fakten werden ähnlich beschrieben, aber unterschiedlich gerahmt?\n- Welche Behauptungen gehen auf dieselbe Ursprungsquelle zurück?\n- Welche späteren Korrekturen erreichten weniger Aufmerksamkeit als die Erstmeldung?\n\nL. WAS WIR NICHT WISSEN\nErstelle einen prominenten Abschnitt mit:\n- entscheidenden unbekannten Fakten\n- Informationen, die nur Geheimdienste/Parteien besitzen könnten\n- nicht zugänglichen Primärdokumenten\n- unsicheren Zahlen\n- Punkten, bei denen Quellen auf beiden Seiten interessengeleitet sind\n- was nötig wäre, um diese Lücken zu schließen.\n\nM. ALTERNATIVE ERKLÄRUNGEN\nFür zentrale Ereignisse oder Entscheidungen mindestens die stärksten konkurrierenden Erklärungen darstellen.\nFür jede:\n- welche Fakten erklärt sie gut?\n- welche schlecht?\n- welche Annahmen benötigt sie?\n- welche Vorhersagen oder prüfbaren Folgen hätte sie?\n- welche Evidenz würde sie widerlegen?\n\nN. RED-TEAM-PROTOKOLL\nErstelle nach Phase 2 einen eigenen Abschnitt mit:\n- vorläufige Schlussfolgerung aus Phase 1\n- stärkste Gegenhypothesen\n- gezielte Suchwege / Suchbegriffe der Phase 2\n- neu gefundene Quellen aus bislang unterrepräsentierten Ländern, Sprachen oder Lagern\n- stärkste neuen Gegenbelege\n- Phase-1-Belege, die den Falsifikationsversuch überstanden haben\n- erkannte Fehler, Auslassungen oder Übergewichtungen der ersten Analyse\n- Änderung des Vertrauensniveaus\n- Schlussfolgerung geändert: ja/nein\n- Begründung der Änderung oder Nichtänderung.\n\nO. SCHLUSSFOLGERUNG\n- Nenne nur Schlussfolgerungen, die die Evidenz trägt.\n- Trenne Fakt, Interpretation und Motivzuschreibung.\n- Formuliere den stärksten Gegenpunkt zur eigenen Schlussfolgerung.\n- Nenne die wichtigste fehlende Information, die das Gesamturteil ändern könnte.\n- Keine false balance: Wenn eine Behauptung deutlich besser belegt ist, sage das. Aber verberge starke Gegenbelege nicht.\n\nAUSGABEFORMAT – ZWINGEND\nGib ausschließlich EINEN Markdown-Codeblock vom Typ json aus. Kein Text davor oder danach. Alle frei formulierten Texte auf Deutsch. Valides JSON, keine Kommentare, keine nachgestellten Kommata. Nutze dieses Schema und fülle nicht anwendbare Bereiche mit [] oder "nicht beurteilbar":\n\n{\n  "schema_version": "1.1",\n  "meta": {\n    "title": "", "subject_type": "", "analysis_date": "", "time_scope": "", "geographic_scope": "", "languages_searched": [], "research_scope_note": ""\n  },\n  "executive_summary": {\n    "bottom_line": "", "overall_confidence": "hoch|mittel|niedrig", "most_secure_facts": [], "most_disputed_points": [], "most_important_unknowns": [], "most_important_omission": ""\n  },\n  "research_quality": {\n    "completeness_score_0_100": 0, "primary_source_density_0_10": 0, "source_independence_0_10": 0, "counterevidence_coverage_0_10": 0, "red_team_depth_0_10": 0, "international_source_diversity_0_10": 0, "access_limit_transparency_0_10": 0, "chronology_completeness_0_10": 0, "uncertainty_transparency_0_10": 0, "note": ""\n  },\n  "timeline": [\n    {"date":"","event":"","status":"gesichert|wahrscheinlich|umstritten|unbelegt|widerlegt|unbekannt","why_it_matters":"","source_ids":[]}\n  ],\n  "claims": [\n    {"id":"C1","claim":"","speaker_or_origin":"","date":"","status":"gesichert|wahrscheinlich|umstritten|unbelegt|widerlegt|unbekannt","evidence_for":[],"evidence_against":[],"independence_note":"","missing_evidence":"","assessment":"","source_ids":[]}\n  ],\n  "omissions_and_blind_spots": [\n    {"topic":"","why_relevant":"","where_underreported":"","evidence_for_omission":"","possible_non_strategic_reason":"","possible_strategic_reason":"","impact_on_overall_picture":"","confidence":"hoch|mittel|niedrig","source_ids":[]}\n  ],\n  "actor_interests": [\n    {"actor":"","stated_goals":[],"material_interests":[],"political_interests":[],"security_military_interests":[],"information_interests":[],"documented_vs_inferred":"","source_ids":[]}\n  ],\n  "source_audit": [\n    {"source_id":"S1","source_name":"","source_type":"Primärquelle|Sekundärquelle|Kommentar|Datensatz|OSINT|Sonstiges","affiliation_or_owner":"","funding_or_dependency":"","firsthand_access":"","independence":"hoch|mittel|niedrig","limitations":"","reliability_for_this_claim":"hoch|mittel|niedrig"}\n  ],\n  "framing_and_language": [\n    {"term_or_frame":"","used_by":"","alternative_description":"","factual_core":"","effect_on_perception":"","assessment":""}\n  ],\n  "information_operation_indicators": [\n    {"indicator":"","possible_actor":"","evidence":"","alternative_explanation":"","status":"Indiz|starkes Indiz|belegt|nicht beurteilbar","source_ids":[]}\n  ],\n  "numbers_and_statistics": [\n    {"metric":"","values_by_source":[{"source_id":"","value":"","definition_or_method":""}],"reason_for_differences":"","best_supported_range":"","confidence":"hoch|mittel|niedrig"}\n  ],\n  "legal_documents_and_agreements": [\n    {"document":"","date":"","parties":[],"relevant_content":"","legal_status":"","competing_interpretations":[],"assessment":"","source_ids":[]}\n  ],\n  "visual_osint": [\n    {"item":"","type":"Bild|Video|Satellit|Karte|Sonstiges","provenance":"","geolocation":"","chronolocation":"","context_or_manipulation_check":"","status":"gesichert|wahrscheinlich|umstritten|unbelegt|widerlegt|unbekannt","source_ids":[]}\n  ],\n  "changed_deleted_corrected_material": [\n    {"item":"","original":"","change_or_removal":"","date":"","documented_reason":"","forensic_relevance":"","source_ids":[]}\n  ],\n  "access_censorship_and_moderation": [\n    {"measure":"","actor":"","affected_information":"","documented_reason":"","effect_on_evidence_access":"","assessment":"","source_ids":[]}\n  ],\n  "economic_and_material_context": [\n    {"topic":"","beneficiaries":[],"disadvantaged":[],"money_or_resource_flow":"","evidence":"","relevance":"","source_ids":[]}\n  ],\n  "contradictions": [\n    {"topic":"","statement_a":"","statement_b":"","can_both_be_true":false,"best_explanation":"","source_ids":[]}\n  ],\n  "unknowns_and_evidence_gaps": [\n    {"question":"","why_unknown":"","who_may_have_the_data":"","what_would_resolve_it":"","importance":"gering|mittel|hoch|kritisch"}\n  ],\n  "alternative_explanations": [\n    {"explanation":"","facts_explained_well":[],"facts_explained_poorly":[],"required_assumptions":[],"what_would_falsify_it":"","current_support":"hoch|mittel|niedrig"}\n  ],\n  "red_team_research": {
    "phase1_preliminary_conclusion":"",
    "phase1_confidence":"hoch|mittel|niedrig",
    "counter_hypotheses":[],
    "phase2_search_paths":[],
    "phase2_new_source_ids":[],
    "phase2_findings_against_phase1":[],
    "phase2_findings_supporting_phase1":[],
    "phase1_errors_or_omissions_found":[],
    "conclusion_changed":false,
    "confidence_changed_from":"",
    "confidence_changed_to":"",
    "change_explanation":"",
    "final_conclusion_after_red_team":""
  },
  "research_access_and_limitations": [
    {"topic_or_source":"","limitation_type":"gelöscht|geändert|regional gesperrt|Plattformmoderation|De-Indexierung|Paywall/Login|technisch nicht erreichbar|keine Archivkopie|Such-/Toolgrenze|Modell-/Richtliniengrenze|unbekannt","documented_cause":"","effect_on_evidence":"","alternatives_attempted":[],"international_or_archived_sources_found":[],"remaining_uncertainty":"","is_documented_censorship":false}
  ],
  "international_crosscheck": {
    "languages_searched":[],
    "countries_or_regions_searched":[],
    "source_ecosystems_searched":[],
    "important_findings_missing_from_initial_source_set":[],
    "translation_or_context_uncertainties":[]
  },
  "what_would_change_the_conclusion": [],\n  "verdict": {\n    "most_supported_conclusion":"","strongest_counterpoint":"","largest_uncertainty":"","plain_language":"","confidence":"hoch|mittel|niedrig"\n  },\n  "sources": [\n    {"id":"S1","title":"","publisher_or_author":"","date":"","url":"","source_type":"","language":"","note":""}\n  ]\n}\n\nABSCHLUSSREGEL\nWenn du auf eine entscheidende Behauptung keine belastbare Quelle findest, markiere sie als unbelegt oder unbekannt – niemals mit einer plausibel klingenden Erfindung auffüllen. Ein politisch unbequemer Fakt darf nicht weggelassen werden; ein spektakulärer Gegen-Narrativ-Punkt darf aber ebenso wenig ohne Beleg aufgewertet werden. Die Red-Team-Phase ist verpflichtend und darf nicht übersprungen werden. Zugriffsbeschränkungen, Modell-/Werkzeuggrenzen und dokumentierte Zensur müssen getrennt ausgewiesen werden.`;
  $('#promptOutput').value = prompt;
  $('#promptBox').hidden=false;
  $('#promptBox').scrollIntoView({behavior:'smooth',block:'start'});
}

$('#generatePromptBtn').addEventListener('click',buildPrompt);
$('#clearPromptBtn').addEventListener('click',()=>{
  $('#queryInput').value=''; $('#scopeInput').value=''; $('#focusInput').value=''; $('#promptOutput').value=''; $('#promptBox').hidden=true; $('#copyStatus').textContent='';
});
$('#copyPromptBtn').addEventListener('click',async()=>{
  const text=$('#promptOutput').value; if(!text)return;
  let ok=false;
  try{await navigator.clipboard.writeText(text);ok=true;}catch(_){try{$('#promptOutput').focus();$('#promptOutput').select();ok=document.execCommand('copy');}catch(__){}}
  const lab=$('#copyPromptLabel'),st=$('#copyStatus');
  if(ok){lab.textContent='Kopiert ✓';st.textContent='Prompt wurde kopiert.';setTimeout(()=>{lab.textContent='Prompt kopieren';st.textContent='';},1800);}else st.textContent='Kopieren blockiert – bitte Prompt markieren und manuell kopieren.';
});
$('#toJsonBtn').addEventListener('click',()=>goStep(2));

function cleanJson(text){
  let t=String(text||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
  const a=t.indexOf('{'),b=t.lastIndexOf('}'); if(a>=0&&b>a)t=t.slice(a,b+1); return t;
}
function parseJson(show=true){
  try{const d=JSON.parse(cleanJson($('#jsonInput').value));if(!d||typeof d!=='object')throw new Error('Kein JSON-Objekt');if(show){$('#jsonStatus').className='status ok';$('#jsonStatus').textContent='JSON ist gültig. Bericht kann erzeugt werden.';}return d;}
  catch(e){if(show){$('#jsonStatus').className='status error';$('#jsonStatus').textContent='JSON-Fehler: '+e.message;}return null;}
}
$('#validateBtn').addEventListener('click',()=>parseJson(true));
$('#renderBtn').addEventListener('click',()=>{const d=parseJson(true);if(!d)return;currentData=d;renderReport(d);goStep(3);});
$('#jsonFileInput').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;$('#jsonInput').value=await f.text();parseJson(true);e.target.value='';});

const STATUS_LABEL={gesichert:'Gesichert',wahrscheinlich:'Wahrscheinlich',umstritten:'Umstritten',unbelegt:'Unbelegt',widerlegt:'Widerlegt',unbekannt:'Unbekannt'};
const HELP={
  status:'Die Statusstufen trennen belegte Tatsachen von Interpretationen und offenen Fragen. „Unbelegt“ bedeutet fehlende ausreichende Belege; „unbekannt“ bedeutet, dass die nötigen Informationen nicht verfügbar sind.',
  source:'Quellenkritik fragt nicht nur „wer sagt es?“, sondern ob die Quelle direkten Zugang hatte, unabhängig ist, welche Interessen bestehen und ob mehrere Berichte tatsächlich voneinander unabhängig sind.',
  framing:'Framing ist die sprachliche Rahmung eines Sachverhalts. Derselbe Fakt kann durch unterschiedliche Begriffe völlig anders wirken, ohne dass sich der Tatsachenkern ändert.',
  infoop:'Informationsoperationen sind koordinierte Versuche, Wahrnehmung oder Verhalten zu beeinflussen. Ein Indiz ist noch kein Beweis für eine zentral gesteuerte Kampagne.',
  osint:'OSINT bedeutet Auswertung offen zugänglicher Informationen, etwa Bilder, Videos, Satellitendaten, Karten oder Register. Entscheidend sind Herkunft, Ort, Zeit und reproduzierbare Prüfung.',
  omission:'Eine Auslassung kann relevant sein, beweist aber allein keine absichtliche Täuschung. Deshalb werden harmlose und strategische Erklärungen getrennt dargestellt.',
  law:'Bei Verträgen und Recht wird zwischen Originalwortlaut, juristischer Interpretation und politischer Behauptung unterschieden.',
  score:'Der Vollständigkeitswert bewertet die Breite der dokumentierten Recherche, nicht ob die Schlussfolgerung „wahr zu 87 %“ ist.',
  redteam:'Red Team bedeutet: Die KI versucht in einer zweiten Recherchephase aktiv, ihre eigene erste Schlussfolgerung zu widerlegen. Entscheidend ist, ob starke Gegenhypothesen wirklich recherchiert wurden.',
  access:'Eine Zugriffsbeschränkung ist nicht automatisch Zensur. Hier wird getrennt dokumentiert, ob eine Quelle gelöscht, gesperrt, kostenpflichtig, technisch nicht erreichbar oder durch Modell-/Werkzeuggrenzen nicht prüfbar war.',
  international:'Internationale Gegenrecherche vergleicht Quellen aus verschiedenen Ländern, Sprachen und institutionellen Lagern. Unterschiedliche Herkunft ersetzt nicht die Quellenkritik, kann aber blinde Flecken sichtbar machen.'
};
function help(text){return `<div class="term-help">${esc(text)}</div>`;}
function list(items){const a=arr(items).filter(x=>x!==null&&x!==undefined&&String(x).trim()!=='');return a.length?`<ul>${a.map(x=>`<li>${esc(typeof x==='string'?x:JSON.stringify(x))}</li>`).join('')}</ul>`:'<p class="small-muted">Keine Angaben.</p>';}
function pill(status){const s=String(status||'unbekannt').toLowerCase();return `<span class="status-pill" data-status="${esc(s)}">${esc(STATUS_LABEL[s]||status||'Unbekannt')}</span>`;}
function sourcesRefs(ids){return arr(ids).length?`<small>Quellen: ${arr(ids).map(esc).join(', ')}</small>`:'';}
function section(title,body,helpText=''){return `<section class="report-section"><h2>${esc(title)}</h2>${helpText?help(helpText):''}${body}</section>`;}
function table(headers,rows){if(!rows.length)return '<p class="small-muted">Keine Angaben.</p>';return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;}
function scoreBar(label,val,helpText=''){let n=Number(val);if(!Number.isFinite(n))n=0;n=Math.max(0,Math.min(10,n));return `<div class="profile-row"><div class="profile-label"><span>${esc(label)}${helpText?`<small class="profile-help">${esc(helpText)}</small>`:''}</span><b>${n.toFixed(1)}/10</b></div><div class="profile-track"><i style="width:${n*10}%"></i></div></div>`;}

function renderDashboard(d){
  const claims=arr(d.claims); const counts={gesichert:0,wahrscheinlich:0,umstritten:0,unbelegt:0,widerlegt:0,unbekannt:0};
  claims.forEach(c=>{const s=String(c.status||'unbekannt').toLowerCase();if(counts[s]!==undefined)counts[s]++;else counts.unbekannt++;});
  const q=d.research_quality||{};let comp=Number(q.completeness_score_0_100);if(!Number.isFinite(comp))comp=0;comp=Math.max(0,Math.min(100,comp));
  return `<div class="forensic-dashboard">
    <div class="dashboard-head"><div><span class="dashboard-eyebrow">Forensische Übersicht</span><h2>Was ist belegt – und was nicht?</h2><p>Die Übersicht zeigt den Status der geprüften Behauptungen sowie die dokumentierte Recherchequalität.</p></div>
    <div class="index-card"><div class="gauge" style="--gauge:${comp}%"><div><strong>${Math.round(comp)}</strong><span>/100</span></div></div><div><small>Recherche-Vollständigkeit</small><b>${esc(d.executive_summary?.overall_confidence||d.verdict?.confidence||'nicht beurteilbar')}</b><p>${esc(q.note||'Bewertung aus der KI-Analyse.')}</p></div></div></div>
    <p class="index-note">${esc(HELP.score)}</p>
    <div class="fact-grid">
      <div class="fact-status secure"><span>Gesichert</span><strong>${counts.gesichert}</strong></div>
      <div class="fact-status disputed"><span>Umstritten</span><strong>${counts.umstritten}</strong></div>
      <div class="fact-status unproven"><span>Unbelegt</span><strong>${counts.unbelegt}</strong></div>
      <div class="fact-status refuted"><span>Widerlegt</span><strong>${counts.widerlegt}</strong></div>
      <div class="fact-status unknown"><span>Unbekannt</span><strong>${counts.unbekannt}</strong></div>
    </div>
    ${help(HELP.status)}
    <div class="dashboard-grid">
      <div class="dashboard-card"><div class="dash-card-head"><h3>Recherchequalität</h3><span>0–10</span></div><div class="profile-bars">
        ${scoreBar('Primärquellen-Anteil',q.primary_source_density_0_10,'Wie stark die Analyse auf Originaldokumente, Rohdaten und unmittelbare Quellen gestützt ist.')}
        ${scoreBar('Unabhängigkeit der Quellen',q.source_independence_0_10,'Ob mehrere Bestätigungen wirklich voneinander unabhängig sind und nicht dieselbe Ursprungsquelle kopieren.')}
        ${scoreBar('Gegenbelege berücksichtigt',q.counterevidence_coverage_0_10,'Wie systematisch starke Belege gegen die bevorzugte Erklärung gesucht wurden.')}
        ${scoreBar('Red-Team-Tiefe',q.red_team_depth_0_10,'Wie ernsthaft die zweite Recherchephase versucht hat, die erste Schlussfolgerung zu widerlegen.')}
        ${scoreBar('Internationale Quellenvielfalt',q.international_source_diversity_0_10,'Ob verschiedene Länder, Sprachen und institutionelle Quellenräume einbezogen wurden.')}
        ${scoreBar('Zugriffsgrenzen transparent',q.access_limit_transparency_0_10,'Ob nicht erreichbare, gesperrte oder modellbedingt nicht prüfbare Quellen sauber ausgewiesen wurden.')}
        ${scoreBar('Chronologie vollständig',q.chronology_completeness_0_10,'Ob relevante Vorgeschichte und zeitliche Reihenfolge ausreichend rekonstruiert wurden.')}
        ${scoreBar('Unsicherheit transparent',q.uncertainty_transparency_0_10,'Ob Wissenslücken und unsichere Punkte klar benannt statt überspielt wurden.')}
      </div></div>
      <div class="dashboard-card"><div class="dash-card-head"><h3>Entscheidende Punkte</h3><span>Kurzfassung</span></div>
        <p><b>Stärkste Schlussfolgerung:</b><br>${esc(d.verdict?.most_supported_conclusion||d.executive_summary?.bottom_line||'nicht beurteilbar')}</p>
        <p><b>Stärkster Gegenpunkt:</b><br>${esc(d.verdict?.strongest_counterpoint||'nicht beurteilbar')}</p>
        <p><b>Größte Unsicherheit:</b><br>${esc(d.verdict?.largest_uncertainty||'nicht beurteilbar')}</p>
      </div>
    </div>
  </div>`;
}

function renderClaims(items){
  if(!arr(items).length)return '<p class="small-muted">Keine Behauptungen strukturiert erfasst.</p>';
  return arr(items).map(c=>`<div class="claim-card" data-status="${esc(String(c.status||'unbekannt').toLowerCase())}">
    <div class="claim-head"><div><strong>${esc(c.claim||'Behauptung')}</strong><div class="claim-meta">${esc(c.speaker_or_origin||'Ursprung nicht angegeben')} ${c.date?'· '+esc(c.date):''}</div></div>${pill(c.status)}</div>
    <div class="claim-columns"><div class="claim-col"><b>Belege dafür</b>${list(c.evidence_for)}</div><div class="claim-col"><b>Belege dagegen</b>${list(c.evidence_against)}</div></div>
    ${c.independence_note?`<p><b>Unabhängigkeit der Belege:</b> ${esc(c.independence_note)}</p>`:''}
    ${c.missing_evidence?`<p><b>Was fehlt zur Klärung?</b> ${esc(c.missing_evidence)}</p>`:''}
    ${c.assessment?`<p><b>Bewertung:</b> ${esc(c.assessment)}</p>`:''}${sourcesRefs(c.source_ids)}</div>`).join('');
}

function renderTimeline(items){if(!arr(items).length)return '<p class="small-muted">Keine Zeitleiste vorhanden.</p>';return `<div class="timeline">${arr(items).map(x=>`<div class="timeline-item"><div class="timeline-date">${esc(x.date||'—')}</div><div class="timeline-line"><div class="timeline-dot"></div></div><div class="timeline-content"><strong>${esc(x.event||'Ereignis')} ${pill(x.status)}</strong>${x.why_it_matters?`<p>${esc(x.why_it_matters)}</p>`:''}${sourcesRefs(x.source_ids)}</div></div>`).join('')}</div>`;}

function renderReport(d){
  const m=d.meta||{},e=d.executive_summary||{},v=d.verdict||{};
  const omissions=arr(d.omissions_and_blind_spots);
  const actors=arr(d.actor_interests);
  const audit=arr(d.source_audit);
  const frames=arr(d.framing_and_language);
  const infoops=arr(d.information_operation_indicators);
  const nums=arr(d.numbers_and_statistics);
  const laws=arr(d.legal_documents_and_agreements);
  const osint=arr(d.visual_osint);
  const changed=arr(d.changed_deleted_corrected_material);
  const access=arr(d.access_censorship_and_moderation);
  const econ=arr(d.economic_and_material_context);
  const contradictions=arr(d.contradictions);
  const unknowns=arr(d.unknowns_and_evidence_gaps);
  const alts=arr(d.alternative_explanations);
  const sources=arr(d.sources);
  const red=d.red_team_research||{};
  const limits=arr(d.research_access_and_limitations);
  const intl=d.international_crosscheck||{};

  const omissionsRows=omissions.map(x=>`<tr><td>${esc(x.topic)}</td><td>${esc(x.why_relevant)}</td><td>${esc(x.where_underreported)}</td><td>${esc(x.impact_on_overall_picture)}</td><td>${esc(x.confidence)}</td></tr>`);
  const actorRows=actors.map(x=>`<tr><td><b>${esc(x.actor)}</b></td><td>${list(x.stated_goals)}</td><td>${list(x.material_interests)}</td><td>${list(x.political_interests)}</td><td>${list(x.security_military_interests)}</td><td>${list(x.information_interests)}</td></tr>`);
  const sourceRows=audit.map(x=>`<tr><td><b>${esc(x.source_id||'')}</b> ${esc(x.source_name||'')}</td><td>${esc(x.source_type)}</td><td>${esc(x.affiliation_or_owner)}</td><td>${esc(x.funding_or_dependency)}</td><td>${esc(x.firsthand_access)}</td><td><span class="source-grade" data-grade="${esc(x.independence)}">${esc(x.independence)}</span></td><td>${esc(x.limitations)}</td><td><span class="source-grade" data-grade="${esc(x.reliability_for_this_claim)}">${esc(x.reliability_for_this_claim)}</span></td></tr>`);
  const frameRows=frames.map(x=>`<tr><td>${esc(x.term_or_frame)}</td><td>${esc(x.used_by)}</td><td>${esc(x.alternative_description)}</td><td>${esc(x.factual_core)}</td><td>${esc(x.effect_on_perception)}</td></tr>`);
  const infoRows=infoops.map(x=>`<tr><td>${esc(x.indicator)}</td><td>${esc(x.possible_actor)}</td><td>${esc(x.evidence)}</td><td>${esc(x.alternative_explanation)}</td><td>${esc(x.status)}</td></tr>`);
  const numRows=nums.map(x=>`<tr><td>${esc(x.metric)}</td><td>${arr(x.values_by_source).map(z=>`<div><b>${esc(z.source_id)}</b>: ${esc(z.value)}<br><small>${esc(z.definition_or_method)}</small></div>`).join('')}</td><td>${esc(x.reason_for_differences)}</td><td>${esc(x.best_supported_range)}</td><td>${esc(x.confidence)}</td></tr>`);
  const lawRows=laws.map(x=>`<tr><td>${esc(x.document)}</td><td>${esc(x.date)}</td><td>${arr(x.parties).map(esc).join(', ')}</td><td>${esc(x.relevant_content)}</td><td>${esc(x.legal_status)}</td><td>${list(x.competing_interpretations)}</td><td>${esc(x.assessment)}</td></tr>`);
  const osintRows=osint.map(x=>`<tr><td>${esc(x.item)}</td><td>${esc(x.type)}</td><td>${esc(x.provenance)}</td><td>${esc(x.geolocation)}</td><td>${esc(x.chronolocation)}</td><td>${esc(x.context_or_manipulation_check)}</td><td>${pill(x.status)}</td></tr>`);
  const changedRows=changed.map(x=>`<tr><td>${esc(x.item)}</td><td>${esc(x.original)}</td><td>${esc(x.change_or_removal)}</td><td>${esc(x.date)}</td><td>${esc(x.documented_reason)}</td><td>${esc(x.forensic_relevance)}</td></tr>`);
  const accessRows=access.map(x=>`<tr><td>${esc(x.measure)}</td><td>${esc(x.actor)}</td><td>${esc(x.affected_information)}</td><td>${esc(x.documented_reason)}</td><td>${esc(x.effect_on_evidence_access)}</td><td>${esc(x.assessment)}</td></tr>`);
  const econRows=econ.map(x=>`<tr><td>${esc(x.topic)}</td><td>${arr(x.beneficiaries).map(esc).join(', ')}</td><td>${arr(x.disadvantaged).map(esc).join(', ')}</td><td>${esc(x.money_or_resource_flow)}</td><td>${esc(x.evidence)}</td><td>${esc(x.relevance)}</td></tr>`);
  const contradictionRows=contradictions.map(x=>`<tr><td>${esc(x.topic)}</td><td>${esc(x.statement_a)}</td><td>${esc(x.statement_b)}</td><td>${x.can_both_be_true?'Ja':'Nein / unklar'}</td><td>${esc(x.best_explanation)}</td></tr>`);
  const unknownRows=unknowns.map(x=>`<tr><td>${esc(x.question)}</td><td>${esc(x.why_unknown)}</td><td>${esc(x.who_may_have_the_data)}</td><td>${esc(x.what_would_resolve_it)}</td><td>${esc(x.importance)}</td></tr>`);
  const altRows=alts.map(x=>`<tr><td>${esc(x.explanation)}</td><td>${list(x.facts_explained_well)}</td><td>${list(x.facts_explained_poorly)}</td><td>${list(x.required_assumptions)}</td><td>${esc(x.what_would_falsify_it)}</td><td>${esc(x.current_support)}</td></tr>`);
  const limitRows=limits.map(x=>`<tr><td>${esc(x.topic_or_source)}</td><td>${esc(x.limitation_type)}</td><td>${esc(x.documented_cause)}</td><td>${esc(x.effect_on_evidence)}</td><td>${list(x.alternatives_attempted)}</td><td>${list(x.international_or_archived_sources_found)}</td><td>${x.is_documented_censorship?'Ja':'Nein / nicht belegt'}</td><td>${esc(x.remaining_uncertainty)}</td></tr>`);

  $('#report').innerHTML=`
    <header class="report-hero"><div class="kicker">Alltags-Forensik · Quellenkritischer Bericht</div><h1>${esc(m.title||'Forensische Analyse')}</h1><div class="meta">${esc(m.subject_type||'')} ${m.time_scope?'· '+esc(m.time_scope):''} ${m.geographic_scope?'· '+esc(m.geographic_scope):''}<br>${esc(m.research_scope_note||'')}</div>
      <div class="verdict-row"><div class="verdict-card"><span>Kurzfazit</span><strong>${esc(e.bottom_line||v.plain_language||'nicht beurteilbar')}</strong></div><div class="verdict-card"><span>Vertrauen</span><strong>${esc(e.overall_confidence||v.confidence||'—')}</strong></div><div class="verdict-card"><span>Quellen</span><strong>${sources.length}</strong></div></div>
    </header>
    <div class="report-body">
      ${renderDashboard(d)}
      ${section('Gesicherte Fakten',list(e.most_secure_facts),HELP.status)}
      ${section('Zentrale Streitpunkte',list(e.most_disputed_points))}
      ${section('Wichtigste unbekannte Punkte',list(e.most_important_unknowns),'Unbekannte Punkte werden bewusst sichtbar gemacht. Fehlende Daten dürfen nicht durch Spekulation ersetzt werden.')}
      ${e.most_important_omission?section('Wichtigste mögliche Auslassung',`<p>${esc(e.most_important_omission)}</p>`,HELP.omission):''}
      ${section('Chronologie & Vorgeschichte',renderTimeline(d.timeline),'Zeitliche Reihenfolge ist entscheidend, weil spätere Rechtfertigungen nicht automatisch frühere Ursachen beweisen.')}
      ${section('Behauptungen im Faktencheck',renderClaims(d.claims),HELP.status)}
      ${section('Auslassungen & blinde Flecken',table(['Thema','Warum relevant','Wo unterbelichtet','Einfluss auf Gesamtbild','Sicherheit'],omissionsRows),HELP.omission)}
      ${section('Interessen & Anreize der Akteure',table(['Akteur','Erklärte Ziele','Materielle Interessen','Politische Interessen','Sicherheits-/Militärinteressen','Informationsinteressen'],actorRows),'Interessen sind keine Beweise für falsches Verhalten. Sie zeigen jedoch, welche Anreize bestehen und wo besonders strenge Gegenprüfung nötig ist.')}
      ${section('Quellenprüfung',table(['Quelle','Typ','Eigentümer / Zugehörigkeit','Finanzierung / Abhängigkeit','Direkter Zugang','Unabhängigkeit','Grenzen','Zuverlässigkeit hier'],sourceRows),HELP.source)}
      ${section('Sprache & Framing',table(['Begriff / Rahmung','Verwendet von','Neutralere Alternative','Tatsachenkern','Wirkung auf Wahrnehmung'],frameRows),HELP.framing)}
      ${section('Propaganda- & Informationsoperations-Indizien',table(['Indiz','Möglicher Akteur','Beleg','Alternative Erklärung','Status'],infoRows),HELP.infoop)}
      ${section('Zahlen- & Statistikvergleich',table(['Kennzahl','Werte / Methoden','Warum Unterschiede?','Bestgestützter Bereich','Sicherheit'],numRows),'Unterschiedliche Zahlen können durch Definitionen, Zeiträume, Zählmethoden, Untererfassung oder strategische Kommunikation entstehen.')}
      ${section('Verträge, Recht & Vereinbarungen',table(['Dokument','Datum','Parteien','Relevanter Inhalt','Rechtsstatus','Unterschiedliche Interpretationen','Bewertung'],lawRows),HELP.law)}
      ${section('Bild-, Video- & OSINT-Prüfung',table(['Material','Typ','Herkunft','Ort','Zeit','Kontext-/Manipulationsprüfung','Status'],osintRows),HELP.osint)}
      ${section('Geänderte, gelöschte oder korrigierte Inhalte',table(['Inhalt','Ursprünglich','Änderung / Entfernung','Datum','Dokumentierter Grund','Forensische Bedeutung'],changedRows),'Eine Änderung oder Löschung kann wichtig sein, beweist aber ohne weitere Belege keine Täuschungsabsicht.')}
      ${section('Zugangsbeschränkung, Zensur & Moderation',table(['Maßnahme','Akteur','Betroffene Information','Dokumentierter Grund','Auswirkung auf Belegzugang','Bewertung'],accessRows),'Hier wird dokumentiert, welche Informationen schwerer zugänglich sind. Das bewertet nicht automatisch die Rechtmäßigkeit oder Motivation der Maßnahme.')}
      ${section('Recherchezugang & technische / modellbedingte Grenzen',table(['Thema / Quelle','Art der Einschränkung','Dokumentierte Ursache','Auswirkung','Alternativen versucht','Internationale / archivierte Ersatzquellen','Dokumentierte Zensur?','Restunsicherheit'],limitRows),HELP.access)}
      ${section('Internationale & anderssprachige Gegenrecherche',`<p><b>Gesuchte Sprachen:</b> ${esc(arr(intl.languages_searched).join(', ')||'keine Angaben')}</p><p><b>Länder / Regionen:</b> ${esc(arr(intl.countries_or_regions_searched).join(', ')||'keine Angaben')}</p><p><b>Quellenräume:</b></p>${list(intl.source_ecosystems_searched)}<p><b>Wichtige Befunde, die im anfänglichen Quellenraum fehlten:</b></p>${list(intl.important_findings_missing_from_initial_source_set)}<p><b>Übersetzungs-/Kontextunsicherheiten:</b></p>${list(intl.translation_or_context_uncertainties)}`,HELP.international)}
      ${section('Wirtschaftlicher & materieller Kontext',table(['Thema','Begünstigte','Benachteiligte','Geld-/Ressourcenfluss','Beleg','Bedeutung'],econRows),'Materielle Gewinner oder Verlierer erklären nicht automatisch Ursachen, können aber relevante Anreize sichtbar machen.')}
      ${section('Widersprüche',table(['Thema','Aussage A','Aussage B','Beides möglich?','Beste Erklärung'],contradictionRows),'Widersprüchliche Aussagen werden nicht stillschweigend geglättet, sondern nebeneinander gestellt.')}
      ${section('Unbekannte Fakten & Beweislücken',table(['Offene Frage','Warum unbekannt?','Wer könnte Daten besitzen?','Was würde klären?','Bedeutung'],unknownRows),'Das ist einer der wichtigsten Abschnitte: Er verhindert, dass Lücken mit scheinbar sicheren Erzählungen gefüllt werden.')}
      ${section('Alternative Erklärungen',table(['Erklärung','Erklärt gut','Erklärt schlecht','Benötigte Annahmen','Was würde sie widerlegen?','Aktuelle Stützung'],altRows),'Alternative Erklärungen werden nicht gleichgewichtet, sondern nach ihrer tatsächlichen Evidenz beurteilt.')}
      ${section('Pflicht-Red-Team: zweite Recherchephase',`<p><b>Vorläufige Schlussfolgerung aus Phase 1:</b><br>${esc(red.phase1_preliminary_conclusion||'nicht angegeben')}</p><p><b>Vertrauen nach Phase 1:</b> ${esc(red.phase1_confidence||'—')}</p><p><b>Gegenhypothesen:</b></p>${list(red.counter_hypotheses)}<p><b>Gezielte Suchwege der Phase 2:</b></p>${list(red.phase2_search_paths)}<p><b>Neue Gegenbelege gegen Phase 1:</b></p>${list(red.phase2_findings_against_phase1)}<p><b>Befunde, die Phase 1 trotz Gegenprüfung stützen:</b></p>${list(red.phase2_findings_supporting_phase1)}<p><b>In Phase 1 erkannte Fehler / Auslassungen:</b></p>${list(red.phase1_errors_or_omissions_found)}<p><b>Schlussfolgerung geändert:</b> ${red.conclusion_changed?'Ja':'Nein'}</p><p><b>Vertrauen:</b> ${esc(red.confidence_changed_from||'—')} → ${esc(red.confidence_changed_to||'—')}</p><p><b>Begründung:</b> ${esc(red.change_explanation||'nicht angegeben')}</p><p><b>Endgültige Schlussfolgerung nach Red Team:</b><br>${esc(red.final_conclusion_after_red_team||v.most_supported_conclusion||'nicht beurteilbar')}</p>`,HELP.redteam)}
      ${section('Was würde das Urteil ändern?',list(d.what_would_change_the_conclusion),'Hier stehen neue Dokumente, Daten oder Befunde, die die Schlussfolgerung wesentlich verändern könnten.')}
      ${section('Gesamturteil',`<p><b>Am besten gestützte Schlussfolgerung:</b> ${esc(v.most_supported_conclusion||'nicht beurteilbar')}</p><p><b>Stärkster Gegenpunkt:</b> ${esc(v.strongest_counterpoint||'nicht beurteilbar')}</p><p><b>Größte Unsicherheit:</b> ${esc(v.largest_uncertainty||'nicht beurteilbar')}</p><p><b>In Alltagssprache:</b> ${esc(v.plain_language||e.bottom_line||'nicht beurteilbar')}</p>`)}
      ${section('Quellenverzeichnis',sources.length?`<div class="source-list">${sources.map(s=>`<div class="source"><b>${esc(s.id||'')}</b> ${esc(s.title||'')}<br><span class="small-muted">${esc(s.publisher_or_author||'')} ${s.date?'· '+esc(s.date):''} ${s.source_type?'· '+esc(s.source_type):''}</span>${s.url?`<br><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a>`:''}${s.note?`<br><small>${esc(s.note)}</small>`:''}</div>`).join('')}</div>`:'<p>Keine Quellen angegeben.</p>','Quellen sollten so angegeben sein, dass zentrale Feststellungen nachvollzogen werden können. Mehr Quellen bedeuten nicht automatisch mehr Unabhängigkeit.')}
    </div>`;
}

$('#printBtn').addEventListener('click',()=>window.print());
$('#newAnalysisBtn').addEventListener('click',()=>{currentData=null;$('#jsonInput').value='';$('#jsonStatus').className='status';$('#jsonStatus').textContent='Noch kein JSON geprüft.';goStep(1);});
$('#exportJsonBtn').addEventListener('click',()=>{const d=currentData||parseJson(false);if(!d)return alert('Kein gültiges JSON vorhanden.');const name=((d.meta?.title||'alltags-forensik').replace(/[^a-z0-9äöüß_-]+/gi,'-').replace(/^-+|-+$/g,'')||'alltags-forensik')+'.json';download(name,JSON.stringify(d,null,2),'application/json');});
function download(name,text,type){const blob=new Blob([text],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);}

const ARCHIVE_KEY='alltagsForensikArchive_v1';
function getArchive(){try{return JSON.parse(localStorage.getItem(ARCHIVE_KEY)||'[]')}catch{return []}}
function setArchive(a){localStorage.setItem(ARCHIVE_KEY,JSON.stringify(a));renderArchive();}
$('#saveAnalysisBtn').addEventListener('click',()=>{if(!currentData)return alert('Noch kein Bericht vorhanden.');const a=getArchive();a.unshift({id:Date.now(),saved:new Date().toISOString(),title:currentData.meta?.title||'Unbenannte Analyse',data:currentData});setArchive(a.slice(0,50));alert('Analyse wurde lokal gespeichert.');});
function renderArchive(){const a=getArchive(),box=$('#archiveList');if(!a.length){box.innerHTML='<p class="small-muted">Noch keine gespeicherten Analysen.</p>';return;}box.innerHTML=a.map(x=>`<div class="archive-item"><div><h3>${esc(x.title)}</h3><p>${new Date(x.saved).toLocaleString('de-DE')}</p></div><div class="archive-actions"><button class="btn secondary" data-load="${x.id}" type="button">Öffnen</button><button class="btn ghost" data-export="${x.id}" type="button">JSON</button><button class="btn danger" data-delete="${x.id}" type="button">Löschen</button></div></div>`).join('');
  box.querySelectorAll('[data-load]').forEach(b=>b.addEventListener('click',()=>{const x=getArchive().find(z=>z.id==b.dataset.load);if(!x)return;currentData=x.data;$('#jsonInput').value=JSON.stringify(x.data,null,2);renderReport(x.data);goStep(3);}));
  box.querySelectorAll('[data-export]').forEach(b=>b.addEventListener('click',()=>{const x=getArchive().find(z=>z.id==b.dataset.export);if(!x)return;download('alltags-forensik-'+x.id+'.json',JSON.stringify(x.data,null,2),'application/json');}));
  box.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>setArchive(getArchive().filter(z=>z.id!=b.dataset.delete))));
}
$('#clearArchiveBtn').addEventListener('click',()=>{if(confirm('Gesamtes lokale Archiv löschen?'))setArchive([]);});
renderArchive();

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;$('#installBtn').hidden=false;});
$('#installBtn').addEventListener('click',async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$('#installBtn').hidden=true;});
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
})();
