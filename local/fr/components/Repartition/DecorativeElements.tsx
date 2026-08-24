"use client";
import { useState, useEffect } from "react";
import {
  Square,
  Circle,
  Triangle,
  Coffee,
  ChefHat,
  Users,
  Sofa,
  Armchair,
  Refrigerator,
  Microwave,
  SoapDispenserDroplet,
  DoorOpen,
  Flower,
  Sun,
  Printer,
  Box,
  Plus,
  X,
  Edit3,
  Move,
  Type,
  Maximize2,
  Minimize2,
  Trash,
  ChevronUp,
  ChevronDown,
  Menu,
  Lock,
  Trash2,
} from "lucide-react";

interface DecorativeElement {
  id: string;
  type:
    | "wall"
    | "plant"
    | "sunshade"
    | "counter"
    | "coffee_machine"
    | "chef"
    | "receptionist"
    | "cashier"
    | "barista"
    | "sink"
    | "fridge"
    | "oven"
    | "table"
    | "chair"
    | "sofa"
    | "entrance"
    | "window"
    | "bar"
    | "display"
    | "printer";
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  label?: string;
  color?: string;
}

const defaultDecorations: DecorativeElement[] = [
  {
    id: "bar-1",
    type: "bar",
    x: 700,
    y: 100,
    width: 150,
    height: 40,
    label: "Bar Principal",
    color: "#8B4513",
  },
  {
    id: "coffee-machine-1",
    type: "coffee_machine",
    x: 720,
    y: 110,
    label: "Machine à Espresso",
  },
  {
    id: "display-1",
    type: "display",
    x: 200,
    y: 80,
    width: 80,
    height: 50,
    label: "Vitrine Pâtisserie",
  },
  {
    id: "printer-1",
    type: "printer",
    x: 300,
    y: 500,
    label: "Imprimante Cuisine",
  },
  {
    id: "oven-1",
    type: "oven",
    x: 100,
    y: 500,
    width: 60,
    height: 40,
    label: "Four",
  },
  {
    id: "sink-1",
    type: "sink",
    x: 200,
    y: 500,
    width: 60,
    height: 40,
    label: "Évier de Préparation",
  },
  {
    id: "fridge-1",
    type: "fridge",
    x: 300,
    y: 500,
    width: 60,
    height: 80,
    label: "Chambre Froide",
  },
  { id: "chef-1", type: "chef", x: 120, y: 450, label: "Chef de Cuisine" },
  { id: "receptionist-1", type: "receptionist", x: 200, y: 80, label: "Hôte" },
  { id: "cashier-1", type: "cashier", x: 250, y: 100, label: "Caissier" },
  { id: "barista-1", type: "barista", x: 720, y: 120, label: "Barista Principal" },
  { id: "plant-1", type: "plant", x: 100, y: 100, label: "Figuier Lyre" },
  { id: "plant-2", type: "plant", x: 800, y: 200, label: "Langue de Belle-Mère" },
  {
    id: "window-1",
    type: "window",
    x: 400,
    y: 50,
    width: 200,
    height: 10,
    label: "Baie Vitreuse",
  },
  {
    id: "entrance-1",
    type: "entrance",
    x: 400,
    y: 550,
    width: 100,
    height: 10,
    label: "Entrée Principale",
  },
  {
    id: "sofa-1",
    type: "sofa",
    x: 500,
    y: 300,
    width: 120,
    height: 40,
    label: "Canapé Lounge",
  },
  { id: "chair-1", type: "chair", x: 550, y: 350, label: "Fauteuil d'Accent" },
];

interface DecorativeElementsProps {
  scale: number;
  isDragging?: boolean;
  onElementMove?: (elementId: string, x: number, y: number) => void;
  onElementSelect?: (element: DecorativeElement) => void;
  selectedElementId?: string | null;
  isEditMode?: boolean;
  isAdmin: boolean;
}

