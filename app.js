// Prix officiels du Tarif Bleu reglemente (TTC par kWh en jusqu'au 31 Juillet 2026)
let GRILLE_TARIFS_FIXES = {
    base: 0.1940,
    hp: 0.2065,
    hc: 0.1579
};
let TARIFS_TEMPO_KWH = {
    "BLEU": { hc: 0.1325, hp: 0.1612},
    "BLANC": { hc: 0.1499, hp: 0.1871},
    "ROUGE": { hc: 0.1575, hp: 0.7060}
};

let listeVoitures = [];
let couleurTempoDuJour = "BLEU"; 

async function init() {
    try {
        const reponse = await fetch('./voitures.json');
        listeVoitures = await reponse.json();
        remplirMarques();

        const resTempo = await fetch('https://www.api-couleur-tempo.fr/api/jourTempo/today');
        if (resTempo.ok) {
            const dataTempo = await resTempo.json();
            if (dataTempo.libCouleur) {
                couleurTempoDuJour = dataTempo.libCouleur.toUpperCase();
            }
        }

    } catch (erreur) {
        console.error("Erreur lors de l'initialisation du site :", erreur);
    }

    document.getElementById('select-marque').addEventListener('change', chargerModeles);
    document.getElementById('select-modele').addEventListener('change', calculer);
    document.getElementById('input-initial').addEventListener('input', calculer);
    document.getElementById('input-cible').addEventListener('input', calculer);
    document.getElementById('check-mode-precis').addEventListener('change', calculer);

    gererAffichageTempo();
    calculer();
    afficherGrilleTarifaire();
}

function remplirMarques() {
    const selectMarque = document.getElementById('select-marque');
    
    const marquesUniques = [...new Set(listeVoitures.map(v => v.marque))];

    marquesUniques.forEach(marque => {
        const option = document.createElement('option');
        option.value = marque;
        option.textContent = marque;
        selectMarque.appendChild(option);
    });
}

function chargerModeles() {
    const marqueSelectionnee = document.getElementById('select-marque').value;
    const selectModele = document.getElementById('select-modele');

    selectModele.innerHTML = '<option value="">-- Choisir le modèle --</option>';

    if (!marqueSelectionnee) {
        selectModele.disabled = true;
        calculer();
        return;
    }

    const modelesFiltres = listeVoitures.filter(v => v.marque === marqueSelectionnee);

    modelesFiltres.forEach(v => {
        const option = document.createElement('option');
        option.value = v.id;

        const affichageVariante = v.variant ? ` - ${v.variant}` : "";
        const affichageAnnee = v.annee ? ` (${v.annee})` : "";
        
        option.textContent = `${v.modele}${affichageVariante}${affichageAnnee} [${v.capaciteUtileKwh} kWh]`;
        selectModele.appendChild(option);
    });

    selectModele.disabled = false;
    calculer();
}

function chargerModelesNew() {
    const marqueSelectionnee = document.getElementById('select-marque').value;
    const selectModele = document.getElementById('select-modele');

    selectModele.innerHTML = '<option value="">-- Choisir le modèle --</option>';

    if (!marqueSelectionnee) {
        selectModele.disabled = true;
        return;
    }

    const modelesFiltres = listeVoitures.filter(v => v.marque === marqueSelectionnee);

    const modelesUniques = [...new Set(modelesFiltres.map(v => v.modele))];

    modelesUniques.forEach(modele => {
        console.log(modele);
        const option = document.createElement('option');
        option.value = modele.toLowerCase();
        option.textContent = modele;
        selectModele.appendChild(option);
    });

    selectModele.disabled = false;
    return;
}

function gererAffichageTempo() {
    const badge = document.getElementById('badge-tempo');
    badge.textContent = `Journée Tempo : ${couleurTempoDuJour}`;

    badge.style.display = "inline-block";

    if (couleurTempoDuJour === 'ROUGE') {
        badge.className = "mt-2 px-3 py-1 text-xs font-bold rounded-full bg-red-100 text-red-800";
    } else if (couleurTempoDuJour === 'BLANC') {
        badge.className = "mt-2 px-3 py-1 text-xs font-bold rounded-full bg-gray-200 text-gray-800";
    } else {
        badge.className = "mt-2 px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800";
    }
}

