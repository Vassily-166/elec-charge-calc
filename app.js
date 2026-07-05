// Prix officiels du Tarif Bleu reglemente (TTC par kWh en jusqu'au 31 Juillet 2026)
let GRILLE_TARIFS_FIXES = {
    base: 0.1927,
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
    document.getElementById('select-tarif').addEventListener('change', gererAffichageTempo);
    document.getElementById('check-mode-precis').addEventListener('change', calculer);

    calculer();
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

function gererAffichageTempo() {
    console.log("Hello changement tarif");
    const typeTarif = document.getElementById('select-tarif').value;
    const badge = document.getElementById('badge-tempo');
    
    if (typeTarif === 'tempo') {
        badge.textContent = `Journée Tempo : ${couleurTempoDuJour}`;

        badge.style.display = "inline-block";

        if (couleurTempoDuJour === 'ROUGE') {
            badge.className = "mt-2 px-3 py-1 text-xs font-bold rounded-full bg-red-100 text-red-800";
        } else if (couleurTempoDuJour === 'BLANC') {
            badge.className = "mt-2 px-3 py-1 text-xs font-bold rounded-full bg-gray-200 text-gray-800";
        } else {
            badge.className = "mt-2 px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800";
        }
    } else {
        badge.style.display = "none";
    }
    calculer();
}

function calculer() {
    const voitureId = document.getElementById('select-modele').value;
    const initial = parseInt(document.getElementById('input-initial').value) || 0;
    const cible = parseInt(document.getElementById('input-cible').value) || 0;
    const typeTarif = document.getElementById('select-tarif').value;
    const modePrecis = document.getElementById('check-mode-precis').checked;

    const affichagePrix = document.getElementById('resultat-prix');
    const affichageKwh = document.getElementById('resultat-kwh');

    if (!voitureId || initial >= cible || initial < 0 || cible > 100) {
        affichagePrix.textContent = "0.00";
        affichageKwh.textContent = "0.0";
        return;
    }

    const voiture = listeVoitures.find(v => v.id === voitureId);
    
    const deltaPourcentage = (cible - initial) / 100;
    const kwhTheoriques = voiture.capaciteUtileKwh * deltaPourcentage;

    const rendement = modePrecis ? voiture.rendementMoyen : 0.85;
    const kwhReels = kwhTheoriques / rendement;

    let prixKwh = GRILLE_TARIFS_FIXES.base;

    if (typeTarif === 'hp') prixKwh = GRILLE_TARIFS_FIXES.hp;
    if (typeTarif === 'hc') prixKwh = GRILLE_TARIFS_FIXES.hc;
    if (typeTarif === 'tempo') {
        prixKwh = TARIFS_TEMPO_KWH[couleurTempoDuJour]?.hc || TARIFS_TEMPO_KWH["BLEU"].hc;
    }

    const coutTotal = kwhReels * prixKwh;

    affichagePrix.textContent = coutTotal.toFixed(2);
    affichageKwh.textContent = kwhReels.toFixed(1);
}

window.addEventListener('DOMContentLoaded', init);