export default function DecorativeElements({
  scale,
  isDragging = false,
  onElementMove,
  onElementSelect,
  selectedElementId,
  isEditMode = false,
  isAdmin,
}: DecorativeElementsProps) {
  const [decorations, setDecorations] = useState<DecorativeElement[]>(() => {
    const saved = localStorage.getItem("decorations");
    return saved ? JSON.parse(saved) : defaultDecorations;
  });
  const [isDraggingElement, setIsDraggingElement] = useState<string | null>(
    null
  );
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showControls, setShowControls] = useState(true);
  const [newElementType, setNewElementType] = useState<
    DecorativeElement["type"] | null
  >(null);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(false);

  useEffect(() => {
    localStorage.setItem("decorations", JSON.stringify(decorations));
  }, [decorations]);

  // Les employés ne doivent PAS interagir avec les éléments décoratifs
  const handleElementClick = (
    e: React.MouseEvent,
    element: DecorativeElement
  ) => {
    e.stopPropagation();

    // Autoriser la sélection uniquement en mode édition si l'utilisateur est admin
    if (isEditMode && onElementSelect && isAdmin) {
      onElementSelect(element);
    }
    // Cliquer sur un élément décoratif ne fait rien pour les employés
  };

  const handleElementDragStart = (
    e: React.MouseEvent,
    element: DecorativeElement
  ) => {
    // Les employés ne peuvent pas déplacer les éléments
    if (!isEditMode || !isAdmin) return;

    e.stopPropagation();
    e.preventDefault();
    setIsDraggingElement(element.id);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragOffset({ x: 0, y: 0 });

    if (onElementSelect) {
      onElementSelect(element);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingElement || !isEditMode || !isAdmin) return;

      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setDragOffset({ x: dx, y: dy });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDraggingElement || !isEditMode || !isAdmin) return;

      const element = decorations.find((d) => d.id === isDraggingElement);
      if (element) {
        const newX = element.x + dragOffset.x / scale;
        const newY = element.y + dragOffset.y / scale;

        setDecorations((prev) =>
          prev.map((d) =>
            d.id === element.id ? { ...d, x: newX, y: newY } : d
          )
        );

        if (onElementMove) {
          onElementMove(element.id, newX, newY);
        }
      }

      setIsDraggingElement(null);
      setDragOffset({ x: 0, y: 0 });
    };

    if (isDraggingElement) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("mouseleave", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseleave", handleMouseUp);
    };
  }, [
    isDraggingElement,
    dragStart,
    dragOffset,
    scale,
    decorations,
    onElementMove,
    isEditMode,
    isAdmin,
  ]);

  const addNewElement = (type: DecorativeElement["type"]) => {
    if (!isAdmin) return;

    const newElement: DecorativeElement = {
      id: `${type}-${Date.now()}`,
      type,
      x: 300,
      y: 300,
      label: getDefaultLabel(type),
      color: getDefaultColor(type),
    };

    switch (type) {
      case "wall":
        newElement.width = 200;
        newElement.height = 10;
        break;
      case "counter":
      case "bar":
        newElement.width = 120;
        newElement.height = 30;
        break;
      case "display":
        newElement.width = 100;
        newElement.height = 60;
        break;
      case "window":
        newElement.width = 150;
        newElement.height = 10;
        break;
      case "entrance":
        newElement.width = 100;
        newElement.height = 10;
        break;
      case "sink":
      case "oven":
        newElement.width = 50;
        newElement.height = 40;
        break;
      case "fridge":
        newElement.width = 60;
        newElement.height = 80;
        break;
      case "sofa":
        newElement.width = 100;
        newElement.height = 40;
        break;
      case "table":
        newElement.width = 80;
        newElement.height = 80;
        break;
    }

    setDecorations([...decorations, newElement]);
    setNewElementType(null);

    if (onElementSelect) {
      onElementSelect(newElement);
    }
  };

  const removeElement = (elementId: string) => {
    if (!isAdmin) return;

    setDecorations((prev) => prev.filter((d) => d.id !== elementId));
    if (onElementSelect) {
      onElementSelect(null as any);
    }
  };

  const updateElementLabel = (elementId: string, label: string) => {
    if (!isAdmin) return;

    setDecorations((prev) =>
      prev.map((d) => (d.id === elementId ? { ...d, label } : d))
    );
  };

  const updateElementDimensions = (
    elementId: string,
    width?: number,
    height?: number
  ) => {
    if (!isAdmin) return;

    setDecorations((prev) =>
      prev.map((d) => {
        if (d.id === elementId) {
          return {
            ...d,
            width: width !== undefined ? Math.max(20, width) : d.width,
            height: height !== undefined ? Math.max(20, height) : d.height,
          };
        }
        return d;
      })
    );
  };

  const getDefaultLabel = (type: DecorativeElement["type"]): string => {
    switch (type) {
      case "wall":
        return "Mur";
      case "plant":
        return "Plante";
      case "counter":
        return "Comptoir";
      case "coffee_machine":
        return "Machine à Café";
      case "chef":
        return "Chef";
      case "receptionist":
        return "Hôte";
      case "cashier":
        return "Caissier";
      case "barista":
        return "Barista";
      case "sink":
        return "Évier";
      case "fridge":
        return "Réfrigérateur";
      case "oven":
        return "Four";
      case "table":
        return "Table";
      case "chair":
        return "Chaise";
      case "sofa":
        return "Canapé";
      case "entrance":
        return "Entrée";
      case "window":
        return "Fenêtre";
      case "bar":
        return "Bar";
      case "display":
        return "Vitrine";
      case "printer":
        return "Imprimante";
      default:
        return "Élément";
    }
  };

  const getDefaultColor = (type: DecorativeElement["type"]): string => {
    switch (type) {
      case "wall":
        return "#6B7280";
      case "counter":
      case "bar":
        return "#8B4513";
      case "coffee_machine":
        return "#374151";
      case "chef":
        return "#DC2626";
      case "receptionist":
        return "#1E40AF";
      case "cashier":
        return "#059669";
      case "barista":
        return "#7C2D12";
      case "sink":
        return "#0EA5E9";
      case "fridge":
        return "#9CA3AF";
      case "oven":
        return "#4B5563";
      case "table":
        return "#92400E";
      case "chair":
        return "#B45309";
      case "sofa":
        return "#7C3AED";
      case "entrance":
        return "#047857";
      case "window":
        return "#93C5FD";
      case "display":
        return "#FBBF24";
      case "printer":
        return "#1F2937";
      default:
        return "#6B7280";
    }
  };

  const getElementIcon = (type: DecorativeElement["type"]) => {
    switch (type) {
      case "wall":
        return <Square className="w-4 h-4" />;
      case "plant":
        return <Flower className="w-4 h-4" />;
      case "counter":
      case "bar":
        return <Square className="w-4 h-4" />;
      case "coffee_machine":
        return <Coffee className="w-4 h-4" />;
      case "chef":
        return <ChefHat className="w-4 h-4" />;
      case "receptionist":
      case "cashier":
      case "barista":
        return <Users className="w-4 h-4" />;
      case "sink":
        return <SoapDispenserDroplet className="w-4 h-4" />;
      case "fridge":
        return <Refrigerator className="w-4 h-4" />;
      case "oven":
        return <Microwave className="w-4 h-4" />;
      case "table":
        return <Square className="w-4 h-4" />;
      case "chair":
        return <Armchair className="w-4 h-4" />;
      case "sofa":
        return <Sofa className="w-4 h-4" />;
      case "entrance":
        return <DoorOpen className="w-4 h-4" />;
      case "window":
        return <Square className="w-4 h-4" />;
      case "display":
        return <Square className="w-4 h-4" />;
      case "printer":
        return <Printer className="w-4 h-4" />;
      default:
        return <Box className="w-4 h-4" />;
    }
  };

  const renderElement = (element: DecorativeElement) => {
    const isSelected = selectedElementId === element.id;
    const isBeingDragged = isDraggingElement === element.id;
    const isDraggable = isEditMode && isAdmin; // Seuls les admins peuvent déplacer

    const elementStyle = {
      left: element.x,
      top: element.y,
      transform: isBeingDragged
        ? `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(${scale})`
        : `scale(${scale})`,
      transformOrigin: "center",
      transition:
        isDragging || isBeingDragged ? "none" : "transform 0.1s ",
      cursor: isDraggable ? "move" : "default",
      position: "absolute" as const,
      pointerEvents:
        isEditMode && !isAdmin
          ? "none"
          : ("auto" as React.CSSProperties["pointerEvents"]),
    };

    let elementComponent;
    const backgroundColor = element.color || getDefaultColor(element.type);

    switch (element.type) {
      case "wall":
      case "counter":
      case "bar":
      case "window":
      case "entrance":
      case "display":
      case "table":
      case "sofa":
        elementComponent = (
          <div
            className={`border rounded ${
              element.type === "window" ? "border-blue-300" : "border-gray-700"
            } flex items-center justify-center`}
            style={{
              width: element.width,
              height: element.height,
              backgroundColor,
              opacity: element.type === "window" ? 0.7 : 0.8,
            }}
            title={element.label}
          >
            {element.label && (
              <span className="text-white text-xs font-medium px-2 py-1 bg-black/30 rounded">
                {element.label}
              </span>
            )}
          </div>
        );
        break;

      case "plant":
        elementComponent = (
          <div className="text-green-600" title={element.label}>
            <Flower className="w-8 h-8" />
          </div>
        );
        break;

      case "coffee_machine":
        elementComponent = (
          <div className="text-gray-800" title={element.label}>
            <Coffee className="w-8 h-8" />
          </div>
        );
        break;

      case "chef":
        elementComponent = (
          <div className="text-red-600" title={element.label}>
            <ChefHat className="w-8 h-8" />
          </div>
        );
        break;

      case "receptionist":
      case "cashier":
      case "barista":
        elementComponent = (
          <div className="text-blue-600" title={element.label}>
            <Users className="w-8 h-8" />
          </div>
        );
        break;

      case "sink":
        elementComponent = (
          <div className="text-blue-500" title={element.label}>
            <SoapDispenserDroplet className="w-8 h-8" />
          </div>
        );
        break;

      case "fridge":
        elementComponent = (
          <div className="text-gray-600" title={element.label}>
            <Refrigerator className="w-8 h-8" />
          </div>
        );
        break;

      case "oven":
        elementComponent = (
          <div className="text-gray-700" title={element.label}>
            <Microwave className="w-8 h-8" />
          </div>
        );
        break;

      case "chair":
        elementComponent = (
          <div className="text-amber-700" title={element.label}>
            <Armchair className="w-8 h-8" />
          </div>
        );
        break;

      case "printer":
        elementComponent = (
          <div className="text-gray-900" title={element.label}>
            <Printer className="w-8 h-8" />
          </div>
        );
        break;

      default:
        return null;
    }

    return (
      <div
        key={element.id}
        onClick={(e) => handleElementClick(e, element)}
        onMouseDown={(e) => handleElementDragStart(e, element)}
        className={`${isSelected ? "ring-1 ring-gray-900 ring-offset-1" : ""} ${
          isDraggable ? "cursor-move" : "cursor-default"
        }`}
        style={elementStyle}
      >
        {elementComponent}

        {isSelected && isEditMode && isAdmin && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center text-white text-xs z-50 border border-white">
            <Move className="w-3 h-3" />
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {decorations.map(renderElement)}

      {/* SEULEMENT afficher le panneau de contrôle si l'utilisateur est admin ET en mode édition */}
      {isEditMode && isAdmin && (
        <>
          {/* Bouton flottant pour réouvrir le panneau en mode réduit */}
          {isControlsCollapsed && (
            <button
              onClick={() => setIsControlsCollapsed(false)}
              className="fixed bottom-80 left-6 bg-gray-800 text-white p-3 rounded-r-lg shadow-lg hover:bg-gray-700  z-0"
              title="Ouvrir les contrôles de mise en page"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Panneau principal - Réservé aux admins en mode édition */}
          {!isControlsCollapsed && (
            <div className="fixed top-80 left-10 bg-white shadow-xl rounded-lg border border-gray-300 w-80 max-h-[calc(100vh-12rem)] overflow-hidden flex flex-col z-50">
              {/* En-tête du panneau */}
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Box className="w-5 h-5 text-gray-700" />
                  <h3 className="font-semibold text-gray-900 text-xs">
                    Éléments de Mise en Page <br />
                    <span className="text-gray-500 tracking-wide">
                      (Admin uniquement)
                    </span>
                  </h3>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowControls(!showControls)}
                    className="p-4 hover:bg-gray-200 rounded-md "
                    title={
                      showControls ? "Réduire les sections" : "Développer les sections"
                    }
                  >
                    {showControls ? (
                      <ChevronUp className="w-4 h-4 text-gray-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                  <button
                    onClick={() => setIsControlsCollapsed(true)}
                    className="p-4 hover:bg-gray-200 rounded-md "
                    title="Réduire le panneau"
                  >
                    <ChevronUp className="w-4 h-4 text-gray-600 rotate-90" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Réinitialiser tous les éléments par défaut ?")) {
                        localStorage.removeItem("decorations");
                        window.location.reload();
                      }
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded-md text-xs  text-red-600"
                    title="Réinitialiser par défaut"
                  >
                    Réinitialiser
                  </button>
                </div>
              </div>

              {/* Zone de contenu défilable */}
              <div className="flex-1 overflow-y-auto scrollbar-hidden">
                {showControls && (
                  <div className="p-4 space-y-6">
                    {/* Ajouter des éléments */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        Ajouter des éléments
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          {
                            type: "wall",
                            label: "Mur",
                            icon: <Square className="w-4 h-4" />,
                          },
                          {
                            type: "bar",
                            label: "Bar",
                            icon: <Square className="w-4 h-4" />,
                          },
                          {
                            type: "counter",
                            label: "Comptoir",
                            icon: <Square className="w-4 h-4" />,
                          },
                          {
                            type: "table",
                            label: "Table",
                            icon: <Square className="w-4 h-4" />,
                          },
                          {
                            type: "chair",
                            label: "Chaise",
                            icon: <Armchair className="w-4 h-4" />,
                          },
                          {
                            type: "sofa",
                            label: "Canapé",
                            icon: <Sofa className="w-4 h-4" />,
                          },
                          {
                            type: "plant",
                            label: "Plante",
                            icon: <Flower className="w-4 h-4" />,
                          },
                          {
                            type: "coffee_machine",
                            label: "Café",
                            icon: <Coffee className="w-4 h-4" />,
                          },
                          {
                            type: "display",
                            label: "Vitrine",
                            icon: <Square className="w-4 h-4" />,
                          },
                          {
                            type: "printer",
                            label: "Imprimante",
                            icon: <Printer className="w-4 h-4" />,
                          },
                          {
                            type: "sink",
                            label: "Évier",
                            icon: <SoapDispenserDroplet className="w-4 h-4" />,
                          },
                          {
                            type: "fridge",
                            label: "Frigo",
                            icon: <Refrigerator className="w-4 h-4" />,
                          },
                          {
                            type: "oven",
                            label: "Four",
                            icon: <Microwave className="w-4 h-4" />,
                          },
                          {
                            type: "window",
                            label: "Fenêtre",
                            icon: <Square className="w-4 h-4" />,
                          },
                          {
                            type: "entrance",
                            label: "Porte",
                            icon: <DoorOpen className="w-4 h-4" />,
                          },
                          {
                            type: "chef",
                            label: "Chef",
                            icon: <ChefHat className="w-4 h-4" />,
                          },
                        ].map(({ type, label, icon }) => (
                          <button
                            key={type}
                            onClick={() =>
                              addNewElement(type as DecorativeElement["type"])
                            }
                            className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-md hover:bg-gray-50 "
                            title={`Ajouter ${label}`}
                          >
                            <div className="mb-1">{icon}</div>
                            <span className="text-xs text-gray-700">
                              {label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Modifier l'élément sélectionné */}
                    {selectedElementId && (
                      <div className="border-t border-gray-300 pt-4 mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-3">
                          Modifier l'élément sélectionné
                        </p>

                        <div className="space-y-4">
                          <div>
                            <label className="flex items-center text-xs text-gray-500 mb-2">
                              <Type className="w-3 h-3 mr-1" />
                              Étiquette
                            </label>
                            <input
                              type="text"
                              value={
                                decorations.find(
                                  (d) => d.id === selectedElementId
                                )?.label || ""
                              }
                              onChange={(e) =>
                                updateElementLabel(
                                  selectedElementId,
                                  e.target.value
                                )
                              }
                              className="w-full px-3 py-4 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-transparent text-sm"
                              placeholder="Nom de l'élément"
                            />
                          </div>

                          {decorations.find((d) => d.id === selectedElementId)
                            ?.width !== undefined && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-gray-500 block mb-2">
                                  Largeur
                                </label>
                                <input
                                  type="number"
                                  min="20"
                                  step="5"
                                  value={
                                    decorations.find(
                                      (d) => d.id === selectedElementId
                                    )?.width || ""
                                  }
                                  onChange={(e) =>
                                    updateElementDimensions(
                                      selectedElementId,
                                      e.target.value
                                        ? parseInt(e.target.value)
                                        : undefined,
                                      undefined
                                    )
                                  }
                                  className="w-full px-3 py-4 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-transparent text-sm"
                                  placeholder="Largeur"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 block mb-2">
                                  Hauteur
                                </label>
                                <input
                                  type="number"
                                  min="20"
                                  step="5"
                                  value={
                                    decorations.find(
                                      (d) => d.id === selectedElementId
                                    )?.height || ""
                                  }
                                  onChange={(e) =>
                                    updateElementDimensions(
                                      selectedElementId,
                                      undefined,
                                      e.target.value
                                        ? parseInt(e.target.value)
                                        : undefined
                                    )
                                  }
                                  className="w-full px-3 py-4 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-transparent text-sm"
                                  placeholder="Hauteur"
                                />
                              </div>
                            </div>
                          )}

                          <div className="pt-2">
                            <button
                              onClick={() => {
                                if (confirm("Supprimer cet élément ?")) {
                                  removeElement(selectedElementId);
                                }
                              }}
                              className="w-full py-4 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium  flex items-center justify-center space-x-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Supprimer l'élément</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 pt-4 border-t">
                      <p className="font-medium mb-2">Instructions :</p>
                      <ul className="space-y-1">
                        <li>• Cliquez pour sélectionner, glissez pour déplacer les éléments</li>
                        <li>• Utilisez le formulaire ci-dessus pour modifier l’élément sélectionné</li>
                        <li>• Les éléments sont sauvegardés automatiquement dans le navigateur</li>
                        <li className="text-red-600 font-medium">
                          • Seuls les administrateurs peuvent modifier les éléments décoratifs
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Pied du panneau */}
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
                <div className="flex items-center justify-between">
                  <span>{decorations.length} éléments</span>
                  <button
                    onClick={() => setIsControlsCollapsed(true)}
                    className="text-gray-700 hover:text-gray-900"
                  >
                    Réduire
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
