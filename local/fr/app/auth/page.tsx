"use client";
import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useAlert } from '../../components/AlertContext';

export default function Page() {
  const [accessCode, setAccessCode] = useState("");
  const router = useRouter();
  const { showAlert } = useAlert();

  const handleAccess = async () => {
    try {
      const res = await axios.post("http://localhost:4000/api/device/set", {
        deviceId: accessCode,
      });

      if (res.data.success) {
        showAlert("✅ Identifiant de l’appareil enregistré avec succès", "success");
        router.push("/auth/connexion");
      } else {
        showAlert("❌ Échec de l’enregistrement de l’appareil", "error");
      }
    } catch (error) {
      console.error("Erreur lors de la définition de l’ID de l’appareil :", error);
      showAlert("Une erreur s’est produite lors de la connexion au serveur", "error");
    }
  };

  return (
    <div dir="ltr" className="min-h-screen flex flex-col justify-center items-center text-gray-900">
      <div className="w-full max-w-md mx-auto bg-white rounded-2xl p-8 flex flex-col items-center space-y-6">
        <h1 className="text-xl font-semibold text-center">
          Saisir l’identifiant de l’appareil
        </h1>

        <input
          type="text"
          value={accessCode}
          onChange={(e) => setAccessCode(e.target.value)}
          placeholder="Entrez l’identifiant de l’appareil"
          className="w-full border border-gray-300 focus:border-gray-500 py-2.5 px-4 text-center"
        />

        <button
          onClick={handleAccess}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2.5"
        >
          Enregistrer l’appareil
        </button>
      </div>
    </div>
  );
}
