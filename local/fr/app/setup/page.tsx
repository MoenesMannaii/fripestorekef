"use client";
import { Store, Coffee } from 'lucide-react';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Logo from "../../assets/aeve_logo.png"
import axios from "axios";
import { FiLock, FiCheckCircle, FiShield, FiCpu, FiServer, FiCheck } from "react-icons/fi";


export default function SetupPage() {
  const router = useRouter();
  const [secretCode, setSecretCode] = useState("");
  const [templateMode, setTemplateMode] = useState<"store" | "restaurant">("store");
  const [hasPermanentTemplate, setHasPermanentTemplate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await axios.get("http://localhost:4000/api/device/check");
        if (res.data.valid) {
          localStorage.setItem("templateMode", res.data.templateMode);
          router.replace("/");
        } else {
          setHasPermanentTemplate(res.data.hasPermanentTemplate);
          if (res.data.hasPermanentTemplate && res.data.templateMode) {
             setTemplateMode(res.data.templateMode as "store" | "restaurant");
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    checkStatus();
  }, [router]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await axios.post("http://localhost:4000/api/device/unlock", {
        secretCode,
        templateMode,
      });

      if (res.data.success) {
        localStorage.setItem("templateMode", res.data.templateMode);
        window.location.href = "/";
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur de connexion au serveur de licence.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-screen h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* Left Panel - Branding & Security Context (Hidden on small screens) */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-gray-800 text-white p-12 relative overflow-hidden">
        {/* Background Decorative Graphic */}
        <div className="absolute top-[-10%] right-[-10%] w-[120%] h-[120%] bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-gray-500/30 via-transparent to-transparent opacity-80 z-0"></div>
        <div className="absolute bottom-[10%] left-[-20%] w-[80%] h-[80%] bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent blur-3xl z-0"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="p-3 bg-white/10 rounded-full  shadow-lg border border-white/20">
              <Image src={Logo} alt="Logo" width={90} height={90} />
            </div>
            <div className="flex flex-col">
{/*               <span className="text-2xl font-bold tracking-widest">AEVE</span>
 */}              <span className="text-sm font-extralight">Logiciel Point de Vente Intelligent</span>
            </div>
            
          </div>

          <h1 className="text-4xl xl:text-5xl font-extrabold leading-tight mb-6">
            Initialisation &<br />
            Sécurisation de l'Appareil
          </h1>
          <p className="text-lg text-gray-200 max-w-md font-light">
            Bienvenue dans l'assistant de configuration. Ce terminal doit être authentifié 
            pour opérer avec votre licence d'entreprise.
          </p>

          <div className="mt-16 space-y-8">
            <div className="flex items-start gap-4">
              <div className="mt-1 bg-gray-800/80 p-2.5 rounded-lg border border-gray-700/50 shadow-sm">
                <FiLock className="w-5 h-5 text-gray-300" />
              </div>
              <div>
                <h3 className="font-semibold text-white tracking-wide">Protection Matérielle</h3>
                <p className="text-sm text-gray-300 leading-relaxed mt-1">L'application est cryptée et liée physiquement aux composants de cette machine (UUID Hardware).</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="mt-1 bg-gray-800/80 p-2.5 rounded-lg border border-gray-700/50 shadow-sm">
                <FiCpu className="w-5 h-5 text-gray-300" />
              </div>
              <div>
                <h3 className="font-semibold text-white tracking-wide">Environnement Isolé</h3>
                <p className="text-sm text-gray-300 leading-relaxed mt-1">Vos données de vente et stocks fonctionnent en configuration locale, sans aucune perturbation du réseau.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-16 mt-auto">
          <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
            <FiServer className="w-4 h-4 " />
            <span>Serveur Local : En attente d'authentification...</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Setup Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 sm:p-12 relative bg-white">
        <div className="w-full max-w-lg xl:max-w-xl">
          
          <div className="mb-10 lg:hidden flex items-center gap-3">
            <div className="p-2.5 bg-gray-600 rounded-lg shadow-md">
              <FiShield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">AEVE POS</span>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-100 text-red-600 text-xs font-bold uppercase tracking-widest mb-4 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-red-500 "></span>
              Accès Restreint
            </span>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">
              Interface Verrouillée
            </h2>
            <p className="text-gray-500 leading-relaxed text-sm sm:text-base">
              Veuillez saisir le code administrateur pour lier de manière permanente ce terminal à votre licence d'utilisation.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-8">
            
            {/* Version Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                  1. Version du Logiciel
                </label>
                {hasPermanentTemplate && (
                  <span className="text-xs font-semibold text-gray-600 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100 flex items-center gap-1">
                    <FiLock className="w-3 h-3" /> Mémorisée
                  </span>
                )}
              </div>
              
              {hasPermanentTemplate ? (
                <div className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-200 flex items-center gap-5 shadow-inner">
                  <div className="p-4 bg-white rounded-full shadow-sm border border-gray-100">
                    {templateMode === "store" ? <Store className="w-8 h-8 text-gray-600" /> : <Coffee className="w-8 h-8 text-gray-600" />}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xl text-gray-900">
                      {templateMode === "store" ? "Édition Magasin" : "Édition Restaurant"}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 font-medium">Pré-configuré sur cette machine.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setTemplateMode("store")}
                    className={`relative p-5 rounded-2xl flex flex-col items-center justify-center border-2   outline-none ${
                      templateMode === "store"
                        ? "border-gray-600 bg-gray-50/50 shadow-[0_0_0_4px_rgba(79,70,229,0.1)]"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {templateMode === "store" && (
                      <div className="absolute top-3 right-3 text-gray-600">
                        <FiCheckCircle className="w-5 h-5 bg-white rounded-full" />
                      </div>
                    )}
                    <div className={`p-3 rounded-full mb-3 ${templateMode === "store" ? "bg-gray-100 text-gray-600" : "bg-gray-100 text-gray-500"}`}>
                      <Store className="w-7 h-7" />
                    </div>
                    <span className={`font-bold text-lg ${templateMode === "store" ? "text-gray-900" : "text-gray-700"}`}>Magasin</span>
                    <span className="text-xs text-center text-gray-500 mt-1.5 font-medium leading-relaxed">
                      Caisse, Stocks, Factures, Produits
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTemplateMode("restaurant")}
                    className={`relative p-5 rounded-2xl flex flex-col items-center justify-center border-2   outline-none ${
                      templateMode === "restaurant"
                        ? "border-gray-600 bg-gray-50/50 shadow-[0_0_0_4px_rgba(79,70,229,0.1)]"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {templateMode === "restaurant" && (
                      <div className="absolute top-3 right-3 text-gray-600">
                        <FiCheckCircle className="w-5 h-5 bg-white rounded-full" />
                      </div>
                    )}
                    <div className={`p-3 rounded-full mb-3 ${templateMode === "restaurant" ? "bg-gray-100 text-gray-600" : "bg-gray-100 text-gray-500"}`}>
                      <Coffee className="w-7 h-7" />
                    </div>
                    <span className={`font-bold text-lg ${templateMode === "restaurant" ? "text-gray-900" : "text-gray-700"}`}>Restaurant</span>
                    <span className="text-xs text-center text-gray-500 mt-1.5 font-medium leading-relaxed">
                      Plans de Table, Cuisine, Répartition
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Secret Code Input */}
            <div>
              <label htmlFor="secretCode" className="block text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">
                2. Code Administrateur
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FiLock className={`w-5 h-5  ${secretCode ? "text-gray-600" : "text-gray-400 group-focus-within:text-gray-500"}`} />
                </div>
                <input
                  type="password"
                  id="secretCode"
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 bg-gray-50 border-2 border-gray-200 text-gray-900  text-lg rounded-xl focus:ring-0 focus:border-gray-600 focus:bg-white outline-none  placeholder:text-gray-400 placeholder:font-sans placeholder:text-base"
                  placeholder="Saisissez la clé de sécurité"
                  autoComplete="off"
                  required
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-200 flex items-start gap-3   ">
                <div className="mt-0.5 bg-red-100 rounded-full p-1"><FiLock className="w-4 h-4 text-red-600" /></div>
                <div className="font-medium">{error}</div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading || !secretCode}
                className={`group relative w-full flex items-center justify-center py-4 px-8 rounded-xl text-lg font-bold text-white   overflow-hidden ${
                  loading || !secretCode
                    ? "bg-gray-300 cursor-not-allowed shadow-inner text-gray-500"
                    : "bg-gray-600 hover:bg-gray-700 active:transform active:scale-[0.98] shadow-lg hover:shadow-gray-500/30"
                }`}
              >
                {/* Button shine effect */}
                {!loading && secretCode && (
                  <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"></div>
                )}
                
                {loading ? (
                  <span className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full "></div>
                    Authentification et Liaison...
                  </span>
                ) : (
                  <span className="flex items-center gap-3 relative z-10">
                    <FiCheck className="w-6 h-6" />
                    Déverrouiller et Lier le Terminal
                  </span>
                )}
              </button>
            </div>
          </form>

          <div className="mt-12 pt-8 border-t border-gray-100 flex items-center justify-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-widest h-10">
            <FiLock className="w-3.5 h-3.5" />
            Environnement Sécurisé par le Groupe Dev AEVE • © 2025-2026
          </div>
        </div>
      </div>
    </div>
  );
}

