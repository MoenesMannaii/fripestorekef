"use client";
import { useState, useEffect, useRef } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Edit3,
  X,
  Move,
  Maximize2,
  Minus,
  Plus,
} from "lucide-react";
import DecorativeElements from "./DecorativeElements";

interface TablePlanProps {
  tables: any[];
  selectedTable: any;
  onTableSelect: (table: any) => void;
  onTableMove: (tableId: number, x: number, y: number, section: string) => void;
  onTableOpen: (tableId: number, customerCount: number) => void;
  isDraggingTable: boolean;
  onDraggingChange: (isDragging: boolean) => void;
  isAdmin: boolean; // Add isAdmin prop
}

export default function TablePlan({
  tables,
  selectedTable,
  onTableSelect,
  onTableMove,
  onTableOpen,
  isDraggingTable,
  onDraggingChange,
  isAdmin,
}: TablePlanProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [draggedTable, setDraggedTable] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [viewPosition, setViewPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);

  const handleDragStart = (e: React.MouseEvent, table: any) => {
    // Only allow dragging for admin users
    if (!isAdmin) {
      // Workers can click tables, just don't let them drag
      return;
    }
    
    if (table.status === "occupied") return;
    if (isEditMode) return;

    e.stopPropagation();
    setIsDragging(true);
    onDraggingChange(true);
    setDraggedTable(table.id);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !draggedTable) return;

      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setDragOffset({ x: dx, y: dy });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDragging || !draggedTable) return;

      setIsDragging(false);
      onDraggingChange(false);

      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const table = tables.find((t) => t.id === draggedTable);
      if (!table) return;

      const containerScrollLeft = container.scrollLeft || 0;
      const containerScrollTop = container.scrollTop || 0;

      const newX = table.x_position + dragOffset.x / scale;
      const newY = table.y_position + dragOffset.y / scale;

      onTableMove(
        table.id,
        Math.max(0, newX),
        Math.max(0, newY),
        table.section
      );

      setDraggedTable(null);
      setDragOffset({ x: 0, y: 0 });
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDragging,
    draggedTable,
    dragStart,
    dragOffset,
    scale,
    tables,
    onTableMove,
    onDraggingChange,
  ]);

  const handlePanStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (isEditMode || isDragging) return;

    e.preventDefault();
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handlePanMove = (e: MouseEvent) => {
    if (!isPanning || !containerRef.current) return;

    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;

    containerRef.current.scrollLeft -= dx;
    containerRef.current.scrollTop -= dy;

    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handlePanEnd = () => {
    setIsPanning(false);
  };

  useEffect(() => {
    if (isPanning) {
      document.addEventListener("mousemove", handlePanMove);
      document.addEventListener("mouseup", handlePanEnd);
      document.addEventListener("mouseleave", handlePanEnd);
    }

    return () => {
      document.removeEventListener("mousemove", handlePanMove);
      document.removeEventListener("mouseup", handlePanEnd);
      document.removeEventListener("mouseleave", handlePanEnd);
    };
  }, [isPanning]);

  const handleElementMove = (elementId: string, x: number, y: number) => {
    console.log(`Element ${elementId} moved to: ${x}, ${y}`);
  };

  const handleElementSelect = (element: any) => {
    setSelectedElement(element);
  };

  const toggleEditMode = () => {
    // Only allow edit mode for admin users
    if (!isAdmin) {
      // Workers cannot enter edit mode - don't show alert, just do nothing
      return;
    }
    setIsEditMode(!isEditMode);
    if (!isEditMode) {
      setSelectedElement(null);
    }
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.1, 0.1));
  };

  const handleResetView = () => {
    setScale(1);
    if (containerRef.current) {
      containerRef.current.scrollLeft = 0;
      containerRef.current.scrollTop = 0;
    }
  };

  const handleResetDecorations = () => {
    if (!isAdmin) {
      // Workers cannot reset decorations
      return;
    }
    
    if (confirm("Reset all decorations to default?")) {
      localStorage.removeItem("decorations");
      window.location.reload();
    }
  };

  const getTableSize = (capacity: number) => {
    if (capacity <= 2) return 60;
    if (capacity <= 4) return 70;
    if (capacity <= 6) return 80;
    if (capacity <= 8) return 90;
    return 100;
  };

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !isDragging && !isEditMode) {
      handlePanStart(e);
    }
  };

  return (
    <div className="relative w-full h-full bg-gray-50 overflow-hidden">
      {/* Controls Bar */}
      <div className="absolute top-4 left-4 z-40">
        <div className="flex items-center space-x-2 bg-white shadow-lg border border-gray-200 p-2">
          {/* Edit Mode Button - Only show for admin */}
          {isAdmin && (
            <button
              onClick={toggleEditMode}
              className={`p-2 rounded  ${
                isEditMode
                  ? "bg-gray-700 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              title={isEditMode ? "Exit Edit Mode" : "Edit Mode"}
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
          {isAdmin && <div className="w-px h-6 bg-gray-200"></div>}
          <button
            onClick={handleZoomIn}
            className="p-2 text-gray-700 hover:bg-gray-100 rounded "
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 text-gray-700 hover:bg-gray-100 rounded "
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetView}
            className="p-2 text-gray-700 hover:bg-gray-100 rounded "
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-gray-200"></div>
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded  ${
              showGrid ? "text-gray-700" : "text-gray-400"
            }`}
            title="Toggle Grid"
          >
            <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
              <div
                className={`${showGrid ? "bg-gray-400" : "bg-gray-300"}`}
              ></div>
              <div
                className={`${showGrid ? "bg-gray-400" : "bg-gray-300"}`}
              ></div>
              <div
                className={`${showGrid ? "bg-gray-400" : "bg-gray-300"}`}
              ></div>
              <div
                className={`${showGrid ? "bg-gray-400" : "bg-gray-300"}`}
              ></div>
            </div>
          </button>
        </div>
      </div>

      {/* Floor Plan Container */}
      <div
        ref={containerRef}
        className="relative w-full h-full overflow-auto cursor-grab active:cursor-grabbing"
        onMouseDown={handleContainerMouseDown}
        style={{
          minWidth: "1200px",
          minHeight: "800px",
        }}
      >
        <div
          className="absolute inset-0 bg-white"
          style={{
            width: "2000px",
            height: "1500px",
            backgroundImage: showGrid
              ? `
              linear-gradient(to right, #f3f4f6 1px, transparent 1px),
              linear-gradient(to bottom, #f3f4f6 1px, transparent 1px)
            `
              : "none",
            backgroundSize: "100px 100px",
          }}
        >
          {/* Decorative Elements - Pass isAdmin and isEditMode */}
          <DecorativeElements
            scale={scale}
            isDragging={isDragging}
            onElementMove={handleElementMove}
            onElementSelect={handleElementSelect}
            selectedElementId={selectedElement?.id}
            isEditMode={isEditMode}
            isAdmin={isAdmin} // Pass isAdmin to DecorativeElements
          />

          {/* Tables */}
          {tables.map((table) => {
            const isSelected = selectedTable?.id === table.id;
            const isBeingDragged = draggedTable === table.id;
            const tableSize = getTableSize(table.capacity);

            return (
              <div
                key={table.id}
                onClick={() => onTableSelect(table)}
                onMouseDown={(e) => handleDragStart(e, table)}
                className={`absolute  ${
                  isSelected ? "ring-1 ring-gray-900" : ""
                } ${
                  table.status === "occupied"
                    ? "cursor-pointer"
                    : isEditMode && !isAdmin
                    ? "cursor-pointer"
                    : isEditMode
                    ? "cursor-default"
                    : isAdmin
                    ? "cursor-move hover:shadow-lg"
                    : "cursor-pointer hover:shadow"
                }`}
                style={{
                  left: `${table.x_position}px`,
                  top: `${table.y_position}px`,
                  width: `${tableSize}px`,
                  height: `${tableSize}px`,
                  transform: isBeingDragged
                    ? `translate(${dragOffset.x}px, ${
                        dragOffset.y
                      }px) scale(${1.05})`
                    : `scale(${scale})`,
                  transformOrigin: "center",
                  zIndex: isBeingDragged ? 50 : 10,
                }}
              >
                {/* Table Visual */}
                <div
                  className={`
                  w-full h-full flex flex-col items-center justify-center border-2
                  ${
                    table.status === "occupied"
                      ? "bg-red-600 border-red-700"
                      : table.status === "reserved"
                      ? "bg-yellow-500 border-yellow-600"
                      : table.status === "cleaning"
                      ? "bg-blue-500 border-blue-600"
                      : "bg-green-600 border-green-700"
                  }
                  text-white font-semibold shadow-sm
                `}
                >
                  <span className="text-xs font-medium">
                    {table.display_name}
                  </span>
                  <span className="text-xs opacity-90 mt-0.5">
                    #{table.table_number}
                  </span>
                  <span className="text-xs mt-1 opacity-80">
                    {table.capacity}
                  </span>

                  {table.status === "occupied" && table.currentSession && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-xs border border-white">
                      {table.currentSession.customer_count}
                    </div>
                  )}
                </div>

                {/* Table number label */}
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
                    {table.section}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Grid coordinates */}
          <div className="absolute top-0 left-0 text-xs text-gray-400 p-2 bg-white/80  rounded-br-lg">
            X: {viewPosition.x}, Y: {viewPosition.y}
          </div>
        </div>
      </div>

      {/* Scale Indicator */}
      <div className="absolute bottom-8 left-4 bg-white/90  p-3 shadow-lg border border-gray-200 z-0">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-700">
            Scale: {Math.round(scale * 100)}%
          </p>
          <div className="flex items-center space-x-2">
            <Minus className="w-4 h-4 text-gray-500" />
            <div className="w-24 h-1 bg-gray-300 rounded-full">
              <div
                className="h-1 bg-gray-700 rounded-full"
                style={{ width: `${((scale - 0.1) / 2.9) * 100}%` }}
              ></div>
            </div>
            <Plus className="w-4 h-4 text-gray-500" />
          </div>
        </div>
      </div>

      {/* View Controls */}
      <div className="absolute bottom-8 right-4 flex flex-col space-y-2 z-0">
        <div className="bg-white shadow-lg border border-gray-200 p-2">
          <p className="text-xs text-gray-600 mb-2 font-medium">
            View Controls
          </p>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Move className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-700">Pan: Click + Drag</span>
            </div>
            <div className="flex items-center space-x-2">
              <Maximize2 className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-700">Zoom: Mouse Wheel</span>
            </div>
            {!isAdmin && (
              <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                <span className="text-red-600 font-medium">Note:</span>
                <span>Only admins can modify layout</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      {(isDragging || isPanning) && (
        <div
          className={`absolute inset-0 pointer-events-none z-20 ${
            isDragging ? "bg-blue-50/20" : "bg-gray-200/10"
          }`}
        ></div>
      )}
    </div>
  );
}
