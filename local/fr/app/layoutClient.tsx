"use client";

import { useEffect, useState, useRef, useCallback, useLayoutEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Navbar from "../constants/Navbar";
import { AlertProvider } from "../components/AlertContext";
import axios from "axios";
import { FiRefreshCw, FiCheck, FiAlertCircle, FiClock, FiLogIn, FiLogOut } from "react-icons/fi";
import ClockInModal from "../components/Shift/ClockInModal";
import ClockOutModal from "../components/Shift/ClockOutModal";
import { useAuth } from "../lib/contexts/AuthContext";

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userRole, activeShift, isLoading, logout, refreshShift } = useAuth();
  
  const hideNavbar = pathname.includes("/auth") || pathname.includes("/setup");
  
  // Auto-Update State
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'updating' | 'success' | 'error'>('idle');
  const [updateMessage, setUpdateMessage] = useState<string>('');
  
  // Refs
  const isUpdatingRef = useRef<boolean>(false);
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isClockInOpen, setIsClockInOpen] = useState(false);
  const [isClockOutOpen, setIsClockOutOpen] = useState(false);

  // 🕐 Format time ago helper
  const formatTimeAgo = useCallback((timestamp: number | null): string => {
    if (!timestamp) return 'Jamais';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'À l\'instant';
    if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)} h`;
    return new Date(timestamp).toLocaleDateString('fr-TN');
  }, []);

  // 🔄 Trigger backend auto-update (with debounce)
  const triggerAutoUpdate = useCallback(async (force: boolean = false): Promise<boolean> => {
    if (isUpdatingRef.current) {
      console.log('⏳ Update already in progress, skipping...');
      return false;
    }

    try {
      isUpdatingRef.current = true;
      setUpdateStatus('updating');
      setUpdateMessage('Synchronisation en cours...');
      
      console.log('🔄 Triggering auto-update...', force ? '(forced)' : '');
      
      const response = await fetch('http://localhost:4000/api/database/auto-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Auto-update successful:', result);
      
      const currentTime = Date.now();
      setLastUpdateTime(currentTime);
      localStorage.setItem('lastupdate', currentTime.toString());
      
      setUpdateStatus('success');
      setUpdateMessage(result.message || 'Base de données synchronisée ✓');
      
      return true;
      
    } catch (error) {
      console.error('❌ Auto-update failed:', error);
      setUpdateStatus('error');
      setUpdateMessage(error instanceof Error ? error.message : 'Échec de la synchronisation');
      return false;
      
    } finally {
      isUpdatingRef.current = false;
      
      statusTimeoutRef.current = setTimeout(() => {
        if (updateStatus !== 'updating') {
          setUpdateStatus('idle');
          setUpdateMessage('');
        }
      }, updateStatus === 'error' ? 8000 : 4000);
    }
  }, [updateStatus]);

  // 🔍 Check if update is needed (5-minute threshold)
  const checkAndUpdateDatabase = useCallback(async () => {
    if (updateStatus === 'updating') return;
    
    try {
      setUpdateStatus('checking');
      const storedLastUpdate = localStorage.getItem('lastupdate');
      const currentTime = Date.now();
      const FIVE_MINUTES_MS = 300000;
      
      if (!storedLastUpdate || (currentTime - parseInt(storedLastUpdate)) > FIVE_MINUTES_MS) {
        console.log(`🕐 Update needed | Last: ${storedLastUpdate ? new Date(parseInt(storedLastUpdate)).toLocaleTimeString('fr-TN') : 'never'}`);
        await triggerAutoUpdate();
      } else {
        const minutesAgo = Math.floor((currentTime - parseInt(storedLastUpdate)) / 60000);
        console.log(`⏭️ Skip update | Last: ${minutesAgo} min ago`);
        setLastUpdateTime(parseInt(storedLastUpdate));
        setUpdateStatus('idle');
      }
    } catch (error) {
      console.error('Error in checkAndUpdateDatabase:', error);
      setUpdateStatus('idle');
    }
  }, [triggerAutoUpdate, updateStatus]);

  // 🚀 Manual refresh handler
  const handleManualRefresh = useCallback(async () => {
    if (updateStatus === 'updating') return;
    
    setUpdateStatus('updating');
    setUpdateMessage('Actualisation...');
    
    const success = await triggerAutoUpdate(true);
    
    if (success) {
      // Refresh user data after successful update
      await refreshShift();
    }
  }, [triggerAutoUpdate, updateStatus, refreshShift]);

  // 🔌 Check if auto-update endpoint is available
  const checkAutoUpdateAvailability = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch('http://localhost:4000/api/database/check-auto-update', {
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Auto-update endpoint available:', result);
      }
    } catch (error) {
      console.log('⚠️ Auto-update endpoint unavailable - using fallback');
    }
  }, []);

  // 🎯 Initialize from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('lastupdate');
    if (stored) {
      setLastUpdateTime(parseInt(stored));
    }
  }, []);

  // ⚙️ Setup background sync interval
  useEffect(() => {
    /* Auto-update disabled as requested */
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // 📊 Debug: Log userRole changes
  useEffect(() => {
    console.log('🔄 LayoutClient - userRole changed:', userRole);
    console.log('🔄 LayoutClient - current path:', pathname);
  }, [userRole, pathname]);

  // Shift Session Logic
  const handleClockIn = async (startingCash: number) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post('http://localhost:4000/api/shifts/clock-in', 
        { starting_cash: startingCash },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        await refreshShift();
        setIsClockInOpen(false);
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur lors de l\'ouverture de session');
    }
  };

  const handleClockOut = async (endingCash: number, notes: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post('http://localhost:4000/api/shifts/clock-out', 
        { ending_cash: endingCash, notes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        await refreshShift();
        setIsClockOutOpen(false);
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur lors de la clôture de session');
    }
  };

  // 🔐 Device Control Logic
  useEffect(() => {
    const checkDevice = async () => {
      try {
        const deviceRes = await axios.get("http://localhost:4000/api/device/check");
        if (!deviceRes.data.valid) {
          if (!pathname.includes("/setup")) {
            router.replace("/setup");
          }
        } else {
          if (pathname.includes("/setup")) {
            router.replace("/");
          }
          if (deviceRes.data.templateMode) {
            localStorage.setItem("templateMode", deviceRes.data.templateMode);
          }
        }
      } catch (error) {
        console.error("Device check error:", error);
      }
    };

    if (!hideNavbar) {
      checkDevice();
    }
  }, [pathname, router, hideNavbar]);
  
  // 🚫 ROUTE PROTECTION - FIXED: Using useLayoutEffect for immediate redirect
  useLayoutEffect(() => {
    // Skip protection for auth/setup pages
    if (hideNavbar) return;
    
    // Skip if userRole is not loaded yet
    if (!userRole) return;
    
    // Restricted routes for workers
    const restrictedPaths = [
      "/gestion",
      "/parametres", 
      "/credit",
      "/ia",
      "/rapports"
    ];
    
    const isRestricted = restrictedPaths.some(path => pathname.includes(path));
    
    console.log(`🔐 Route protection check: userRole=${userRole}, path=${pathname}, restricted=${isRestricted}`);
    
    if (userRole === "worker" && isRestricted) {
      console.log("🚫 Worker trying to access restricted route - redirecting to /403");
      router.replace("/403");
    }
  }, [pathname, userRole, router, hideNavbar]);

  // 🚫 Route protection for Store template
  useLayoutEffect(() => {
    const template = localStorage.getItem("templateMode");
    if (template === "store" && pathname.includes("/repartition")) {
      router.replace("/");
    }
  }, [pathname, router]);

  // 🎨 Loading State
  if (!hideNavbar && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 uppercase">
        <div className="text-center font-black">
          <p className="text-gray-900 border-2 border-gray-900 px-6 py-4">Session...</p>
        </div>
      </div>
    );
  }
  
  return (
    <AlertProvider>
      {!hideNavbar && (
        <>
          <Navbar 
            onOpenClockIn={() => setIsClockInOpen(true)}
            onOpenClockOut={() => setIsClockOutOpen(true)}
          />
          
          {/* 🔄 Sync Status Bar */}
          {updateStatus !== 'idle' && !hideNavbar && (
            <div className={`sticky top-16 z-30 ${
              updateStatus === 'error' ? 'bg-red-50 border-red-200' :
              updateStatus === 'success' ? 'bg-green-50 border-green-200' :
              'bg-gray-50 border-gray-200'
            } border-b px-4 py-2.5`}>
              <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`shrink-0 p-1.5 rounded-full ${
                    updateStatus === 'updating' ? 'bg-gray-100 text-gray-600' :
                    updateStatus === 'success' ? 'bg-green-100 text-green-600' :
                    updateStatus === 'error' ? 'bg-red-100 text-red-600' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {updateStatus === 'updating' ? (
                      <FiRefreshCw className="w-4 h-4" />
                    ) : updateStatus === 'success' ? (
                      <FiCheck className="w-4 h-4" />
                    ) : (
                      <FiAlertCircle className="w-4 h-4" />
                    )}
                  </span>
                  
                  <p className={`text-sm font-medium truncate ${
                    updateStatus === 'error' ? 'text-red-800' :
                    updateStatus === 'success' ? 'text-green-800' :
                    'text-gray-800'
                  }`}>
                    {updateMessage || 'Synchronisation...'}
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    setUpdateStatus('idle');
                    setUpdateMessage('');
                  }}
                  className="shrink-0 text-gray-400 hover:text-gray-600 p-1"
                  aria-label="Fermer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}
      
      <main className={`min-h-full w-full mx-auto ${!hideNavbar ? "pt-16" : ""}`}>
        <div className="w-full h-full">
          {children}
        </div>
      </main>

      <ClockInModal 
        isOpen={isClockInOpen} 
        onClose={() => setIsClockInOpen(false)} 
        onClockIn={handleClockIn} 
      />
      <ClockOutModal 
        isOpen={isClockOutOpen} 
        onClose={() => setIsClockOutOpen(false)} 
        onClockOut={handleClockOut}
        activeShift={activeShift}
      />
    </AlertProvider>
  );
}