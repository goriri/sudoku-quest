import React from "react";
import { Lock, Play, ShoppingBag, LogOut, Award, Coins } from "lucide-react";
import { AVATARS } from "../utils/magic_emojis";

export default function Map({ profile, onSelectLevel, onOpenShop, onLogout }) {
  // Define zones mapping
  const zones = [
    {
      id: 1,
      name: "Whispering Woods",
      description: "Simple 4x4 Magic Grids",
      levels: [1, 2, 3, 4, 5],
      color: "bg-emerald-50 border-emerald-200",
      textColor: "text-emerald-700",
      bubbleBg: "bg-emerald-400 border-emerald-600 text-white",
      lockedBg: "bg-emerald-200 text-emerald-500",
      size: 4,
      difficulty: "easy"
    },
    {
      id: 2,
      name: "Crystal Caves",
      description: "Intermediate 6x6 Gem Grids",
      levels: [6, 7, 8, 9, 10],
      color: "bg-indigo-50 border-indigo-200",
      textColor: "text-indigo-700",
      bubbleBg: "bg-indigo-400 border-indigo-600 text-white",
      lockedBg: "bg-indigo-200 text-indigo-500",
      size: 6,
      difficulty: "medium"
    },
    {
      id: 3,
      name: "Cloud Castle",
      description: "Master 9x9 Royal Grids",
      levels: [11, 12, 13, 14, 15],
      color: "bg-amber-50 border-amber-200",
      textColor: "text-amber-700",
      bubbleBg: "bg-amber-400 border-amber-600 text-white",
      lockedBg: "bg-amber-200 text-amber-500",
      size: 9,
      difficulty: "hard"
    }
  ];

  const getAvatarInfo = () => {
    return AVATARS[profile.avatar] || { label: "Adventurer", color: "from-purple-400 to-indigo-500" };
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 pb-20">
      
      {/* Top Profile Header */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-md border-2 border-indigo-100 flex flex-wrap items-center justify-between gap-4 mb-8">
        
        {/* User Info */}
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full bg-gradient-to-tr ${getAvatarInfo().color} flex items-center justify-center text-2xl shadow-inner`}>
            {profile.avatar === "wizard" ? "🧙‍♂️" : profile.avatar === "fairy" ? "🧚‍♀️" : profile.avatar === "knight" ? "🛡️" : "🧝‍♂️"}
          </div>
          <div>
            <h2 className="font-extrabold text-indigo-900 text-lg leading-tight">
              {profile.username}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Award className="text-candy-purple" size={16} />
              <span className="text-xs font-bold text-indigo-500 uppercase tracking-wide">
                Level {profile.current_level} (XP: {profile.xp})
              </span>
            </div>
          </div>
        </div>

        {/* Currency & Inventory Shop buttons */}
        <div className="flex items-center gap-3">
          {/* Coin tracker */}
          <div className="flex items-center gap-1.5 bg-candy-yellow/20 px-4 py-2 rounded-2xl border-2 border-candy-yellow/40">
            <Coins className="text-amber-500 animate-pulse" size={20} />
            <span className="font-extrabold text-amber-800 text-lg">{profile.coins}</span>
          </div>

          {/* Shop button */}
          <button
            onClick={onOpenShop}
            className="flex items-center gap-1.5 bg-candy-pink hover:bg-candy-pink/90 text-white font-bold px-4 py-2 rounded-2xl shadow hover:shadow-md transform active:scale-95 transition-all cursor-pointer"
          >
            <ShoppingBag size={20} />
            <span>Magic Shop</span>
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="p-2 text-indigo-400 hover:text-indigo-600 rounded-2xl hover:bg-indigo-50 cursor-pointer"
            title="Log Out"
          >
            <LogOut size={22} />
          </button>
        </div>
      </div>

      {/* Main Map Journey */}
      <div className="space-y-8">
        <h1 className="text-4xl font-extrabold text-indigo-900 text-center tracking-wide mb-2">
          Your Magic Adventure
        </h1>
        <p className="text-center text-indigo-500 font-medium -mt-6 mb-8">
          Complete Sudoku challenges to unlock new regions!
        </p>

        {zones.map((zone) => {
          // A zone is fully locked if all its levels are greater than the user's level
          const isZoneLocked = zone.levels[0] > profile.current_level;

          return (
            <div
              key={zone.id}
              className={`rounded-3xl p-6 border-4 transition-all shadow-md ${
                isZoneLocked ? "opacity-60 bg-gray-50 border-gray-200" : `${zone.color}`
              }`}
            >
              {/* Zone Header */}
              <div className="mb-6">
                <h3 className={`text-2xl font-extrabold ${isZoneLocked ? "text-gray-500" : zone.textColor}`}>
                  {zone.name}
                </h3>
                <p className="text-sm font-semibold text-gray-500">
                  {zone.description}
                </p>
              </div>

              {/* Levels Path */}
              <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
                {zone.levels.map((lvl, index) => {
                  const isLevelCompleted = lvl < profile.current_level;
                  const isLevelActive = lvl === profile.current_level;
                  const isLevelLocked = lvl > profile.current_level;

                  return (
                    <div key={lvl} className="flex items-center">
                      {/* Connection line between nodes */}
                      {index > 0 && (
                        <div className={`hidden md:block w-8 h-1 border-t-4 border-dashed mx-[-12px] z-0 ${
                          isLevelLocked ? "border-gray-300" : "border-indigo-300"
                        }`} />
                      )}

                      {/* Level bubble */}
                      <button
                        disabled={isLevelLocked}
                        onClick={() => onSelectLevel(zone.size, zone.difficulty)}
                        className={`w-16 h-16 rounded-full border-4 flex flex-col items-center justify-center relative font-extrabold text-xl shadow-lg transform transition-all z-10 ${
                          isLevelActive
                            ? "bg-candy-pink border-pink-600 text-white scale-110 animate-bounce cursor-pointer ring-4 ring-pink-300/40"
                            : isLevelCompleted
                            ? `${zone.bubbleBg} opacity-80 cursor-pointer`
                            : `${zone.lockedBg} border-gray-300 cursor-not-allowed`
                        }`}
                      >
                        {isLevelLocked ? (
                          <Lock size={20} />
                        ) : isLevelActive ? (
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] uppercase font-bold tracking-wider -mb-1">Play</span>
                            <Play size={18} fill="white" />
                          </div>
                        ) : (
                          <span>{lvl}</span>
                        )}

                        {/* Tiny checkmark if completed */}
                        {isLevelCompleted && (
                          <span className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold border-2 border-white">
                            ✓
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
