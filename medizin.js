(() => {
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let currentData = null;
let deferredInstall = null;

const queryType = $('#queryType');
const queryInput = $('#queryInput');
const queryLabel = $('#queryLabel');
const promptOutput = $('#promptOutput');
const jsonInput = $('#jsonInput');
const jsonStatus = $('#jsonStatus');

const labels = {
  study:['Link, DOI oder PMID','z. B. https://doi.org/... oder PMID 12345678'],
  drug:['Wirkstoff / Medikament','z. B. Semaglutid, Metformin, Ibuprofen'],
  vaccine:['Impfstoff / Impfstoffprodukt','z. B. Comirnaty, Gardasil 9, MMRV oder Impfstoff gegen Influenza'],
  topic:['Thema / wissenschaftliche Behauptung','z. B. "Künstliche Süßstoffe erhöhen das Herz-Kreislauf-Risiko"'],
  title:['Studientitel / Autor / Suchhinweis','z. B. Titel, Autor, Jahr oder Zeitschrift']
};

queryType.addEventListener('change', () => {
  const [label, ph] = labels[queryType.value];
  queryLabel.textContent = label;
  queryInput.placeholder = ph;
});

function goStep(n){
  $$('.step').forEach(x=>x.classList.toggle('active', Number(x.dataset.step)===n));
  $$('.step-panel').forEach(x=>x.classList.remove('active'));
  $('#step'+n).classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
  if(n===4) renderArchive();
}
$$('.step').forEach(b=>b.addEventListener('click',()=>goStep(Number(b.dataset.step))));

function checked(id){ return $('#'+id).checked ? 'JA' : 'NEIN'; }

function buildPrompt(){
  const q = queryInput.value.trim();
  if(!q){ alert('Bitte zuerst eine Studie, einen Wirkstoff oder ein Thema eingeben.'); queryInput.focus(); return; }
  const typeNames={study:'konkrete Studie',drug:'Wirkstoff / Medikament',vaccine:'Impfstoff / Impfstoffprodukt',topic:'Thema / Behauptung',title:'Studientitel / Autor'};
  const mode=$('#analysisMode').value;
  const focus=$('#focusInput').value.trim() || 'Kein zusätzlicher Schwerpunkt – vollständige Prüfung.';
  const isMedical=['drug','vaccine'].includes(queryType.value);
  const drugModule=isMedical ? `\nMEDIZIN-/ARZNEIMITTEL-MODUL:\n- Ermittle die entscheidenden Zulassungs-, Wirksamkeits- und Sicherheitsstudien zum Produkt/Wirkstoff.\n- Trenne Nutzen und Schaden sowie relative und absolute Effekte.\n- Prüfe Dosis, Vergleichstherapie, Placebo, Vorlaufphasen (Run-in), Bedarfs-/Notfallmedikation, Abbruchraten, Intention-to-Treat- und Per-Protocol-Auswertung, unerwünschte Ereignisse, schwere unerwünschte Ereignisse und Mortalität.\n- Vergleiche wenn verfügbar Studienregister, Publikation, regulatorische Bewertungen und nachfolgende unabhängige Evidenz.\n- Prüfe, ob Herstellerfinanzierung, beauftragte Manuskripterstellung (Medical Writing), nicht transparent genannte Textbeiträge (Ghostwriting) oder Datenzugriffsrechte relevant sind.\n- Prüfe die vollständige bekannte Zusammensetzung des untersuchten Produktes und trenne Wirkstoff(e) von Hilfs-, Träger- und Zusatzstoffen sowie herstellungsbedingten Rückständen.\n- Prüfe Vorgängerwirkstoffe und frühere Standardtherapien mit gleicher oder sehr ähnlicher Indikation. Suche nach direkten Vergleichsstudien (Head-to-Head) und prüfe, ob ein neuer Stoff tatsächlich einen klinischen Zusatznutzen brachte.\n- Rekonstruiere Patentfamilie, Patentabläufe, neue Formulierungen/Isomere/Salze/Applikationsformen und zeitliche Nähe zu Patentabläufen mit drohendem Umsatzverlust (Patent-Cliffs), soweit öffentlich dokumentiert. Markiere mögliches Evergreening als Indiz, nicht als bewiesene Absicht.\n- Rekonstruiere die Entwicklung von Diagnose- und Behandlungsgrenzen der relevanten Erkrankung/Risikofaktoren. Berechne, sofern Daten vorliegen, wie sich der Anteil der als behandlungsbedürftig eingestuften Bevölkerung durch Grenzwertänderungen veränderte.\n- Prüfe Nutzen und mögliche Schäden einer Schwellenabsenkung: harte Endpunkte, absolute Risikoreduktion, NNT/NNH, Überdiagnose, Übertherapie und Medikalisierung.\n- Formuliere KEINE individuelle Therapieempfehlung.` : '';
  const vaccineModule=queryType.value==='vaccine' ? `\nIMPFSTOFF-/KOMPONENTENFORENSIK:\n- Ermittle aus Fachinformation/SmPC, Packungsbeilage, Zulassungsunterlagen, öffentlichen Bewertungsberichten, regulatorischen Datenbanken und – soweit öffentlich – Herstellungsinformationen alle auffindbaren Bestandteile.\n- Trenne mindestens: Antigen/Wirkstoff bzw. Nukleinsäure; Adjuvanzien; Träger-/Transportsysteme (Delivery-Systeme); Konservierungsstoffe; Stabilisatoren; Puffer/Salze; Zucker/Polyole; Tenside/Emulgatoren; Lösungsmittel; sonstige Hilfsstoffe.\n- Suche zusätzlich nach konkret belegten herstellungsbedingten Rückständen/Spuren.\n- Prüfe Container-/Verschlusssysteme auf relevante Kontaktmaterialien, Latexhinweise und dokumentierte herauslösbare bzw. in das Produkt übergehende Stoffe (Extractables/Leachables).\n- Prüfe für Jurisdiktion und Dokument, welche Bestandteile deklarationspflichtig sind und wo Prozessrückstände/Spuren erscheinen können.\n- Vergleiche offizielle Dokumentversionen und markiere Unterschiede oder fehlende Mengenangaben.\n- Ermittle für jeden Bestandteil separat Sicherheitsdaten und mögliche unerwünschte Reaktionen; unterscheide bekannte Reaktion, theoretischen Mechanismus, Signal und unbelegte Vermutung.\n- Prüfe, ob Nebenwirkungen plausibel Wirkstoff/Antigen, Adjuvans, Hilfs-/Trägerstoff, Prozessrückstand, Verpackungsbestandteil oder Kombination zugeordnet werden können.\n- Prüfe, ob Sicherheitsstudien das fertige Endprodukt in der tatsächlich verwendeten Formulierung untersuchten.\n- Prüfe dokumentierte Chargen-, Formulierungs- und Herstellungsänderungen.` : '';
  const historyModule = checked('checkHistory')==='JA' ? `\nHISTORISCHE PROBLEM- & INTERVENTIONSFORENSIK:\n- Rekonstruiere die Geschichte des behaupteten Problems VOR der modernen Intervention. Suche nach möglichst zeitnahen historischen Primärquellen, amtlicher Statistik, Lehrbüchern, frühen Kohorten, Sterbe-/Erkrankungsregistern, Leitlinien und zeitgenössischen Fachdebatten.\n- Bestimme: Wann wurde das Problem erstmals als relevantes Gesundheits-/Gesellschaftsproblem beschrieben? Wie schwer war es tatsächlich? Welche Morbidität, Mortalität oder Einschränkung bestand? Wie groß war der Anteil der Bevölkerung ohne die Intervention, der gesund bzw. ohne den behaupteten Endpunkt blieb?\n- Frage ausdrücklich: Wurde die Intervention entwickelt, um ein bereits dokumentiertes Problem zu lösen, oder wurde die Problemdefinition zeitgleich/nachträglich ausgeweitet bzw. stärker vermarktet? Antworte nur anhand der Evidenz.\n- Erstelle eine Zeitleiste aus Problemwahrnehmung, Entwicklung, Einführung, Marketing/öffentlicher Empfehlung, ersten Wirksamkeitsstudien, Leitlinienänderungen und späteren Outcome-Trends.\n- Prüfe, ob belastbare Wirksamkeitsstudien erst deutlich NACH breiter Einführung/Empfehlung erschienen und welche Evidenz zuvor die Nutzung begründete.\n- Vergleiche Trends vor und nach Einführung, ohne einfache Vorher-Nachher-Korrelation als Kausalbeweis zu behandeln.\n- Berücksichtige konkurrierende zeitliche Veränderungen wie Lebenserwartung, Diagnostik, Screening, Kodierung, Meldeverhalten, Verhalten, Exposition, Demografie, Umwelt und Therapie anderer Ursachen.\n- Unterscheide: reales Problem; reales, aber möglicherweise verstärkt dargestelltes Problem; veränderte Definition/Messung; unklare Evidenz; Hinweise auf Medikalisierung/Problemexpansion.` : '';
  const predecessorModule = checked('checkPredecessors')==='JA' ? `\nVORGÄNGER-, PATENT- & MARKTFORENSIK:\n- Suche systematisch nach früheren Stoffen, Produkten, Verfahren oder Verhaltensmaßnahmen mit identischer oder sehr ähnlicher Funktion/Indikation.\n- Prüfe, ob diese Vorgänger ähnlich wirksam, sicherer, günstiger oder bereits generisch/patentfrei waren. Priorisiere direkte Vergleiche und harte klinische Endpunkte.\n- Rekonstruiere soweit möglich Patentlaufzeiten, Patentabläufe, Markteinführung von Nachfolgeprodukten, neue Isomere/Salze/Formulierungen/Kombinationen/Applikationsformen und Indikationserweiterungen.\n- Prüfe auf zeitliche Muster eines Patentablaufs mit drohendem Umsatzverlust (Patent-Cliff) und mögliches Evergreening. Ein zeitlicher Zusammenhang ist ein Indiz, kein Beweis für unlautere Absicht.\n- Ermittle dokumentierte Gründe, warum ein Vorgänger ersetzt wurde: bessere Wirksamkeit, Sicherheit, Handhabung, Produktionsgründe, regulatorische Gründe, Marktstrategie oder unklar.\n- Prüfe, ob Zulassungsstudien gegen Placebo statt gegen einen etablierten wirksamen Vorgänger durchgeführt wurden und ob dadurch ein echter Zusatznutzen ungeklärt blieb.\n- Trenne wissenschaftlichen Zusatznutzen von kommerziellem Neuheitswert.` : '';
  const thresholdModule = checked('checkThresholds')==='JA' ? `\nDIAGNOSE-, RISIKO- & GRENZWERTFORENSIK:\n- Rekonstruiere Definitionen, Grenzwerte, Risikokategorien und Behandlungsschwellen im Zeitverlauf.\n- Für jede Änderung: Jahr, Organisation/Leitliniengremium, alter Wert, neuer Wert, Evidenzbasis, Begründung, Interessenkonflikte der Panelmitglieder und geschätzte Auswirkung auf die Zahl/den Anteil der neu als krank, gefährdet oder behandlungsbedürftig klassifizierten Menschen.\n- Verwende nicht automatisch die aktuelle Definition rückwirkend auf historische Populationen.\n- Prüfe, ob Grenzwerte auf patientenrelevante Ergebnisse, Ersatzmesswerte (Surrogatmarker), Expertenkonsens oder Modellannahmen gestützt wurden.\n- Prüfe, ob niedrigere Schwellen in den neu erfassten Niedrigrisikogruppen einen nachweisbaren absoluten klinischen Nutzen erzeugen und welche Schäden/Belastungen durch Überdiagnose oder Übertherapie entstehen.\n- Identifiziere mögliche schleichende Definitionsänderung, Indikationserweiterung, Ausweitung von Krankheitsdefinitionen (Disease Mongering) / Medikalisierung oder Risikofaktor-zu-Krankheit-Verschiebung als Prüfpunkt; verwende diese Begriffe nur, wenn die Evidenz sie trägt.\n- Zeige sowohl Argumente FÜR als auch GEGEN die jeweilige Grenzwertänderung.` : '';
  const substanceHistoryModule = checked('checkSubstanceHistory')==='JA' ? `\nSTOFFBIOGRAFIE / FRÜHERE VERWENDUNGEN UND GEFAHRSTOFFKONTEXT:\n- Rekonstruiere für den Wirkstoff und für relevante Hilfs-, Träger-, Adjuvans- und Prozessstoffe eine Stoffbiografie VOR der heutigen medizinischen/gesundheitsbezogenen Verwendung.\n- Suche nach früheren oder parallelen Verwendungen desselben Stoffes in Medizin, Industrie, Landwirtschaft, Lebensmitteltechnik, Kosmetik, Desinfektion/Reinigung, Labor, Bergbau, Materialtechnik, militärischem Kontext, chemischer Kriegführung oder anderen Bereichen.\n- Falls eine medizinische Entwicklung historisch aus Beobachtungen an einem Kampfstoff, Giftstoff, Industriechemikalie, Reinigungs-/Desinfektionsmittel, Pestizid oder anderem nichtmedizinischen Einsatz hervorging, stelle diesen Entwicklungspfad mit Primärquellen und Jahresangaben dar.\n- Prüfe zuerst die CHEMISCHE IDENTITÄT: Ist es exakt dieselbe chemische Spezies, ein Salz, Ester, Isomer, Metabolit, Derivat, Vorläufer, Formulierung, nur dieselbe Stofffamilie oder lediglich ein ähnlich klingender Name? Keine Gleichsetzung verwandter Stoffe.\n- Unterscheide besonders Element, Ion und Verbindung. Beispiel: elementares Fluor (F2), Fluorid-Ion und konkrete Fluoridsalze dürfen toxikologisch nicht als derselbe Stoff behandelt werden. Dasselbe Prinzip gilt z. B. für Chlor/Chlorid oder elementares Natrium/Natriumsalze.\n- Für jede historische Nutzung dokumentiere soweit möglich: Stoffform, Reinheit/Konzentration, Dosis, Expositionsweg, Expositionsdauer, Ziel der Verwendung und bekannte Gefahren.\n- Prüfe historische und heutige Gefahrstoffklassifikationen/Sicherheitsdaten, aber übertrage eine Gefahrenklassifikation nicht automatisch auf eine völlig andere Dosis, Formulierung oder Expositionsroute.\n- Umgekehrt darf eine medizinische Verwendung nicht dazu führen, bekannte toxische Eigenschaften bei relevanter Dosis oder Route zu verharmlosen.\n- Beantworte getrennt: (1) Wurde derselbe Stoff früher anders verwendet? (2) War diese Verwendung gefährlich? (3) Ist der damalige Gefahrenmechanismus bei der heutigen Dosis/Route plausibel relevant? (4) Welche Daten testen dies direkt?\n- Suche nach Dosis-Wirkungs-Beziehungen, NOAEL/LOAEL soweit sinnvoll, Pharmakokinetik/Toxikokinetik, Expositionsroute und kumulativer Exposition.\n- Markiere auffällige Kommunikationsunterschiede, wenn derselbe Stoff in einem Kontext als Gefahrstoff und in einem anderen als medizinisch nützlich beschrieben wird; erkläre dann, ob die unterschiedliche Bewertung wissenschaftlich durch Dosis, Form, Route und Nutzen-Risiko-Kontext gerechtfertigt ist.\n- Frühere militärische/industrielle Nutzung ist ein relevanter historischer Hinweis, aber allein kein Beweis für Schädlichkeit der heutigen Anwendung. Ebenso ist eine Zulassung/medizinische Verwendung allein kein Beweis für Harmlosigkeit.` : '';

  const effectDurationModule = checked('checkEffectDuration')==='JA' ? `\nZEITVERLAUF DER WIRKUNG & REALE ANWENDUNG:\n- Prüfe die Wirksamkeit NICHT nur als Ja/Nein-Frage. Bestimme für jeden relevanten Endpunkt die tatsächlich untersuchte und belegte ZEITSPANNE.\n- Trenne: Wirkungseintritt, Zeit bis zur maximalen Wirkung, Dauer nach EINMALIGER Anwendung/Dosis/Exposition, Dauer bei wiederholter Anwendung sowie Langzeitwirkung auf patientenrelevante Endpunkte.\n- Erstelle eine Evidenztabelle: Endpunkt | untersuchtes Zeitfenster | Anwendung/Dosis | kontrollierte Bedingungen oder Alltag | Effekt | Unsicherheit | Quelle.\n- Prüfe ausdrücklich, ob kurzfristige Labor-/Surrogatwirkung auf längerfristigen Nutzen extrapoliert wird, ohne dass dieser Zeitraum direkt untersucht wurde.\n- Ermittle Faktoren, die die Wirkung verkürzen oder verändern können: Zeit, Wasser, Schweiß, Reibung, Waschen, Kleidung, Licht/UV/Hitze, Abbau, Metabolismus, Ausscheidung, Wechselwirkungen, Lagerung, falsche Dosis/Menge oder andere für die Intervention relevante Faktoren.\n- Prüfe Nachcremen/Nachdosieren/Wiederholungsintervalle: Woher stammt die Empfehlung? Ist gezeigt, dass Wiederholung den ursprünglichen Schutz vollständig, teilweise oder unklar wiederherstellt? Gibt es direkte Messungen unmittelbar vor und nach Wiederholung?\n- Vergleiche Wirksamkeit unter idealen Studienbedingungen mit realer Anwendung, Adhärenz/Anwendungsfehlern und typischer tatsächlicher Dosis/Menge.\n- Falls eine Intervention nur unter kontinuierlicher oder wiederholter Anwendung wirksam ist, schreibe dies ausdrücklich und stelle NICHT den Eindruck eines durchgehenden Schutzes nach einer einzelnen Anwendung her.\n- Bei topischen Schutzmitteln wie Sonnenschutz: trenne standardisierte SPF/UVA-Labormessung, Wasserfestigkeit, Abrieb/Schweiß, reale Auftragsmenge, erneutes Auftragen sowie Studien zu Sonnenbrand, aktinischen Schäden und Hautkrebs über lange Zeiträume.\n- Gib für jede zentrale Wirksamkeitsaussage an: 'direkt über diesen Zeitraum belegt', 'nur indirekt/extrapoliert' oder 'nicht belegt'.` : '';
  const selfProtectionModule = checked('checkSelfProtection')==='JA' ? `\nKÖRPEREIGENER SELBSTSCHUTZ, ANPASSUNG & NICHT-PRODUKT-ALTERNATIVEN:\n- Ermittle zunächst, welche natürlichen/physiologischen Schutzmechanismen gegen das untersuchte Problem existieren und wie stark sie nachweislich sind.\n- Trenne angeborene Eigenschaften von erworbenen Anpassungen und Verhalten. Untersuche Zeit bis zum Aufbau, Größenordnung des Effekts, Dauer/Abklingen, Grenzen und mögliche Kosten/Risiken der Anpassung.\n- Prüfe ausdrücklich die Frage: Kann ein relevanter Selbstschutz durch schrittweise Exposition oder andere Anpassung aufgebaut werden? Wenn ja: gegen WELCHEN Endpunkt, in welchem Ausmaß und mit welchen Grenzen? Wenn nein oder unklar: ebenfalls klar ausweisen.\n- Bei UV/Sonne untersuche getrennt Hauttyp/Pigmentierung, Melanin, Bräunungsreaktion, Verdickung der Hornschicht, DNA-Reparatur/sonstige biologische Antworten sowie Verhalten wie Kleidung, Schatten und Expositionszeit. Stelle nicht automatisch 'weniger Sonnenbrand' mit 'kein langfristiges Hautkrebsrisiko' gleich.\n- Vergleiche intermittierende intensive Exposition mit regelmäßiger/beruflicher chronischer Exposition, soweit Daten vorliegen.\n- Suche gezielt nach Kohorten mit hoher beruflicher Exposition (z. B. Dachdecker, Bauarbeiter, Landwirte, Seeleute oder andere passende Berufsgruppen). Vergleiche Erkrankungsraten mit geeigneten Kontrollgruppen und berücksichtige Hauttyp, Alter, Geschlecht, Region, Kleidung, Arbeitszeiten, sozioökonomische Faktoren, Screening und andere Expositionen.\n- Prüfe Healthy-Worker-Effekt, Selbstselektion, Survivor Bias und Verhaltensanpassung: Menschen, die eine Tätigkeit langfristig ausüben, können sich systematisch von Personen unterscheiden, die sie nicht ausüben oder früh verlassen.\n- Anekdotische Beobachtungen wie 'viele stark gebräunte Beschäftigte wirken gesund' sind als Hypothese zulässig, aber nicht als Beweis. Suche dazu Populationsdaten und widersprechende Evidenz.\n- Vergleiche Produktintervention mit nichtproduktbezogenen Alternativen: Expositionssteuerung, Kleidung, Schatten, Tageszeit, Verhaltensänderung oder andere relevante Maßnahmen.\n- Zeige getrennt: Schutz vor kurzfristigem Symptom/Schaden, Schutz vor kumulativem Schaden und Schutz vor langfristiger Erkrankung.` : '';
  const lowCostAlternativesModule = checked('checkLowCostAlternatives')==='JA' ? `\nGÜNSTIGE ALTERNATIVEN, HAUSMITTEL & EVIDENZLÜCKEN:\n- Suche gezielt nach kostengünstigen, traditionellen, frei verfügbaren, nicht patentierten, generischen, verhaltensbezogenen und physikalischen Alternativen zur untersuchten Intervention. Schließe Hausmittel/Naturstoffe NICHT allein deshalb aus, weil randomisierte Studien fehlen.\n- WICHTIG: Fehlende Forschung bedeutet NICHT Unwirksamkeit. Formuliere bei fehlenden Daten ausdrücklich 'nicht oder unzureichend untersucht' und NICHT 'unwirksam'. Umgekehrt bedeutet traditionelle Nutzung, Plausibilität oder eine nützliche Nebeneigenschaft noch keinen nachgewiesenen Schutz gegen den Zielendpunkt.\n- Beurteile JEDE Alternative in fünf getrennten Ebenen: (1) bekannte/dokumentierte Eigenschaften und Nebenvorteile, (2) plausibler Wirkmechanismus, (3) direkte Evidenz für den gewünschten Schutz/Nutzen, (4) offene/nicht untersuchte Punkte, (5) tatsächlich widerlegte Aussagen. Vermische diese Kategorien nicht.\n- Dokumentiere auch Vorteile, die unabhängig vom Hauptziel bestehen können, z. B. Hautpflege, rückfettende/okklusive Eigenschaften, Feuchtigkeitserhalt, Barrierewirkung, Komfort, Verfügbarkeit oder einfache Anwendung – aber nur soweit plausibel oder belegt und mit entsprechender Evidenzstufe.\n- Wenn für eine Alternative keine direkte Wirksamkeitsstudie existiert, suche nach indirekter Evidenz: physikalisch-chemische Eigenschaften, Labor-/Mechanismusdaten, traditionelle Nutzung, Beobachtungsdaten, Sicherheitsdaten oder Vergleichsmessungen. Kennzeichne die Grenzen dieser Evidenz.\n- Stelle 'nicht untersucht', 'nur indirekt untersucht', 'teilweise untersucht', 'direkt untersucht' und 'widerlegt' klar getrennt dar.\n- Vergleiche Alternativen NICHT nur über einen Einzelwert. Prüfe dieselben relevanten Dimensionen wie bei der Referenzintervention: Zielwirkung, Wirkungsdauer, Dosis/Menge, Anwendungsbedingungen, Langzeitendpunkte, Nebenwirkungen, praktische Nachteile, Kosten und Verfügbarkeit.\n- Bei Sonnenschutz/Naturölen/Hausmitteln: getrennt angeben, welche hautpflegenden oder okklusiven Eigenschaften bekannt/plausibel sind und ob ein standardisierter UVA-/UVB-Schutz, Photostabilität, Wasser-/Schweiß-/Abriebfestigkeit und Schutzdauer direkt untersucht wurden. Ein möglicher Pflegeeffekt darf NICHT als Nachweis eines vergleichbaren UV-Schutzes dargestellt werden; fehlende UV-Studien dürfen aber ebenso NICHT als Beweis fehlender UV-Wirkung formuliert werden.\n- Beziehe physische/verhaltensbezogene Alternativen wie Kleidung, Kopfbedeckung, Schatten, Expositionszeit oder andere situationsgerechte Maßnahmen in denselben Kosten-Nutzen-Vergleich ein.\n- Ermittle soweit sinnvoll grobe Kosten pro Anwendung/Tag/Behandlungszeitraum und kennzeichne, wenn belastbare Kostendaten fehlen.\n- Gib am Ende eine praktische Matrix aus: Alternative | bekannte Vorteile | plausibler Mechanismus | Schutzwirkung direkt belegt? | was nicht untersucht ist | was widerlegt ist | Risiken/Nachteile | Kosten/Verfügbarkeit | Vergleichbarkeit zur Referenz.` : '';


  const prompt = `ROLLE\nDu bist ein interdisziplinäres forensisches Prüferteam aus Methodik, Biostatistik, Epidemiologie, Fachwissenschaft, Medizingeschichte, Wissenschaftssoziologie, Gesundheitsökonomie, Patent-/Innovationsanalyse, Forschungsintegrität und Reproduzierbarkeitsforschung. Arbeite skeptisch, aber ergebnisoffen. Dein Auftrag ist weder Widerlegung noch Bestätigung, sondern die belastbare Prüfung der Evidenz.\n\nUNTERSUCHUNGSGEGENSTAND\nTyp: ${typeNames[queryType.value]}\nEingabe: ${q}\nZusätzlicher Fokus: ${focus}\nModus: ${mode==='forensic'?'FORENSISCH / MAXIMAL':'KRITISCH / KOMPAKT'}\n\nAKTIVIERTE FORENSISCHE PRÜFUNGEN\n- Register/Präregistrierung vergleichen: ${checked('checkRegistry')}\n- Autoren/Finanzierung/Interessenkonflikte: ${checked('checkAuthors')}\n- Korrekturen/offizielle Warnhinweise/zurückgezogene Veröffentlichungen: ${checked('checkRetraction')}\n- Wiederholungsstudien/widersprechende Evidenz: ${checked('checkReplication')}\n- Zahlen/Tabellen/Effektmaße nachrechnen: ${checked('checkMath')}\n- Primärquellen priorisieren: ${checked('checkSources')}\n- Historische Problem-/Interventionsgeschichte: ${checked('checkHistory')}\n- Vorgänger, Patente & Marktwechsel: ${checked('checkPredecessors')}\n- Diagnose-/Risikoschwellen im Zeitverlauf: ${checked('checkThresholds')}\n- Stoffbiografie & frühere Verwendungen: ${checked('checkSubstanceHistory')}\n- Wirkungsdauer & reale Anwendung: ${checked('checkEffectDuration')}\n- Körpereigener Selbstschutz & Anpassung: ${checked('checkSelfProtection')}\n- Günstige Alternativen & Hausmittel differenziert prüfen: ${checked('checkLowCostAlternatives')}\n${drugModule}${vaccineModule}${historyModule}${predecessorModule}${thresholdModule}${substanceHistoryModule}${effectDurationModule}${selfProtectionModule}${lowCostAlternativesModule}\n\nRECHERCHE- UND EVIDENZREGELN\n1. Nutze Websuche, DOI/PubMed, Verlagsseite, Supplement, Studienregister sowie regulatorische, amtliche und institutionelle Primärquellen. Für historische Fragen suche zusätzlich zeitgenössische Primärquellen und archivierte Leitlinien/Dokumente.\n2. Falls ein PDF verfügbar ist, analysiere den Volltext und nicht nur Abstract oder Pressemitteilung.\n3. Suche nach Studienprotokoll, Präregistrierung, Registrierungsverlauf, Supplement, Korrekturen, offizielle Warnhinweise, zurückgezogene Veröffentlichungen und Folgepublikationen.\n4. Vergleiche Registrierung/Protokoll mit finaler Publikation: Hypothesen, Endpunkte, Stichprobengröße, Analyseplan, Subgruppen, Zeitpunkte und Ausschlüsse.\n5. Suche nach Replikationen, größeren unabhängigen Studien, systematischen Übersichtsarbeiten und Meta-Analysen.\n6. Prüfe Autoren, institutionelle Verbindungen, Sponsor, Rolle des Sponsors, Datenbesitz, statistische Analyse, Medical Writing, Patente und Interessenkonflikte.\n7. Rechne veröffentlichte Prozentwerte, Summen, Konfidenzintervalle, p-Werte, Effektgrößen, absolute/relative Risiken, OR, HR, NNT/NNH und Stichprobenzahlen soweit möglich nach.\n8. Suche nach internen Widersprüchen zwischen Abstract, Methoden, Ergebnissen, Tabellen, Grafiken, Supplement und Schlussfolgerungen.\n9. Prüfe Selektionsbias, Confounding, Attrition, Missing Data, Survivorship Bias, Recall Bias, Detection Bias, Performance Bias, Reporting Bias, Outcome Switching, HARKing, p-Hacking, multiple Tests, Subgruppen-Fishing, Regression zur Mitte, Overfitting und unangemessene Kausalbehauptungen.\n10. Prüfe externe Validität und Übertragbarkeit.\n11. Prüfe historische Daten auf Änderungen von Diagnostik, Klassifikation, Kodierung, Screening, Lebenserwartung und Population, bevor du Trends vergleichst.\n12. Prüfe bei jeder behaupteten Problemzunahme, ob die Zunahme real, diagnostisch/definitorisch, demografisch oder durch Erfassung/Reporting erklärbar sein könnte.\n13. Behandle Interessenkonflikte, Sponsoreneinfluss, ungewöhnliche statistische Muster, selektive Analyseentscheidungen, Protokollabweichungen, Outcome-Switching, nachträgliche Subgruppen, ungewöhnliche Ausschlüsse, auffällige Datenbereinigung, p-Wert-Häufungen, inkonsistente Zahlen und ungewöhnlich günstige Darstellungen ausdrücklich als MANIPULATIONS- ODER BEEINFLUSSUNGSINDIKATOREN.\n14. Behandle auch zeitlich auffällige Kombinationen aus Patentablauf, Nachfolgeprodukt, Leitlinienänderung, Indikationserweiterung oder Grenzwertabsenkung als mögliche wirtschaftliche/strukturelle Einflussindikatoren, sofern belegt. Ein zeitlicher Zusammenhang allein beweist keine Absicht.\n15. Unterscheide präzise zwischen möglicher Einflussnahme, starkem Indiz für Ergebnis-/Marktsteuerung und nachgewiesenem Fehlverhalten.\n16. Führe jeden Manipulations-/Beeinflussungsindikator separat auf: Evidenzstärke, Mechanismus, Einfluss, Gegenargumente, Quellen und Beurteilbarkeit der Absicht.\n17. Trenne strikt: FAKT, INTERPRETATION, PLAUSIBLE SCHWACHSTELLE, OFFENE FRAGE, NICHT BEURTEILBAR.\n18. Wenn historische Daten fehlen oder nicht vergleichbar sind, sage dies ausdrücklich. Keine Rückrechnung oder Krankheitseinstufung ohne passende Definition und Daten.\n19. Bei Arzneimitteln/Impfstoffen: Prüfe Formulierung komponentenweise und trenne Wirkstoff, Hilfs-/Trägerstoffe, Adjuvanzien, Prozessrückstände und Kontaktmaterialien.\n20. Verifiziere Deklarationspflichten der jeweiligen Jurisdiktion und Dokumentart.\n21. Bei Nebenwirkungen bewerte substanzspezifisch Dosis/Exposition, Mechanismus, Zeitbezug, Dechallenge/Rechallenge und Alternativen.\n22. Behandle unterschiedliche Produktvarianten, Chargen, Hersteller, Formulierungen oder Prozesse getrennt.\n23. Bewerte niemals 'früher waren die Menschen gesund' oder 'Grenzwerte wurden nur für mehr Patienten abgesenkt' als Ausgangsannahme. Prüfe diese Hypothesen anhand historischer Outcome-Daten und dokumentierter Entscheidungsgrundlagen.\n24. Frage umgekehrt ebenso, ob ein historisch unterschätztes Problem durch bessere Diagnostik oder Evidenz tatsächlich sichtbar wurde.\n25. Rekonstruiere bei Stoffen/Produkten frühere Verwendungen der exakten chemischen Spezies und relevanter Derivate/Vorläufer. Kennzeichne klar, ob es exakt derselbe Stoff oder nur chemisch verwandt ist.\n26. Prüfe für toxikologische Vergleiche immer Dosis, Konzentration, chemische Form, Expositionsweg und -dauer. 'Giftig' und 'gesund/notwendig' sind ohne diese Angaben keine hinreichenden wissenschaftlichen Kategorien.\n27. Wenn ein Stoff historisch als Kampfstoff, Industriechemikalie, Reinigungs-/Desinfektionsmittel, Pestizid oder anderer Gefahrstoff genutzt wurde, erwähne dies ausdrücklich, sofern belegt, und untersuche die Relevanz für die heutige Anwendung.\n28. Prüfe bei Elementen/Ionen/Salzen die chemische Identität besonders streng; vermeide Namensgleichsetzungen (z. B. Fluor ≠ Fluorid ≠ jedes Fluoridsalz).\n29. Bewerte fehlende Forschung zu Hausmitteln/Alternativen als Evidenzlücke, nicht automatisch als Unwirksamkeitsnachweis. Trenne bekannte Nebenvorteile, plausible Mechanismen, direkte Zielwirkungs-Evidenz, offene Fragen und widerlegte Aussagen.\n30. Vergleiche günstige Alternativen auf denselben relevanten Endpunkten wie die Referenz und kennzeichne Nichtvergleichbarkeit transparent.\n\nBEWERTUNG\nBewerte Studiendesign, Stichprobe, Messmethodik, Statistik, Transparenz, Reproduzierbarkeit, interne Validität, externe Validität, Robustheit und Glaubwürdigkeit der Schlussfolgerungen jeweils 0–10.\n\nAUSGABEFORMAT – ZWINGEND\nSPRACHE: Alle frei formulierten Textwerte, Bewertungen, Begründungen, Titel, Kategorien und Beschreibungen müssen auf DEUTSCH ausgegeben werden. Englische Fachbegriffe nur verwenden, wenn sie wissenschaftlich gebräuchlich oder Teil eines Eigennamens sind; dann unmittelbar eine kurze deutsche Bedeutung in Klammern ergänzen. Die JSON-Schlüsselnamen bleiben exakt wie im Schema vorgegeben.\nGib ausschließlich EINEN Markdown-Codeblock vom Typ json aus: beginne mit \`\`\`json, danach das valide JSON, und beende mit \`\`\`. Kein erklärender Text vor oder nach dem Codeblock. Verwende UTF-8 und dieses Schema. Arrays dürfen leer sein, Felder bei fehlenden Informationen null, aber die obersten Schlüssel müssen vorhanden sein:\n\n{\n  "schema_version":"1.6",\n  "meta":{\n    "title":"",\n    "identifier":"",\n    "authors":[],\n    "journal":"",\n    "year":null,\n    "study_type":"",\n    "subject":"${q.replace(/"/g,'\\"')}",\n    "analysis_date":"YYYY-MM-DD",\n    "full_text_reviewed":false,\n    "registry_reviewed":false\n  },\n  "executive_summary":{\n    "one_sentence":"",\n    "overall_evidence":"sehr hoch|hoch|mittel|eingeschränkt|gering|sehr gering",\n    "how_much_should_this_change_belief":"praktisch gar nicht|geringfügig|moderat|deutlich|sehr stark",\n    "strongest_point":"",\n    "most_serious_weakness":"",\n    "key_uncertainty":""\n  },\n  "study_profile":{\n    "research_question":"",\n    "hypothesis":"",\n    "population":"",\n    "sample_size":"",\n    "intervention_or_exposure":"",\n    "control":"",\n    "primary_endpoints":[],\n    "secondary_endpoints":[],\n    "follow_up":"",\n    "main_results":[]\n  },\n  "historical_context":{\n    "problem_first_documented":"",\n    "intervention_origin_and_original_rationale":"",\n    "evidence_available_before_widespread_use":"",\n    "first_widespread_use_or_recommendation":"",\n    "first_strong_outcome_evidence":"",\n    "gap_between_use_and_strong_evidence":"",\n    "pre_intervention_population":{\n      "period":"",\n      "problem_prevalence_or_incidence":"",\n      "morbidity":"",\n      "mortality":"",\n      "proportion_or_description_healthy_without_intervention":"",\n      "data_quality_and_comparability":""\n    },\n    "timeline":[{"year_or_period":"","event":"","category":"Problemdefinition|Interventionsentwicklung|Markteinführung|Empfehlung|Studie|Leitlinie|Diagnostik|Marketing|Outcome-Trend|Andere","significance":"","source_ids":[]}],\n    "secular_changes_and_confounders":[],\n    "problem_origin_assessment":"bereits klar dokumentiertes Problem|reales Problem mit späterer Ausweitung|Definition/Messung stark verändert|Hinweise auf Problemexpansion/Medikalisierung|unklar|nicht beurteilbar",\n    "assessment_reasoning":"",\n    "source_ids":[]\n  },\n  "predecessors_patents_market":{\n    "predecessors":[{"name":"","type":"Wirkstoff|Produkt|Verfahren|Verhaltensmaßnahme|Andere","same_or_similar_indication":"","evidence_vs_current":"","safety_vs_current":"","cost_or_access_context":"","patent_or_generic_status":"","why_replaced_or_declined":"","source_ids":[]}],\n    "head_to_head_evidence":"",\n    "patent_timeline":[{"product_or_substance":"","patent_or_exclusivity":"","filing_or_start":"","expiry":"","related_successor":"","source_ids":[]}],\n    "patent_cliff_relationship":"",\n    "evergreening_indicators":[{"indicator":"","evidence_level":"Hinweis|Indiz|starkes Indiz|belegt","evidence":"","benign_explanation":"","source_ids":[]}],\n    "market_or_guideline_transition":"",\n    "incremental_clinical_benefit_over_predecessor":"",\n    "commercial_incentive_assessment":"",\n    "source_ids":[]\n  },\n  "threshold_definition_history":{\n    "condition_or_risk_factor":"",\n    "timeline":[{"year":"","organization":"","old_definition_or_threshold":"","new_definition_or_threshold":"","evidence_basis":"","panel_conflicts":"","estimated_population_impact":"","source_ids":[]}],\n    "direction_of_change":"niedrigere/weitere Schwellen|höhere/engere Schwellen|gemischt|unverändert|nicht beurteilbar",\n    "people_newly_classified":"",\n    "hard_outcome_benefit_in_newly_included_group":"",\n    "absolute_benefit_and_nnt":"",\n    "harms_overdiagnosis_overtreatment_nnh":"",\n    "surrogate_vs_hard_endpoint_issue":"",\n    "medicalization_or_disease_mongering_assessment":"kein Hinweis|möglich|Indiz|starkes Indiz|nicht beurteilbar",\n    "arguments_supporting_change":[],\n    "arguments_against_change":[],\n    "overall_assessment":"",\n    "source_ids":[]\n  },\n  "substance_history":{\n    "summary":"",\n    "notable_findings":[],\n    "substances":[{\n      "name":"",\n      "current_role":"Wirkstoff|Antigen|Adjuvans|Träger/Delivery|Hilfsstoff|Prozessrückstand|Sonstiges",\n      "chemical_identity":{"exact_species":"","cas_number":"","form":"","identity_relationship":"identisch|Salz/Derivat|Isomer|Metabolit|Vorläufer|gleiche Stofffamilie|nur Namensähnlichkeit|nicht beurteilbar","distinguish_from":[]},\n      "development_origin":"",\n      "earliest_documented_use":"",\n      "prior_uses":[{"period":"","sector":"Medizin|Industrie|Reinigung/Desinfektion|Landwirtschaft|Lebensmittel|Kosmetik|Labor|Militär|Chemische Kriegführung|Andere","use":"","form_concentration":"","dose_or_exposure":"","route":"","known_hazards":"","source_ids":[]}],\n      "hazard_classification_history":[{"period":"","classification_or_warning":"","context":"","source_ids":[]}],\n      "transition_to_current_use":{"period":"","reason":"","evidence_or_discovery_path":"","source_ids":[]},\n      "dose_route_context":{"current_dose_or_exposure":"","current_route":"","historical_vs_current_comparability":"","dose_response_evidence":"","cumulative_exposure":""},\n      "relevance_to_current_safety":"",\n      "communication_context":"",\n      "source_ids":[]\n    }],\n    "misleading_equivalences_to_avoid":[],\n    "overall_assessment":""\n  },\n  "effect_duration_and_real_world":{
    "intervention_or_measure":"",
    "application_or_dose_pattern":"",
    "onset_of_effect":"",
    "time_to_peak_effect":"",
    "duration_after_single_use":"",
    "reapplication_or_redosing_recommendation":"",
    "recommendation_evidence_basis":"",
    "effect_restoration_after_reapplication":"vollständig belegt|teilweise belegt|indirekt plausibel|unklar|nicht belegt",
    "evidence_windows":[{"outcome":"","time_window":"","application_or_dose":"","setting":"kontrolliert|Alltag|gemischt","effect":"","certainty":"","directly_demonstrated_over_this_window":true,"source_ids":[]}],
    "factors_reducing_or_changing_effect":[{"factor":"","mechanism_or_reason":"","measured_effect":"","time_course":"","source_ids":[]}],
    "real_world_adherence_and_application":"",
    "controlled_vs_real_world_difference":"",
    "continuous_or_repeated_use_evidence":"",
    "long_term_outcome_evidence":"",
    "extrapolations_or_time_gaps":[],
    "bottom_line_duration":""
  },
  "endogenous_protection_and_adaptation":{
    "baseline_protection_summary":"",
    "innate_mechanisms":[{"mechanism":"","who_or_when_relevant":"","magnitude":"","protects_against":"","limits":"","source_ids":[]}],
    "acquired_adaptations":[{"adaptation":"","time_to_develop":"","magnitude":"","duration_or_fade":"","protects_against":"","does_not_establish_protection_against":"","costs_or_risks":"","source_ids":[]}],
    "can_self_protection_be_built":"",
    "intermittent_vs_chronic_exposure":"",
    "individual_variation":"",
    "behavioral_non_product_protection":[{"measure":"","effectiveness":"","time_context":"","advantages":"","limitations":"","source_ids":[]}],
    "occupational_or_high_exposure_populations":[{"population":"","exposure_pattern":"","observed_short_term_outcomes":"","observed_long_term_outcomes":"","comparison_group":"","important_adjustments":"","healthy_worker_selection_survivor_bias":"","interpretation":"","source_ids":[]}],
    "anecdote_vs_population_evidence":"",
    "comparison_with_product_intervention":"",
    "overall_assessment":""
  },
  "cost_effective_alternatives":{
    "summary":"",
    "evidence_gap_principle":"Fehlende Forschung ist nicht gleich Unwirksamkeit; bekannte Eigenschaften, plausible Mechanismen, direkte Evidenz, offene Fragen und Widerlegung werden getrennt bewertet.",
    "alternatives":[{
      "name":"",
      "category":"Hausmittel/Naturstoff|Generikum/älterer Wirkstoff|Physische Barriere|Verhaltensmaßnahme|Lebensstil|Technische Lösung|Andere",
      "intended_function":"",
      "known_or_documented_non_target_benefits":[{"benefit":"","evidence_level":"bekannt/plausibel|indirekt belegt|direkt belegt|unklar","evidence":"","source_ids":[]}],
      "proposed_mechanism":"",
      "target_effect_evidence_status":"direkt gut untersucht|direkt begrenzt untersucht|nur indirekt untersucht|nicht ausreichend untersucht|nicht untersucht|widerlegt",
      "what_is_known":"",
      "what_is_not_known":"",
      "what_has_been_disproven":"",
      "comparability_with_reference":"gleichwertig belegt|teilweise vergleichbar|möglicherweise vergleichbar|nicht ausreichend vergleichbar|nicht vergleichbar|nicht beurteilbar",
      "practical_advantages":[],
      "practical_disadvantages":[],
      "safety_considerations":"",
      "cost_and_access":"",
      "source_ids":[]
    }],
    "best_supported_low_cost_options":[],
    "promising_but_understudied_options":[],
    "options_with_useful_other_properties_but_unproven_target_protection":[],
    "overall_assessment":""
  },
  "formulation_and_components":{\n    "product_name":"",\n    "jurisdiction":"",\n    "official_composition_sources":[],\n    "disclosure_assessment":"",\n    "active_components":[{"name":"","role":"","amount":"","source_ids":[]}],\n    "adjuvants":[{"name":"","role":"","amount":"","known_safety_findings":"","source_ids":[]}],\n    "carriers_delivery_systems":[{"name":"","role":"","amount":"","known_safety_findings":"","source_ids":[]}],\n    "excipients":[{"name":"","category":"Konservierungsstoff|Stabilisator|Puffer/Salz|Zucker/Polyol|Tensid/Emulgator|Lösungsmittel|Sonstiges","role":"","amount":"","known_safety_findings":"","source_ids":[]}],\n    "manufacturing_residuals":[{"name":"","origin":"","reported_level":"","disclosure_location":"","known_safety_findings":"","source_ids":[]}],\n    "container_closure_materials":[{"material":"","contact_part":"","relevance":"","known_safety_findings":"","source_ids":[]}],\n    "formulation_or_process_changes":[{"date_or_version":"","change":"","possible_safety_relevance":"","source_ids":[]}],\n    "adverse_event_attribution":[{"event":"","possible_component":"","evidence_level":"keine Evidenz|theoretisch|Signal|plausibel|gut belegt","reasoning":"","alternative_causes":"","source_ids":[]}],\n    "missing_or_unclear_component_information":[]\n  },\n  "scores":{\n    "study_design":0,"sample":0,"measurement":0,"statistics":0,"transparency":0,"reproducibility":0,"internal_validity":0,"external_validity":0,"robustness":0,"conclusion_credibility":0\n  },\n  "red_flags":[{"rank":1,"title":"","severity":"gering|relevant|erheblich|kritisch","category":"","status":"Fakt|Interpretation|Plausible Schwachstelle|Offene Frage|Nicht beurteilbar","evidence":"","impact":"","what_would_resolve_it":""}],\n  "manipulation_indicators":[{"rank":1,"indicator":"","area":"Studiendesign|Datenerhebung|Datenbereinigung|Statistik|Endpunkte|Berichterstattung|Finanzierung|Sponsor|Autoren|Publikation|Patent/Markt|Leitlinie/Grenzwert|Andere","type":"Interessenkonflikt|Sponsoreneinfluss|Selektive Auswertung|Outcome-Switching|p-Hacking-Indiz|Subgruppen-Fishing|Protokollabweichung|Ausschlussentscheidung|Statistische Auffälligkeit|Zahleninkonsistenz|Spin|Datenauffälligkeit|Patent-/Marktindiz|Grenzwert-/Definitionsindiz|Sonstiges","evidence_level":"Hinweis|Indiz|starkes Indiz|belegt","intent_assessment":"nicht beurteilbar|möglich|wahrscheinlich|belegt","evidence":"","possible_mechanism":"","impact_on_result":"","counterevidence_or_benign_explanation":"","source_ids":[]}],\n  "strengths":[{"title":"","evidence":"","importance":""}],\n  "bias_matrix":[{"bias":"Selection Bias","assessment":"nicht erkennbar|möglich|wahrscheinlich|deutlich erkennbar|nicht beurteilbar","reason":"","impact":""}],\n  "forensic_checks":{\n    "preregistration":{"found":false,"registry":"","registration_id":"","registered_before_start":null,"discrepancies":[{"field":"","registered":"","published":"","assessment":""}]},\n    "outcome_switching":[],"sample_size_changes":[],"analysis_plan_changes":[],"internal_inconsistencies":[],\n    "numerical_checks":[{"item":"","reported":"","recalculated":"","assessment":""}],\n    "corrections_retractions":[{"type":"","date":"","description":"","source_id":""}],\n    "author_sponsor_checks":{"funding":"","sponsor_role":"","conflicts":[],"data_access":"","analysis_independence":"","assessment":""}\n  },\n  "statistical_review":{"methods_appropriate":"","power":"","multiple_testing":"","effect_sizes":"","absolute_vs_relative_effects":"","confidence_intervals":"","missing_data":"","dropouts":"","itt_vs_per_protocol":"","subgroups":"","sensitivity_analyses":"","clinical_or_practical_relevance":""},\n  "alternative_explanations":[{"explanation":"","plausibility":"niedrig|mittel|hoch","study_rules_it_out":false,"needed_evidence":""}],\n  "replication_and_context":{"replications":[],"contradictory_evidence":[],"systematic_reviews":[],"overall_context":""},\n  "claims_audit":[{"claim":"","evidence":"","support":"vollständig gedeckt|überwiegend gedeckt|teilweise gedeckt|schwach gedeckt|nicht gedeckt|widerspricht Daten","comment":""}],\n  "what_the_study_does_not_show":[],\n  "missing_information":[],\n  "next_best_study":{"design":"","population":"","sample":"","endpoints":"","duration":"","why":""},\n  "sources":[{"id":"S1","type":"Primärpublikation|Historische Primärquelle|Register|Protokoll|Supplement|Fachinformation/SmPC|Packungsbeilage|Zulassungsbericht|Regulator|Leitlinie|Patent|Amtliche Statistik|Herstellungsinformation|Sicherheitsdatenblatt|Chemikalienregister|Historische Industriequelle|Militärhistorische Primärquelle|Berufskohorte|Expositionsstudie|Real-World-Studie|Photobiologie/Labor|Pharmakovigilanz|Korrektur|Retraktion|Replikation|Review|Meta-Analyse|Andere","title":"","url":"","date":"","supports":""}],\n  "limitations_of_this_review":[]\n}\n\nQUALITÄTSSICHERUNG VOR AUSGABE\n- Jede starke Behauptung auf konkrete Quelle zurückführen.\n- Bei historischen Vergleichen Definitionen und Messmethoden zeitgerecht vergleichen.\n- Nicht aus fehlender früherer Diagnose ableiten, dass das Problem nicht existierte; nicht aus heutiger Diagnose rückwirkend Krankheit unterstellen.\n- Zeige explizit, was über Morbidität/Mortalität und Gesundheit der Bevölkerung VOR der Intervention bekannt ist.\n- Prüfe, ob breite Nutzung/Empfehlung der Intervention der starken Outcome-Evidenz vorausging.\n- Prüfe Vorgänger und direkten Zusatznutzen; 'neuer' bedeutet nicht automatisch 'besser'.\n- Prüfe zeitliche Beziehung zwischen Patentabläufen und Nachfolgeprodukten, ohne Absicht zu erfinden.\n- Bei Grenzwertänderungen zeige alte/neue Definition, Evidenzbasis, neu klassifizierte Population, absoluten Nutzen und mögliche Schäden.\n- Nenne Interessenkonflikte von Leitlinien-/Grenzwertgremien, wenn dokumentiert.\n- Trenne statistische Signifikanz von klinischer Relevanz und relative von absoluten Effekten.\n- Erfasse relevante Interessenkonflikte, Sponsor-, Patent-, Markt- und Grenzwertindizien zusätzlich in manipulation_indicators.\n- Bei Arzneimitteln/Impfstoffen alle auffindbaren Produktkomponenten inklusive dokumentierter Rückstände/Kontaktmaterialien erfassen.\n- Erstelle für relevante Bestandteile eine Stoffbiografie mit früheren medizinischen, industriellen, Reinigungs-/Desinfektions-, landwirtschaftlichen und ggf. militärischen/chemischen Kriegführungs-Verwendungen.\n- Prüfe vor jeder historischen Toxizitätsanalogie die exakte chemische Identität sowie Dosis, Form, Route und Expositionsdauer.\n- Unterstelle Hilfs-/Trägerstoffen nicht pauschal mehr Nebenwirkungen als dem Wirkstoff; bewerte jeden Bestandteil anhand Evidenz.\n- Gib bei Wirksamkeit IMMER den direkt untersuchten Zeitraum an und markiere Extrapolationen über diesen Zeitraum hinaus.\n- Trenne Wirkung nach Einzelanwendung von Wirkung bei wiederholter/regelmäßiger Anwendung und von langfristigen Krankheitsendpunkten.\n- Prüfe natürliche Selbstschutz-/Anpassungsmechanismen, ihre Größenordnung und Grenzen; 'weniger akuter Schaden' darf nicht automatisch als 'kein Langzeitrisiko' interpretiert werden.\n- Bei hoch exponierten Berufsgruppen prüfe Populationsdaten und Healthy-Worker-/Selektions-/Survivor-Effekte statt Anekdoten als Beweis zu verwenden.\n- Bei günstigen Alternativen/Hausmitteln gilt: keine Studie = Evidenzlücke, nicht automatisch Unwirksamkeit. Zeige bekannte andere Vorteile separat von der unbewiesenen Zielwirkung.\n- Trenne ausdrücklich: bekannt/plausibel, indirekt belegt, direkt belegt, nicht untersucht und widerlegt.\n- Prüfe das JSON auf syntaktische Gültigkeit und gib danach nur den einen json-Codeblock aus.`;

  promptOutput.value=prompt;
  $('#promptBox').hidden=false;
  promptOutput.scrollTop=0;
}

$('#generatePromptBtn').addEventListener('click',buildPrompt);
$('#clearPromptBtn').addEventListener('click',()=>{queryInput.value='';$('#focusInput').value='';promptOutput.value='';$('#promptBox').hidden=true;});
$('#copyPromptBtn').addEventListener('click', async () => {
  const text = promptOutput.value;
  if (!text) return;
  const btn = $('#copyPromptBtn');
  const label = $('#copyPromptLabel');
  const status = $('#copyStatus');
  let copied = false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      copied = true;
    }
  } catch (_) {}
  if (!copied) {
    try {
      promptOutput.focus();
      promptOutput.select();
      promptOutput.setSelectionRange(0, text.length);
      copied = document.execCommand('copy');
      promptOutput.setSelectionRange(0, 0);
      promptOutput.blur();
    } catch (_) {}
  }
  if (copied) {
    label.textContent = 'Kopiert ✓';
    status.textContent = 'Prompt wurde in die Zwischenablage kopiert.';
    btn.classList.add('primary');
    btn.classList.remove('secondary');
    setTimeout(() => {
      label.textContent = 'Prompt kopieren';
      status.textContent = '';
      btn.classList.remove('primary');
      btn.classList.add('secondary');
    }, 1800);
  } else {
    status.textContent = 'Kopieren wurde vom Browser blockiert. Prompt markieren und manuell kopieren.';
  }
});
$('#toJsonBtn').addEventListener('click',()=>goStep(2));

