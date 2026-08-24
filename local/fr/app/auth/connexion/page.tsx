"use client";

import { useState, useEffect, FC } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { 
  FiMail, 
  FiLock, 
  FiEye, 
  FiEyeOff, 
  FiArrowRight, 
  FiUser, 
  FiArrowLeft,
  FiShield,
  FiCpu,
  FiServer,
  FiCheckCircle
} from "react-icons/fi";
import { motion, AnimatePresence, Variants } from "framer-motion";
import Image from "next/image";
import aevelogo from "../../../assets/aeve_logo.png";

interface Worker {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
}

const LoginPage: FC = () => {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workerPassword, setWorkerPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showWorkerPassword, setShowWorkerPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [workerLoading, setWorkerLoading] = useState(false);
  const [error, setError] = useState("");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [workersLoading, setWorkersLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<"worker" | "admin">("worker");

  // Fetch workers on mount
  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      setWorkersLoading(true);
      const response = await axios.get("http://localhost:4000/api/auth/workers");
      
      if (response.data && Array.isArray(response.data)) {
        setWorkers(response.data);
      } else {
        setWorkers([]);
      }
    } catch (err) {
      console.error("Failed to fetch workers", err);
      setWorkers([]);
    } finally {
      setWorkersLoading(false);
    }
  };

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      try {
        await axios.get("http://localhost:4000/api/auth/verify-token", {
          headers: { Authorization: `Bearer ${token}` },
        });
        router.replace("/");
      } catch {
        localStorage.removeItem("authToken");
      }
    };
    verifyToken();
  }, [router]);

  const handleWorkerClick = (worker: Worker) => {
    setSelectedWorker(worker);
    setWorkerPassword("");
    setError("");
  };

  const handleBackToWorkers = () => {
    setSelectedWorker(null);
    setWorkerPassword("");
    setError("");
  };

  const handleWorkerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerPassword || !selectedWorker) return;

    setWorkerLoading(true);
    setError("");

    try {
      const response = await axios.post(
        "http://127.0.0.1:4000/api/auth/login",
        { 
          email: selectedWorker.email,
          password: workerPassword
        }
      );
      const { token, user } = response.data;
      
      if (user.role !== 'worker') {
        throw new Error("La connexion est réservée aux employés");
      }
      
      localStorage.setItem("authToken", token);
      localStorage.setItem("userName", user.name);
      localStorage.setItem("userRole", user.role);
      
      router.push("/");
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError("Mot de passe incorrect. Veuillez réessayer.");
      } else {
        setError(err.response?.data?.message || "Erreur de connexion");
      }
    } finally {
      setWorkerLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await axios.post(
        "http://127.0.0.1:4000/api/auth/login",
        { email, password }
      );
      const { token, user } = response.data;
      localStorage.setItem("authToken", token);
      localStorage.setItem("userName", user.name);
      localStorage.setItem("userRole", user.role);
      router.push("/");
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError(
          err.response.data.message === "email"
            ? "Email non trouvé"
            : "Mot de passe incorrect"
        );
      } else {
        setError("Erreur de connexion, veuillez réessayer plus tard");
      }
    } finally {
      setLoading(false);
    }
  };

  // Animation variants
  const fadeIn: Variants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.3 } }
  };

  const cardVariants: Variants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.4 } },
    hover: { scale: 1.02, transition: { duration: 0.2 } },
    tap: { scale: 0.98 }
  };

  return (
    <div className="flex w-screen h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* Left Panel - Branding & Security (Matched with Setup) */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-gray-800 text-white p-12 relative overflow-hidden">
        {/* Background Decorative Graphic */}
        <div className="absolute top-[-10%] right-[-10%] w-[120%] h-[120%] bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-gray-500/30 via-transparent to-transparent opacity-80 z-0"></div>
        <div className="absolute bottom-[10%] left-[-20%] w-[80%] h-[80%] bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent blur-3xl z-0"></div>

        <div className="relative z-10">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4 mb-16"
          >
            <div className="p-3 bg-white/10 rounded-full  shadow-lg border border-white/20">
              <Image src={aevelogo} alt="AEVE Logo" width={100} height={100} className="w-auto h-24" />
            </div>
            <div className="flex flex-col">
           
              <span className="text-sm font-extralight text-gray-400">Logiciel Point de Vente Intelligent</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-4xl xl:text-5xl font-extrabold leading-tight mb-6 uppercase tracking-tight">
              Système de<br />
              Gestion Intelligent
            </h1>
            <p className="text-lg text-gray-200 max-w-md font-light leading-relaxed mb-12">
              Identifiez-vous pour accéder au terminal de vente et aux outils d'administration. Ce terminal est sécurisé par licence.
            </p>

            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="mt-1 bg-gray-800/80 p-2.5 rounded-lg border border-gray-700/50 shadow-sm">
                  <FiCpu className="w-5 h-5 text-gray-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-white tracking-wide">Protection Matérielle</h3>
                  <p className="text-sm text-gray-300 leading-relaxed mt-1">L'application est cryptée et liée physiquement aux composants de cette machine.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="mt-1 bg-gray-800/80 p-2.5 rounded-lg border border-gray-700/50 shadow-sm">
                  <FiServer className="w-5 h-5 text-gray-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-white tracking-wide">Environnement Isolé</h3>
                  <p className="text-sm text-gray-300 leading-relaxed mt-1">Vos données de vente et stocks fonctionnent en configuration locale sécurisée.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="relative z-10 pt-16 mt-auto">
          <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
            <FiShield className="w-4 h-4  text-green-500" />
            <span>Serveur Local : Terminal Authentifié</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Interaction Area */}
      <div className="flex-1 flex flex-col relative bg-white overflow-y-auto">
        {/* Mode Switcher - Matched with Setup Badge style */}
        <div className="absolute top-8 right-8 z-20">
          <button
            onClick={() => {
              setLoginMode(loginMode === "worker" ? "admin" : "worker");
              setError("");
              setSelectedWorker(null);
            }}
            className="flex items-center gap-1.5 px-6 py-4 rounded-full bg-gray-50 border border-gray-200 text-gray-600 text-xs font-bold uppercase tracking-widest hover:bg-gray-100  shadow-sm"
          >
            <FiShield className="w-3.5 h-3.5" />
            {loginMode === "worker" ? "Accès Admin" : "Accès Personnel"}
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center items-center p-8 sm:p-12 xl:p-24">
          <div className="w-full max-w-lg xl:max-w-xl">
            
            <AnimatePresence mode="wait">
              {loginMode === "worker" ? (
                /* WORKER MODE */
                <motion.div
                  key="worker-selection"
                  variants={fadeIn}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="w-full"
                >
                  {!selectedWorker ? (
                    <>
                      <div className="mb-10 text-center lg:text-left">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-widest mb-4 shadow-sm">
                          Ouverture de Session
                        </span>
                        <h2 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">
                          Portail Personnel
                        </h2>
                        <p className="text-gray-500 text-base font-light">
                          Veuillez choisir votre compte pour débuter la session de vente.
                        </p>
                      </div>

                      {workersLoading ? (
                        <div className="grid grid-cols-2 gap-4 ">
                          {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-32 bg-gray-50 rounded-xl border border-gray-200"></div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                          {workers.map((worker) => (
                            <motion.div
                              key={worker.id}
                              variants={cardVariants}
                              whileHover="hover"
                              whileTap="tap"
                              onClick={() => handleWorkerClick(worker)}
                              className="group relative bg-white p-5 rounded-xl border-2 border-gray-100 hover:border-gray-600 hover:bg-gray-50  cursor-pointer flex flex-col items-center text-center shadow-sm"
                            >
                              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4 group-hover:bg-white ">
                                <FiUser className="w-6 h-6 text-gray-500" />
                              </div>
                              <h3 className="font-bold text-gray-900 text-sm tracking-tight mb-1 truncate w-full px-2">
                                {worker.name}
                              </h3>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                Personnel
                              </p>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    /* WORKER PASSWORD FORM */
                    <motion.div
                      variants={fadeIn}
                      initial="initial"
                      animate="animate"
                      className="w-full"
                    >
                      <button
                        onClick={handleBackToWorkers}
                        className="flex items-center gap-2 text-gray-400 hover:text-gray-600 mb-8  text-xs font-bold uppercase tracking-widest"
                      >
                        <FiArrowLeft className="w-4 h-4" />
                        Retour
                      </button>

                      <div className="flex items-center gap-6 mb-10 p-6 bg-gray-50 rounded-2xl border-2 border-gray-200">
                        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-100">
                          <FiUser className="w-8 h-8 text-gray-600" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-extrabold text-gray-900 mb-1 tracking-tight">
                            {selectedWorker.name}
                          </h2>
                          <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Vérification d'Identité</p>
                        </div>
                      </div>

                      <form onSubmit={handleWorkerLogin} className="space-y-6">
                        <div>
                          <label className="block text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">
                            Code de Sécurité
                          </label>
                          <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                              <FiLock className="w-5 h-5 text-gray-400 group-focus-within:text-gray-600 " />
                            </div>
                            <input
                              type={showWorkerPassword ? "text" : "password"}
                              value={workerPassword}
                              onChange={(e) => setWorkerPassword(e.target.value)}
                              className="w-full pl-11 pr-11 py-4 bg-gray-50 border-2 border-gray-200 text-gray-900  text-lg rounded-xl focus:ring-0 focus:border-gray-600 focus:bg-white outline-none "
                              placeholder="••••"
                              required
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => setShowWorkerPassword(!showWorkerPassword)}
                              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 "
                            >
                              {showWorkerPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                        {error && (
                          <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-200 flex items-center gap-3">
                            <FiLock className="w-4 h-4 text-red-600" />
                            <div className="font-medium">{error}</div>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={workerLoading || !workerPassword}
                          className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 text-lg font-bold  shadow-lg ${
                            workerLoading || !workerPassword
                              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                              : "bg-gray-600 text-white hover:bg-gray-700 active:scale-[0.98]"
                          }`}
                        >
                          {workerLoading ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full "></div>
                              Connexion...
                            </>
                          ) : (
                            <>
                              <span>Se connecter</span>
                              <FiArrowRight className="w-5 h-5" />
                            </>
                          )}
                        </button>
                      </form>
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                /* ADMIN MODE */
                <motion.div
                  key="admin-login"
                  variants={fadeIn}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="w-full"
                >
                  <div className="mb-10 text-center lg:text-left">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-100 text-red-600 text-xs font-bold uppercase tracking-widest mb-4 shadow-sm">
                      Accès Restreint
                    </span>
                    <h2 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">
                      Administration
                    </h2>
                    <p className="text-gray-500 text-base font-light leading-relaxed">
                      Saisissez vos identifiants pour accéder aux paramètres et à la gestion du magasin.
                    </p>
                  </div>

                  <form onSubmit={handleEmailLogin} className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">
                        Identifiant E-mail
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <FiMail className="w-5 h-5 text-gray-400 group-focus-within:text-gray-600 " />
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-11 pr-4 py-4 bg-gray-50 border-2 border-gray-200 text-gray-900 rounded-xl focus:ring-0 focus:border-gray-600 focus:bg-white outline-none "
                          placeholder="votre email ici"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-3">
                        <label className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                          Mot de Passe
                        </label>
                      </div>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <FiLock className="w-5 h-5 text-gray-400 group-focus-within:text-gray-600 " />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-11 pr-11 py-4 bg-gray-50 border-2 border-gray-200 text-gray-900 rounded-xl focus:ring-0 focus:border-gray-600 focus:bg-white outline-none "
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 "
                        >
                          {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-200 flex items-center gap-3">
                        <FiLock className="w-4 h-4 text-red-600" />
                        <div className="font-medium">{error}</div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 text-lg font-bold  shadow-lg ${
                        loading
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-gray-600 text-white hover:bg-gray-700 active:scale-[0.98]"
                      }`}
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full "></div>
                          Chargement...
                        </>
                      ) : (
                        <>
                          <span>Accéder à la gestion</span>
                          <FiArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer Attribution - Matched with Setup */}
            <div className="mt-12 pt-8 border-t border-gray-100 flex items-center justify-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-widest">
              <FiLock className="w-3.5 h-3.5" />
              <span>Environnement Sécurisé par le Groupe Dev AEVE • © 2025-2026</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
