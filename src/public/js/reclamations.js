// Complete premium Claims and Workflows state controller (Salesforce / ServiceNow level)
let currentData = null; // Stored detailed claim object for active tabs

window.getAuthHeaders = () => {
  return {
    'x-user-id': localStorage.getItem('userId') || '',
    'x-user-role': localStorage.getItem('userRole') || ''
  };
};

// Check Auth on page load
function checkAuth() {
  const userId = localStorage.getItem('userId');
  if (!userId) {
    window.location.href = '/login';
  } else {
    const nameSpan = document.getElementById('user-name');
    if (nameSpan) nameSpan.innerText = localStorage.getItem('userNom') || 'Utilisateur';
    const roleSpan = document.getElementById('user-role-badge');
    if (roleSpan) {
      const role = localStorage.getItem('userRole') || '';
      roleSpan.innerText = getRoleLabel(role);
    }
  }
}

function getRoleLabel(role) {
  const labels = {
    'admin': 'Administrateur CFAO',
    'call_center': 'Responsable SAV / Réception',
    'chef_atelier': 'Chef d\'Atelier',
    'conseiller_sav': 'Conseiller Technique SAV',
    'garantie': 'Responsable Garantie',
    'csi': 'Responsable Qualité & CSI',
    'direction': 'Directeur Général (Reporting)'
  };
  return labels[role] || role;
}

