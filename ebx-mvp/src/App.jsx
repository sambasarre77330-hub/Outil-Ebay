import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { ShoppingBag, TrendingUp, ShieldAlert, Zap, ArrowRight, LogOut, CheckCircle2, Lock, Mail, PackageSearch } from 'lucide-react'
import Dashboard from './components/Dashboard'
export default function App() {
  // --- ÉTATS (La mémoire de notre page) ---
  const [session, setSession] = useState(null)
  const [afficherAuth, setAfficherAuth] = useState(false)
  const [modeInscription, setModeInscription] = useState(false)
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [chargement, setChargement] = useState(false)
  const [message, setMessage] = useState({ type: '', texte: '' })

  // --- VÉRIFICATION AUTOMATIQUE DE LA CONNEXION ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // --- FONCTION D'INSCRIPTION OU DE CONNEXION ---
  const gererAuthentification = async (e) => {
    e.preventDefault()
    setChargement(true)
    setMessage({ type: '', texte: '' })

    try {
      if (modeInscription) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage({ 
          type: 'succes', 
          texte: 'Compte créé ! Vérifie tes mails ou connecte-toi directement.' 
        })
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (error) {
      setMessage({ type: 'erreur', texte: error.message })
    } finally {
      setChargement(false)
    }
  }

  // --- FONCTION DE DÉCONNEXION ---
  const seDeconnecter = async () => {
    await supabase.auth.signOut()
    setAfficherAuth(false)
  }

  // =========================================================================
  // ÉCRAN 1 : UTILISATEUR CONNECTÉ -> ON AFFICHE LE DASHBOARD COMPLET
  // =========================================================================
  if (session) {
    return <Dashboard session={session} seDeconnecter={seDeconnecter} />
  }

  // =========================================================================
  // ÉCRAN 2 : CONNEXION / INSCRIPTION
  // =========================================================================
  if (afficherAuth) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4">
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 max-w-md w-full">
          <button 
            onClick={() => setAfficherAuth(false)}
            className="text-sm text-slate-400 hover:text-white mb-6 inline-block cursor-pointer"
          >
            ← Retour à l'accueil
          </button>

          <div className="flex items-center gap-2 font-extrabold text-xl mb-2">
            <Zap className="w-6 h-6 text-amber-400" />
            <span>EBX<span className="text-amber-400">.COMMAND</span></span>
          </div>

          <h2 className="text-2xl font-bold mb-1">
            {modeInscription ? 'Rejoindre la flotte' : 'Accès au cockpit'}
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            {modeInscription 
              ? 'Créez votre compte pour automatiser vos boutiques eBay.' 
              : 'Connectez-vous pour gérer vos annonces et vos stocks.'}
          </p>

          {message.texte && (
            <div className={`p-3 rounded-lg text-sm mb-4 ${
              message.type === 'erreur' ? 'bg-red-950/60 text-red-300 border border-red-800' : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
            }`}>
              {message.texte}
            </div>
          )}

          <form onSubmit={gererAuthentification} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Adresse e-mail</label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vendeur@ebay-pro.com"
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Mot de passe (6 caractères min.)</label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={chargement}
              className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold py-2.5 rounded-lg transition cursor-pointer disabled:opacity-50"
            >
              {chargement ? 'Chargement...' : (modeInscription ? "Créer mon compte" : 'Se connecter')}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            {modeInscription ? 'Déjà membre ?' : "Pas encore de compte ?"}{' '}
            <button
              onClick={() => {
                setModeInscription(!modeInscription)
                setMessage({ type: '', texte: '' })
              }}
              className="text-amber-400 font-semibold hover:underline cursor-pointer"
            >
              {modeInscription ? 'Se connecter' : 'Créer un compte'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // ÉCRAN 3 : LANDING PAGE FAÇON EBX.ARMY (Dark Mode / Vendeurs eBay)
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <nav className="max-w-6xl w-full mx-auto px-6 py-5 flex justify-between items-center">
        <div className="flex items-center gap-2 font-extrabold text-xl tracking-wider">
          <Zap className="w-7 h-7 text-amber-400" />
          <span>EBX<span className="text-amber-400">.COMMAND</span></span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setModeInscription(false); setAfficherAuth(true); }}
            className="text-sm font-medium text-slate-300 hover:text-white px-4 py-2 cursor-pointer"
          >
            Connexion
          </button>
          <button
            onClick={() => { setModeInscription(true); setAfficherAuth(true); }}
            className="text-sm font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2 rounded-lg transition cursor-pointer"
          >
            Lancer mon empire
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-5xl mx-auto px-6 py-16 text-center flex flex-col justify-center">
        <div className="inline-flex items-center gap-2 bg-amber-400/10 text-amber-400 border border-amber-400/20 px-3 py-1 rounded-full text-xs font-semibold mx-auto mb-6">
          <span>Inspiré par EBX.army</span>
          <span>•</span>
          <span>Automatisation & Dropshipping eBay</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
          Dominez eBay sans effort. <br />
          <span className="text-amber-400">Automatisez vos boutiques.</span>
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
          Le centre de commandement tout-en-un pour gérer vos comptes eBay, surveiller les stocks de vos fournisseurs, calculer vos marges nettes et lister vos produits gagnants.
        </p>

        <div className="flex justify-center gap-4 mb-20">
          <button
            onClick={() => { setModeInscription(true); setAfficherAuth(true); }}
            className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-6 py-3.5 rounded-xl transition cursor-pointer"
          >
            Accéder à la plateforme
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 text-left">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
            <div className="w-10 h-10 bg-amber-400/10 text-amber-400 rounded-lg flex items-center justify-center mb-4">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg mb-2">Gestion Multi-Boutiques</h3>
            <p className="text-sm text-slate-400">
              Suivez vos différents comptes eBay, vos limites de vente mensuelles et la santé de vos boutiques sur un seul écran sécurisé.
            </p>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
            <div className="w-10 h-10 bg-amber-400/10 text-amber-400 rounded-lg flex items-center justify-center mb-4">
              <PackageSearch className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg mb-2">Sourcing & Auto-Pricer</h3>
            <p className="text-sm text-slate-400">
              Calculez automatiquement vos bénéfices après frais eBay et surveillez les variations de prix et de stocks fournisseurs.
            </p>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
            <div className="w-10 h-10 bg-amber-400/10 text-amber-400 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg mb-2">Suivi des Commandes</h3>
            <p className="text-sm text-slate-400">
              Centralisez vos ventes, gérez vos numéros de suivi et analysez votre rentabilité nette jour après jour.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}