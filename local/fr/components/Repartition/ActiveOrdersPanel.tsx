import {
  Clock,
  Users,
  ShoppingBag,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

interface ActiveOrdersPanelProps {
  activeSessions: any[];
  onTableSelect: (tableId: number) => void;
}

export default function ActiveOrdersPanel({
  activeSessions,
  onTableSelect,
}: ActiveOrdersPanelProps) {
  // Removed expandedSession as the whole card will now act as a single touch target

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const calculateSessionTotal = (orders: any[]) => {
    return orders?.reduce((total, order) => total + (order.total || 0), 0) || 0;
  };

  const calculateAverageOrderValue = () => {
    if (activeSessions.length === 0) return 0;
    const total = activeSessions.reduce(
      (sum, session) => sum + calculateSessionTotal(session.orders || []),
      0
    );
    return (total / activeSessions.length).toFixed(2);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Sessions Actives
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {activeSessions.length} session(s) active(s)
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full "></div>
            <span className="text-xs text-gray-500">En direct</span>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="px-2 py-4 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Commandes totales</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {activeSessions.reduce(
                    (total, session) => total + (session.orders?.length || 0),
                    0
                  )}
                </p>
              </div>
              <div className="p-2 bg-gray-100">
                <ShoppingBag className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Panier moyen</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {parseFloat(calculateAverageOrderValue().toString()).toFixed(3)} DT
                </p>
              </div>
              <div className="p-2 bg-gray-100">
                <TrendingUp className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {activeSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <div className="text-gray-400 mb-4">
              <Clock className="w-16 h-16" />
            </div>
            <p className="text-gray-900 font-medium mb-2">Aucune session active</p>
            <p className="text-gray-600 text-sm text-center">
              Les sessions apparaîtront ici lorsqu'une table sera ouverte
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {activeSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => onTableSelect(session.table_id)}
                className="bg-white border text-left w-full border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-blue-300  cursor-pointer active:scale-[0.98]"
              >
                {/* Session Header */}
                <div className="p-5 flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-3">
                      <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-full flex items-center justify-center border border-blue-100 shadow-inner">
                        <span className="font-bold text-lg">
                          #{session.session_number}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">
                          {session.table?.display_name || "Table"}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 text-sm text-gray-600 mt-1">
                          <div className="flex items-center text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-xs font-medium">
                            <Users className="w-3 h-3 mr-1" />
                            <span>{session.customer_count} invités</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            <span>
                              Début : {formatTime(session.started_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium shadow-sm flex items-center gap-2">
                       Ouvrir
                    </div>
                  </div>
                </div>

                {/* Session Stats */}
                <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center rounded-b-xl">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm">
                      <span className="text-gray-500">Commandes :</span>
                      <span className="font-bold text-gray-900 ml-1 bg-white border border-gray-200 px-2 py-0.5 rounded">
                        {session.orders?.length || 0}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total</span>
                    <span className="text-xl font-bold text-green-700 bg-green-50 px-3 py-1 rounded-lg border border-green-100">
                      {calculateSessionTotal(session.orders || []).toFixed(3)} DT
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-600">
            <AlertCircle className="w-4 h-4 mr-2" />
            <span>Mise à jour toutes les 30 secondes</span>
          </div>
          <button className="text-gray-900 hover:text-gray-700 ">
            Actualiser
          </button>
        </div>
      </div>
    </div>
  );
}