async function getReclamations() {
  try {
    const res = await fetch('/api/reclamations', { headers: window.getAuthHeaders() });
    if (!res.ok) throw new Error('Token ou session expire');
    return await res.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

// Global render
async function renderTable() {
  const tbody = document.querySelector('#reclamations-table tbody');
  if(!tbody) return;
  
  let reclamations = await getReclamations();
  if (!Array.isArray(reclamations)) {
    reclamations = [];
  }

  // Advanced search query
  const searchInput = document.getElementById('global-search');
  const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';

  // Advanced filters
  const filterStatut = document.getElementById('filter-statut');
  const selectedStatut = filterStatut ? filterStatut.value : 'tous';

  const filterGravity = document.getElementById('filter-gravity');
  const selectedGravity = filterGravity ? filterGravity.value : 'tous';

  const filterCategory = document.getElementById('filter-category');
  const selectedCategory = filterCategory ? filterCategory.value : 'tous';

  // Apply filters
  const filtered = reclamations.filter(r => {
    // Search
    const matchesSearch = !searchQuery || 
      r.numero.toLowerCase().includes(searchQuery) ||
      (r.client_nom && r.client_nom.toLowerCase().includes(searchQuery)) ||
      (r.plaque_immatriculation && r.plaque_immatriculation.toLowerCase().includes(searchQuery)) ||
      (r.vin && r.vin.toLowerCase().includes(searchQuery)) ||
      (r.motif && r.motif.toLowerCase().includes(searchQuery));

    // Statut
    const matchesStatut = selectedStatut === 'tous' || r.statut === selectedStatut;
    // Gravity
    const matchesGravity = selectedGravity === 'tous' || r.urgence === selectedGravity;
    // Category
    const matchesCategory = selectedCategory === 'tous' || r.categorie === selectedCategory;

    return matchesSearch && matchesStatut && matchesGravity && matchesCategory;
  });

  tbody.innerHTML = '';
  
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-gray-400">Aucune réclamation trouvée</td></tr>`;
    return;
  }

  filtered.forEach(r => {
    const tr = document.createElement('tr');
    tr.className = "border-b border-gray-100 hover:bg-gray-50/80 transition-all cursor-pointer";
    tr.onclick = (e) => {
      // Don't open if clicked button directly
      if (e.target.tagName !== 'BUTTON') {
        openDetails(r.id);
      }
    };

    // Urg badge color
    const urgMap = {
      'faible': 'bg-green-100 text-green-800',
      'moyen': 'bg-yellow-100 text-yellow-800',
      'urgent': 'bg-orange-100 text-orange-800',
      'critique': 'bg-red-100 text-red-800'
    };
    const urgColor = urgMap[r.urgence] || 'bg-gray-100 text-gray-800';

    // Status label
    const statLabels = {
      'nouveau': 'Nouveau',
      'en_cours': 'En cours d\'analyse',
      'affecte': 'Affecté',
      'en_traitement': 'En traitement',
      'en_attente': 'En attente client',
      'en_attente_fournisseur': 'En attente fournisseur',
      'resolu': 'Résolu',
      'cloture_technique': 'Clôturé Technique',
      'cloture': 'Clôturé (Archivé)'
    };
    const statMap = {
      'nouveau': 'bg-blue-100 text-blue-800',
      'en_cours': 'bg-purple-100 text-purple-800',
      'affecte': 'bg-indigo-100 text-indigo-800',
      'en_traitement': 'bg-yellow-100 text-yellow-800',
      'en_attente': 'bg-orange-100 text-amber-800',
      'en_attente_fournisseur': 'bg-pink-100 text-pink-800',
      'resolu': 'bg-green-100 text-green-800',
      'cloture_technique': 'bg-teal-100 text-teal-800',
      'cloture': 'bg-gray-100 text-gray-600'
    };
    const statColor = statMap[r.statut] || 'bg-gray-100 text-gray-800';

    tr.innerHTML = `
      <td class="font-mono font-bold text-blue-600 py-3.5 px-4">${r.numero}</td>
      <td class="font-medium text-gray-900 py-3.5 px-4">
        <div>${r.client_nom}</div>
        <div class="text-[10px] text-gray-400 font-normal">${r.client_telephone || ''}</div>
      </td>
      <td class="py-3.5 px-4">
        <span class="bg-gray-100 text-gray-800 px-2 py-1 rounded font-mono text-xs border border-gray-200">${r.plaque_immatriculation}</span>
        <div class="text-[10px] text-gray-400 font-mono">${r.modele_vehicule || ''}</div>
      </td>
      <td class="py-3.5 px-4"><span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${urgColor}">${r.urgence}</span></td>
      <td class="py-3.5 px-4"><span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${statColor}">${statLabels[r.statut] || r.statut}</span></td>
      <td class="text-gray-500 py-3.5 px-4 text-xs">${r.conseiller_nom || '<span class="text-gray-300 italic">Non assigné</span>'}</td>
      <td class="py-3.5 px-4 text-right">
        <button class="bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold text-xs py-1.5 px-3 rounded-lg transition" onclick="openDetails(${r.id})">
          Gérer
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Details loader
async function openDetails(id) {
  try {
    const res = await fetch(`/api/reclamations/${id}`, { headers: window.getAuthHeaders() });
    if (!res.ok) throw new Error('Impossible de charger cette fiche');
    currentData = await res.json();
    
    // Inject and display modal
    buildDetailsModalHTML(currentData);
    showModal('details-modal');
  } catch (error) {
    alert(error.message);
  }
}

// Dynamic Premium Modal Content Builder
function buildDetailsModalHTML(data) {
  const r = data.reclamation;
  const userRole = localStorage.getItem('userRole') || '';

  const modal = document.getElementById('details-modal');
  if(!modal) return;

  // Let's create visual components
  let containerHTML = `
    <div class="modal-content relative max-w-5xl w-11/12 bg-white rounded-2xl shadow-2xl overflow-hidden p-0 flex flex-col max-h-[90vh]">
      <!-- Header -->
      <div class="bg-slate-900 text-white p-5 flex justify-between items-center border-b border-slate-800">
        <div>
          <div class="flex items-center gap-3">
            <span class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono font-bold px-3 py-1 rounded-full uppercase">${r.numero}</span>
            <h2 class="text-xl font-bold text-white m-0">${r.motif}</h2>
          </div>
          <p class="text-slate-400 text-xs mt-1 m-0">Créé le ${new Date(r.date_creation).toLocaleString('fr-FR')} | Initié par ${r.client_nom}</p>
        </div>
        <button onclick="hideModal('details-modal')" class="text-slate-400 hover:text-white transition duration-200 text-2xl p-1 font-bold">&times;</button>
      </div>

      <!-- Detail View Grid with Tab selectors on top -->
      <div class="bg-slate-100 border-b border-slate-200 flex px-5 gap-1 pt-2">
        <button onclick="switchTab('tab-general')" id="btn-tab-general" class="tab-btn active px-4 py-3 font-semibold text-xs rounded-t-lg transition border-b-2 border-blue-600 text-blue-600 bg-white">
          📊 Fiche Générale
        </button>
        <button onclick="switchTab('tab-or')" id="btn-tab-or" class="tab-btn px-4 py-3 font-semibold text-xs rounded-t-lg transition text-slate-500 hover:text-slate-900 hover:bg-slate-50">
          🔧 Ordre de Réparation & Devis
        </button>
        <button onclick="switchTab('tab-documents')" id="btn-tab-documents" class="tab-btn px-4 py-3 font-semibold text-xs rounded-t-lg transition text-slate-500 hover:text-slate-900 hover:bg-slate-50">
          📂 Pièces Jointes (${data.fichiers ? data.fichiers.length : 0})
        </button>
        <button onclick="switchTab('tab-actions')" id="btn-tab-actions" class="tab-btn px-4 py-3 font-semibold text-xs rounded-t-lg transition text-slate-500 hover:text-slate-900 hover:bg-slate-50">
          🎯 Plan d'Actions (${data.actions_correctives ? data.actions_correctives.length : 0})
        </button>
        <button onclick="switchTab('tab-discussion')" id="btn-tab-discussion" class="tab-btn px-4 py-3 font-semibold text-xs rounded-t-lg transition text-slate-500 hover:text-slate-900 hover:bg-slate-50">
          💬 Chat Interne (${data.notes ? data.notes.length : 0})
        </button>
        <button onclick="switchTab('tab-history')" id="btn-tab-history" class="tab-btn px-4 py-3 font-semibold text-xs rounded-t-lg transition text-slate-500 hover:text-slate-900 hover:bg-slate-50">
          📜 Journal d'Audit (${data.historique ? data.historique.length : 0})
        </button>
      </div>

      <!-- Main Body Scroll wrapper -->
      <div class="overflow-y-auto p-6 flex-1 bg-slate-50">
        
        <!-- ================= TAB: GENERAL DESCRIPTION ================= -->
        <div id="tab-general" class="tab-pane flex flex-col gap-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Client Info -->
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 class="text-slate-800 text-xs font-bold uppercase tracking-wider mb-3 border-b pb-2 flex items-center gap-2">
                👤 Contacts Client
              </h3>
              <div class="space-y-3.5 text-xs text-slate-600">
                <div><span class="font-bold block text-slate-400">Nom Complet:</span> <span class="text-sm font-semibold text-slate-900">${r.client_nom}</span></div>
                <div><span class="font-bold block text-slate-400">Téléphone:</span> <span class="font-medium text-slate-900">${r.client_telephone || 'Non spécifié'}</span></div>
                <div><span class="font-bold block text-slate-400">Email:</span> <a href="mailto:${r.client_email}" class="text-blue-600 hover:underline font-medium">${r.client_email || 'Non spécifié'}</a></div>
              </div>
            </div>

            <!-- Vehicle Specs -->
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm col-span-2">
              <h3 class="text-slate-800 text-xs font-bold uppercase tracking-wider mb-3 border-b pb-2 flex justify-between items-center">
                <span>🚗 Identification Véhicule</span>
                ${userRole === 'chef_atelier' || userRole === 'admin' || userRole === 'conseiller_sav' ? `
                  <button onclick="toggleVehicleEditing()" class="text-blue-600 hover:text-blue-800 text-xs font-semibold">✐ Modifier</button>
                ` : ''}
              </h3>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-600">
                <div><span class="font-bold text-slate-400 block">Modèle:</span> <span class="font-semibold text-slate-900" id="v-modele">${r.modele_vehicule || 'Inconnu'}</span></div>
                <div><span class="font-bold text-slate-400 block">N° Immatriculation:</span> <span class="font-mono bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-bold" id="v-plaque">${r.plaque_immatriculation}</span></div>
                <div><span class="font-bold text-slate-400 block">Numéro de Châssis (VIN):</span> <span class="font-mono text-slate-900 font-bold" id="v-vin">${r.vin}</span></div>
                <div><span class="font-bold text-slate-400 block">Type de Garantie:</span> <span class="font-semibold text-slate-900">${r.type_garantie || 'Non défini'}</span></div>
                <div><span class="font-bold text-slate-400 block">Kilométrage:</span> <span class="font-semibold text-slate-900" id="v-km">${r.kilometrage ? r.kilometrage.toLocaleString('fr-FR') + ' km' : 'Inconnu'}</span></div>
                <div><span class="font-bold text-slate-400 block">Mise en Circulation:</span> <span class="font-semibold text-slate-900" id="v-circulation">${r.date_circulation || 'Inconnue'}</span></div>
                <div><span class="font-bold text-slate-400 block">Année Modèle:</span> <span class="font-semibold text-slate-900" id="v-annee">${r.annee_vehicule || 'Inconnue'}</span></div>
              </div>

              <!-- Inline Vehicle editing form (hidden by default) -->
              <form id="vehicle-edit-form" class="hidden mt-4 pt-4 border-t border-dashed bg-slate-50 p-3 rounded-lg space-y-3" onsubmit="saveVehicleEdit(event, ${r.id})">
                <div class="grid grid-cols-4 gap-2">
                  <input type="text" id="edit-v-modele" placeholder="Modèle" value="${r.modele_vehicule || ''}" class="p-1 px-2 text-xs border rounded w-full">
                  <input type="text" id="edit-v-plaque" placeholder="Plaque" value="${r.plaque_immatriculation || ''}" class="p-1 px-2 text-xs border rounded w-full" required>
                  <input type="text" id="edit-v-vin" placeholder="VIN" value="${r.vin || ''}" class="p-1 px-2 text-xs border rounded w-full" required>
                  <select id="edit-v-type" class="p-1 px-2 text-xs border rounded w-full">
                    <option value="sous_garantie" ${r.type_garantie === 'sous_garantie' ? 'selected' : ''}>Sous Garantie Constructeur</option>
                    <option value="hors_garantie" ${r.type_garantie === 'hors_garantie' ? 'selected' : ''}>Hors Garantie</option>
                    <option value="extension" ${r.type_garantie === 'extension' ? 'selected' : ''}>Extension de Garantie</option>
                  </select>
                </div>
                <div class="grid grid-cols-4 gap-2">
                  <input type="number" id="edit-v-km" placeholder="Kilométrage" value="${r.kilometrage || ''}" class="p-1 px-2 text-xs border rounded w-full">
                  <input type="date" id="edit-v-circulation" placeholder="Date Circulation" value="${r.date_circulation || ''}" class="p-1 px-2 text-xs border rounded w-full">
                  <input type="number" id="edit-v-annee" placeholder="Année" value="${r.annee_vehicule || ''}" class="p-1 px-2 text-xs border rounded w-full">
                </div>
                <div class="flex justify-end gap-1.5 pt-1">
                  <button type="button" onclick="toggleVehicleEditing()" class="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs">Annuler</button>
                  <button type="submit" class="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold shadow">Enregistrer</button>
                </div>
              </form>
            </div>
          </div>

          <!-- Description, Analysis & Management row -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm md:col-span-2 space-y-5">
              
              <!-- Core Description -->
              <div>
                <h4 class="text-slate-800 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  📝 Description de l'Incident
                </h4>
                <div class="bg-slate-50 p-4 border rounded-xl text-slate-700 text-xs leading-relaxed whitespace-pre-wrap">${r.description}</div>
              </div>

              <!-- Root Cause analysis by Quality Manager / CSI -->
              <div>
                <div class="flex justify-between items-center mb-2">
                  <h4 class="text-slate-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    🔬 Analyse de Cause Racine (Qualité)
                  </h4>
                  ${userRole === 'csi' || userRole === 'admin' ? `
                    <button onclick="toggleAnalyseEditing()" class="text-blue-600 hover:text-blue-800 text-xs font-semibold">✐ Rédiger</button>
                  ` : ''}
                </div>
                <div class="bg-blue-50/50 p-4 border border-blue-100 rounded-xl text-slate-700 text-xs leading-relaxed" id="cause-racine-box">
                  ${r.analyse_racine ? r.analyse_racine : '<span class="text-gray-400 italic">Aucune analyse de cause racine n\'a encore été rédigée par le Service Qualité / CSI.</span>'}
                </div>

                <!-- Cause analysis inline form (hidden by default) -->
                <form id="analyse-edit-form" class="hidden mt-3 space-y-2" onsubmit="saveAnalyseEdit(event, ${r.id})">
                  <textarea id="edit-analyse-text" rows="3" class="p-2 border rounded-lg w-full text-xs shadow-inner" placeholder="Décrivez les causes profondes du problème (erreur humaine, pièce défectueuse, retard livraison...)" required>${r.analyse_racine || ''}</textarea>
                  <div class="flex justify-end gap-1.5">
                    <button type="button" onclick="toggleAnalyseEditing()" class="bg-gray-200 text-gray-700 px-2.5 py-1 rounded-md text-xs">Annuler</button>
                    <button type="submit" class="bg-blue-600 text-white px-4 py-1 rounded-md text-xs font-bold shadow">Publier l'Analyse</button>
                  </div>
                </form>
              </div>
            </div>

            <!-- Management Box / Process state updates -->
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-5">
              <h4 class="text-slate-800 text-xs font-bold uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                ⚙️ Pilotage & Workflow
              </h4>

              <!-- Service & Classifier -->
              <div class="space-y-4 text-xs text-slate-700">
                <!-- Gravité & Catégorie -->
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="font-bold text-slate-400 block mb-1">Gravité:</label>
                    <select onchange="updateSingleField(${r.id}, 'urgence', this.value)" class="w-full border rounded-lg p-1.5 text-xs bg-slate-50 font-semibold">
                      <option value="faible" ${r.urgence === 'faible' ? 'selected' : ''}>🟢 Faible</option>
                      <option value="moyen" ${r.urgence === 'moyen' ? 'selected' : ''}>🟡 Moyen</option>
                      <option value="urgent" ${r.urgence === 'urgent' ? 'selected' : ''}>🟠 Urgent</option>
                      <option value="critique" ${r.urgence === 'critique' ? 'selected' : ''}>🔴 Critique</option>
                    </select>
                  </div>
                  <div>
                    <label class="font-bold text-slate-400 block mb-1">Classification:</label>
                    <select onchange="updateSingleField(${r.id}, 'categorie', this.value)" class="w-full border rounded-lg p-1.5 text-xs bg-slate-50 font-semibold">
                      <option value="">Sélectionner...</option>
                      <option value="produit" ${r.categorie === 'produit' ? 'selected' : ''}>Produit (Véhicule)</option>
                      <option value="atelier" ${r.categorie === 'atelier' ? 'selected' : ''}>Intervention Atelier</option>
                      <option value="piece" ${r.categorie === 'piece' ? 'selected' : ''}>Pièce de rechange</option>
                      <option value="garantie" ${r.categorie === 'garantie' ? 'selected' : ''}>Garantie constructeur</option>
                      <option value="livraison" ${r.categorie === 'livraison' ? 'selected' : ''}>Livraison VN/VO</option>
                      <option value="commercial" ${r.categorie === 'commercial' ? 'selected' : ''}>Service Commercial</option>
                      <option value="facturation" ${r.categorie === 'facturation' ? 'selected' : ''}>Facturation</option>
                      <option value="relation_client" ${r.categorie === 'relation_client' ? 'selected' : ''}>Relation Client</option>
                    </select>
                  </div>
                </div>

                <!-- Assign conseiller (Only Chef d'Atelier or Admin) -->
                <div>
                  <label class="font-bold text-slate-400 block mb-1">Conseiller Assigné:</label>
                  ${userRole === 'chef_atelier' || userRole === 'admin' ? `
                    <select id="direct-assign-select" onchange="assignClaim(${r.id}, this.value)" class="w-full border rounded-lg p-1.5 text-xs bg-yellow-50 font-bold text-amber-900 border-amber-200">
                      <option value="">--- Non Assigné ---</option>
                    </select>
                  ` : `
                    <div class="p-2 border rounded-lg bg-slate-100 font-semibold text-slate-800">${r.conseiller_nom || 'Non assigné'}</div>
                  `}
                </div>

                <!-- Update general Status (SAV limits) -->
                <div>
                  <label class="font-bold text-slate-400 block mb-1">Statut Courant:</label>
                  <select onchange="changeClaimStatus(${r.id}, this.value)" class="w-full border rounded-lg p-1.5 text-xs bg-blue-50 border-blue-200 font-bold text-blue-900">
                    <option value="nouveau" ${r.statut === 'nouveau' ? 'selected' : ''}>Nouveau</option>
                    <option value="en_cours" ${r.statut === 'en_cours' ? 'selected' : ''}>En cours d'analyse</option>
                    <option value="affecte" ${r.statut === 'affecte' ? 'selected' : ''}>Affecté</option>
                    <option value="en_traitement" ${r.statut === 'en_traitement' ? 'selected' : ''}>En traitement</option>
                    <option value="en_attente" ${r.statut === 'en_attente' ? 'selected' : ''}>En attente client</option>
                    <option value="en_attente_fournisseur" ${r.statut === 'en_attente_fournisseur' ? 'selected' : ''}>En attente fournisseur</option>
                    <option value="resolu" ${r.statut === 'resolu' ? 'selected' : ''}>Terminé (Résolu)</option>
                    <option value="cloture_technique" ${r.statut === 'cloture_technique' ? 'selected' : ''}>Clôturé Technique</option>
                    <option value="cloture" ${r.statut === 'cloture' ? 'selected' : ''}>Clôturé Définitivement (Archivé)</option>
                  </select>
                </div>

                <!-- Warranty Validation toggles (Only Responsable Garantie / Admin) -->
                <div class="border-t pt-3 mt-3">
                  <div class="flex justify-between items-center mb-1">
                    <label class="font-bold text-slate-400 block">⚠️ Statut Garantie:</label>
                    <span class="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-mono">
                      ${r.transfert_garantie ? 'Garantie Activée' : 'Standard'}
                    </span>
                  </div>
                  
                  <div class="p-3 bg-slate-50 border rounded-lg space-y-2">
                    <div class="flex justify-between items-center text-xs">
                      <span class="text-slate-500 font-medium">Valid. Prise en Charge:</span>
                      <span class="px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px] 
                        ${r.garantie_statut === 'valide' ? 'bg-green-100 text-green-800' : ''}
                        ${r.garantie_statut === 'refuse' ? 'bg-red-100 text-red-800' : ''}
                        ${r.garantie_statut === 'en_attente' ? 'bg-yellow-100 text-yellow-800' : ''}">
                        ${r.garantie_statut === 'valide' ? 'Validé' : ''}
                        ${r.garantie_statut === 'refuse' ? 'Refusé' : ''}
                        ${r.garantie_statut === 'en_attente' ? 'En attente' : ''}
                      </span>
                    </div>

                    <!-- Warranty buttons -->
                    ${userRole === 'garantie' || userRole === 'admin' ? `
                      <div class="grid grid-cols-2 gap-1 pt-1">
                        <button onclick="updateGarantieStatus(${r.id}, 'valide')" class="bg-green-600 hover:bg-green-700 text-white p-1 rounded font-bold text-[10px] uppercase shadow">Valider OK</button>
                        <button onclick="updateGarantieStatus(${r.id}, 'refuse')" class="bg-red-600 hover:bg-red-700 text-white p-1 rounded font-bold text-[10px] uppercase shadow">Refuser</button>
                      </div>
                    ` : ''}

                    <label class="flex items-center gap-1.5 text-[11px] text-slate-600 font-semibold cursor-pointer pt-1">
                      <input type="checkbox" onchange="toggleWarrantyTransfer(${r.id}, this.checked)" ${r.transfert_garantie ? 'checked' : ''} ${userRole !== 'chef_atelier' && userRole !== 'admin' && userRole !== 'conseiller_sav' ? 'disabled' : ''}>
                      Transférer au Responsable Garantie
                    </label>
                  </div>
                </div>

                <!-- CSI Score Logging section (Only CSI Customer Relation / Admin) -->
                ${r.statut === 'cloture_technique' || r.statut === 'cloture' ? `
                  <div class="border-t pt-3">
                    <label class="font-bold text-slate-400 block mb-1">⭐ Questionnaire de Satisfaction (CSI):</label>
                    <div class="bg-yellow-50/50 p-3 rounded-lg border border-yellow-100 text-slate-700">
                      <div class="flex items-center gap-1 justify-center mb-1">
                        ${[1, 2, 3, 4, 5].map(star => `
                          <button onclick="setCSIScore(${r.id}, ${star})" class="text-lg transition cursor-pointer hover:scale-125 ${r.score_csi >= star ? 'text-amber-400' : 'text-gray-300'}" ${userRole !== 'csi' && userRole !== 'admin' ? 'disabled' : ''}>★</button>
                        `).join('')}
                      </div>
                      <p class="text-center font-bold text-xs m-0 text-amber-900">${r.score_csi ? r.score_csi + '/5 étoiles' : 'Non évalué'}</p>
                      
                      ${userRole === 'csi' || userRole === 'admin' ? `
                        <div class="mt-2 space-y-1">
                          <textarea id="csi-comment-text" placeholder="Commentaire client lors du rappel qualité..." class="p-1 px-2 border w-full text-xs rounded bg-white shadow-inner" rows="2">${r.commentaire_client || ''}</textarea>
                          <button onclick="saveCSIComment(${r.id})" class="bg-amber-600 hover:bg-amber-700 text-white text-[10px] uppercase font-bold p-1 w-full rounded shadow">Enregistrer Commentaire</button>
                        </div>
                      ` : `
                        <p class="text-[11px] text-slate-500 italic mt-1 m-0">${r.commentaire_client ? '"' + r.commentaire_client + '"' : 'Aucun commentaire enregistré.'}</p>
                      `}
                    </div>
                  </div>
                ` : ''}

              </div>
            </div>
          </div>
        </div>

      <!-- ================= TAB: ORDRE DE RÉPARATION ================= -->
        <div id="tab-or" class="tab-pane hidden space-y-6">
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm col-span-2">
            <h3 class="text-slate-800 text-xs font-bold uppercase tracking-wider mb-4 border-b pb-2 flex justify-between items-center">
              <span>🔧 Ordre de Réparation & Devis Atelier</span>
              ${userRole === 'chef_atelier' || userRole === 'conseiller_sav' || userRole === 'admin' ? `
                <button onclick="saveORData(${r.id})" class="bg-blue-600 text-white font-bold py-1 px-3 text-xs rounded hover:bg-blue-700 shadow">Enregistrer OR</button>
              ` : ''}
            </h3>
            
            <form id="or-form" class="space-y-4 text-xs">
              <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label class="font-bold text-slate-400 block mb-1">Numéro OR (DMS):</label>
                  <input type="text" id="or-numero" value="${r.numero_or || ''}" class="w-full border p-2 rounded bg-slate-50" placeholder="Ex: OR-994192">
                </div>
                <div>
                  <label class="font-bold text-slate-400 block mb-1">Heure de réception prévue:</label>
                  <input type="datetime-local" id="or-heure-reception" value="${r.heure_reception || ''}" class="w-full border p-2 rounded bg-slate-50">
                </div>
                <div>
                  <label class="font-bold text-slate-400 block mb-1">Temps Main d'Œuvre (min):</label>
                  <input type="number" id="or-temps-mo" value="${r.temps_mo || ''}" class="w-full border p-2 rounded bg-slate-50" placeholder="Ex: 120">
                </div>
                <div>
                  <label class="font-bold text-slate-400 block mb-1">Montant Devis HT (Optionnel):</label>
                  <input type="number" id="or-montant" value="${r.montant_devis || ''}" class="w-full border p-2 rounded bg-slate-50" placeholder="Ex: 45000">
                </div>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label class="font-bold text-slate-400 block mb-1">Pièces de rechange demandées :</label>
                    <textarea id="or-pieces-list" rows="3" class="w-full border p-2 rounded bg-slate-50" placeholder="Ex: 1x Filtre à Huile, 2x Plaquettes de frein...">${r.pieces_list || ''}</textarea>
                 </div>
                 <div>
                    <label class="font-bold text-slate-400 block mb-1">Statut Facturation / Paiement :</label>
                    <select id="or-statut-paiement" class="w-full border p-2 rounded bg-slate-50">
                      <option value="non_paye" ${r.statut_paiement === 'non_paye' ? 'selected' : ''}>Non payé / Non facturé</option>
                      <option value="facture" ${r.statut_paiement === 'facture' ? 'selected' : ''}>Facture émise</option>
                      <option value="paye" ${r.statut_paiement === 'paye' ? 'selected' : ''}>Payé (Clôturé financièrement)</option>
                      <option value="sous_garantie" ${r.statut_paiement === 'sous_garantie' ? 'selected' : ''}>Couvert par Garantie (0€)</option>
                    </select>
                 </div>
              </div>
              
            </form>
          </div>
        </div>

        <!-- ================= TAB: DOCUMENTS ================= -->
        <div id="tab-documents" class="tab-pane hidden space-y-6">
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm col-span-2">
            <h3 class="text-slate-800 text-xs font-bold uppercase tracking-wider mb-4 border-b pb-2">
              📂 Gestion Documentaire (Factures, Photos, Expertises)
            </h3>

            <!-- Real-time dynamic document uploader -->
            <form id="doc-upload-form" onsubmit="handleClaimFileUpload(event, ${r.id})" class="mb-6 p-5 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50 hover:bg-slate-50 hover:border-blue-500 transition cursor-pointer text-center relative">
              <input type="file" id="claim-file-input" name="fichier" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" required onchange="displayFileNamePreview(this)">
              <div class="space-y-1 text-xs">
                <span class="block text-2xl">📥</span>
                <span class="font-bold text-blue-600 font-sans block" id="file-upload-label">Cliquer ou Glisser-Déposer un fichier à joindre</span>
                <span class="text-slate-400 font-normal">Formats acceptés: Photo (PNG, JPG), PDF, Factures (Max 10Mo)</span>
              </div>
              <button id="file-submit-btn" type="submit" class="hidden mt-3 bg-blue-600 text-white hover:bg-blue-700 font-bold py-1 px-3.5 rounded text-xs">Uploader le Fichier</button>
            </form>

            <!-- Listed files -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="claims-files-grid">
              ${data.fichiers && data.fichiers.length > 0 ? data.fichiers.map(f => {
                const isImg = f.type_fichier && f.type_fichier.startsWith('image/');
                const sizeKb = f.taille ? (f.taille / 1024).toFixed(1) + ' Ko' : 'Taille inconnue';
                return `
                  <div class="border rounded-xl p-3 flex gap-3.5 items-center bg-slate-50/50 hover:bg-white transition">
                    <div class="w-12 h-12 bg-slate-200 hover:bg-slate-300 rounded overflow-hidden flex items-center justify-center font-bold text-sm text-slate-500 shadow-inner flex-shrink-0 cursor-pointer" onclick="previewDocumentFile('${f.chemin_fichier}', '${f.nom_fichier}')">
                      ${isImg ? `
                        <img src="${f.chemin_fichier}" referrerpolicy="no-referrer" class="w-full h-full object-cover">
                      ` : '📄'}
                    </div>
                    <div class="flex-1 overflow-hidden">
                      <h4 class="font-sans font-bold text-slate-800 text-xs truncate max-w-[200px]" title="${f.nom_fichier}">${f.nom_fichier}</h4>
                      <p class="text-[10px] text-gray-400 font-mono mt-0.5">${sizeKb} | ${new Date(f.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <a href="${f.chemin_fichier}" download class="text-blue-600 hover:text-blue-800 text-xs font-bold font-mono">Télécharger</a>
                  </div>
                `;
              }).join('') : `
                <div class="col-span-2 text-center py-6 text-gray-400 text-xs italic">Aucune pièce jointe liée à ce dossier.</div>
              `}
            </div>
          </div>
        </div>

        <!-- ================= TAB: ACTIONS CORRECTIVES ================= -->
        <div id="tab-actions" class="tab-pane hidden space-y-6">
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 class="text-slate-800 text-xs font-bold uppercase tracking-wider mb-4 border-b pb-2 flex justify-between items-center">
              <span>🎯 Plan d'Actions Correctives (Suivi Qualité)</span>
              <span class="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold uppercase">Objectif Clôture</span>
            </h3>

            <!-- Actions grid log -->
            <div class="space-y-3 mb-6" id="claim-actions-list">
              ${data.actions_correctives && data.actions_correctives.length > 0 ? data.actions_correctives.map(a => {
                const statColor = {
                  'en_attente': 'bg-yellow-100 text-yellow-800 border-yellow-200',
                  'en_traitement': 'bg-blue-100 text-blue-800 border-blue-200',
                  'termine': 'bg-green-100 text-green-800 border-green-200'
                }[a.statut] || 'bg-gray-100 text-gray-800 border-gray-200';

                const statLabels = {
                  'en_attente': 'En attente',
                  'en_traitement': 'En traitement',
                  'termine': 'Terminé'
                };

                return `
                  <div class="p-3.5 border rounded-xl flex justify-between items-center bg-slate-50/50 hover:bg-white transition duration-150 shadow-sm gap-4">
                    <div class="flex-1 text-xs">
                      <p class="font-bold text-slate-800 mb-1">${a.description}</p>
                      <div class="flex gap-4 text-[10px] text-slate-400 font-medium">
                        <span>👤 Mandataire: <span class="text-slate-600 font-bold">${a.responsable}</span></span>
                        <span>📅 Échéance: <span class="text-slate-600 font-bold">${a.date_echeance || 'Inconnue'}</span></span>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <select onchange="changeActionStatus(${r.id}, ${a.id}, this.value)" class="p-1 px-2 border rounded text-[10px] font-bold ${statColor} cursor-pointer shadow-sm uppercase tracking-wider">
                        <option value="en_attente" ${a.statut === 'en_attente' ? 'selected' : ''}>En attente</option>
                        <option value="en_traitement" ${a.statut === 'en_traitement' ? 'selected' : ''}>En Traitement</option>
                        <option value="termine" ${a.statut === 'termine' ? 'selected' : ''}>✓ Terminé</option>
                      </select>
                    </div>
                  </div>
                `;
              }).join('') : `
                <div class="text-center py-6 text-gray-400 text-xs italic border rounded-xl border-dashed">Aucune action corrective planifiée pour cette réclamation.</div>
              `}
            </div>

            <!-- Create corrective action plan form (Only Responsable Qualité / CSI or SAV) -->
            ${userRole === 'csi' || userRole === 'chef_atelier' || userRole === 'admin' ? `
              <div class="bg-slate-50 p-4 rounded-xl border">
                <h4 class="text-slate-800 text-xs font-bold uppercase tracking-wider mb-3">🛠️ Planifier une action corrective</h4>
                <form onsubmit="handleClaimActionCreation(event, ${r.id})" class="space-y-3">
                  <div class="form-group mb-2">
                    <label class="text-[11px] font-bold text-slate-700 block mb-1">Description précise de l'action :</label>
                    <input type="text" id="action-desc" placeholder="Ex: Remplacement du faisceau électrique sous garantie..." class="w-full border rounded-lg p-2 text-xs bg-white shadow-inner" required />
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div class="form-group mb-0">
                      <label class="text-[11px] font-bold text-slate-700 block mb-1">Responsable Action :</label>
                      <input type="text" id="action-owner" placeholder="Ex: Chef d'Atelier / SAV" class="w-full border rounded-lg p-2 text-xs bg-white shadow-inner" required />
                    </div>
                    <div class="form-group mb-0">
                      <label class="text-[11px] font-bold text-slate-700 block mb-1">Date d'échéance :</label>
                      <input type="date" id="action-due" class="w-full border rounded-lg p-2 text-xs bg-white shadow-inner" required />
                    </div>
                  </div>
                  <div class="flex justify-end pt-1">
                    <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold font-sans py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition">Enregistrer l'action</button>
                  </div>
                </form>
              </div>
            ` : ''}

          </div>
        </div>

        <!-- ================= TAB: DISCUSSION PARTNERS ================= -->
        <div id="tab-discussion" class="tab-pane hidden space-y-6">
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 class="text-slate-800 text-xs font-bold uppercase tracking-wider mb-4 border-b pb-2">
              💬 Discussion & Notes Internes (Coffre-fort Collaboratif)
            </h3>

            <!-- Discussion list -->
            <div class="space-y-3 max-h-[300px] overflow-y-auto mb-4 p-2 bg-slate-50 rounded-xl shadow-inner border" id="notes-chat-box">
              ${data.notes && data.notes.length > 0 ? data.notes.map(n => {
                const badgeInfo = {
                  'chef_atelier': 'bg-purple-100 text-purple-800',
                  'garantie': 'bg-indigo-100 text-indigo-800',
                  'csi': 'bg-teal-100 text-teal-800',
                  'call_center': 'bg-blue-100 text-blue-800',
                  'admin': 'bg-slate-800 text-white'
                }[n.user_role] || 'bg-gray-100 text-gray-800';

                return `
                  <div class="bg-white p-3 border rounded-xl text-xs space-y-1 hover:shadow shadow-sm transition">
                    <div class="flex justify-between items-center">
                      <span class="font-sans font-bold text-slate-800">${n.user_nom} 
                        <span class="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${badgeInfo}">${getRoleLabel(n.user_role || '')}</span>
                      </span>
                      <span class="text-[10px] text-gray-400 font-mono">${new Date(n.created_at).toLocaleString('fr-FR')}</span>
                    </div>
                    <p class="text-slate-600 font-normal m-0 whitespace-pre-wrap">${n.note}</p>
                  </div>
                `;
              }).join('') : `
                <div class="text-center py-8 text-gray-400 italic text-xs">Aucune note insérée. Lancez la discussion ci-dessous.</div>
              `}
            </div>

            <!-- Note Creation form -->
            <form onsubmit="handleClaimNoteSubmit(event, ${r.id})" class="space-y-3.5">
              <div class="form-group mb-2">
                <textarea id="discussion-note-input" rows="3" class="w-full border rounded-lg p-2.5 text-xs shadow-inner bg-slate-50 focus:bg-white" placeholder="Saisissez un message ou une note technique..." required></textarea>
              </div>
              <div class="flex justify-between items-center col-span-2">
                <div class="flex items-center gap-1.5">
                  <span class="text-xs text-slate-400 font-bold block">Visibilité:</span>
                  <select id="discussion-note-visibility" class="border rounded p-1 text-xs bg-slate-100 font-semibold cursor-pointer">
                    <option value="tous">🌍 Tout le Réseau</option>
                    <option value="interne">🔒 Restreint / Interne</option>
                  </select>
                </div>
                <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-4.5 rounded-lg shadow transition">Envoyer le Message</button>
              </div>
            </form>
          </div>
        </div>

        <!-- ================= TAB: TIMELINE AUDIT ================= -->
        <div id="tab-history" class="tab-pane hidden space-y-6">
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 class="text-slate-800 text-xs font-bold uppercase tracking-wider mb-4 border-b pb-2">
              📜 Journal de Traçabilité & Audit (Historique Complet)
            </h3>

            <!-- Sequential list -->
            <div class="relative pl-6 border-l-2 border-slate-200 ml-4 space-y-6 py-2">
              ${data.historique && data.historique.length > 0 ? data.historique.map(h => {
                const actionIcons = {
                  'creation': '⭐',
                  'changement_statut': '🔄',
                  'affectation': '👤',
                  'note': '💬',
                  'upload_fichier': '📄',
                  'action_corrective_creation': '🛠️',
                  'action_corrective_status': '🎯',
                  'modification': '✏️'
                };
                const icon = actionIcons[h.action] || '📝';

                return `
                  <div class="relative">
                    <!-- Circle line indicator -->
                    <span class="absolute -left-[30px] top-0 bg-slate-200 border-2 border-slate-50 w-5 h-5 rounded-full flex items-center justify-center text-xs shadow-inner">${icon}</span>
                    <div class="text-xs">
                      <div class="flex justify-between items-center text-slate-400 font-medium">
                        <span class="font-bold text-slate-800">${h.details}</span>
                        <span class="font-mono text-[10px]">${new Date(h.created_at).toLocaleString('fr-FR')}</span>
                      </div>
                      <p class="text-slate-400 text-[10px] font-semibold mt-0.5 m-0">Par l'utilisateur: <span class="text-slate-600 font-bold">${h.user_nom || 'Système'}</span></p>
                    </div>
                  </div>
                `;
              }).join('') : `
                <div class="text-center py-6 text-gray-400 text-xs italic">Aucune historique enregistré.</div>
              `}
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  modal.innerHTML = containerHTML;
}

// Tab switcher inside modal
function switchTab(tabId) {
  // Hide all panes
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
  document.getElementById(tabId).classList.remove('hidden');

  // Switch button classes
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active', 'border-b-2', 'border-blue-600', 'text-blue-600', 'bg-white');
    btn.classList.add('text-slate-500', 'hover:text-slate-900', 'hover:bg-slate-50');
  });

  const activeBtn = document.getElementById('btn-' + tabId);
  if (activeBtn) {
    activeBtn.classList.add('active', 'border-b-2', 'border-blue-600', 'text-blue-600', 'bg-white');
    activeBtn.classList.remove('text-slate-500', 'hover:text-slate-900', 'hover:bg-slate-50');
  }
}

// Inline Fields Patching API
async function updateSingleField(id, key, value) {
  try {
    const res = await fetch(`/api/reclamations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...window.getAuthHeaders() },
      body: JSON.stringify({ [key]: value })
    });
    if(!res.ok) throw new Error('Action non autorisée');
    // Refresh
    await openDetails(id);
    await renderTable();
  } catch (error) {
    alert(error.message);
  }
}

// Status workflow patcher
async function changeClaimStatus(id, value) {
  try {
    const res = await fetch(`/api/reclamations/${id}/statut`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...window.getAuthHeaders() },
      body: JSON.stringify({ statut: value })
    });
    if(!res.ok) throw new Error('Changement du statut impossible');
    await openDetails(id);
    await renderTable();
  } catch (error) {
    alert(error.message);
  }
}

// Assign claim to Technical advisor
async function assignClaim(id, value) {
  try {
    const res = await fetch(`/api/reclamations/${id}/affecter`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...window.getAuthHeaders() },
      body: JSON.stringify({ conseillerId: value })
    });
    if(!res.ok) throw new Error('Assignation impossible');
    await openDetails(id);
    await renderTable();
  } catch (error) {
    alert(error.message);
  }
}

// Save OR Data
async function saveORData(id) {
  const payload = {
    numero_or: document.getElementById('or-numero').value,
    heure_reception: document.getElementById('or-heure-reception').value,
    temps_mo: document.getElementById('or-temps-mo').value,
    montant_devis: document.getElementById('or-montant').value,
    pieces_list: document.getElementById('or-pieces-list').value,
    statut_paiement: document.getElementById('or-statut-paiement').value
  };

  try {
    const res = await fetch(`/api/reclamations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...window.getAuthHeaders() },
      body: JSON.stringify(payload)
    });
    if(!res.ok) throw new Error('Erreur lors de la sauvegarde de l\'OR');
    alert('Ordre de réparation mis à jour avec succès.');
    await openDetails(id);
    await renderTable();
  } catch(error) {
    alert(error.message);
  }
}

