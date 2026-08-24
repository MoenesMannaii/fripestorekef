"use client";
import { useState, useEffect } from "react";
import Select from "react-select";
import {
  Grid3X3,
  List,
  Plus,
  Home,
  MapPin,
  Filter,
  RefreshCw,
  Clock,
  BarChart3,
  Settings,
  HelpCircle,
  Users,
  X,
} from "lucide-react";
import TablePlan from "../../components/Repartition/TablePlan";
import TableDetailsPanel from "../../components/Repartition/TableDetailsPanel";
import ActiveOrdersPanel from "../../components/Repartition/ActiveOrdersPanel";
import Link from "next/link";

interface Table {
  id: number;
  table_number: string;
  display_name: string;
  capacity: number;
  x_position: number;
  y_position: number;
  section: string;
  status: "available" | "occupied" | "reserved" | "cleaning";
  currentSession?: any;
  orders?: any[];
}

interface TableSession {
  id: number;
  session_number: string;
  customer_count: number;
  started_at: string;
  status: "active" | "closed" | "merged";
  waiter_id?: number;
  orders?: any[];
}

interface SelectOption {
  value: string;
  label: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "worker";
  phone?: string;
  created_at: string;
}

export default function RepartitionPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [activeSessions, setActiveSessions] = useState<TableSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"plan" | "list">("plan");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [isDraggingTable, setIsDraggingTable] = useState(false);
  const [sections, setSections] = useState<string[]>(["all"]);
  const [sectionOptions, setSectionOptions] = useState<SelectOption[]>([]);
  const [showNewSectionModal, setShowNewSectionModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [showNewTableModal, setShowNewTableModal] = useState(false);
  const [newTableData, setNewTableData] = useState({
    table_number: "",
    display_name: "",
    capacity: 4,
    section: "main",
    x_position: 100,
    y_position: 100,
  });

  const [windowHeight, setWindowHeight] = useState(0);
  const [tableOrders, setTableOrders] = useState<{ [key: number]: any[] }>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Récupérer l'utilisateur actuel et définir le statut admin
  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("http://localhost:4000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setIsAdmin(data.user?.role === "admin");
      }
    } catch (error) {
      console.error("Erreur lors de la récupération de l'utilisateur:", error);
    }
  };

  // Mettre à jour la hauteur de la fenêtre lors du redimensionnement
  useEffect(() => {
    const updateHeight = () => {
      setWindowHeight(window.innerHeight);
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);

    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("authToken");

      // Récupérer les tables
      const tablesRes = await fetch("http://localhost:4000/api/tables", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!tablesRes.ok) {
        console.error("Échec de la récupération des tables:", tablesRes.status);
        return;
      }

      const tablesData = await tablesRes.json();
      const tablesList = tablesData.tables || [];
      setTables(tablesList);

      // Récupérer les commandes pour chaque table avec session active
      const ordersMap: { [key: number]: any[] } = {};

      for (const table of tablesList) {
        if (table.currentSession) {
          try {
            const ordersRes = await fetch(
              `http://localhost:4000/api/orders/table/${table.id}/active`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );

            if (ordersRes.ok) {
              const ordersData = await ordersRes.json();
              ordersMap[table.id] = ordersData.orders || [];
            }
          } catch (error) {
            console.log(
              `Impossible de récupérer les commandes actives pour la table ${table.id}:`,
              error
            );
            ordersMap[table.id] = [];
          }
        } else {
          ordersMap[table.id] = [];
        }
      }

      setTableOrders(ordersMap);

      try {
        const sessionsRes = await fetch(
          "http://localhost:4000/api/tables/sessions/active",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (sessionsRes.ok) {
          const sessionsData = await sessionsRes.json();
          setActiveSessions(sessionsData.sessions || []);
        }
      } catch (error) {
        console.log(
          "Point de terminaison des sessions non disponible, continuation sans sessions"
        );
      }

      const tableSections = tablesList
        .map((table: Table) => table.section)
        .filter(Boolean) as string[];

      const uniqueSections = Array.from(new Set(tableSections));

      const allSections = ["all"];
      ["main", "terrace", "private", "bar", "window"].forEach((section) => {
        if (!allSections.includes(section)) {
          allSections.push(section);
        }
      });

      uniqueSections.forEach((section) => {
        if (!allSections.includes(section)) {
          allSections.push(section);
        }
      });

      setSections(allSections);

      // Créer les options pour react-select
      const options = allSections.map((section) => ({
        value: section,
        label:
          section === "all"
            ? "Toutes les sections"
            : section.charAt(0).toUpperCase() + section.slice(1),
      }));
      setSectionOptions(options);
    } catch (error) {
      console.error("Erreur lors de la récupération des données:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fonction pour calculer le total pour une table spécifique
  const calculateTableTotal = (tableId: number) => {
    const orders = tableOrders[tableId];
    if (!orders || orders.length === 0) return 0;

    return orders.reduce((total, order) => total + (order.total || 0), 0);
  };

  const handleOpenTable = async (
    tableId: number,
    customerCount: number = 1
  ) => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(
        `http://localhost:4000/api/tables/${tableId}/open`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ customer_count: customerCount }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        fetchData();
        setSelectedTable(data.table);
        return data;
      }
    } catch (error) {
      console.error("Erreur lors de l'ouverture de la table:", error);
    }
  };

  const handleCloseTable = async (tableId: number) => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(
        `http://localhost:4000/api/tables/${tableId}/close`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (res.ok) {
        const data = await res.json();

        setTableOrders((prev) => ({
          ...prev,
          [tableId]: [],
        }));

        await fetchData();
        setSelectedTable(null);

        return data;
      }
    } catch (error) {
      console.error("Erreur lors de la fermeture de la table:", error);
    }
  };

  // CORRIGÉ : Supprimer la vérification isAdmin - TOUS peuvent déplacer les tables
  const handleMoveTable = async (
    tableId: number,
    x: number,
    y: number,
    section: string
  ) => {
    try {
      const token = localStorage.getItem("authToken");
      await fetch(`http://localhost:4000/api/tables/${tableId}/move`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ x_position: x, y_position: y, section }),
      });
      fetchData();
    } catch (error) {
      console.error("Erreur lors du déplacement de la table:", error);
    }
  };

  const handleCreateTable = async (tableData: any) => {
    // Seuls les administrateurs peuvent créer des tables
    if (!isAdmin) {
      alert("Seuls les administrateurs peuvent créer des tables");
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("http://localhost:4000/api/tables", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tableData),
      });

      if (res.ok) {
        const data = await res.json();
        fetchData();
        setShowNewTableModal(false);
        setNewTableData({
          table_number: "",
          display_name: "",
          capacity: 4,
          section: "main",
          x_position: 100,
          y_position: 100,
        });
        return data;
      }
    } catch (error) {
      console.error("Erreur lors de la création de la table:", error);
    }
  };

  const handleDeleteTable = async (tableId: number) => {
    // Seuls les administrateurs peuvent supprimer des tables
    if (!isAdmin) {
      alert("Seuls les administrateurs peuvent supprimer des tables");
      return;
    }

    if (!confirm("Êtes-vous sûr de vouloir supprimer cette table ?")) return;

    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`http://localhost:4000/api/tables/${tableId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        fetchData();
        setSelectedTable(null);
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de la table:", error);
    }
  };

  const handleMergeTables = async (fromTableId: number, toTableId: number) => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("http://localhost:4000/api/tables/merge", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fromTableId, toTableId }),
      });

      if (res.ok) {
        const data = await res.json();
        fetchData();
        return data;
      }
    } catch (error) {
      console.error("Erreur lors de la fusion des tables:", error);
    }
  };

  const handleAddSection = async () => {
    // Seuls les administrateurs peuvent créer des sections
    if (!isAdmin) {
      alert("Seuls les administrateurs peuvent créer des sections");
      return;
    }

    if (!newSectionName.trim()) return;

    if (sections.includes(newSectionName)) {
      alert("Cette section existe déjà !");
      return;
    }

    const newSections = [...sections, newSectionName];
    setSections(newSections);
    setNewSectionName("");
    setShowNewSectionModal(false);

    const newOption = {
      value: newSectionName,
      label: newSectionName.charAt(0).toUpperCase() + newSectionName.slice(1),
    };
    setSectionOptions((prev) => [
      ...prev.filter((opt) => opt.value !== "all"),
      { value: "all", label: "Toutes les sections" },
      ...prev.filter((opt) => opt.value !== "all"),
      newOption,
    ]);

    setNewTableData((prev) => ({
      ...prev,
      section: newSectionName,
    }));
  };

  const filteredTables =
    selectedSection === "all"
      ? tables
      : tables.filter((table) => table.section === selectedSection);

  const calculateMainContentHeight = () => {
    const topNavHeight = 60;
    const toolbarHeight = 56;
    const statusBarHeight = 32;
    const margins = 48;

    return (
      windowHeight - topNavHeight - toolbarHeight - statusBarHeight - margins
    );
  };

  const selectStyles = {
    control: (base: any, state: any) => ({
      ...base,
      borderRadius: 0,
      minHeight: "54px",
      borderColor: state.isFocused ? "#374151" : "#D1D5DB",
      boxShadow: state.isFocused ? "0 0 0 1px #374151" : "none",
      "&:hover": {
        borderColor: "#9CA3AF",
      },
      backgroundColor: "white",
      fontSize: "0.875rem",
    }),
    menu: (base: any) => ({
      ...base,
      borderRadius: 0,
      zIndex: 9999,
      fontSize: "0.875rem",
    }),
    option: (base: any, state: any) => ({
      ...base,
      borderRadius: 0,
      backgroundColor: state.isSelected
        ? "#374151"
        : state.isFocused
        ? "#F3F4F6"
        : "white",
      color: state.isSelected ? "white" : "#374151",
      "&:active": {
        backgroundColor: "#374151",
      },
    }),
    placeholder: (base: any) => ({
      ...base,
      color: "#9CA3AF",
    }),
    singleValue: (base: any) => ({
      ...base,
      color: "#374151",
    }),
  };

  const capacityOptions = [2, 4, 6, 8, 10, 12].map((num) => ({
    value: num,
    label: `${num} personnes`,
  }));
// Ajoutez ce hook avant votre composant principal
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Vérifier au chargement
    checkMobile();

    // Écouter les changements de taille
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  return isMobile;
}

// Dans votre composant principal, ajoutez :
const isMobile = useIsMobile();
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className=" rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-800 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du plan de salle...</p>
        </div>
      </div>
    );
  }

  return (
<div className="flex flex-col h-screen overflow-hidden bg-gray-50">
  {/* Navigation supérieure */}
  <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2 flex items-center justify-between shrink-0">
    <div className="flex items-center space-x-4 sm:space-x-6">
      <div className="flex items-center space-x-2 sm:space-x-3">
        <Home className="w-5 h-5 text-gray-700" />
        <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
          Plan de Salle
        </h1>
      </div>

      <div className="hidden sm:flex items-center space-x-2 border-l border-gray-200 pl-4 sm:pl-6">
        <button
          onClick={() => setViewMode("plan")}
          className={`flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-2  ${
            viewMode === "plan"
              ? "bg-gray-700 text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Grid3X3 className="w-4 h-4" />
          <span>Vue Plan</span>
        </button>
        <button
          onClick={() => setViewMode("list")}
          className={`flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-2  ${
            viewMode === "list"
              ? "bg-gray-700 text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <List className="w-4 h-4" />
          <span>Vue Liste</span>
        </button>
      </div>
    </div>

    <div className="flex items-center space-x-2 sm:space-x-4">
      <div className="hidden sm:block text-sm text-gray-600 truncate">
        Connecté : <span className="font-medium">{currentUser?.name}</span>
      </div>
      <div className="flex items-center space-x-1 sm:space-x-2">
        <button className="p-1 sm:p-2 hover:bg-gray-100">
          <Link href="/parametres" prefetch={false}>
            <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
          </Link>
        </button>
        <button className="p-1 sm:p-2 hover:bg-gray-100">
          <Link href="/aide" prefetch={false}>
            <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
          </Link>
        </button>
      </div>
    </div>
  </div>

  {/* Boutons de vue mobile */}
  <div className="sm:hidden bg-white border-b border-gray-200 px-4 py-2 flex justify-center space-x-2">
    <button
      onClick={() => setViewMode("plan")}
      className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2  ${
        viewMode === "plan"
          ? "bg-gray-700 text-white"
          : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      <Grid3X3 className="w-4 h-4" />
      <span>Vue Plan</span>
    </button>
    <button
      onClick={() => setViewMode("list")}
      className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2  ${
        viewMode === "list"
          ? "bg-gray-700 text-white"
          : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      <List className="w-4 h-4" />
      <span>Vue Liste</span>
    </button>
  </div>

  {/* Zone de contenu principale */}
  <div className="flex flex-1 overflow-hidden">
    {/* Contenu principal */}
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 shrink-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 w-full">
            <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <Select
                value={sectionOptions.find(
                  (opt) => opt.value === selectedSection
                )}
                onChange={(selectedOption) =>
                  setSelectedSection(selectedOption?.value || "all")
                }
                options={sectionOptions}
                styles={selectStyles}
                isSearchable
                placeholder="Section..."
                className="react-select-container"
                classNamePrefix="react-select"
              />
            </div>
            {/* Afficher le bouton Ajouter une section uniquement pour l'admin */}
            {isAdmin && (
              <button
                onClick={() => setShowNewSectionModal(true)}
                className="px-3 py-2 border border-gray-300 hover:bg-gray-50 text-sm flex items-center space-x-1 flex-shrink-0 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Section</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Actualisation : 30s</span>
            <button onClick={fetchData} className="p-1 hover:bg-gray-100">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end mt-2 sm:mt-0">
          {/* Afficher le bouton Nouvelle Table uniquement pour l'admin */}
          {isAdmin && (
            <button
              onClick={() => setShowNewTableModal(true)}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-800 text-white text-sm flex items-center space-x-2 w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Table</span>
            </button>
          )}
        </div>
      </div>

      {/* Zone de contenu */}
      <div className="flex-1 overflow-auto bg-white m-2 sm:m-4 md:m-6 border border-gray-200 shadow-sm">
        {viewMode === "plan" ? (
          <div className="w-full h-full min-h-[500px] p-2 sm:p-4 relative">
            <TablePlan
              tables={filteredTables}
              selectedTable={selectedTable}
              onTableSelect={setSelectedTable}
              onTableMove={handleMoveTable}
              onTableOpen={handleOpenTable}
              isDraggingTable={isDraggingTable}
              onDraggingChange={setIsDraggingTable}
              isAdmin={isAdmin}
            />
          </div>
        ) : (
          <div className="h-full overflow-auto p-3 sm:p-4 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filteredTables.map((table) => {
                const tableTotal = calculateTableTotal(table.id);
                const hasOrders = tableTotal > 0;

                return (
                  <div
                    key={table.id}
                    onClick={() => setSelectedTable(table)}
                    className={`bg-white border border-dashed border-gray-300 p-3 sm:p-4 cursor-pointer  hover:shadow ${
                      table.id === selectedTable?.id
                        ? "border-gray-900"
                        : ""
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-base text-gray-900 truncate">
                          {table.display_name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          #{table.table_number}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium whitespace-nowrap flex-shrink-0 ${
                          table.status === "occupied"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : table.status === "reserved"
                            ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                            : table.status === "cleaning"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-green-50 text-green-700 border border-green-200"
                        }`}
                      >
                        {table.status === "occupied"
                          ? "Occupée"
                          : table.status === "reserved"
                          ? "Réservée"
                          : table.status === "cleaning"
                          ? "Nettoyage"
                          : "Disponible"}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{table.section || "Aucune section"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 flex-shrink-0" />
                        <span>{table.capacity} places</span>
                      </div>
                    </div>

                    {hasOrders && (
                      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-900">
                            Total Actuel
                          </span>
                          <span className="text-base font-bold text-green-800">
                            {tableTotal.toFixed(2)} DT
                          </span>
                        </div>
                      </div>
                    )}

                    {table.currentSession && (
                      <div
                        className={`mt-3 sm:mt-4 pt-3 sm:pt-4 ${
                          hasOrders ? "border-t border-gray-100" : ""
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-900">
                            Session Active
                          </span>
                          <span className="text-sm text-gray-600">
                            {table.currentSession.customer_count} invités
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Panneau droit - Desktop seulement */}
    {!isMobile && (
      <div className="w-80 lg:w-96 border-l border-gray-200 flex flex-col bg-white shrink-0 hidden md:flex">
        {selectedTable ? (
          <TableDetailsPanel
            table={selectedTable}
            onCloseTable={handleCloseTable}
            onMergeTables={handleMergeTables}
            onOpenTable={handleOpenTable}
            onClosePanel={() => setSelectedTable(null)}
            onDeleteTable={handleDeleteTable}
            tables={tables}
            tableOrders={tableOrders[selectedTable.id] || []}
            onRefreshData={fetchData}
            isAdmin={isAdmin}
          />
        ) : (
          <div className="h-full overflow-hidden">
            <ActiveOrdersPanel
              activeSessions={activeSessions}
              onTableSelect={(tableId) => {
                const table = tables.find((t) => t.id === tableId);
                if (table) setSelectedTable(table);
              }}
            />
          </div>
        )}
      </div>
    )}
  </div>

  {/* Panneau droit mobile - Overlay */}
  {isMobile && selectedTable && (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setSelectedTable(null)}>
      <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Détails de la table</h2>
          <button 
            onClick={() => setSelectedTable(null)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="h-[calc(100vh-4rem)] overflow-auto">
          <TableDetailsPanel
            table={selectedTable}
            onCloseTable={handleCloseTable}
            onMergeTables={handleMergeTables}
            onOpenTable={handleOpenTable}
            onClosePanel={() => setSelectedTable(null)}
            onDeleteTable={handleDeleteTable}
            tables={tables}
            tableOrders={tableOrders[selectedTable.id] || []}
            onRefreshData={fetchData}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </div>
  )}

  {/* Barre de statut */}
  <div className="bg-gray-800 text-white px-3 sm:px-6 py-1.5 bottom-0 w-full flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs sm:text-sm border-t border-gray-800 shrink-0 z-30">
    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-2 sm:mb-0">
      <div className="flex items-center space-x-1 sm:space-x-2">
        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full"></div>
        <span className="whitespace-nowrap">
          Disponible ({tables.filter((t) => t.status === "available").length})
        </span>
      </div>
      <div className="flex items-center space-x-1 sm:space-x-2">
        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full"></div>
        <span className="whitespace-nowrap">
          Occupée ({tables.filter((t) => t.status === "occupied").length})
        </span>
      </div>
      <div className="flex items-center space-x-1 sm:space-x-2">
        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-500 rounded-full"></div>
        <span className="whitespace-nowrap">
          Réservée ({tables.filter((t) => t.status === "reserved").length})
        </span>
      </div>
      <div className="flex items-center space-x-1 sm:space-x-2">
        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full"></div>
        <span className="whitespace-nowrap">
          Nettoyage ({tables.filter((t) => t.status === "cleaning").length})
        </span>
      </div>
    </div>
    <div className="flex items-center space-x-2 sm:space-x-4">
      <div className="flex items-center space-x-1 sm:space-x-2 text-gray-300">
        <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
        <span className="whitespace-nowrap">
          {tables.length} tables • {activeSessions.length} sessions
        </span>
      </div>
    </div>
  </div>

  {/* Modal Nouvelle Section */}
  {showNewSectionModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-gray-300 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Créer une Nouvelle Section
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Ajoutez une nouvelle section pour organiser votre plan de salle
          </p>
        </div>

        <div className="p-4 sm:p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom de la Section
            </label>
            <input
              type="text"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              className="w-full px-3 sm:px-4 py-3 sm:py-4 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-transparent"
              placeholder="ex : VIP, Terrasse, Salle Principale..."
              autoFocus
            />
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={() => {
              setShowNewSectionModal(false);
              setNewSectionName("");
            }}
            className="px-3 sm:px-4 py-3 sm:py-4 border border-gray-300 text-gray-700 hover:bg-gray-50 "
          >
            Annuler
          </button>
          <button
            onClick={handleAddSection}
            className="px-3 sm:px-4 py-3 sm:py-4 bg-gray-700 hover:bg-gray-800 text-white "
          >
            Créer la Section
          </button>
        </div>
      </div>
    </div>
  )}

  {/* Modal Nouvelle Table */}
  {showNewTableModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-gray-300 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Créer une Nouvelle Table
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Configurer les paramètres de la table
          </p>
        </div>

        <div className="p-4 sm:p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numéro de Table
                </label>
                <input
                  type="text"
                  value={newTableData.table_number}
                  onChange={(e) =>
                    setNewTableData({
                      ...newTableData,
                      table_number: e.target.value,
                    })
                  }
                  className="w-full px-3 sm:px-4 py-3 sm:py-4 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-transparent"
                  placeholder="ex : T1, A12..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom d'Affichage
                </label>
                <input
                  type="text"
                  value={newTableData.display_name}
                  onChange={(e) =>
                    setNewTableData({
                      ...newTableData,
                      display_name: e.target.value,
                    })
                  }
                  className="w-full px-3 sm:px-4 py-3 sm:py-4 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-transparent"
                  placeholder="ex : Table Fenêtre, VIP..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Capacité
              </label>
              <Select
                value={capacityOptions.find(
                  (opt) => opt.value === newTableData.capacity
                )}
                onChange={(selectedOption) =>
                  setNewTableData({
                    ...newTableData,
                    capacity: selectedOption?.value || 4,
                  })
                }
                options={capacityOptions}
                styles={selectStyles}
                placeholder="Sélectionner la capacité..."
                className="react-select-container"
                classNamePrefix="react-select"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Section
              </label>
              <Select
                value={sectionOptions.find(
                  (opt) =>
                    opt.value === newTableData.section &&
                    opt.value !== "all"
                )}
                onChange={(selectedOption) =>
                  setNewTableData({
                    ...newTableData,
                    section: selectedOption?.value || "main",
                  })
                }
                options={sectionOptions.filter(
                  (opt) => opt.value !== "all"
                )}
                styles={selectStyles}
                placeholder="Sélectionner une section..."
                className="react-select-container"
                classNamePrefix="react-select"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position X
                </label>
                <input
                  type="number"
                  value={newTableData.x_position}
                  onChange={(e) =>
                    setNewTableData({
                      ...newTableData,
                      x_position: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 sm:px-4 py-3 sm:py-4 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-transparent"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position Y
                </label>
                <input
                  type="number"
                  value={newTableData.y_position}
                  onChange={(e) =>
                    setNewTableData({
                      ...newTableData,
                      y_position: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 sm:px-4 py-3 sm:py-4 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-transparent"
                  min="0"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={() => {
              setShowNewTableModal(false);
              setNewTableData({
                table_number: "",
                display_name: "",
                capacity: 4,
                section: "main",
                x_position: 100,
                y_position: 100,
              });
            }}
            className="px-3 sm:px-4 py-3 sm:py-4 border border-gray-300 text-gray-700 hover:bg-gray-50 "
          >
            Annuler
          </button>
          <button
            onClick={() => handleCreateTable(newTableData)}
            className="px-3 sm:px-4 py-3 sm:py-4 bg-gray-700 hover:bg-gray-800 text-white "
          >
            Créer la Table
          </button>
        </div>
      </div>
    </div>
  )}
</div>
  );
}

