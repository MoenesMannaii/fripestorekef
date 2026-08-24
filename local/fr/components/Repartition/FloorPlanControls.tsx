"use client";

interface FloorPlanControlsProps {
  onAddTable: () => void;
  onSaveLayout: () => void;
  onResetLayout: () => void;
  sections: string[];
  selectedSection: string;
  onSectionChange: (section: string) => void;
}

export default function FloorPlanControls({
  onAddTable,
  onSaveLayout,
  onResetLayout,
  sections,
  selectedSection,
  onSectionChange,
}: FloorPlanControlsProps) {
  return (
    <div className="bg-white border-b p-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {/* Section Filter */}
          <div>
            <label className="text-sm text-gray-600 mr-2">Section:</label>
            <select
              value={selectedSection}
              onChange={(e) => onSectionChange(e.target.value)}
              className="border rounded px-3 py-1"
            >
              {sections.map((section) => (
                <option key={section} value={section}>
                  {section === "all" ? "Toutes" : section}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Actions */}
          <div className="flex space-x-2">
            <button
              onClick={onAddTable}
              className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-800 rounded text-sm flex items-center"
            >
              <span className="mr-1">+</span> Table
            </button>
            <button
              onClick={onSaveLayout}
              className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-sm"
            >
              Sauvegarder
            </button>
            <button
              onClick={onResetLayout}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-sm"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-sm">Disponible</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-sm">Occupée</span>
          </div>
        </div>
      </div>
    </div>
  );
}