// Warranty status update
async function updateGarantieStatus(id, value) {
  try {
    await updateSingleField(id, 'garantie_statut', value);
  } catch (error) {
    alert(error.message);
  }
}

// Toggle transfer warranty flag
async function toggleWarrantyTransfer(id, checked) {
  try {
    await updateSingleField(id, 'transfert_garantie', checked ? 1 : 0);
  } catch (error) {
    alert(error.message);
  }
}

// CSI score update on stars click
async function setCSIScore(id, stars) {
  try {
    const res = await fetch(`/api/reclamations/${id}/statut`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...window.getAuthHeaders() },
      body: JSON.stringify({ statut: 'cloture', score_csi: stars, commentaire_client: document.getElementById('csi-comment-text')?.value || '' })
    });
    if(!res.ok) throw new Error('Score CSI impossible');
    await openDetails(id);
    await renderTable();
  } catch (error) {
    alert(error.message);
  }
}

// CSI Client comment update save
async function saveCSIComment(id) {
  const comm = document.getElementById('csi-comment-text').value;
  try {
    await updateSingleField(id, 'commentaire_client', comm);
    alert('Commentaire qualité sauvegardé.');
  } catch (error) {
    alert(error.message);
  }
}

// Vehicle inline toggle
function toggleVehicleEditing() {
  document.getElementById('vehicle-edit-form').classList.toggle('hidden');
}

