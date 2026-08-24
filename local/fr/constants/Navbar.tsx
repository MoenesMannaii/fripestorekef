"use client";
import { Bell, Package, ChevronDown, User, X, History } from 'lucide-react';

import React, { useState, useEffect } from "react";
import { FiLogOut, FiLogIn } from "react-icons/fi";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "../assets/AEVE.png";
import userAvatar from "../assets/user.png"
import Image from "next/image";
import { useAuth } from "../lib/contexts/AuthContext";


const formatStockDisplay = (item: { stock: number; has_sub_units?: boolean; pieces_per_box?: number }) => {
  if (!item.has_sub_units || !item.pieces_per_box) return `${item.stock}`;
  const boxes = Math.floor(item.stock);
  const fractional = item.stock - boxes;
  const loose = Math.round(fractional * item.pieces_per_box);
  if (boxes > 0 && loose > 0) return `${boxes} Bt. + ${loose} Un.`;
  if (boxes > 0) return `${boxes} Bt.`;
  return `${loose} Un.`;
};

const Navbar: React.FC<{
  onOpenClockIn?: () => void;
  onOpenClockOut?: () => void;
}> = ({ onOpenClockIn, onOpenClockOut }) => {
  const { user, activeShift, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userInitials, setUserInitials] = useState("JD");
  const [templateMode, setTemplateMode] = useState<string>("restaurant");

  // Notification States
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    fetchLowStockAlerts();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fetchLowStockAlerts = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const res = await fetch("http://localhost:4000/api/products/notifications/low-stock", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data || []);
        // Just as an example, everything fetched is considered 'unread' for the glowing indicator
        setUnreadCount(data.count || 0);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  // Get user info from localStorage on component mount
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const user = JSON.parse(userData);

        // ✅ Handle both name or firstName + lastName
        let initials = "JD";
        if (user.firstName || user.lastName) {
          const first = user.firstName ? user.firstName.charAt(0) : "";
          const last = user.lastName ? user.lastName.charAt(0) : "";
          initials = (first + last).toUpperCase();
        } else if (user.name) {
          // Fallback if the object has a "name" key instead
          initials = user.name
            .split(" ")
            .map((word) => word.charAt(0))
            .join("")
            .toUpperCase()
            .slice(0, 2);
        }

        setUserInitials(initials);
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
    
    // Load template mode from localStorage
    const storedTemplateInfo = localStorage.getItem("templateMode");
    if (storedTemplateInfo) {
      setTemplateMode(storedTemplateInfo);
    }
  }, []);

  // Function to check if a link is active
  const isActiveLink = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    // For other paths, check if the current path starts with the link path
    return pathname.startsWith(path);
  };

  // Function to get link styles based on active state
  const getLinkStyles = (path: string) => {
    const isActive = isActiveLink(path);
    return `px-5 py-5 text-sm font-medium flex items-center border-b-2 ${
      isActive
        ? "text-gray-900 border-gray-900 bg-gray-50/50"
        : "text-gray-500 border-transparent hover:text-gray-800 hover:bg-gray-50"
    }`;
  };

  // Logout function
  const handleLogout = () => {
    // Remove auth token and user data from localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('cart'); // Optional: clear cart on logout

    // Close menus
    setUserMenu(false);
    setOpen(false);

    // Redirect to login page
    router.push('/auth/connexion');
  };

  return (
    <nav
      className={`fixed top-0 left-0 w-full border-b border-gray-300 z-50 ${
        scrolled ? "shadow-md bg-white/95 " : "bg-white"
      }`}
    >
      <div className="max-w-full mx-auto flex items-center justify-between px-4 sm:px-8">
        {/* Left: Logo */}
        <Link href="/" className="font-bold py-2" prefetch={false}>
          <Image src={Logo} alt="POS System Logo" className="w-20 h-auto" />
        </Link>


        {/* Desktop & Tablet Links */}
        <div className="hidden sm:flex items-stretch self-stretch">
          <Link href="/" className={getLinkStyles("/")} prefetch={false}>
            Ventes
          </Link>
          <Link href="/gestion" className={getLinkStyles("/gestion")} prefetch={false}>
            Gestion
          </Link>
          <Link href="/rapports" className={getLinkStyles("/rapports")} prefetch={false}>
            Rapports
          </Link>
          <Link href="/ia" className={getLinkStyles("/ia")} prefetch={false}>
            Insights IA
          </Link>
          <Link href="/credit" className={getLinkStyles("/credit")} prefetch={false}>
            Crédit
          </Link>
          {templateMode !== "store" && (
            <Link href="/repartition" className={getLinkStyles("/repartition")} prefetch={false}>
              Répartition
            </Link>
          )}
          <Link href="/parametres" className={getLinkStyles("/parametres")} prefetch={false}>
            Paramètres
          </Link>
          {user?.role === 'admin' && (
            <Link href="/gestion/logs" className={getLinkStyles("/gestion/logs")} prefetch={false}>
              Logs
            </Link>
          )}
        </div>

        {/* --- SHIFT SESSION CONTROLS --- */}
      

        {/* Right: Aide + Avatar */}
        <div className="hidden sm:flex items-center space-x-2 relative self-stretch">
          <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-gray-50 border border-gray-200">
            {activeShift ? (
              <>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Session Active</span>
                  <span className="text-xs text-gray-900 leading-tight">
                    🕒 {new Date(activeShift.start_time).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <button
                  onClick={onOpenClockOut}
                  className="bg-red-50 hover:bg-red-100 text-red-600 p-2 border border-red-200 group relative ml-2"
                  title="Clôturer la session"
                >
                  <FiLogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <span className="text-[10px] text-gray-500 uppercase font-bold px-2">Session Fermée</span>
                <button
                  onClick={onOpenClockIn}
                  className="bg-gray-800 hover:bg-gray-900 text-white px-5 py-3 text-xs font-bold flex items-center gap-2 border border-gray-900"
                >
                  <FiLogIn className="w-4 h-4" />
                  Ouvrir Session
                </button>
              </>
            )}
          </div>

          {/* Aide */}
         {/*  <a
            href="/aide"
            className={getLinkStyles("/parametres") + " flex items-center gap-1"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M12 20c4.418 0 8-3.582
                      8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8z"
              />
            </svg>
            <span>Aide</span>
          </a> */}

          {/* Notification Bell */}
          <div className="relative flex items-center self-stretch h-full">
            <button
              onClick={() => { setShowNotifications(!showNotifications); setUserMenu(false); }}
              className={`relative h-full px-5 text-gray-500 hover:text-gray-900 hover:bg-gray-50 focus:outline-none border-l border-gray-100 ${showNotifications ? 'bg-gray-50' : ''}`}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-4 right-4 flex h-2.5 w-2.5">
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-0 w-80 bg-white shadow-2xl ring-1 ring-gray-200 z-50 top-full">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Alertes Stock</h3>
                  <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5">{unreadCount}</span>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">Aucune alerte pour le moment.</div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {notifications.map((item, idx) => (
                        <li key={idx} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => router.push('/gestion')}>
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full ${item.stock === 0 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                              <Package className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 leading-tight">{item.name}</p>
                              <p className={`text-xs mt-1 ${item.stock === 0 ? 'text-red-600 font-bold' : 'text-orange-600'}`}>
                                {item.stock === 0 ? 'Rupture de stock !' : `Stock faible: ${formatStockDisplay(item)}`}
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Avatar Dropdown */}
          <div className="relative flex items-center self-stretch h-full border-l border-gray-100">
            <button
              onClick={() => setUserMenu((prev) => !prev)}
              className={`h-full px-5 flex items-center gap-3 cursor-pointer focus:outline-none hover:bg-gray-50 ${userMenu ? 'bg-gray-50' : ''}`}
              aria-haspopup="true"
              aria-expanded={userMenu}
            >
              <div className="w-9 h-9 border border-gray-300 overflow-hidden">
                <Image
                  src={userAvatar.src}
                  alt="User Avatar"
                  width={36}
                  height={36}
                  className="object-cover"
                />
              </div>
              <ChevronDown className={`w-3 h-3 text-gray-400  ${userMenu ? 'rotate-180' : ''}`} />
            </button>

            {userMenu && (
              <div
                className="origin-top-right absolute right-0 mt-0 w-56 bg-white z-20 shadow-2xl ring-1 ring-gray-200 top-full"
                onMouseLeave={() => setUserMenu(false)}
              >
                <Link
                  href="/parametres/update"
                  className="flex items-center gap-3 px-5 py-4 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100"
                  prefetch={false}
                >
                  <User className="w-4 h-4 text-gray-400" />
                  Mon Profil
                </Link>
                <Link
                  href="/parametres"
                  className="flex items-center gap-3 px-5 py-4 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100"
                  prefetch={false}
                >
                  <Package className="w-4 h-4 text-gray-400" />
                  Configuration
                </Link>
                <button
                  onClick={logout}
                  className="flex items-center gap-3 w-full text-left px-5 py-4 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600"
                >
                  <FiLogOut className="w-4 h-4" />
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="sm:hidden p-4 text-gray-700 hover:text-gray-900 focus:outline-none border-l border-gray-100"
        >
          {open ? <X className="w-7 h-7" /> : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="sm:hidden bg-white border-t border-gray-200">
          <div className="flex flex-col text-left">
            <Link
              href="/"
              className={`px-6 py-5 text-base ${isActiveLink("/") ? "bg-gray-50 text-gray-900 font-bold border-l-4 border-gray-900" : "text-gray-600 font-medium"}`}
              onClick={() => setOpen(false)}
              prefetch={false}
            >
              Accueil / Ventes
            </Link>
            <Link
              href="/gestion"
              className={`px-6 py-5 text-base border-t border-gray-100 ${isActiveLink("/gestion") ? "bg-gray-50 text-gray-900 font-bold border-l-4 border-gray-900" : "text-gray-600 font-medium"}`}
              onClick={() => setOpen(false)}
              prefetch={false}
            >
              Gestion de produits
            </Link>
            <Link
              href="/rapports"
              className={`px-6 py-5 text-base border-t border-gray-100 ${isActiveLink("/rapports") ? "bg-gray-50 text-gray-900 font-bold border-l-4 border-gray-900" : "text-gray-600 font-medium"}`}
              onClick={() => setOpen(false)}
              prefetch={false}
            >
              Rapports
            </Link>
            <Link
              href="/ia"
              className={`px-6 py-5 text-base border-t border-gray-100 ${isActiveLink("/ia") ? "bg-purple-50 text-purple-700 font-bold border-l-4 border-purple-600" : "text-purple-600 font-medium"}`}
              onClick={() => setOpen(false)}
              prefetch={false}
            >
              Insights IA ✨
            </Link>
            <Link
              href="/credit"
              className={`px-6 py-5 text-base border-t border-gray-100 ${isActiveLink("/credit") ? "bg-gray-50 text-gray-900 font-bold border-l-4 border-gray-900" : "text-gray-600 font-medium"}`}
              onClick={() => setOpen(false)}
              prefetch={false}
            >
              Crédit
            </Link>
            {templateMode !== "store" && (
              <Link
                href="/repartition"
                className={`px-6 py-5 text-base border-t border-gray-100 ${isActiveLink("/repartition") ? "bg-gray-50 text-gray-900 font-bold border-l-4 border-gray-900" : "text-gray-600 font-medium"}`}
                onClick={() => setOpen(false)}
                prefetch={false}
              >
                Répartition
              </Link>
            )}
            <Link
              href="/parametres"
              className={`px-6 py-5 text-base border-t border-gray-100 ${isActiveLink("/parametres") ? "bg-gray-50 text-gray-900 font-bold border-l-4 border-gray-900" : "text-gray-600 font-medium"}`}
              onClick={() => setOpen(false)}
              prefetch={false}
            >
              Paramètres
            </Link>
            {user?.role === 'admin' && (
              <Link
                href="/gestion/logs"
                className={`px-6 py-5 text-base border-t border-gray-100 ${isActiveLink("/gestion/logs") ? "bg-red-50 text-red-600 font-bold border-l-4 border-red-600" : "text-gray-600 font-medium"}`}
                onClick={() => setOpen(false)}
                prefetch={false}
              >
                Journal d'audit (Logs)
              </Link>
            )}
          </div>

          <div className="border-t border-gray-200 bg-gray-50 p-6 flex justify-between items-center">
            {/* Session Info (Mobile) */}
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                {activeShift ? "Session Active" : "Session Fermée"}
              </span>
              <span className="text-xs text-gray-900">
                {activeShift ? `🕒 ${new Date(activeShift.start_time).toLocaleTimeString()}` : "Inactif"}
              </span>
            </div>

            <div className="flex items-center gap-4">
               {/* Avatar */}
               <div className="w-12 h-12 border border-gray-300 overflow-hidden">
                <Image
                  src={userAvatar.src}
                  alt="User Avatar"
                  width={48}
                  height={48}
                  className="object-cover"
                />
              </div>
              <button 
                onClick={handleLogout}
                className="px-5 py-3 bg-red-600 text-white font-bold text-sm"
              >
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
