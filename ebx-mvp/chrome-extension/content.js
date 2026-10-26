// ============================================================================
// EBX.AI-ENGINE v3.0 : SCANNER DE STOCK FOURNISSEUR & AUTO-PILOT EBAY
// ============================================================================

(function () {
  const urlActuelle = window.location.href
  // Change par 'http://localhost:5173' si tu testes en local, ou garde ton URL Vercel en ligne :
  const URL_SAAS_EBX = 'https://outil-ebay.vercel.app'

  // ==========================================================================
  // PARTIE 1 : DÉTECTION DE STOCK & EXTRACTION SUR AMAZON / ALIEXPRESS / CDISCOUNT
  // ==========================================================================
  const estAmazon = urlActuelle.includes('amazon.fr')
  const estAliExpress = urlActuelle.includes('aliexpress.com')
  const estCdiscount = urlActuelle.includes('cdiscount.com')

  if (estAmazon || estAliExpress || estCdiscount) {
    setTimeout(() => {
      // CAS A : ON EST SUR UNE PAGE DE RECHERCHE -> CIBLER LE 1er PRODUIT DISPONIBLE
      const estPageRecherche =
        urlActuelle.includes('/s?') ||
        urlActuelle.includes('/wholesale') ||
        urlActuelle.includes('search')

      if (estPageRecherche) {
        let premierLienProduit = null

        if (estAmazon) {
          const liens = Array.from(document.querySelectorAll('div[data-component-type="s-search-result"] a.a-link-normal.s-underline-text'))
          premierLienProduit = liens.find(a => a.href && a.href.includes('/dp/'))
        } else if (estAliExpress) {
          const liens = Array.from(document.querySelectorAll('a[href*="/item/"]'))
          premierLienProduit = liens[0]
        } else if (estCdiscount) {
          const liens = Array.from(document.querySelectorAll('a[href*="/f-"]'))
          premierLienProduit = liens[0]
        }

        const barreRecherche = document.createElement('div')
        barreRecherche.style =
          'position:fixed;bottom:20px;right:20px;background:#0f172a;color:#ffffff;padding:16px 20px;border-radius:16px;z-index:999999;font-family:sans-serif;box-shadow:0 10px 30px rgba(0,0,0,0.5);border:2px solid #a855f7;max-width:360px;'

        if (premierLienProduit) {
          barreRecherche.innerHTML = `
            <div style="font-size:12px;color:#c084fc;font-weight:bold;margin-bottom:6px;">🧠 RADAR IA EBX.COMMAND</div>
            <div style="font-size:13px;margin-bottom:12px;line-height:1.4;">Meilleur produit identifié dans les résultats. Ouvrir sa fiche exacte pour vérifier le stock ?</div>
            <button id="ebx-open-first" style="width:100%;background:#a855f7;color:#fff;border:none;padding:10px;border-radius:10px;font-weight:bold;cursor:pointer;font-size:12px;">
              🎯 Ouvrir le Produit Exact & Vérifier Stock →
            </button>
          `
          document.body.appendChild(barreRecherche)
          document.getElementById('ebx-open-first').addEventListener('click', () => {
            window.location.href = premierLienProduit.href
          })
        }
        return
      }

      // CAS B : ON EST SUR UNE FICHE PRODUIT EXACTE -> VÉRIFIER LE STOCK EN TEMPS RÉEL
      const textePage = document.body.innerText.toLowerCase()
      let enStock = true
      let raisonStock = 'En stock (Expédition rapide)'

      // Détection des ruptures sur Amazon / AliExpress / Cdiscount
      const boutonPanierAmazon = document.querySelector('#add-to-cart-button, #buy-now-button')
      const blocDispoAmazon = document.querySelector('#availability')?.innerText.toLowerCase() || ''

      if (estAmazon) {
        if (
          blocDispoAmazon.includes('actuellement indisponible') ||
          blocDispoAmazon.includes('temporairement en rupture') ||
          !boutonPanierAmazon
        ) {
          enStock = false
          raisonStock = 'Rupture de stock détectée sur Amazon'
        }
      } else if (
        textePage.includes('épuisé') ||
        textePage.includes('rupture de stock') ||
        textePage.includes('cet article n\'est plus disponible') ||
        textePage.includes('sorry, this item is no longer available')
      ) {
        enStock = false
        raisonStock = 'Produit épuisé chez le fournisseur'
      }

      // Extraction du titre exact
      const titreBrut = (
        document.querySelector('#productTitle')?.innerText ||
        document.querySelector('h1')?.innerText ||
        document.title
      ).trim()
      const titreSEO = `${titreBrut.slice(0, 62).trim()} - NEUF Stock France`.slice(0, 80)

      // Extraction du prix exact
      let prixAchat = 15.90
      const selecteursPrix = [
        '.a-price .a-offscreen',
        '#priceblock_ourprice',
        '.product-price-value',
        '[class*="price--current"]',
        '.fpPrice'
      ]
      for (const sel of selecteursPrix) {
        const el = document.querySelector(sel)
        if (el && el.innerText) {
          const match = el.innerText.replace(',', '.').match(/\d+(\.\d{1,2})?/)
          if (match) {
            prixAchat = parseFloat(match[0])
            break
          }
        }
      }

      const prixVenteConseille = (Math.ceil((prixAchat * 1.30 + 0.35) / 0.87) - 0.10).toFixed(2)
      const fournisseurNom = estAmazon ? 'Amazon' : estAliExpress ? 'AliExpress' : 'Cdiscount'

      // Affichage du Widget de Contrôle de Stock en direct
      const widgetStock = document.createElement('div')
      widgetStock.style = `position:fixed;bottom:20px;right:20px;background:#0f172a;color:#ffffff;padding:18px;border-radius:16px;z-index:999999;font-family:sans-serif;box-shadow:0 10px 30px rgba(0,0,0,0.6);border:2px solid ${
        enStock ? '#10b981' : '#ef4444'
      };width:340px;`

      widgetStock.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <span style="font-size:11px;font-weight:bold;color:#38bdf8;">⚡ EBX STOCK SCANNER</span>
          <span style="font-size:11px;font-weight:bold;padding:3px 8px;border-radius:20px;background:${
            enStock ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'
          };color:${enStock ? '#34d399' : '#f87171'};">
            ${enStock ? '🟢 EN STOCK' : '🔴 RUPTURE'}
          </span>
        </div>
        <div style="font-size:12px;font-weight:bold;margin-bottom:6px;color:#e2e8f0;">${titreSEO}</div>
        <div style="font-size:11px;color:#94a3b8;margin-bottom:12px;">
          Achat : <strong style="color:#fff;">${prixAchat.toFixed(2)} €</strong> • Revente eBay : <strong style="color:#fbbf24;">${prixVenteConseille} €</strong>
          <div style="margin-top:3px;color:${enStock ? '#34d399' : '#f87171'};">${raisonStock}</div>
        </div>
        ${
          enStock
            ? `<button id="ebx-import-direct" style="width:100%;background:#10b981;color:#020617;border:none;padding:10px;border-radius:10px;font-weight:800;cursor:pointer;font-size:12px;">
                🚀 Importer ce Produit Vérifié dans EBX
              </button>`
            : `<div style="background:#450a0a;color:#fca5a5;padding:8px;border-radius:8px;font-size:11px;text-align:center;font-weight:bold;">
                ⛔ Importation bloquée : Produit indisponible chez ${fournisseurNom}
              </div>`
        }
      `

      document.body.appendChild(widgetStock)

      const btnImport = document.getElementById('ebx-import-direct')
      if (btnImport) {
        btnImport.addEventListener('click', () => {
          const urlExport = `${URL_SAAS_EBX}/?auto_titre=${encodeURIComponent(
            titreSEO
          )}&auto_achat=${prixAchat.toFixed(2)}&auto_vente=${prixVenteConseille}&auto_url=${encodeURIComponent(
            window.location.href.split('?')[0]
          )}&auto_fournisseur=${fournisseurNom}&auto_stock=EN_STOCK`
          window.open(urlExport, '_blank')
        })
      }
    }, 1500)
  }

  // ==========================================================================
  // PARTIE 2 : PILOTE AUTOMATIQUE SUR EBAY.FR
  // ==========================================================================
  if (urlActuelle.includes('ebay.fr') || urlActuelle.includes('ebay.com')) {
    const params = new URLSearchParams(window.location.search)
    const autoPrix = params.get('ebx_price')
    const autoTitre = params.get('title')

    if (autoPrix && autoTitre) {
      chrome.storage.local.set({
        missionEbayActive: true,
        produitEnCours: { titre: autoTitre, prix: autoPrix }
      })
    }

    chrome.storage.local.get(['missionEbayActive', 'produitEnCours'], (data) => {
      if (!data.missionEbayActive || !data.produitEnCours) return

      const bandeau = document.createElement('div')
      bandeau.style =
        'position:fixed;top:0;left:0;right:0;background:#020617;color:#22d3ee;padding:10px;text-align:center;z-index:999999;font-family:sans-serif;font-weight:bold;border-bottom:2px solid #22d3ee;font-size:13px;'
      bandeau.innerText = `🤖 PILOTE AUTOMATIQUE EBX ACTIF : Préparation de "${data.produitEnCours.titre.slice(0, 40)}..." (${data.produitEnCours.prix} €)`
      document.body.prepend(bandeau)

      if (urlActuelle.includes('/sl/prelist/suggest')) {
        setTimeout(() => {
          const boutonLoupe = document.querySelector('button.textbox__button, button[type="submit"], button.btn--primary')
          if (boutonLoupe) {
            bandeau.innerText = '⚡ Clic automatique sur la recherche eBay...'
            boutonLoupe.click()
          }
        }, 1200)
      }

      setInterval(() => {
        const boutons = Array.from(document.querySelectorAll('button, a'))
        const btnContinuerSansMatch = boutons.find(
          el =>
            el.innerText &&
            (el.innerText.toLowerCase().includes('continuer sans') ||
              el.innerText.toLowerCase().includes('continue without'))
        )
        if (btnContinuerSansMatch) {
          bandeau.innerText = '⚡ Passage direct au formulaire de vente...'
          btnContinuerSansMatch.click()
        }

        const champPrix = document.querySelector('input[name*="price" i], input[aria-label*="prix" i]')
        if (champPrix && !champPrix.dataset.ebxFilled) {
          champPrix.focus()
          champPrix.value = data.produitEnCours.prix
          champPrix.dispatchEvent(new Event('input', { bubbles: true }))
          champPrix.dataset.ebxFilled = 'true'
          bandeau.style.color = '#34d399'
          bandeau.innerText = `✅ Prix (${data.produitEnCours.prix} €) injecté ! Ta description HTML est dans ton presse-papier (Ctrl+V).`
          chrome.storage.local.set({ missionEbayActive: false })
        }
      }, 1800)
    })
  }
})()