"use client";

interface Area {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity?: number;
}

const defaultAreas: Area[] = [
  {
    id: "terrace",
    name: "Terrasse",
    color: "bg-green-100",
    x: 50,
    y: 50,
    width: 300,
    height: 250,
    opacity: 0.3,
  },
  {
    id: "main-hall",
    name: "Salle Principale",
    color: "bg-blue-100",
    x: 400,
    y: 50,
    width: 400,
    height: 300,
    opacity: 0.3,
  },
  {
    id: "bar-area",
    name: "Zone Bar",
    color: "bg-amber-100",
    x: 650,
    y: 100,
    width: 200,
    height: 200,
    opacity: 0.3,
  },
  {
    id: "kitchen",
    name: "Cuisine",
    color: "bg-red-100",
    x: 100,
    y: 400,
    width: 250,
    height: 150,
    opacity: 0.3,
  },
  {
    id: "entrance",
    name: "Entrée",
    color: "bg-gray-100",
    x: 400,
    y: 400,
    width: 150,
    height: 50,
    opacity: 0.3,
  },
];

interface FloorAreasProps {
  showAreas?: boolean;
}

export default function FloorAreas({ showAreas = true }: FloorAreasProps) {
  if (!showAreas) return null;

  return (
    <>
      {defaultAreas.map((area) => (
        <div
          key={area.id}
          className={`absolute ${area.color} border-2 border-dashed border-opacity-50 rounded-lg flex items-center justify-center`}
          style={{
            left: `${area.x}px`,
            top: `${area.y}px`,
            width: `${area.width}px`,
            height: `${area.height}px`,
            opacity: area.opacity || 0.3,
          }}
        >
          <span className="text-gray-800 font-bold text-sm p-2 bg-white bg-opacity-70 rounded">
            {area.name}
          </span>
        </div>
      ))}
    </>
  );
}
