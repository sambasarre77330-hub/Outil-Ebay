// Éléments de l'interface
const btnScrape = document.getElementById('btnScrape')
const btnSendDashboard = document.getElementById('btnSendDashboard')
const btnFillEbay = document.getElementById('btnFillEbay')
const titreInput = document.getElementById('titreInput')
const prixAchatInput = document.getElementById('prixAchatInput')
const prixVenteInput = document.getElementById('prixVenteInput')
const statusText = document.getElementById('status')

let urlActuelle = ''
let fournisseurActuel = 'Amazon'

// Calcul automatique du prix de vente (+30% de marge + frais eBay 13% + 0.35€)
function calculerPrixVente(achat) {
  const num = parseFloat(achat)
  if (!num || num <= 0) return ''
  const vente = (num * 1.30 + 0.35) / 0.87
  return (Math.ceil(vente) - 0.10).toFixed(2)
}

// Charger le dernier produit sauvegardé en mémoire
chrome.storage.local.get(['dernierProduit'], (res) => {
  if (res.dernierProduit) {
    titreInput.value = res.dernierProduit.titre || ''
    prixAchatInput.value = res.dernierProduit.prixAchat || ''
    prixVenteInput.value = res.dernierProduit.prixVente || ''
    urlActuelle = res.dernierProduit.url || ''
    fournisseurActuel = res.dernierProduit.fournisseur || 'Amazon'
  }
})

prixAchatInput.addEventListener('input', (e) => {
  prixVenteInput.value = calculerPrixVente(e.target.value)
})

// --- ACTION 1 : ASPIRER LA PAGE FOURNISSEUR (AMAZON, ALIEXPRESS, CDISCOUNT...) ---
btnScrape.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  urlActuelle = tab.url

  if (urlActuelle.includes('amazon')) fournisseurActuel = 'Amazon'
  else if (urlActuelle.includes('aliexpress')) fournisseurActuel = 'AliExpress'
  else if (urlActuelle.includes('cdiscount')) fournisseurActuel = 'Cdiscount'
  else fournisseurActuel = 'Grossiste'

  // Exécute un script directement dans la page du fournisseur pour lire le vrai titre et le vrai prix
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      // 1. Chercher le titre du produit (Amazon #productTitle ou balise h1 générale)
      const elTitre = document.querySelector('#productTitle') || document.querySelector('h1')
      const titreBrut = elTitre ? elTitre.innerText.trim() : document.title

      // 2. Chercher le prix sur la page
      const selecteursPrix = [
        '.a-price-whole',
        '#corePrice_feature_div .a-offscreen',
        '[class*="price"]',
        '[id*="price"]'
      ]
      let prixTrouve = ''
      for (const sel of selecteursPrix) {
        const el = document.querySelector(sel)
        if (el && el.innerText) {
          const match = el.innerText.replace(',', '.').match(/\d+(\.\d{1,2})?/)
          if (match) {
            prixTrouve = match[0]
            break
          }
        }
      }
      return { titreBrut, prixTrouve }
    }
  }, (results) => {
    if (results && results[0] && results[0].result) {
      const { titreBrut, prixTrouve } = results[0].result
      const titreSEO = (titreBrut.slice(0, 58).trim() + ' - NEUF Livraison Rapide').slice(0, 80)
      const achat = prixTrouve || '19.90'
      const vente = calculerPrixVente(achat)

      titreInput.value = titreSEO
      prixAchatInput.value = achat
      prixVenteInput.value = vente

      // Sauvegarder dans la mémoire de l'extension
      chrome.storage.local.set({
        dernierProduit: { titre: titreSEO, prixAchat: achat, prixVente: vente, url: urlActuelle, fournisseur: fournisseurActuel }
      })

      statusText.innerText = '✅ Produit aspiré avec succès !'
    }
  })
})

// --- ACTION 2 : ENVOYER EN 1 CLIC VERS TON DASHBOARD LOCALHOST:5173 ---
btnSendDashboard.addEventListener('click', () => {
  const params = new URLSearchParams({
    auto_titre: titreInput.value,
    auto_achat: prixAchatInput.value,
    auto_vente: prixVenteInput.value,
    auto_url: urlActuelle,
    auto_fournisseur: fournisseurActuel
  })
  // Ouvre ton Dashboard et pré-remplit automatiquement tous les champs !
  chrome.tabs.create({ url: `http://localhost:5173/?${params.toString()}` })
})

// --- ACTION 3 : AUTO-REMPLIR SUR LA PAGE DE CRÉATION D'ANNONCE EBAY ---
btnFillEbay.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const titre = titreInput.value
  const prix = prixVenteInput.value

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [titre, prix],
    func: (titreAnnonce, prixAnnonce) => {
      // Cherche le champ Titre sur eBay et le remplit en simulant une frappe humaine
      const champTitre = document.querySelector('input[name*="title" i], input[aria-label*="titre" i], input[type="text"]')
      if (champTitre) {
        champTitre.focus()
        champTitre.value = titreAnnonce
        champTitre.dispatchEvent(new Event('input', { bubbles: true }))
      }

      // Cherche le champ Prix sur eBay
      const champPrix = document.querySelector('input[name*="price" i], input[aria-label*="prix" i]')
      if (champPrix) {
        champPrix.focus()
        champPrix.value = prixAnnonce
        champPrix.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }
  })

  statusText.innerText = '🤖 Champs remplis sur la page !'
})