function cleanJson(text){
  let t=text.trim();
  t=t.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
  const first=t.indexOf('{'), last=t.lastIndexOf('}');
  if(first>0 || last<t.length-1){ if(first>=0&&last>first)t=t.slice(first,last+1); }
  return t;
}
function parseJson(show=true){
  try{
    const data=JSON.parse(cleanJson(jsonInput.value));
    if(!data || typeof data!=='object') throw new Error('Kein JSON-Objekt');
    if(show){jsonStatus.className='status ok';jsonStatus.textContent='JSON ist syntaktisch gültig. Bericht kann erzeugt werden.';}
    return data;
  }catch(e){
    if(show){jsonStatus.className='status error';jsonStatus.textContent='JSON-Fehler: '+e.message;}
    return null;
  }
}
$('#validateBtn').addEventListener('click',()=>parseJson(true));
$('#renderBtn').addEventListener('click',()=>{const d=parseJson(true);if(!d)return;currentData=d;renderReport(d);goStep(3);});
$('#jsonFileInput').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;jsonInput.value=await f.text();parseJson(true);e.target.value='';});

function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function arr(v){return Array.isArray(v)?v:[];}

const FIELD_LABELS={
  research_question:'Forschungsfrage', hypothesis:'Hypothese', population:'Untersuchte Personengruppe / Population', sample_size:'Teilnehmerzahl / Stichprobengröße',
  intervention_or_exposure:'Untersuchte Behandlung oder Einwirkung', control:'Vergleichs- / Kontrollgruppe', primary_endpoints:'Vorab wichtigste Zielgrößen', secondary_endpoints:'Weitere Zielgrößen', follow_up:'Beobachtungsdauer / Nachbeobachtung', main_results:'Hauptergebnisse',
  methods_appropriate:'Eignung der statistischen Methoden', power:'Aussagekraft durch ausreichende Teilnehmerzahl', multiple_testing:'Viele gleichzeitige statistische Tests', effect_sizes:'Größe des beobachteten Effekts', absolute_vs_relative_effects:'Absolute gegenüber relativen Effekten', confidence_intervals:'Unsicherheitsbereiche / Konfidenzintervalle', missing_data:'Fehlende Daten', dropouts:'Studienabbrüche', itt_vs_per_protocol:'Auswertung aller zugeteilten Teilnehmer gegenüber nur protokolltreuen Teilnehmern', subgroups:'Untergruppenanalysen', sensitivity_analyses:'Robustheits- / Sensitivitätsanalysen', clinical_or_practical_relevance:'Klinische / praktische Bedeutung',
  funding:'Finanzierung', sponsor_role:'Rolle des Geldgebers / Sponsors', conflicts:'Interessenkonflikte', data_access:'Zugriff auf die Rohdaten', analysis_independence:'Unabhängigkeit der Auswertung', assessment:'Gesamtbewertung',
  design:'Empfohlenes Studiendesign', sample:'Empfohlene Teilnehmerzahl / Stichprobe', endpoints:'Zu messende Zielgrößen', duration:'Dauer', why:'Warum diese Untersuchung wichtig wäre',
  intervention_or_measure:'Intervention / Maßnahme', application_or_dose_pattern:'Anwendungs- / Dosierungsmuster', onset_of_effect:'Wirkungseintritt', time_to_peak_effect:'Zeit bis zur maximalen Wirkung', duration_after_single_use:'Dauer nach einmaliger Anwendung', reapplication_or_redosing_recommendation:'Empfohlenes Wiederholungsintervall', recommendation_evidence_basis:'Evidenzbasis der Wiederholungsempfehlung', effect_restoration_after_reapplication:'Wiederherstellung der Wirkung nach Wiederholung', real_world_adherence_and_application:'Tatsächliche Anwendung im Alltag', controlled_vs_real_world_difference:'Unterschied Studie ↔ Alltag', continuous_or_repeated_use_evidence:'Evidenz bei wiederholter Anwendung', long_term_outcome_evidence:'Langzeit-Evidenz', bottom_line_duration:'Kurzfazit zur belegten Wirkungsdauer', baseline_protection_summary:'Körpereigener Basisschutz', can_self_protection_be_built:'Kann Selbstschutz aufgebaut werden?', intermittent_vs_chronic_exposure:'Unregelmäßige intensive vs. regelmäßige chronische Exposition', individual_variation:'Individuelle Unterschiede', anecdote_vs_population_evidence:'Anekdoten gegenüber Populationsdaten', comparison_with_product_intervention:'Vergleich mit Produktintervention', overall_assessment:'Gesamtbewertung', target_effect_evidence_status:'Stand der direkten Wirksamkeitsforschung', what_is_known:'Was bekannt ist', what_is_not_known:'Was nicht untersucht / unbekannt ist', what_has_been_disproven:'Was tatsächlich widerlegt wurde', comparability_with_reference:'Vergleichbarkeit mit Referenz', cost_and_access:'Kosten & Verfügbarkeit',
    full_text_reviewed:'Volltext geprüft', registry_reviewed:'Studienregister geprüft', study_type:'Studienart', subject:'Untersuchungsgegenstand', analysis_date:'Analysedatum', identifier:'Kennnummer / DOI / PMID', journal:'Fachzeitschrift', year:'Jahr', authors:'Autorinnen und Autoren', title:'Titel'
};
const VALUE_LABELS={
  'Selection Bias':'Auswahlverzerrung', 'Publication Bias':'Publikationsverzerrung', 'Reporting Bias':'Berichtsverzerrung', 'Attrition Bias':'Verzerrung durch Studienabbrüche', 'Recall Bias':'Erinnerungsverzerrung', 'Detection Bias':'Verzerrung bei der Erfassung von Ergebnissen', 'Performance Bias':'Verzerrung durch unterschiedliche Behandlung/Betreuung', 'Confirmation Bias':'Bestätigungsneigung', 'Observer Bias':'Beobachterverzerrung', 'Sponsorship Bias':'Verzerrung durch Sponsoreneinfluss', 'Confounding':'Verzerrung durch Störfaktoren', 'Survivorship Bias':'Überlebendenverzerrung',
  'Outcome Switching':'Nachträglicher Wechsel der Zielgrößen', 'Outcome-Switching':'Nachträglicher Wechsel der Zielgrößen', 'Medical Writing':'Vom Auftraggeber unterstützte Manuskripterstellung', 'Ghostwriting':'Nicht transparent genannte Mitautorenschaft / Textbeiträge',
  'Head-to-Head':'Direkter Vergleich', 'Evergreening':'Patentverlängerungs-/Nachfolgeprodukt-Strategie', 'Patent Cliff':'Patentablauf mit drohendem Umsatzverlust', 'Patent-Cliff':'Patentablauf mit drohendem Umsatzverlust', 'Disease Mongering':'Ausweitung einer Krankheitsdefinition / Krankheitsvermarktung',
  'Run-in':'Vorlaufphase', 'Rescue Medication':'Bedarfs-/Notfallmedikation', 'Delivery':'Trägersystem', 'Extractables':'herauslösbare Stoffe', 'Leachables':'in das Produkt übergehende Stoffe', 'Endpoint':'Zielgröße', 'Endpoints':'Zielgrößen', 'Outcome':'Ergebnis / Endpunkt', 'Outcomes':'Ergebnisse / Endpunkte'
};
const TERM_HELP={
  bias:'Bias bedeutet systematische Verzerrung: Ein Ergebnis kann dadurch in eine bestimmte Richtung verschoben werden, auch ohne bewusste Manipulation.',
  prereg:'Präregistrierung bedeutet, dass Hypothesen, Zielgrößen und Auswertungsplan möglichst vor Beginn der Studie festgehalten werden. Abweichungen danach können wichtig sein.',
  outcome:'Outcome-Switching bedeutet, dass ursprünglich geplante Zielgrößen später geändert, ersetzt oder anders gewichtet werden. Das kann Ergebnisse günstiger erscheinen lassen.',
  redflag:'Warnsignale sind Auffälligkeiten, die eine genauere Prüfung rechtfertigen. Sie sind nicht automatisch ein Beweis für Fehler oder Manipulation.',
  confounder:'Störfaktoren (Confounder) sind andere Einflüsse, die einen beobachteten Zusammenhang erklären oder verstärken können.',
  replication:'Replikationen sind Wiederholungsstudien durch dieselben oder unabhängige Forschungsgruppen. Sie zeigen, ob ein Ergebnis unter ähnlichen Bedingungen erneut auftritt.',
  meta:'Eine Meta-Analyse fasst Ergebnisse mehrerer Studien statistisch zusammen. Ihre Aussagekraft hängt stark von der Qualität und Vergleichbarkeit der eingeschlossenen Studien ab.',
  validity:'Interne Validität beschreibt, wie zuverlässig die Studie den Effekt innerhalb der untersuchten Gruppe misst. Externe Validität beschreibt, wie gut sich das Ergebnis auf andere Menschen oder Situationen übertragen lässt.',
  robustness:'Robustheit bedeutet, ob das Ergebnis auch bei vernünftigen anderen Auswertungsentscheidungen ähnlich bestehen bleibt.',
  nnt:'NNT (Number Needed to Treat) bedeutet: Wie viele Menschen müssen behandelt werden, damit im Mittel bei einer Person ein gewünschtes Ereignis zusätzlich verhindert oder erreicht wird.',
  nnh:'NNH (Number Needed to Harm) bedeutet: Wie viele Menschen müssen behandelt oder exponiert werden, bis im Mittel bei einer Person zusätzlich ein Schaden auftritt.',
  surrogate:'Ein Surrogatendpunkt ist ein Ersatzmesswert, z. B. Blutdruck oder Laborwert, statt eines direkt für Patienten wichtigen Ergebnisses wie Herzinfarkt, Lebensqualität oder Sterblichkeit.',
  evergreening:'Evergreening bezeichnet Strategien, mit denen Schutzrechte oder Marktpositionen durch neue Formulierungen, Kombinationen, Anwendungen oder Nachfolgeprodukte verlängert werden können. Das ist nicht automatisch missbräuchlich.',
  patentcliff:'Patent-Cliff bezeichnet den Zeitpunkt, an dem ein wichtiges Patent ausläuft und Generika oder Wettbewerber den Umsatz des bisherigen Produkts stark verringern können.',
  adjuvant:'Adjuvanzien sind Zusatzstoffe, die bei manchen Impfstoffen die Immunantwort verstärken sollen. Ihre Wirkung und Sicherheit müssen komponentenbezogen bewertet werden.',
  delivery:'Träger- oder Träger-/Transportsysteme (Delivery-Systeme) bringen einen Wirkstoff an den gewünschten Ort oder schützen ihn auf dem Weg dorthin, z. B. Lipid-Nanopartikel.',
  retraction:'Eine Retraktion ist die formelle Zurückziehung einer wissenschaftlichen Veröffentlichung. Gründe können schwere Fehler, unzuverlässige Daten oder wissenschaftliches Fehlverhalten sein.',
  review:'Ein systematischer Review ist eine nach vorher festgelegten Regeln durchgeführte Gesamtschau der verfügbaren Studien.',
  confidence:'Ein Konfidenzintervall ist ein Unsicherheitsbereich um einen geschätzten Effekt. Breite Intervalle bedeuten meist größere Unsicherheit.',
  pvalue:'Ein p-Wert beschreibt, wie ungewöhnlich die beobachteten Daten unter einer bestimmten statistischen Nullannahme wären. Er beweist weder, dass eine Hypothese wahr ist, noch wie groß oder wichtig ein Effekt ist.',
  itt:'Intention-to-Treat bedeutet, dass Teilnehmende in der ursprünglich zugeteilten Gruppe ausgewertet werden. Das erhält meist die Vorteile der Randomisierung.',
  perprotocol:'Per-Protocol wertet nur Personen aus, die das Studienprotokoll ausreichend eingehalten haben. Dadurch kann die Vergleichbarkeit der Gruppen verloren gehen.',
  duration:'Wirkungsdauer bedeutet hier nicht nur, wie lange ein Messwert verändert bleibt. Entscheidend ist, für welchen Zeitraum ein konkreter Schutz oder Nutzen direkt untersucht und bestätigt wurde.',
  selfprotection:'Körpereigener Selbstschutz kann angeboren oder erworben sein. Er kann bestimmte kurzfristige Schäden mindern, ohne automatisch vor allen langfristigen Folgen zu schützen.',
  healthyworker:'Der Healthy-Worker-Effekt bedeutet, dass langjährig Beschäftigte oft gesünder oder belastbarer sein können als die Allgemeinbevölkerung. Dadurch können Berufsgruppenvergleiche zu günstig wirken.',
  adherence:'Alltagsanwendung unterscheidet sich oft von Studienbedingungen: Menge, Häufigkeit, Wiederholung und korrekte Anwendung beeinflussen die tatsächlich erreichbare Wirkung.'
};
const BIAS_HELP={
  'Selection Bias':'Die Auswahl der Teilnehmenden oder Gruppen kann dazu führen, dass die verglichenen Gruppen von Anfang an nicht wirklich vergleichbar sind.',
  'Publication Bias':'Studien mit positiven oder auffälligen Ergebnissen werden eher veröffentlicht; negative oder unauffällige Ergebnisse können dadurch fehlen.',
  'Reporting Bias':'Nicht alle gemessenen Ergebnisse werden gleich vollständig berichtet; günstige Resultate können stärker hervorgehoben werden.',
  'Attrition Bias':'Wenn viele Teilnehmende ausfallen – besonders unterschiedlich zwischen Gruppen – kann das Endergebnis verzerrt werden.',
  'Recall Bias':'Erinnerungen sind ungenau. Gruppen können sich unterschiedlich gut oder unterschiedlich motiviert an frühere Ereignisse erinnern.',
  'Detection Bias':'Ergebnisse können unterschiedlich gründlich gesucht, gemessen oder diagnostiziert werden, je nachdem zu welcher Gruppe jemand gehört.',
  'Performance Bias':'Gruppen können neben der eigentlichen Intervention unterschiedlich betreut, behandelt oder beobachtet werden.',
  'Confirmation Bias':'Menschen neigen dazu, Informationen stärker zu beachten, die ihre Erwartungen bestätigen.',
  'Observer Bias':'Erwartungen der Untersuchenden können Messung, Bewertung oder Interpretation beeinflussen.',
  'Sponsorship Bias':'Finanzierung oder Einfluss eines Sponsors kann Fragestellung, Vergleich, Auswertung oder Darstellung systematisch beeinflussen.',
  'Confounding':'Ein dritter Faktor kann den beobachteten Zusammenhang teilweise oder vollständig erklären.',
  'Survivorship Bias':'Es werden vor allem die Fälle betrachtet, die bis zum betrachteten Zeitpunkt sichtbar oder erhalten geblieben sind; fehlende Fälle können das Bild verändern.'
};
const QUALITY_HELP={
  study_design:'Passt der Aufbau der Studie zur Forschungsfrage, z. B. Vergleichsgruppe, Randomisierung und Beobachtungsdauer?',
  sample:'Ist die Teilnehmerzahl groß und passend genug, und bildet sie die relevante Zielgruppe sinnvoll ab?',
  measurement:'Wurden zuverlässige, geeignete und möglichst objektive Messmethoden verwendet?',
  statistics:'Sind statistische Verfahren, Annahmen und Berechnungen für die Daten geeignet?',
  transparency:'Sind Vorgehen, Änderungen, Finanzierung, Daten und Entscheidungen nachvollziehbar offengelegt?',
  reproducibility:'Könnten andere Forschende die Auswertung mit verfügbaren Daten, Methoden und Code nachvollziehen oder wiederholen?',
  internal_validity:'Wie sicher ist, dass der gemessene Effekt innerhalb dieser Studie tatsächlich durch den untersuchten Faktor erklärt wird?',
  external_validity:'Wie gut lässt sich das Ergebnis auf andere Menschen, Orte, Zeiten oder Alltagssituationen übertragen?',
  robustness:'Bleibt das Ergebnis bei vernünftigen alternativen Auswertungen und Annahmen ähnlich bestehen?',
  conclusion_credibility:'Wie gut werden die Schlussfolgerungen tatsächlich von den erhobenen Daten getragen?'
};
function biasHelp(name){return BIAS_HELP[String(name||'')]||'';}
function qualityHelp(key){return QUALITY_HELP[key]||'';}
function displayLabel(v){const s=String(v??'');return VALUE_LABELS[s]||s;}
function fieldLabel(k){return FIELD_LABELS[k]||k.replaceAll('_',' ');}
function termHelp(key){return TERM_HELP[key]?`<p class="term-help">${esc(TERM_HELP[key])}</p>`:'';}
function localizedBiasName(name){return VALUE_LABELS[String(name||'')]||String(name||'Verzerrungsrisiko');}
function textList(items){if(!arr(items).length)return '<p class="small-muted">Keine Angaben.</p>';return '<ul>'+items.map(x=>'<li>'+esc(typeof x==='string'?x:(x.title||x.description||JSON.stringify(x)))+'</li>').join('')+'</ul>';}
function scoreCards(scores={}){const map=[['Studiendesign','study_design'],['Stichprobe','sample'],['Messmethodik','measurement'],['Statistik','statistics'],['Transparenz','transparency'],['Reproduzierbarkeit','reproducibility'],['Interne Aussagezuverlässigkeit','internal_validity'],['Übertragbarkeit auf andere Situationen','external_validity'],['Robustheit / Stabilität','robustness'],['Glaubwürdigkeit der Schlussfolgerungen','conclusion_credibility']];return '<div class="cards">'+map.map(([l,k])=>{const v=Number(scores[k]);return `<div class="metric"><div class="label">${esc(l)}</div><div class="metric-help">${esc(qualityHelp(k))}</div><div class="value">${Number.isFinite(v)?Math.max(0,Math.min(10,v)).toFixed(1):'–'}<small>/10</small></div></div>`}).join('')+'</div>';}
function table(headers,rows){if(!rows.length)return '<p class="small-muted">Keine Angaben.</p>';return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;}
function objectRows(obj){return Object.entries(obj||{}).filter(([,v])=>v!==''&&v!==null&&v!==undefined&&(!Array.isArray(v)||v.length)).map(([k,v])=>`<tr><td>${esc(fieldLabel(k))}</td><td>${esc(Array.isArray(v)?v.map(displayLabel).join('; '):typeof v==='object'?JSON.stringify(v):displayLabel(v))}</td></tr>`);}
function sourceHtml(sources){if(!arr(sources).length)return '<p class="small-muted">Keine Quellen im JSON angegeben.</p>';return '<div class="source-list">'+sources.map(s=>`<div class="source"><strong>${esc(s.id||'')} ${esc(s.title||'')}</strong><div class="small-muted">${esc(s.type||'')} ${s.date?'· '+esc(s.date):''}</div>${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a>`:''}${s.supports?`<div class="small-muted">Belegt: ${esc(s.supports)}</div>`:''}</div>`).join('')+'</div>';}


function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function scoreAverage(scores={}){const vals=Object.values(scores).map(Number).filter(Number.isFinite).map(v=>clamp(v,0,10));return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;}
function manipulationSummary(items){
  const weights={'hinweis':25,'indiz':50,'starkes indiz':75,'belegt':100};
  const vals=arr(items).map(x=>weights[String(x.evidence_level||'').toLowerCase()]||0).filter(v=>v>0);
  const index=vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):0;
  const strong=arr(items).filter(x=>['starkes indiz','belegt'].includes(String(x.evidence_level||'').toLowerCase())).length;
  const label=index>=85?'sehr hoch':index>=65?'hoch':index>=45?'deutlich':index>=25?'moderat':'niedrig';
  return {index,strong,count:arr(items).length,label};
}
function biasValue(a){const s=String(a||'').toLowerCase();if(s.includes('deutlich'))return 90;if(s.includes('wahrscheinlich'))return 70;if(s.includes('möglich')||s.includes('moeglich'))return 45;if(s.includes('nicht erkennbar'))return 10;return 25;}
function qualityBars(scores={}){const map=[['Studiendesign','study_design'],['Stichprobe','sample'],['Messmethodik','measurement'],['Statistik','statistics'],['Transparenz','transparency'],['Reproduzierbarkeit','reproducibility'],['Interne Aussagezuverlässigkeit','internal_validity'],['Übertragbarkeit','external_validity'],['Robustheit','robustness'],['Schlussfolgerungen','conclusion_credibility']];return '<div class="profile-bars">'+map.map(([l,k])=>{const n=Number(scores[k]);const v=Number.isFinite(n)?clamp(n,0,10):0;return `<div class="profile-row"><div class="profile-label"><span>${esc(l)}<small class="profile-help">${esc(qualityHelp(k))}</small></span><b>${Number.isFinite(n)?v.toFixed(1):'–'}/10</b></div><div class="profile-track"><i style="width:${v*10}%"></i></div></div>`}).join('')+'</div>';}
function biasProfile(items){if(!arr(items).length)return '<p class="small-muted">Keine Bewertungen zu möglichen Verzerrungen angegeben.</p>';return '<div class="profile-bars">'+arr(items).map(x=>{const v=biasValue(x.assessment);const help=biasHelp(x.bias);return `<div class="profile-row"><div class="profile-label"><span>${esc(localizedBiasName(x.bias))}${help?`<small class="profile-help">${esc(help)}</small>`:''}</span><b>${esc(displayLabel(x.assessment||'–'))}</b></div><div class="profile-track risk"><i style="width:${v}%"></i></div></div>`}).join('')+'</div>';}
function miniFlag(items,kind){if(!arr(items).length)return '<p class="small-muted">Keine Angaben.</p>';return '<div class="mini-list">'+arr(items).slice(0,3).map((x,i)=>{const title=kind==='manip'?(x.indicator||x.type||'Indikator'):(x.title||'Warnsignal');const tag=kind==='manip'?(x.evidence_level||'Hinweis'):(x.severity||'');const text=kind==='manip'?(x.impact_on_result||x.evidence||''):(x.impact||x.evidence||'');return `<div class="mini-item"><span class="mini-rank">${i+1}</span><div><b>${esc(title)}</b><small>${esc(tag)}${text?' · '+esc(text):''}</small></div></div>`}).join('')+'</div>';}
function registrationLabel(reg={}){if(!reg.found)return 'nicht gefunden';if(reg.registered_before_start===true)return 'vorab registriert';if(reg.registered_before_start===false)return 'nachträglich';return 'gefunden';}

function componentRows(items, fields){return arr(items).map(x=>`<tr>${fields.map(f=>`<td>${esc(x?.[f]??'')}</td>`).join('')}</tr>`);}
function formulationHtml(form){
  if(!form || !Object.keys(form).length) return '<p class="small-muted">Keine Komponenten-/Formulierungsdaten im JSON angegeben.</p>';
  const parts=[];
  if(form.disclosure_assessment) parts.push(`<p><b>Deklarations-/Transparenzbewertung:</b> ${esc(form.disclosure_assessment)}</p>`);
  if(arr(form.official_composition_sources).length) parts.push(`<p><b>Offizielle Zusammensetzungsquellen:</b> ${esc(form.official_composition_sources.join('; '))}</p>`);
  parts.push('<h3>Wirkstoff / aktive Komponenten</h3>'+table(['Name','Rolle','Menge','Quellen'],componentRows(form.active_components,['name','role','amount']).map((r,i)=>r.replace('</tr>',`<td>${esc(arr(form.active_components)[i]?.source_ids?.join(', ')||'')}</td></tr>`))));
  parts.push('<h3>Adjuvanzien</h3>'+termHelp('adjuvant')+table(['Name','Rolle','Menge','Sicherheitsbefunde','Quellen'],componentRows(form.adjuvants,['name','role','amount','known_safety_findings']).map((r,i)=>r.replace('</tr>',`<td>${esc(arr(form.adjuvants)[i]?.source_ids?.join(', ')||'')}</td></tr>`))));
  parts.push('<h3>Träger- / Transportsysteme</h3>'+termHelp('delivery')+table(['Name','Rolle','Menge','Sicherheitsbefunde','Quellen'],componentRows(form.carriers_delivery_systems,['name','role','amount','known_safety_findings']).map((r,i)=>r.replace('</tr>',`<td>${esc(arr(form.carriers_delivery_systems)[i]?.source_ids?.join(', ')||'')}</td></tr>`))));
  parts.push('<h3>Hilfsstoffe</h3>'+table(['Name','Kategorie','Rolle','Menge','Sicherheitsbefunde'],componentRows(form.excipients,['name','category','role','amount','known_safety_findings'])));
  parts.push('<h3>Herstellungsbedingte Rückstände / Spuren</h3>'+table(['Name','Ursprung','Berichtete Menge','Wo deklariert','Sicherheitsbefunde'],componentRows(form.manufacturing_residuals,['name','origin','reported_level','disclosure_location','known_safety_findings'])));
  parts.push('<h3>Behälter- / Verschlussmaterialien</h3>'+table(['Material','Kontaktteil','Relevanz','Sicherheitsbefunde'],componentRows(form.container_closure_materials,['material','contact_part','relevance','known_safety_findings'])));
  parts.push('<h3>Formulierungs-/Prozessänderungen</h3>'+table(['Version/Datum','Änderung','Mögliche Sicherheitsrelevanz'],componentRows(form.formulation_or_process_changes,['date_or_version','change','possible_safety_relevance'])));
  parts.push('<h3>Zuordnung möglicher Nebenwirkungen</h3>'+table(['Ereignis','Mögliche Komponente','Evidenz','Begründung','Alternative Ursachen'],componentRows(form.adverse_event_attribution,['event','possible_component','evidence_level','reasoning','alternative_causes'])));
  if(arr(form.missing_or_unclear_component_information).length) parts.push('<h3>Fehlende / unklare Komponentenangaben</h3>'+textList(form.missing_or_unclear_component_information));
  return parts.join('');
}

function substanceHistoryHtml(sh){
  if(!sh || !Object.keys(sh).length) return '<p class="small-muted">Keine Stoffbiografie im JSON angegeben.</p>';
  const parts=[];
  if(sh.summary) parts.push(`<p><b>Zusammenfassung:</b> ${esc(sh.summary)}</p>`);
  if(arr(sh.notable_findings).length) parts.push('<h3>Auffällige historische Befunde</h3>'+textList(sh.notable_findings));
  arr(sh.substances).forEach((x,i)=>{
    const ci=x.chemical_identity||{}, dr=x.dose_route_context||{}, tr=x.transition_to_current_use||{};
    parts.push(`<div class="substance-card"><h3>${i+1}. ${esc(x.name||'Unbenannter Stoff')} <span class="pill">${esc(x.current_role||'')}</span></h3>`);
    parts.push(table(['Aspekt','Befund'],[
      ['Exakte chemische Spezies',ci.exact_species],['CAS',ci.cas_number],['Form',ci.form],['Beziehung zur historischen Substanz',ci.identity_relationship],['Abzugrenzen von',arr(ci.distinguish_from).join('; ')],
      ['Entwicklungsursprung',x.development_origin],['Früheste dokumentierte Nutzung',x.earliest_documented_use],['Übergang zur heutigen Nutzung', [tr.period,tr.reason,tr.evidence_or_discovery_path].filter(Boolean).join(' · ')],
      ['Heutige Dosis/Exposition',dr.current_dose_or_exposure],['Heutiger Expositionsweg',dr.current_route],['Vergleichbarkeit historisch/heute',dr.historical_vs_current_comparability],['Dosis-Wirkungs-Evidenz',dr.dose_response_evidence],['Kumulative Exposition',dr.cumulative_exposure],
      ['Relevanz für heutige Sicherheit',x.relevance_to_current_safety],['Kommunikationskontext',x.communication_context]
    ].filter(r=>r[1])));
    const uses=arr(x.prior_uses).map(u=>`<tr><td>${esc(u.period)}</td><td>${esc(u.sector)}</td><td>${esc(u.use)}</td><td>${esc(u.form_concentration)}</td><td>${esc(u.dose_or_exposure)}</td><td>${esc(u.route)}</td><td>${esc(u.known_hazards)}</td><td>${esc(arr(u.source_ids).join(', '))}</td></tr>`);
    parts.push('<h3>Frühere / parallele Verwendungen</h3>'+table(['Zeit','Bereich','Verwendung','Form/Konzentration','Dosis/Exposition','Route','Bekannte Gefahren','Quellen'],uses));
    const hz=arr(x.hazard_classification_history).map(h=>`<tr><td>${esc(h.period)}</td><td>${esc(h.classification_or_warning)}</td><td>${esc(h.context)}</td><td>${esc(arr(h.source_ids).join(', '))}</td></tr>`);
    if(hz.length) parts.push('<h3>Gefahrstoff-/Warnhistorie</h3>'+table(['Zeit','Klassifikation/Warnung','Kontext','Quellen'],hz));
    parts.push('</div>');
  });
  if(arr(sh.misleading_equivalences_to_avoid).length) parts.push('<h3>Unzulässige / irreführende Gleichsetzungen vermeiden</h3>'+textList(sh.misleading_equivalences_to_avoid));
  if(sh.overall_assessment) parts.push(`<p><b>Gesamtbewertung:</b> ${esc(sh.overall_assessment)}</p>`);
  return parts.join('');
}

function historicalHtml(h){
  if(!h || !Object.keys(h).length) return '<p class="small-muted">Keine historischen Kontextdaten im JSON angegeben.</p>';
  const pre=h.pre_intervention_population||{};
  const timeline=arr(h.timeline).map(x=>`<tr><td>${esc(x.year_or_period)}</td><td>${esc(x.category)}</td><td>${esc(x.event)}</td><td>${esc(x.significance)}</td><td>${esc(arr(x.source_ids).join(', '))}</td></tr>`);
  return `${table(['Historische Frage','Befund'],[
    ['Problem erstmals dokumentiert',h.problem_first_documented],['Ursprung & ursprüngliche Begründung',h.intervention_origin_and_original_rationale],['Evidenz vor breiter Nutzung',h.evidence_available_before_widespread_use],['Breite Nutzung/Empfehlung',h.first_widespread_use_or_recommendation],['Erste starke Outcome-Evidenz',h.first_strong_outcome_evidence],['Zeitlücke Nutzung ↔ Evidenz',h.gap_between_use_and_strong_evidence],['Gesamtbewertung',h.problem_origin_assessment],['Begründung',h.assessment_reasoning]
  ].filter(([,v])=>v).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`))}
  <h3>Population vor der Intervention</h3>${table(['Merkmal','Historischer Befund'],objectRows(pre))}
  <h3>Historische Zeitleiste</h3>${table(['Zeitraum','Kategorie','Ereignis','Bedeutung','Quellen'],timeline)}
  <h3>Gleichzeitige Veränderungen / Störfaktoren</h3>${termHelp('confounder')}${textList(h.secular_changes_and_confounders)}`;
}
function predecessorsHtml(p){
  if(!p || !Object.keys(p).length) return '<p class="small-muted">Keine Vorgänger-/Patentdaten im JSON angegeben.</p>';
  const pred=arr(p.predecessors).map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.type)}</td><td>${esc(x.same_or_similar_indication)}</td><td>${esc(x.evidence_vs_current)}</td><td>${esc(x.safety_vs_current)}</td><td>${esc(x.patent_or_generic_status)}</td><td>${esc(x.why_replaced_or_declined)}</td></tr>`);
  const patents=arr(p.patent_timeline).map(x=>`<tr><td>${esc(x.product_or_substance)}</td><td>${esc(x.patent_or_exclusivity)}</td><td>${esc(x.filing_or_start)}</td><td>${esc(x.expiry)}</td><td>${esc(x.related_successor)}</td></tr>`);
  const evergreen=arr(p.evergreening_indicators).map(x=>`<tr><td>${esc(x.indicator)}</td><td>${esc(x.evidence_level)}</td><td>${esc(x.evidence)}</td><td>${esc(x.benign_explanation)}</td></tr>`);
  return `${termHelp('patentcliff')}${termHelp('evergreening')}<p><b>Direkter Vergleich mit Vorgängern:</b> ${esc(p.head_to_head_evidence||'–')}</p><p><b>Zusatznutzen:</b> ${esc(p.incremental_clinical_benefit_over_predecessor||'–')}</p><p><b>Bezug zum Patentablauf:</b> ${esc(p.patent_cliff_relationship||'–')}</p><p><b>Markt-/Leitlinienübergang:</b> ${esc(p.market_or_guideline_transition||'–')}</p><p><b>Kommerzielle Anreize:</b> ${esc(p.commercial_incentive_assessment||'–')}</p><h3>Vorgänger</h3>${table(['Name','Typ','Indikation/Funktion','Wirksamkeit vs. aktuell','Sicherheit vs. aktuell','Patent/Generika','Warum ersetzt?'],pred)}<h3>Patent-/Exklusivitätszeitleiste</h3>${table(['Produkt/Stoff','Patent/Exklusivität','Beginn','Ablauf','Nachfolger'],patents)}<h3>Mögliche Indizien für Schutzrechts-/Nachfolgeprodukt-Strategien</h3>${termHelp('evergreening')}${table(['Indikator','Stärke','Evidenz','Alternative Erklärung'],evergreen)}`;
}
function thresholdsHtml(t){
  if(!t || !Object.keys(t).length) return '<p class="small-muted">Keine Diagnose-/Grenzwertdaten im JSON angegeben.</p>';
  const rows=arr(t.timeline).map(x=>`<tr><td>${esc(x.year)}</td><td>${esc(x.organization)}</td><td>${esc(x.old_definition_or_threshold)}</td><td>${esc(x.new_definition_or_threshold)}</td><td>${esc(x.evidence_basis)}</td><td>${esc(x.estimated_population_impact)}</td><td>${esc(x.panel_conflicts)}</td></tr>`);
  return `${termHelp('nnt')}${termHelp('nnh')}${termHelp('surrogate')}<p><b>Erkrankung/Risikofaktor:</b> ${esc(t.condition_or_risk_factor||'–')} · <b>Richtung:</b> ${esc(t.direction_of_change||'–')}</p><p><b>Neu klassifizierte Menschen:</b> ${esc(t.people_newly_classified||'–')}</p><p><b>Patientenrelevante Ergebnisse in neu erfasster Gruppe:</b> ${esc(t.hard_outcome_benefit_in_newly_included_group||'–')}</p><p><b>Absoluter Nutzen / NNT:</b> ${esc(t.absolute_benefit_and_nnt||'–')}</p><p><b>Überdiagnose/Übertherapie / NNH:</b> ${esc(t.harms_overdiagnosis_overtreatment_nnh||'–')}</p><p><b>Ersatzmesswert statt patientenrelevantem Ergebnis (Surrogatproblem):</b> ${esc(t.surrogate_vs_hard_endpoint_issue||'–')}</p><p><b>Bewertung möglicher Ausweitung von Krankheitsdefinitionen / Medikalisierung:</b> ${esc(t.medicalization_or_disease_mongering_assessment||'–')}</p><h3>Schwellenwert-/Definitionszeitleiste</h3>${table(['Jahr','Organisation','Alt','Neu','Evidenzbasis','Populationseffekt','Interessenkonflikte'],rows)}<h3>Argumente für die Änderung</h3>${textList(t.arguments_supporting_change)}<h3>Argumente gegen die Änderung</h3>${textList(t.arguments_against_change)}<p><b>Gesamtbewertung:</b> ${esc(t.overall_assessment||'–')}</p>`;
}


function effectDurationHtml(eff){
  if(!eff || !Object.keys(eff).length) return '<p class="small-muted">Keine Angaben zur Wirkungsdauer im JSON vorhanden.</p>';
  const windows=arr(eff.evidence_windows).map(x=>`<tr><td>${esc(x.outcome)}</td><td>${esc(x.time_window)}</td><td>${esc(x.application_or_dose)}</td><td>${esc(x.setting)}</td><td>${esc(x.effect)}</td><td>${esc(x.certainty)}</td><td>${x.directly_demonstrated_over_this_window===true?'Ja':x.directly_demonstrated_over_this_window===false?'Nein':'Unklar'}</td><td>${esc(arr(x.source_ids).join(', '))}</td></tr>`);
  const reducers=arr(eff.factors_reducing_or_changing_effect).map(x=>`<tr><td>${esc(x.factor)}</td><td>${esc(x.mechanism_or_reason)}</td><td>${esc(x.measured_effect)}</td><td>${esc(x.time_course)}</td><td>${esc(arr(x.source_ids).join(', '))}</td></tr>`);
  return `${termHelp('duration')}${termHelp('adherence')}
  ${table(['Frage','Befund'],[
    ['Intervention / Maßnahme',eff.intervention_or_measure],
    ['Anwendungs-/Dosierungsmuster',eff.application_or_dose_pattern],
    ['Wirkungseintritt',eff.onset_of_effect],
    ['Zeit bis maximale Wirkung',eff.time_to_peak_effect],
    ['Belegte Dauer nach einmaliger Anwendung',eff.duration_after_single_use],
    ['Empfohlenes Wiederholungsintervall',eff.reapplication_or_redosing_recommendation],
    ['Woher stammt diese Empfehlung?',eff.recommendation_evidence_basis],
    ['Wird die Wirkung nach Wiederholung wiederhergestellt?',eff.effect_restoration_after_reapplication],
    ['Alltagsanwendung / Einhaltung',eff.real_world_adherence_and_application],
    ['Studienbedingungen vs. Alltag',eff.controlled_vs_real_world_difference],
    ['Evidenz bei regelmäßiger Wiederholung',eff.continuous_or_repeated_use_evidence],
    ['Langzeit-Evidenz zu relevanten Endpunkten',eff.long_term_outcome_evidence],
    ['Kurzfazit: über welchen Zeitraum ist die Wirkung belegt?',eff.bottom_line_duration]
  ].filter(([,v])=>v).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${esc(displayLabel(v))}</td></tr>`))}
  <h3>Welche Wirkung ist über welchen Zeitraum direkt belegt?</h3>${table(['Endpunkt','Zeitfenster','Anwendung/Dosis','Umgebung','Effekt','Sicherheit','Direkt für diesen Zeitraum belegt?','Quellen'],windows)}
  <h3>Was kann die Wirkung verkürzen oder verändern?</h3>${table(['Faktor','Warum relevant?','Gemessener Einfluss','Zeitverlauf','Quellen'],reducers)}
  <h3>Zeitliche Lücken / Extrapolationen</h3>${textList(eff.extrapolations_or_time_gaps)}`;
}

function selfProtectionHtml(sel){
  if(!sel || !Object.keys(sel).length) return '<p class="small-muted">Keine Angaben zu körpereigenem Selbstschutz oder Anpassung im JSON vorhanden.</p>';
  const innate=arr(sel.innate_mechanisms).map(x=>`<tr><td>${esc(x.mechanism)}</td><td>${esc(x.who_or_when_relevant)}</td><td>${esc(x.magnitude)}</td><td>${esc(x.protects_against)}</td><td>${esc(x.limits)}</td><td>${esc(arr(x.source_ids).join(', '))}</td></tr>`);
  const acquired=arr(sel.acquired_adaptations).map(x=>`<tr><td>${esc(x.adaptation)}</td><td>${esc(x.time_to_develop)}</td><td>${esc(x.magnitude)}</td><td>${esc(x.duration_or_fade)}</td><td>${esc(x.protects_against)}</td><td>${esc(x.does_not_establish_protection_against)}</td><td>${esc(x.costs_or_risks)}</td><td>${esc(arr(x.source_ids).join(', '))}</td></tr>`);
  const behavior=arr(sel.behavioral_non_product_protection).map(x=>`<tr><td>${esc(x.measure)}</td><td>${esc(x.effectiveness)}</td><td>${esc(x.time_context)}</td><td>${esc(x.advantages)}</td><td>${esc(x.limitations)}</td><td>${esc(arr(x.source_ids).join(', '))}</td></tr>`);
  const occ=arr(sel.occupational_or_high_exposure_populations).map(x=>`<tr><td>${esc(x.population)}</td><td>${esc(x.exposure_pattern)}</td><td>${esc(x.observed_short_term_outcomes)}</td><td>${esc(x.observed_long_term_outcomes)}</td><td>${esc(x.comparison_group)}</td><td>${esc(x.important_adjustments)}</td><td>${esc(x.healthy_worker_selection_survivor_bias)}</td><td>${esc(x.interpretation)}</td><td>${esc(arr(x.source_ids).join(', '))}</td></tr>`);
  return `${termHelp('selfprotection')}${termHelp('healthyworker')}
  <p><b>Körpereigener Basisschutz:</b> ${esc(sel.baseline_protection_summary||'–')}</p>
  <p><b>Kann Selbstschutz aufgebaut werden?</b> ${esc(sel.can_self_protection_be_built||'–')}</p>
  <p><b>Unregelmäßige intensive vs. regelmäßige chronische Exposition:</b> ${esc(sel.intermittent_vs_chronic_exposure||'–')}</p>
  <p><b>Individuelle Unterschiede:</b> ${esc(sel.individual_variation||'–')}</p>
  <h3>Angeborene Schutzmechanismen</h3>${table(['Mechanismus','Für wen/wann relevant','Größenordnung','Schützt wogegen?','Grenzen','Quellen'],innate)}
  <h3>Erworbene Anpassungen</h3>${table(['Anpassung','Aufbauzeit','Größenordnung','Wie lange vorhanden?','Schützt wogegen?','Beweist keinen Schutz wogegen?','Mögliche Kosten/Risiken','Quellen'],acquired)}
  <h3>Nicht-produktbezogene Schutzmaßnahmen</h3>${table(['Maßnahme','Wirksamkeit','Zeitbezug','Vorteile','Grenzen','Quellen'],behavior)}
  <h3>Berufsgruppen / dauerhaft hoch exponierte Populationen</h3>${table(['Population','Expositionsmuster','Kurzfristige Ergebnisse','Langfristige Ergebnisse','Vergleichsgruppe','Wichtige Korrekturen','Healthy-Worker/Selektion','Interpretation','Quellen'],occ)}
  <p><b>Anekdoten gegenüber Populationsdaten:</b> ${esc(sel.anecdote_vs_population_evidence||'–')}</p>
  <p><b>Vergleich mit Produktintervention:</b> ${esc(sel.comparison_with_product_intervention||'–')}</p>
  <p><b>Gesamtbewertung:</b> ${esc(sel.overall_assessment||'–')}</p>`;
}

function lowCostAlternativesHtml(a){
  if(!a || !Object.keys(a).length) return '<p class="small-muted">Keine Angaben zu günstigen Alternativen oder Hausmitteln im JSON vorhanden.</p>';
  const rows=arr(a.alternatives).map(x=>{
    const benefits=arr(x.known_or_documented_non_target_benefits).map(b=>`${esc(b.benefit||'–')} <span class="pill">${esc(displayLabel(b.evidence_level||'unklar'))}</span>${b.evidence?`<div class="bias-help">${esc(b.evidence)}</div>`:''}`).join('<br>')||'–';
    return `<tr><td><strong>${esc(x.name||'–')}</strong><div class="bias-help">${esc(displayLabel(x.category||''))}</div></td><td>${benefits}</td><td>${esc(x.proposed_mechanism||'–')}</td><td><span class="pill">${esc(displayLabel(x.target_effect_evidence_status||'–'))}</span><div class="bias-help">${esc(x.what_is_known||'')}</div></td><td>${esc(x.what_is_not_known||'–')}</td><td>${esc(x.what_has_been_disproven||'–')}</td><td>${esc(displayLabel(x.comparability_with_reference||'–'))}</td><td>${esc(arr(x.practical_advantages).join('; ')||'–')}</td><td>${esc(arr(x.practical_disadvantages).join('; ')||'–')}</td><td>${esc(x.safety_considerations||'–')}</td><td>${esc(x.cost_and_access||'–')}</td></tr>`;
  });
  return `<div class="term-help"><strong>Wichtig zur Einordnung von Hausmitteln und wenig erforschten Alternativen</strong><span>Wenn eine Alternative kaum untersucht wurde, bedeutet das nicht automatisch, dass sie unwirksam ist. Die App trennt deshalb bekannte andere Eigenschaften und Vorteile von der Frage, ob der gewünschte Schutz direkt belegt wurde. Ebenso wird eine nicht belegte Wirkung nicht als bewiesen dargestellt.</span></div>
  <p><b>Zusammenfassung:</b> ${esc(a.summary||'–')}</p>
  <h3>Vergleich der günstigen Alternativen</h3>${table(['Alternative','Bekannte andere Vorteile','Plausibler Mechanismus','Direkte Zielwirkung','Nicht untersucht / offen','Tatsächlich widerlegt','Vergleichbarkeit','Praktische Vorteile','Nachteile','Sicherheit','Kosten / Zugang'],rows)}
  <h3>Am besten gestützte günstige Optionen</h3>${textList(a.best_supported_low_cost_options)}
  <h3>Interessant, aber unzureichend untersucht</h3>${textList(a.promising_but_understudied_options)}
  <h3>Nützliche andere Eigenschaften, aber Zielschutz nicht belegt</h3>${textList(a.options_with_useful_other_properties_but_unproven_target_protection)}
  <p><b>Gesamtbewertung:</b> ${esc(a.overall_assessment||'–')}</p>`;
}

function renderReport(d){
  const m=d.meta||{}, e=d.executive_summary||{}, sp=d.study_profile||{}, fc=d.forensic_checks||{}, sr=d.statistical_review||{}, form=d.formulation_and_components||{}, sh=d.substance_history||{}, hist=d.historical_context||{}, pred=d.predecessors_patents_market||{}, thresh=d.threshold_definition_history||{}, eff=d.effect_duration_and_real_world||{}, sel=d.endogenous_protection_and_adaptation||{}, low=d.cost_effective_alternatives||{};
  const flags=arr(d.red_flags).sort((a,b)=>(a.rank||99)-(b.rank||99));
  const manip=arr(d.manipulation_indicators).sort((a,b)=>(a.rank||99)-(b.rank||99));
  const strengths=arr(d.strengths);
  const bias=arr(d.bias_matrix);
  const claims=arr(d.claims_audit);
  const alt=arr(d.alternative_explanations);
  const reg=fc.preregistration||{};
  const sponsor=fc.author_sponsor_checks||{};
  const rep=d.replication_and_context||{};
  const next=d.next_best_study||{};
  const title=m.title||m.subject||'Forensische Studienanalyse';
  const meta=[m.authors?.length?m.authors.join(', '):'',m.journal||'',m.year||'',m.identifier||''].filter(Boolean).join(' · ');
  const flagHtml=flags.length?`<div class="redflags">${flags.map(f=>`<div class="flag" data-severity="${esc((f.severity||'').toLowerCase())}"><div class="severity">#${esc(f.rank||'')} ${esc(f.severity||'')}</div><div><strong>${esc(f.title||'')}</strong><p>${esc(f.evidence||'')}</p>${f.impact?`<p><b>Einfluss:</b> ${esc(f.impact)}</p>`:''}${f.status?`<span class="pill">${esc(f.status)}</span>`:''}</div></div>`).join('')}</div>`:'<p class="small-muted">Keine Warnsignale angegeben.</p>';
  const manipHtml=manip.length?`<div class="redflags">${manip.map(x=>`<div class="flag" data-severity="${esc((x.evidence_level==='belegt'||x.evidence_level==='starkes Indiz')?'kritisch':x.evidence_level==='Indiz'?'erheblich':'relevant')}"><div class="severity">#${esc(x.rank||'')} ${esc(x.evidence_level||'Indiz')}</div><div><strong>${esc(x.indicator||x.type||'Manipulationsindikator')}</strong><p>${esc(x.evidence||'')}</p><p><b>Bereich:</b> ${esc(x.area||'–')} · <b>Typ:</b> ${esc(x.type||'–')} · <b>Absicht:</b> ${esc(x.intent_assessment||'nicht beurteilbar')}</p>${x.possible_mechanism?`<p><b>Möglicher Mechanismus:</b> ${esc(x.possible_mechanism)}</p>`:''}${x.impact_on_result?`<p><b>Möglicher Einfluss:</b> ${esc(x.impact_on_result)}</p>`:''}${x.counterevidence_or_benign_explanation?`<p><b>Gegenargument / harmlose Erklärung:</b> ${esc(x.counterevidence_or_benign_explanation)}</p>`:''}${arr(x.source_ids).length?`<span class="pill">Quellen: ${esc(x.source_ids.join(', '))}</span>`:''}</div></div>`).join('')}</div>`:'<p class="small-muted">Keine Manipulations- oder Beeinflussungsindikatoren angegeben.</p>';
  const biasRows=bias.map(x=>`<tr><td><strong>${esc(localizedBiasName(x.bias))}</strong>${biasHelp(x.bias)?`<div class="bias-help">${esc(biasHelp(x.bias))}</div>`:''}</td><td><span class="pill">${esc(displayLabel(x.assessment))}</span></td><td>${esc(x.reason)}</td><td>${esc(x.impact)}</td></tr>`);
  const claimRows=claims.map(x=>`<tr><td>${esc(x.claim)}</td><td>${esc(x.evidence)}</td><td>${esc(x.support)}</td><td>${esc(x.comment)}</td></tr>`);
  const discrepancyRows=arr(reg.discrepancies).map(x=>`<tr><td>${esc(x.field)}</td><td>${esc(x.registered)}</td><td>${esc(x.published)}</td><td>${esc(x.assessment)}</td></tr>`);
  const numRows=arr(fc.numerical_checks).map(x=>`<tr><td>${esc(x.item)}</td><td>${esc(x.reported)}</td><td>${esc(x.recalculated)}</td><td>${esc(x.assessment)}</td></tr>`);
  const altRows=alt.map(x=>`<tr><td>${esc(x.explanation)}</td><td>${esc(x.plausibility)}</td><td>${x.study_rules_it_out?'Ja':'Nein'}</td><td>${esc(x.needed_evidence)}</td></tr>`);
  const mainResults=arr(sp.main_results).map(x=>typeof x==='string'?x:(x.result||x.title||JSON.stringify(x)));
  const manipSum=manipulationSummary(manip);
  const avgScore=scoreAverage(d.scores);
  const criticalFlags=flags.filter(x=>String(x.severity||'').toLowerCase()==='kritisch').length;
  const dashboard=`
    <section class="forensic-dashboard">
      <div class="dashboard-head">
        <div><span class="dashboard-eyebrow">Forensische Übersicht</span><h2>Schnellüberblick</h2><p>Warnsignale, mögliche Verzerrungen und methodische Qualität auf einen Blick.</p></div>
        <div class="index-card">
          <div class="gauge" style="--gauge:${manipSum.index*3.6}deg"><div><strong>${manipSum.index}</strong><span>/100</span></div></div>
          <div><small>Stärke der Manipulations-/Beeinflussungsindizien</small><b>${esc(manipSum.label)}</b><p>${manipSum.count} Indikatoren · ${manipSum.strong} stark/belegt</p></div>
        </div>
      </div>
      <p class="index-note">Der Index bildet nur Stärke und Dichte der dokumentierten Indizien ab. Er ist keine Betrugswahrscheinlichkeit und kein Nachweis von Absicht.</p>
      <div class="dashboard-kpis">
        <div class="dash-kpi"><span>Kritische Warnsignale</span><strong>${criticalFlags}</strong><small>von ${flags.length} insgesamt</small></div>
        <div class="dash-kpi"><span>Starke/belegte Indizien</span><strong>${manipSum.strong}</strong><small>von ${manipSum.count} Indikatoren</small></div>
        <div class="dash-kpi"><span>Durchschnittliche Qualitätsbewertung</span><strong>${avgScore===null?'–':avgScore.toFixed(1)}</strong><small>${avgScore===null?'keine Bewertungen':'von 10'}</small></div>
        <div class="dash-kpi"><span>Präregistrierung</span><strong class="kpi-text">${esc(registrationLabel(reg))}</strong><small>${esc(reg.registration_id||'keine ID')}</small></div>
        <div class="dash-kpi"><span>Volltext geprüft</span><strong class="kpi-text">${m.full_text_reviewed?'Ja':'Nein'}</strong><small>${m.full_text_reviewed?'Volltextbasis':'Einschränkung beachten'}</small></div>
        <div class="dash-kpi"><span>Quellen</span><strong>${arr(d.sources).length}</strong><small>im Analyse-JSON</small></div>
        <div class="dash-kpi"><span>Zeit vor Intervention</span><strong class="kpi-text">${esc(hist.problem_origin_assessment||'–')}</strong><small>${esc(hist.gap_between_use_and_strong_evidence||'historischer Kontext')}</small></div>
        <div class="dash-kpi"><span>Belegte Wirkungsdauer</span><strong class="kpi-text">${esc(eff.bottom_line_duration||eff.duration_after_single_use||'–')}</strong><small>${esc(eff.reapplication_or_redosing_recommendation||'Wiederholung: –')}</small></div>
        <div class="dash-kpi"><span>Körpereigener Selbstschutz</span><strong class="kpi-text">${esc(sel.can_self_protection_be_built||'–')}</strong><small>${esc(sel.overall_assessment||'Anpassung / Eigenmechanismen')}</small></div>
        <div class="dash-kpi"><span>Günstige Alternativen</span><strong>${arr(low.alternatives).length}</strong><small>${esc(low.summary||'bekannte Vorteile und Evidenzlücken getrennt')}</small></div>
        <div class="dash-kpi"><span>Vorgänger-Zusatznutzen</span><strong class="kpi-text">${esc(pred.incremental_clinical_benefit_over_predecessor||'–')}</strong><small>${esc(pred.patent_cliff_relationship||'Bezug zum Patentablauf: –')}</small></div>
        <div class="dash-kpi"><span>Grenzwert-Entwicklung</span><strong class="kpi-text">${esc(thresh.direction_of_change||'–')}</strong><small>${esc(thresh.people_newly_classified||'Populationseffekt: –')}</small></div>
        <div class="dash-kpi"><span>Stoffbiografie</span><strong>${arr(sh.substances).length}</strong><small>${esc(sh.overall_assessment||'historische Stoffverwendungen')}</small></div>
      </div>
      <div class="dashboard-grid">
        <div class="dashboard-card"><div class="dash-card-head"><h3>Mögliche Verzerrungen</h3><span>Risiko</span></div>${termHelp('bias')}${biasProfile(bias)}</div>
        <div class="dashboard-card"><div class="dash-card-head"><h3>Qualitätsprofil</h3><span>0–10</span></div>${qualityBars(d.scores)}</div>
      </div>
      <div class="dashboard-grid compact">
        <div class="dashboard-card"><div class="dash-card-head"><h3>Top Manipulationsindikatoren</h3><span>${manipSum.count}</span></div>${miniFlag(manip,'manip')}</div>
        <div class="dashboard-card"><div class="dash-card-head"><h3>Wichtigste Warnsignale</h3><span>${flags.length}</span></div>${miniFlag(flags,'flags')}</div>
      </div>
    </section>`;

  $('#report').innerHTML=`
    <header class="report-hero">
      <div class="kicker">Forensischer Evidenzbericht · Schema ${esc(d.schema_version||'')}</div>
      <h1>${esc(title)}</h1>
      <div class="meta">${esc(meta||sp.research_question||'')}</div>
      <div class="verdict-row">
        <div class="verdict-card"><span>Kernaussage</span><strong>${esc(e.one_sentence||'Keine Kurzbewertung angegeben.')}</strong></div>
        <div class="verdict-card"><span>Aussagekraft</span><strong>${esc(e.overall_evidence||'–')}</strong></div>
        <div class="verdict-card"><span>Meinungsänderung</span><strong>${esc(e.how_much_should_this_change_belief||'–')}</strong></div>
      </div>
    </header>
    <div class="report-body">
      ${dashboard}
      <section class="report-section"><h2>1. Kurzbewertung</h2><div class="cards">
        <div class="metric"><div class="label">Stärkster Punkt</div><div class="note">${esc(e.strongest_point||'–')}</div></div>
        <div class="metric"><div class="label">Schwerwiegendste Schwäche</div><div class="note">${esc(e.most_serious_weakness||'–')}</div></div>
        <div class="metric"><div class="label">Zentrale Unsicherheit</div><div class="note">${esc(e.key_uncertainty||'–')}</div></div>
      </div></section>
      <section class="report-section"><h2>2. Qualitätsprofil</h2>${termHelp('validity')}${termHelp('robustness')}${scoreCards(d.scores)}</section>
      <section class="report-section"><h2>3. Studienprofil</h2>${table(['Merkmal','Angabe'],objectRows(sp))}<h3>Hauptergebnisse</h3>${textList(mainResults)}</section>
      <section class="report-section"><h2>4. Historischer Ursprung des Problems & Zeit vor der Intervention</h2>${historicalHtml(hist)}</section>
      <section class="report-section"><h2>5. Wirkungsdauer & reale Anwendung im Zeitverlauf</h2>${effectDurationHtml(eff)}</section>
      <section class="report-section"><h2>6. Körpereigener Selbstschutz & Anpassung</h2>${selfProtectionHtml(sel)}</section>
      <section class="report-section"><h2>7. Günstige Alternativen, Hausmittel & Evidenzlücken</h2>${lowCostAlternativesHtml(low)}</section>
      <section class="report-section"><h2>8. Vorgänger, Patente & Marktwechsel</h2>${predecessorsHtml(pred)}</section>
      <section class="report-section"><h2>9. Diagnose-, Risiko- & Grenzwertgeschichte</h2>${thresholdsHtml(thresh)}</section>
      <section class="report-section"><h2>10. Stoffbiografie & frühere Verwendungen</h2>${substanceHistoryHtml(sh)}</section>
      <section class="report-section"><h2>11. Wichtigste Warnsignale</h2>${termHelp('redflag')}${flagHtml}</section>
      <section class="report-section"><h2>12. Manipulations- & Beeinflussungsindikatoren</h2><p class="small-muted">Hier werden mögliche Eingriffe oder Anreize zur Ergebnissteuerung ausdrücklich sichtbar gemacht. Ein Indiz ist nicht automatisch ein Nachweis vorsätzlicher Datenfälschung.</p>${manipHtml}</section>
      <section class="report-section"><h2>13. Methodische Stärken</h2>${strengths.length?'<div class="redflags">'+strengths.map(s=>`<div class="flag" data-severity="gering"><div class="severity">Stärke</div><div><strong>${esc(s.title)}</strong><p>${esc(s.evidence)}</p>${s.importance?`<p><b>Bedeutung:</b> ${esc(s.importance)}</p>`:''}</div></div>`).join('')+'</div>':'<p class="small-muted">Keine Angaben.</p>'}</section>
      <section class="report-section"><h2>14. Mögliche Verzerrungen (Bias)</h2>${termHelp('bias')}${table(['Art der Verzerrung','Bewertung','Begründung','Möglicher Einfluss'],biasRows)}</section>
      <section class="report-section"><h2>15. Vorab-Registrierung & nachträgliche Änderungen der Zielgrößen</h2>${termHelp('prereg')}${termHelp('outcome')}<p><b>Register gefunden:</b> ${reg.found?'Ja':'Nein / nicht angegeben'} · <b>ID:</b> ${esc(reg.registration_id||'–')} · <b>Vor Studienbeginn registriert:</b> ${reg.registered_before_start===true?'Ja':reg.registered_before_start===false?'Nein':'Nicht beurteilbar'}</p>${table(['Feld','Registriert','Publiziert','Bewertung'],discrepancyRows)}<h3>Nachträglicher Wechsel der Zielgrößen</h3>${textList(fc.outcome_switching)}<h3>Änderungen Stichprobengröße / Analyseplan</h3>${textList([...(arr(fc.sample_size_changes)),...(arr(fc.analysis_plan_changes))])}</section>
      <section class="report-section"><h2>16. Interne Widersprüche & Zahlenprüfung</h2><h3>Widersprüche</h3>${textList(fc.internal_inconsistencies)}<h3>Nachgerechnete Angaben</h3>${table(['Prüfung','Publiziert','Nachgerechnet','Bewertung'],numRows)}</section>
      <section class="report-section"><h2>17. Statistik</h2>${termHelp('pvalue')}${termHelp('confidence')}${termHelp('itt')}${termHelp('perprotocol')}${table(['Prüfbereich','Bewertung'],objectRows(sr))}</section>
      <section class="report-section"><h2>18. Produktzusammensetzung & Komponentenforensik</h2>${formulationHtml(form)}</section>
      <section class="report-section"><h2>19. Finanzierung & Interessenkonflikte</h2>${table(['Aspekt','Angabe'],objectRows(sponsor))}</section>
      <section class="report-section"><h2>20. Behauptungen gegen Evidenz</h2>${table(['Behauptung','Beleg','Deckung','Kommentar'],claimRows)}</section>
      <section class="report-section"><h2>21. Alternative Erklärungen</h2>${table(['Erklärung','Plausibilität','Von Studie ausgeschlossen?','Benötigte Evidenz'],altRows)}</section>
      <section class="report-section"><h2>22. Wiederholungsstudien & Gesamtkontext</h2>${termHelp('replication')}<p>${esc(rep.overall_context||'')}</p><h3>Wiederholungsstudien</h3>${textList(rep.replications)}<h3>Widersprechende Evidenz</h3>${textList(rep.contradictory_evidence)}<h3>Systematische Übersichtsarbeiten / Meta-Analysen</h3>${termHelp('review')}${termHelp('meta')}${textList(rep.systematic_reviews)}</section>
      <section class="report-section"><h2>23. Was die Studie ausdrücklich nicht zeigt</h2>${textList(d.what_the_study_does_not_show)}</section>
      <section class="report-section"><h2>24. Fehlende Informationen</h2>${textList(d.missing_information)}</section>
      <section class="report-section"><h2>25. Nächste entscheidende Untersuchung</h2>${table(['Merkmal','Empfehlung'],objectRows(next))}</section>
      <section class="report-section"><h2>26. Korrekturen / zurückgezogene Veröffentlichungen</h2>${termHelp('retraction')}${table(['Typ','Datum','Beschreibung','Quelle'],arr(fc.corrections_retractions).map(x=>`<tr><td>${esc(x.type)}</td><td>${esc(x.date)}</td><td>${esc(x.description)}</td><td>${esc(x.source_id)}</td></tr>`))}</section>
      <section class="report-section"><h2>27. Quellen</h2>${sourceHtml(d.sources)}</section>
      <section class="report-section"><h2>28. Grenzen dieser Analyse</h2>${textList(d.limitations_of_this_review)}</section>
      <p class="small-muted">Hinweis: Dieser Bericht strukturiert die von der verwendeten KI gelieferten Angaben. Er ersetzt keine eigene fachliche Prüfung der Primärquellen.</p>
    </div>`;
}

function download(name,content,type='application/json'){
  const blob=new Blob([content],{type}); const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function safeName(s){return (s||'analyse').toLowerCase().replace(/[^a-z0-9äöüß]+/gi,'-').replace(/^-|-$/g,'').slice(0,70)||'analyse';}
$('#exportJsonBtn').addEventListener('click',()=>{if(!currentData)return alert('Noch kein Bericht vorhanden.');download(safeName(currentData.meta?.title||currentData.meta?.subject)+'-forensik.json',JSON.stringify(currentData,null,2));});
$('#printBtn').addEventListener('click',()=>{if(!currentData)return alert('Noch kein Bericht vorhanden.');window.print();});
$('#newAnalysisBtn').addEventListener('click',()=>{currentData=null;jsonInput.value='';jsonStatus.className='status';jsonStatus.textContent='Noch kein JSON geprüft.';$('#report').innerHTML='<div class="empty-report no-print"><div class="empty-icon">⌕</div><h2>Noch kein Bericht</h2><p>Erzeuge zuerst einen Prompt und füge anschließend die JSON-Antwort der KI ein.</p></div>';goStep(1);});

const ARCHIVE_KEY='studien-forensik-archive-v1';
function readArchive(){try{return JSON.parse(localStorage.getItem(ARCHIVE_KEY)||'[]')}catch{return[]}}
function writeArchive(a){localStorage.setItem(ARCHIVE_KEY,JSON.stringify(a.slice(0,50)));}
$('#saveAnalysisBtn').addEventListener('click',()=>{if(!currentData)return alert('Noch kein Bericht vorhanden.');const a=readArchive();a.unshift({id:crypto.randomUUID?crypto.randomUUID():Date.now().toString(),saved:new Date().toISOString(),data:currentData});writeArchive(a);alert('Analyse lokal im Browser gespeichert.');});
function renderArchive(){const a=readArchive();const box=$('#archiveList');if(!a.length){box.innerHTML='<p class="small-muted">Noch keine Analysen gespeichert.</p>';return;}box.innerHTML=a.map(x=>{const d=x.data||{},t=d.meta?.title||d.meta?.subject||'Unbenannte Analyse';const v=d.executive_summary?.overall_evidence||'ohne Bewertung';return `<div class="archive-item" data-id="${esc(x.id)}"><div><h3>${esc(t)}</h3><p>${new Date(x.saved).toLocaleString('de-DE')} · Aussagekraft: ${esc(v)}</p></div><div class="archive-actions"><button type="button" class="btn secondary load-archive">Öffnen</button><button type="button" class="btn ghost export-archive">JSON</button><button type="button" class="btn danger delete-archive">Löschen</button></div></div>`}).join('');
  box.querySelectorAll('.archive-item').forEach(item=>{const id=item.dataset.id;item.querySelector('.load-archive').addEventListener('click',()=>{const x=readArchive().find(y=>y.id===id);if(!x)return;currentData=x.data;jsonInput.value=JSON.stringify(currentData,null,2);renderReport(currentData);goStep(3)});item.querySelector('.export-archive').addEventListener('click',()=>{const x=readArchive().find(y=>y.id===id);if(!x)return;download(safeName(x.data.meta?.title||x.data.meta?.subject)+'-forensik.json',JSON.stringify(x.data,null,2));});item.querySelector('.delete-archive').addEventListener('click',()=>{writeArchive(readArchive().filter(y=>y.id!==id));renderArchive();});});
}
$('#clearArchiveBtn').addEventListener('click',()=>{if(confirm('Wirklich alle lokal gespeicherten Analysen löschen?')){localStorage.removeItem(ARCHIVE_KEY);renderArchive();}});

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;$('#installBtn').hidden=false;});
$('#installBtn').addEventListener('click',async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$('#installBtn').hidden=true;});
if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
