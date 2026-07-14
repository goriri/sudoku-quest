import React, { useState } from "react";
import { Coins, Shield, Wand2, Hourglass, X } from "lucide-react";

export default function Shop({ profile, onClose, onPurchaseSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const shopItems = [
    {
      type: "hint_wand",
      name: "Magic Wand",
      description: "Fills in one secret cell for you!",
      cost: 30,
      icon: <Wand2 className="text-candy-purple" size={32} />,
      color: "border-candy-purple bg-purple-50/50"
    },
    {
      type: "crystal_shield",
      name: "Crystal Shield",
      description: "Protects you from making a mistake!",
      cost: 50,
      icon: <Shield className="text-candy-blue" size={32} />,
      color: "border-candy-blue bg-blue-50/50"
    },
    {
      type: "hourglass",
      name: "Time Hourglass",
      description: "Gives you extra magic time!",
      cost: 20,
      icon: <Hourglass className="text-candy-yellow" size={32} />,
      color: "border-candy-yellow bg-yellow-50/50"
    }
  ];

  const handleBuy = async (itemType, cost) => {
    if (profile.coins < cost) {
      setError("Not enough Mana Coins! Play more levels to earn coins!");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/shop/buy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ item_type: itemType, quantity: 1 })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Transaction failed");
      }

      onPurchaseSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border-4 border-candy-yellow relative animate-playful">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-2 bg-indigo-50 hover:bg-indigo-100 rounded-full text-indigo-700 cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="bg-candy-yellow/30 p-6 text-center border-b-2 border-candy-yellow/40">
          <h2 className="text-3xl font-extrabold text-amber-800 tracking-wide flex items-center justify-center gap-2">
            🔮 Magic Shop
          </h2>
          <p className="text-sm font-semibold text-amber-700 mt-1">
            Exchange your Mana Coins for magic powers!
          </p>

          {/* User Coins display */}
          <div className="inline-flex items-center gap-1.5 bg-white/80 px-4 py-2 rounded-full border-2 border-candy-yellow mt-4">
            <Coins className="text-amber-500" size={18} />
            <span className="font-extrabold text-amber-800">{profile.coins} Coins</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="bg-red-100 border-2 border-red-300 text-red-700 px-4 py-2 rounded-xl text-center font-bold text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {shopItems.map((item) => (
              <div
                key={item.type}
                className={`border-3 rounded-2xl p-4 flex items-center justify-between gap-4 transition-all ${item.color}`}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-white p-3 rounded-xl shadow-inner border border-gray-100">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-indigo-900 text-lg">{item.name}</h4>
                    <p className="text-xs text-indigo-500 font-semibold">{item.description}</p>
                  </div>
                </div>

                <button
                  disabled={loading || profile.coins < item.cost}
                  onClick={() => handleBuy(item.type, item.cost)}
                  className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl font-extrabold shadow-md border-b-4 transition-all active:translate-y-0.5 active:border-b-0 cursor-pointer ${
                    profile.coins >= item.cost
                      ? "bg-candy-yellow border-amber-500 hover:bg-candy-yellow/95 text-amber-900"
                      : "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <span className="text-sm">Buy</span>
                  <div className="flex items-center gap-0.5 text-xs mt-0.5">
                    <Coins size={12} />
                    <span>{item.cost}</span>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