// Vehicle info save submit
async function saveVehicleEdit(e, id) {
  e.preventDefault();
  const body = {
    modele_vehicule: document.getElementById('edit-v-modele').value,
    plaque_immatriculation: document.getElementById('edit-v-plaque').value,
    vin: document.getElementById('edit-v-vin').value,
    type_garantie: document.getElementById('edit-v-type').value,
    kilometrage: parseInt(document.getElementById('edit-v-km').value, 10) || null,
    date_circulation: document.getElementById('edit-v-circulation').value,
    annee_vehicule: parseInt(document.getElementById('edit-v-annee').value, 10) || null
  };
  try {
    const res = await fetch(`/api/reclamations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...window.getAuthHeaders() },
      body: JSON.stringify(body)
    });
    if(!res.ok) throw new Error('Sauvegarde impossible');
    toggleVehicleEditing();
    await openDetails(id);
    await renderTable();
  } catch (error) {
    alert(error.message);
  }
}

// Quality Root Cause editing toggle
function toggleAnalyseEditing() {
  document.getElementById('analyse-edit-form').classList.toggle('hidden');
}

// Publish Quality Cause analysis log
async function saveAnalyseEdit(e, id) {
  e.preventDefault();
  const text = document.getElementById('edit-analyse-text').value;
  try {
    const res = await fetch(`/api/reclamations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...window.getAuthHeaders() },
      body: JSON.stringify({ analyse_racine: text })
    });
    if(!res.ok) throw new Error('Sauvegarde analyse racine impossible');
    toggleAnalyseEditing();
    await openDetails(id);
    await renderTable();
  } catch (error) {
    alert(error.message);
  }
}