function calculer() {
    const voitureId = document.getElementById('select-modele').value;
    const initial = parseInt(document.getElementById('input-initial').value) || 0;
    const cible = parseInt(document.getElementById('input-cible').value) || 0;
    const modePrecis = document.getElementById('check-mode-precis').checked;

    const affichagePrixBase = document.getElementById('resultat-prix-base');
    const affichagePrixCreuses = document.getElementById('resultat-prix-creuses');
    const affichagePrixPleines = document.getElementById('resultat-prix-pleines');
    const affichagePrixTempoCreuses = document.getElementById('resultat-prix-tempo-creuses');
    const affichagePrixTempoPleines = document.getElementById('resultat-prix-tempo-pleines');
    const affichageKwh = document.getElementById('resultat-kwh');
    const affichageRendement = document.getElementById('rendement-voiture');

    if (!voitureId || initial >= cible || initial < 0 || cible > 100) {
        affichagePrixBase.textContent = "0.00";
        affichagePrixCreuses.textContent = "0.00";
        affichagePrixPleines.textContent = "0.00";
        affichagePrixTempoCreuses.textContent = "0.00";
        affichagePrixTempoPleines.textContent = "0.00";
        affichageKwh.textContent = "0.0";
        return;
    }

    const voiture = listeVoitures.find(v => v.id === voitureId);
    
    const deltaPourcentage = (cible - initial) / 100;
    const kwhTheoriques = voiture.capaciteUtileKwh * deltaPourcentage;

    const rendement = modePrecis ? voiture.rendementMoyen : 0.85;
    const kwhReels = kwhTheoriques / rendement;

    let prixKwhBase = GRILLE_TARIFS_FIXES.base;
    let prixKwhCreuses = GRILLE_TARIFS_FIXES.hc;
    let prixKwhPleines = GRILLE_TARIFS_FIXES.hp;
    let prixKwhTempoCreuses = TARIFS_TEMPO_KWH[couleurTempoDuJour]?.hc || TARIFS_TEMPO_KWH["BLEU"].hc;
    let prixKwhTempoPleines = TARIFS_TEMPO_KWH[couleurTempoDuJour]?.hp || TARIFS_TEMPO_KWH["BLEU"].hp;

    const coutTotalBase = kwhReels * prixKwhBase;
    const coutTotalCreuses = kwhReels * prixKwhCreuses;
    const coutTotalPleines = kwhReels * prixKwhPleines;
    const coutTotalTempoCreuses = kwhReels * prixKwhTempoCreuses;
    const coutTotaltempoPleines = kwhReels * prixKwhTempoPleines;

    affichagePrixBase.textContent = coutTotalBase.toFixed(2);
    affichagePrixCreuses.textContent = coutTotalCreuses.toFixed(2);
    affichagePrixPleines.textContent = coutTotalPleines.toFixed(2);
    affichagePrixTempoCreuses.textContent = coutTotalTempoCreuses.toFixed(2);
    affichagePrixTempoPleines.textContent = coutTotaltempoPleines.toFixed(2);
    affichageKwh.textContent = kwhReels.toFixed(1);
    affichageRendement.textContent = 100-(rendement*100);
}

function afficherGrilleTarifaire() {
    document.getElementById('tab-base').textContent = GRILLE_TARIFS_FIXES.base.toFixed(4);
    document.getElementById('tab-hc').textContent = GRILLE_TARIFS_FIXES.hc.toFixed(4);
    document.getElementById('tab-hp').textContent = GRILLE_TARIFS_FIXES.hp.toFixed(4);

    document.getElementById('tab-t-bleu-hc').textContent = TARIFS_TEMPO_KWH["BLEU"].hc.toFixed(4);
    document.getElementById('tab-t-bleu-hp').textContent = TARIFS_TEMPO_KWH["BLEU"].hp.toFixed(4);
    
    document.getElementById('tab-t-blanc-hc').textContent = TARIFS_TEMPO_KWH["BLANC"].hc.toFixed(4);
    document.getElementById('tab-t-blanc-hp').textContent = TARIFS_TEMPO_KWH["BLANC"].hp.toFixed(4);
    
    document.getElementById('tab-t-rouge-hc').textContent = TARIFS_TEMPO_KWH["ROUGE"].hc.toFixed(4);
    document.getElementById('tab-t-rouge-hp').textContent = TARIFS_TEMPO_KWH["ROUGE"].hp.toFixed(4);

    document.getElementById('row-tempo-bleu').className = "divide-y divide-gray-100";
    document.getElementById('row-tempo-blanc').className = "divide-y divide-gray-100";
    document.getElementById('row-tempo-rouge').className = "divide-y divide-gray-100";

    if (couleurTempoDuJour === 'ROUGE') {
        document.getElementById('row-tempo-rouge').className = "bg-red-50 font-bold text-red-900";
    } else if (couleurTempoDuJour === 'BLANC') {
        document.getElementById('row-tempo-blanc').className = "bg-gray-100 font-bold text-gray-900";
    } else {
        document.getElementById('row-tempo-bleu').className = "bg-blue-50 font-bold text-blue-900";
    }
}

window.addEventListener('DOMContentLoaded', init);