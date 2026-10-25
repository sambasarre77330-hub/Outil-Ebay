// ============================================================================
// PILOTE AUTOMATIQUE EBAY (S'exécute tout seul dès qu'une page eBay s'ouvre)
// ============================================================================

(function () {
  const urlActuelle = window.location.href

  // 1. Si on arrive depuis notre Dashboard EBX avec un titre et un prix dans l'URL
  const params = new URLSearchParams(window.location.search)
  const autoPrix = params.get('ebx_price')
  const autoTitre = params.get('title')

  if (autoPrix && autoTitre) {
    // On sauvegarde la mission dans la mémoire de Chrome
    chrome.storage.local.set({
      missionEbayActive: true,
      produitEnCours: { titre: autoTitre, prix: autoPrix }
    })
  }

  // 2. Vérifier si une mission d'automatisation est en cours
  chrome.storage.local.get(['missionEbayActive', 'produitEnCours'], (data) => {
    if (!data.missionEbayActive || !data.produitEnCours) return

    // Bandeau visuel en haut d'eBay pour te montrer que le robot travaille
    const bandeau = document.createElement('div')
    bandeau.style = 'position:fixed;top:0;left:0;right:0;background:#020617;color:#22d3ee;padding:10px;text-align:center;z-index:999999;font-family:sans-serif;font-weight:bold;border-bottom:2px solid #22d3ee;font-size:13px;'
    bandeau.innerText = `🤖 PILOTE AUTOMATIQUE EBX ACTIF : Préparation de "${data.produitEnCours.titre.slice(0, 40)}..." (${data.produitEnCours.prix} €)`
    document.body.prepend(bandeau)

    // ÉTAPE A : Sur la page "Commencer votre annonce" (celle de ta capture d'écran !)
    if (urlActuelle.includes('/sl/prelist/suggest')) {
      setTimeout(() => {
        const boutonLoupe = document.querySelector('button.textbox__button, button[type="submit"], button.btn--primary')
        if (boutonLoupe) {
          bandeau.innerText = '⚡ Clic automatique sur la recherche eBay...'
          boutonLoupe.click()
        }
      }, 1200)
    }

    // ÉTAPE B : Sur la page "Trouver un objet correspondant" (Passer sans catalogue)
    setInterval(() => {
      const boutons = Array.from(document.querySelectorAll('button, a'))
      const btnContinuerSansMatch = boutons.find(el => 
        el.innerText && (
          el.innerText.toLowerCase().includes('continuer sans') ||
          el.innerText.toLowerCase().includes('continue without')
        )
      )
      if (btnContinuerSansMatch) {
        bandeau.innerText = '⚡ Passage direct au formulaire de vente...'
        btnContinuerSansMatch.click()
      }

      // ÉTAPE C : Sur le formulaire final de l'annonce -> Remplir le prix automatiquement !
      const champPrix = document.querySelector('input[name*="price" i], input[aria-label*="prix" i]')
      if (champPrix && !champPrix.dataset.ebxFilled) {
        champPrix.focus()
        champPrix.value = data.produitEnCours.prix
        champPrix.dispatchEvent(new Event('input', { bubbles: true }))
        champPrix.dataset.ebxFilled = 'true'
        bandeau.style.color = '#34d399'
        bandeau.innerText = `✅ Prix (${data.produitEnCours.prix} €) injecté ! Ta description HTML est dans ton presse-papier (Ctrl+V).`
        // Mission terminée
        chrome.storage.local.set({ missionEbayActive: false })
      }
    }, 1800)
  })
})()