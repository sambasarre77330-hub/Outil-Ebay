// ============================================================================
// EBX.AI-ENGINE v4.2 COMPLET : STOCK SCANNER (AMAZON HAUL INCLUS) + 
// AUTO-CHECKOUT COMPLET + EBAY ORDER & TRACKING SYNC
// ============================================================================

(function () {
  const urlActuelle = window.location.href
  const URL_SAAS_EBX = 'https://outil-ebay.vercel.app'
  const params = new URLSearchParams(window.location.search)

  // ==========================================================================
  // 1. DÉTECTION D'UNE MISSION AUTO-ORDER FOURNISSEUR DEPUIS LE DASHBOARD EBX
  // ==========================================================================
  if (params.get('ebx_auto_order') === '1') {
    const commandeMission = {
      actif: true,
      acheteur: params.get('ebx_buyer') || 'Client eBay',
      adresseComplete: params.get('ebx_addr') || '15 Avenue des Champs, 75008 Paris',
      horodatage: Date.now()
    }
    chrome.storage.local.set({ ebxAutoOrder: commandeMission })
  }

  // ==========================================================================
  // 2. SUR AMAZON / ALIEXPRESS / CDISCOUNT : AUTO-CHECKOUT OU SCAN DE STOCK
  // ==========================================================================
  const estAmazon = urlActuelle.includes('amazon.fr')
  const estAliExpress = urlActuelle.includes('aliexpress.com')
  const estCdiscount = urlActuelle.includes('cdiscount.com')

  if (estAmazon || estAliExpress || estCdiscount) {
    chrome.storage.local.get(['ebxAutoOrder'], (data) => {
      const mission = data.ebxAutoOrder

      // --- MODE A : AUTO-CHECKOUT ACTIF (PASSAGE DE COMMANDE AUTOMATIQUE) ---
      if (mission && mission.actif) {
        const bandeauOrder = document.createElement('div')
        bandeauOrder.style =
          'position:fixed;top:0;left:0;right:0;background:#022c22;color:#34d399;padding:12px 20px;z-index:999999;font-family:sans-serif;font-weight:bold;border-bottom:2px solid #10b981;display:flex;justify-content:space-between;align-items:center;font-size:13px;'
        bandeauOrder.innerHTML = `
          <span>🤖 AUTO-CHECKOUT EBX ACTIF — Destinataire : <strong>${mission.acheteur}</strong> (${mission.adresseComplete})</span>
          <div style="display:flex;gap:10px;">
            <button id="ebx-fill-address" style="background:#10b981;color:#020617;border:none;padding:6px 12px;border-radius:8px;font-weight:800;cursor:pointer;font-size:12px;">
              ⚡ Injecter l'adresse client ici
            </button>
            <button id="ebx-stop-order" style="background:#334155;color:#fff;border:none;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;">
              Terminer mission
            </button>
          </div>
        `
        document.body.prepend(bandeauOrder)

        // Fonction d'injection automatique dans les formulaires d'adresse Amazon / AliExpress
        const injecterAdresseFormulaire = () => {
          const parties = mission.adresseComplete.split(',')
          const rue = (parties[0] || mission.adresseComplete).trim()
          const cpVille = (parties[1] || '75001 Paris').trim()
          const matchCP = cpVille.match(/\b\d{5}\b/)
          const codePostal = matchCP ? matchCP[0] : '75001'
          const ville = cpVille.replace(codePostal, '').trim() || 'Paris'

          const remplirChamp = (selecteurs, valeur) => {
            for (const sel of selecteurs) {
              const champ = document.querySelector(sel)
              if (champ) {
                champ.focus()
                champ.value = valeur
                champ.dispatchEvent(new Event('input', { bubbles: true }))
                champ.dispatchEvent(new Event('change', { bubbles: true }))
                return true
              }
            }
            return false
          }

          // Sélecteurs officiels Amazon.fr & AliExpress Checkout
          remplirChamp([
            '#address-ui-widgets-enterAddressFullName',
            'input[name="enterAddressFullName"]',
            'input[placeholder*="Nom" i]',
            'input[name="contactPerson"]'
          ], mission.acheteur)

          remplirChamp([
            '#address-ui-widgets-enterAddressLine1',
            'input[name="enterAddressLine1"]',
            'input[placeholder*="Adresse" i]',
            'input[name="address"]'
          ], rue)

          remplirChamp([
            '#address-ui-widgets-enterAddressPostalCode',
            'input[name="enterAddressPostalCode"]',
            'input[placeholder*="Code postal" i]',
            'input[name="zip"]'
          ], codePostal)

          remplirChamp([
            '#address-ui-widgets-enterAddressCity',
            'input[name="enterAddressCity"]',
            'input[placeholder*="Ville" i]',
            'input[name="city"]'
          ], ville)

          remplirChamp([
            '#address-ui-widgets-enterAddressPhoneNumber',
            'input[name="enterAddressPhoneNumber"]',
            'input[type="tel"]'
          ], '0612345678')
        }

        document.getElementById('ebx-fill-address')?.addEventListener('click', () => {
          injecterAdresseFormulaire()
          alert(`✅ Coordonnées de ${mission.acheteur} injectées dans les champs d'adresse !`)
        })

        document.getElementById('ebx-stop-order')?.addEventListener('click', () => {
          chrome.storage.local.set({ ebxAutoOrder: { actif: false } })
          bandeauOrder.remove()
        })

        // Si on est sur la fiche produit, clic automatique sur "Ajouter au panier" ou "Acheter"
        setTimeout(() => {
          const btnBuyNow =
            document.querySelector('#buy-now-button, #add-to-cart-button') ||
            Array.from(document.querySelectorAll('button, input[type="submit"], span[role="button"]')).find(
              el => el.innerText && el.innerText.toLowerCase().includes('ajouter au panier')
            )
          if (btnBuyNow && !urlActuelle.includes('gp/buy') && !urlActuelle.includes('cart')) {
            btnBuyNow.style.border = '3px solid #10b981'
            btnBuyNow.click()
          }
          // Si on est déjà sur la page de paiement/adresse, on remplit tout seul !
          injecterAdresseFormulaire()
        }, 1500)

        return
      }

      // --- MODE B : SCANNER DE STOCK & EXTRACTION PRODUIT EXACT ---
      setTimeout(() => {
        const estPageRecherche =
          urlActuelle.includes('/s?') ||
          urlActuelle.includes('/wholesale') ||
          urlActuelle.includes('search')

        if (estPageRecherche) {
          let premierLienProduit = null
          if (estAmazon) {
            const liens = Array.from(document.querySelectorAll('div[data-component-type="s-search-result"] a.a-link-normal.s-underline-text, a.a-link-normal[href*="/dp/"]'))
            premierLienProduit = liens.find(a => a.href && a.href.includes('/dp/'))
          } else if (estAliExpress) {
            const liens = Array.from(document.querySelectorAll('a[href*="/item/"]'))
            premierLienProduit = liens[0]
          } else if (estCdiscount) {
            const liens = Array.from(document.querySelectorAll('a[href*="/f-"]'))
            premierLienProduit = liens[0]
          }

          if (premierLienProduit) {
            const barreRecherche = document.createElement('div')
            barreRecherche.style =
              'position:fixed;bottom:20px;right:20px;background:#0f172a;color:#ffffff;padding:16px 20px;border-radius:16px;z-index:999999;font-family:sans-serif;box-shadow:0 10px 30px rgba(0,0,0,0.5);border:2px solid #a855f7;max-width:360px;'
            barreRecherche.innerHTML = `
              <div style="font-size:12px;color:#c084fc;font-weight:bold;margin-bottom:6px;">🧠 RADAR IA EBX.COMMAND</div>
              <div style="font-size:13px;margin-bottom:12px;line-height:1.4;">Meilleur produit identifié. Ouvrir sa fiche exacte pour vérifier le stock ?</div>
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

        const textePage = document.body.innerText.toLowerCase()
        let enStock = true
        let raisonStock = 'En stock (Expédition rapide)'

        // Détection compatible Amazon classique + Amazon Haul (bouton jaune "Ajouter au panier")
        const boutonPanierAmazon =
          document.querySelector('#add-to-cart-button, #buy-now-button, input[name="submit.add-to-cart"]') ||
          Array.from(document.querySelectorAll('button, span, input, a')).find(
            el => el.innerText && el.innerText.trim().toLowerCase() === 'ajouter au panier'
          )
        const contientTextePanier = textePage.includes('ajouter au panier')
        const blocDispoAmazon = document.querySelector('#availability')?.innerText.toLowerCase() || ''

        if (estAmazon) {
          if (
            blocDispoAmazon.includes('actuellement indisponible') ||
            blocDispoAmazon.includes('temporairement en rupture') ||
            (!boutonPanierAmazon && !contientTextePanier)
          ) {
            enStock = false
            raisonStock = 'Rupture de stock détectée sur Amazon'
          }
        } else if (
          textePage.includes('épuisé') ||
          textePage.includes('rupture de stock') ||
          textePage.includes("cet article n'est plus disponible")
        ) {
          enStock = false
          raisonStock = 'Produit épuisé chez le fournisseur'
        }

        const titreBrut = (
          document.querySelector('#productTitle')?.innerText ||
          document.querySelector('h1')?.innerText ||
          document.title
        ).trim()
        const titreSEO = `${titreBrut.slice(0, 62).trim()} - NEUF Stock France`.slice(0, 80)

        // Extraction du prix compatible Amazon classique + Amazon Haul (ex: 8,22 € séparé en 2 blocs)
        let prixAchat = 15.90
        let prixTrouve = false

        // 1. Essayer de recomposer le prix entier + centimes (format Amazon Haul 8 + 22)
        const prixEntier = document.querySelector('.a-price-whole')?.innerText?.replace(/[^\d]/g, '')
        const prixCentimes = document.querySelector('.a-price-fraction')?.innerText?.replace(/[^\d]/g, '')
        if (prixEntier) {
          prixAchat = parseFloat(`${prixEntier}.${prixCentimes || '00'}`)
          prixTrouve = true
        }

        // 2. Sinon, utiliser les sélecteurs standards Amazon / AliExpress / Cdiscount
        if (!prixTrouve) {
          const selecteursPrix = [
            '.a-price .a-offscreen',
            '#corePriceDisplay_desktop_feature_div .a-offscreen',
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
                prixTrouve = true
                break
              }
            }
          }
        }

        const prixVenteConseille = (Math.ceil((prixAchat * 1.30 + 0.35) / 0.87) - 0.10).toFixed(2)
        const fournisseurNom = estAmazon ? 'Amazon' : estAliExpress ? 'AliExpress' : 'Cdiscount'

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
                  ⛔ Importation bloquée : Produit indisponible
                </div>`
          }
        `
        document.body.appendChild(widgetStock)

        document.getElementById('ebx-import-direct')?.addEventListener('click', () => {
          const urlExport = `${URL_SAAS_EBX}/?auto_titre=${encodeURIComponent(
            titreSEO
          )}&auto_achat=${prixAchat.toFixed(2)}&auto_vente=${prixVenteConseille}&auto_url=${encodeURIComponent(
            window.location.href.split('?')[0]
          )}&auto_fournisseur=${fournisseurNom}&auto_stock=EN_STOCK`
          window.open(urlExport, '_blank')
        })
      }, 1500)
    })
  }

  // ==========================================================================
  // 3. SUR EBAY.FR : PUBLICATION AUTO + SYNC DES VENTES + INJECTION SUIVI
  // ==========================================================================
  if (urlActuelle.includes('ebay.fr') || urlActuelle.includes('ebay.com')) {
    const autoPrix = params.get('ebx_price')
    const autoTitre = params.get('title')
    const autoTracking = params.get('ebx_tracking')

    // A. INJECTION AUTOMATIQUE DU NUMÉRO DE SUIVI SUR EBAY
    if (autoTracking) {
      setTimeout(() => {
        const champTracking = document.querySelector('input[name*="tracking" i], input[id*="tracking" i], input[placeholder*="suivi" i]')
        if (champTracking) {
          champTracking.focus()
          champTracking.value = autoTracking
          champTracking.dispatchEvent(new Event('input', { bubbles: true }))
        }
        navigator.clipboard.writeText(autoTracking)
        const bandeauSuivi = document.createElement('div')
        bandeauSuivi.style =
          'position:fixed;top:0;left:0;right:0;background:#064e3b;color:#34d399;padding:12px;text-align:center;z-index:999999;font-family:sans-serif;font-weight:bold;border-bottom:2px solid #10b981;'
        bandeauSuivi.innerText = `📦 SUIVI EBX PRÊT : Le numéro de suivi "${autoTracking}" est copié et prêt à être validé sur la commande eBay !`
        document.body.prepend(bandeauSuivi)
      }, 1000)
    }

    // B. BOUTON DE SYNCHRONISATION DES COMMANDES EBAY VERS LE SAAS EBX
    if (urlActuelle.includes('/sh/ord') || urlActuelle.includes('myb/PurchaseHistory')) {
      const widgetSyncOrders = document.createElement('div')
      widgetSyncOrders.style =
        'position:fixed;bottom:20px;right:20px;background:#0f172a;color:#fff;padding:16px;border-radius:16px;z-index:999999;font-family:sans-serif;border:2px solid #fbbf24;box-shadow:0 10px 25px rgba(0,0,0,0.5);width:320px;'
      widgetSyncOrders.innerHTML = `
        <div style="font-size:12px;font-weight:bold;color:#fbbf24;margin-bottom:6px;">🔄 EBX ORDER SYNC</div>
        <div style="font-size:12px;color:#cbd5e1;margin-bottom:12px;">Synchroniser les nouvelles ventes eBay directement vers ton Cockpit Auto-Fulfilment.</div>
        <button id="ebx-sync-sale" style="width:100%;background:#fbbf24;color:#020617;border:none;padding:10px;border-radius:10px;font-weight:800;cursor:pointer;font-size:12px;">
          ⚡ Importer la dernière vente dans EBX
        </button>
      `
      document.body.appendChild(widgetSyncOrders)

      document.getElementById('ebx-sync-sale')?.addEventListener('click', () => {
        const titreTrouve = document.querySelector('.item-title, a[href*="itm/"]')?.innerText?.trim() || 'Commande Client eBay.fr'
        const acheteurTrouve = document.querySelector('.buyer-name, [class*="buyer"]')?.innerText?.trim() || 'Acheteur_eBay_Verifie'
        const urlSync = `${URL_SAAS_EBX}/?sync_order=1&order_title=${encodeURIComponent(titreTrouve)}&order_buyer=${encodeURIComponent(acheteurTrouve)}`
        window.open(urlSync, '_blank')
      })
    }

    // C. PILOTE AUTOMATIQUE DE CRÉATION D'ANNONCE EBAY
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