// Create corrective plan action
async function handleClaimActionCreation(e, id) {
  e.preventDefault();
  const body = {
    description: document.getElementById('action-desc').value,
    responsable: document.getElementById('action-owner').value,
    date_echeance: document.getElementById('action-due').value
  };
  try {
    const res = await fetch(`/api/reclamations/${id}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...window.getAuthHeaders() },
      body: JSON.stringify(body)
    });
    if(!res.ok) throw new Error('Impossible de planifier l\'action');
    await openDetails(id);
    switchTab('tab-actions');
  } catch (error) {
    alert(error.message);
  }
}

// Corrective Action status changer
async function changeActionStatus(claimId, actionId, value) {
  try {
    const res = await fetch(`/api/reclamations/${claimId}/actions/${actionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...window.getAuthHeaders() },
      body: JSON.stringify({ statut: value })
    });
    if(!res.ok) throw new Error('Statut d\'action impossible à mettre à jour');
    await openDetails(claimId);
    switchTab('tab-actions');
  } catch (error) {
    alert(error.message);
  }
}

// Team note poster
async function handleClaimNoteSubmit(e, id) {
  e.preventDefault();
  const input = document.getElementById('discussion-note-input');
  const visibility = document.getElementById('discussion-note-visibility');
  const note = input.value;
  try {
    const res = await fetch(`/api/reclamations/${id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...window.getAuthHeaders() },
      body: JSON.stringify({ note, visible_pour: visibility.value })
    });
    if(!res.ok) throw new Error('Envoi de la note interne impossible');
    input.value = '';
    await openDetails(id);
    switchTab('tab-discussion');
    
    // Auto scroll bottom
    const box = document.getElementById('notes-chat-box');
    if(box) box.scrollTop = box.scrollHeight;
  } catch (error) {
    alert(error.message);
  }
}

// Document Drag and drop file select preview
function displayFileNamePreview(input) {
  const lbl = document.getElementById('file-upload-label');
  if (input.files && input.files[0]) {
    lbl.innerText = "📁 Fichier sélectionné : " + input.files[0].name + " | Prêt à être envoyé";
    document.getElementById('file-submit-btn').classList.remove('hidden');
  }
}

// Document submit AJAX
async function handleClaimFileUpload(e, id) {
  e.preventDefault();
  const input = document.getElementById('claim-file-input');
  if(!input.files || !input.files[0]) return;

  const fd = new FormData();
  fd.append('fichier', input.files[0]);

  try {
    const authHeaders = window.getAuthHeaders();
    const res = await fetch(`/api/reclamations/${id}/fichiers`, {
      method: 'POST',
      headers: { 
        'x-user-id': authHeaders['x-user-id'],
        'x-user-role': authHeaders['x-user-role']
      },
      body: fd
    });
    if(!res.ok) throw new Error('Téléversement échoué');
    await openDetails(id);
    switchTab('tab-documents');
  } catch (error) {
    alert(error.message);
  }
}

// Preview file link helper
function previewDocumentFile(path, name) {
  if (path.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/)) {
    // Open image directly inside a light centered popup iframe/window
    const w = window.open();
    if(w) {
      w.document.write(`<div style="display:flex; justify-content:center; align-items:center; height:100vh; background:#0f172a; margin:0;"><img src="${path}" style="max-width:90%; max-height:90%; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.5);"></div>`);
    }
  } else {
    window.open(path, '_blank');
  }
}

// CSV export function
async function exportToCSV() {
  const data = await getReclamations();
  if(!Array.isArray(data) || data.length === 0) {
    alert('Aucune donnée à exporter');
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
  // CSV Header
  csvContent += "Numéro;Client;Téléphone;Modèle;Immatriculation;VIN;Classification;Motif;Urgence;Statut;Conseiller\r\n";

  data.forEach(r => {
    const row = [
      r.numero,
      r.client_nom,
      r.client_telephone || '',
      r.modele_vehicule || '',
      r.plaque_immatriculation,
      r.vin,
      r.categorie || '',
      (r.motif || '').replace(/;/g, ','),
      r.urgence,
      r.statut,
      r.conseiller_nom || ''
    ].join(";");
    csvContent += row + "\r\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `export-cobail-reclamations-${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Real-Time auto dropdown load for conseiller_sav selection
async function populateAdvisorsSelect() {
  const select = document.getElementById('direct-assign-select');
  if(!select) return;

  try {
    const res = await fetch('/api/reclamations/config/conseillers', { headers: window.getAuthHeaders() });
    if(res.ok) {
      const users = await res.json();
      select.innerHTML = '<option value="">--- Cliquer pour Assignation ---</option>';
      users.forEach(u => {
        const selected = currentData && currentData.reclamation && currentData.reclamation.utilisateur_id === u.id ? 'selected' : '';
        select.innerHTML += `<option value="${u.id}" ${selected}>${u.nom} (${u.service || 'Advisor'})</option>`;
      });
    }
  } catch (error) {
    console.error(error);
  }
}

// Bind load
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  renderTable();

  // Load search listener
  const searchInput = document.getElementById('global-search');
  if (searchInput) {
    searchInput.addEventListener('input', renderTable);
  }
  // Filters listeners
  ['filter-statut', 'filter-gravity', 'filter-category'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', renderTable);
  });

  // Export spreadsheet listener
  const expBtn = document.getElementById('btn-export-csv');
  if(expBtn) {
    expBtn.addEventListener('click', exportToCSV);
  }

  // Populate dynamic elements
  document.addEventListener('click', (e) => {
    // If modal is opened and conseiller dropdown is present, populate it
    if(e.target.tagName === 'BUTTON' && e.target.innerText.includes('Gérer')) {
      setTimeout(populateAdvisorsSelect, 500); 
    }
  });
});
