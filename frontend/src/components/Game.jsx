import React, { useState, useEffect, useRef } from "react";
import { Heart, Clock, ArrowLeft, Wand2, Shield, Hourglass, Award, Sparkles } from "lucide-react";
import { MAGIC_EMOJIS } from "../utils/magic_emojis";
import confetti from "canvas-confetti";

export default function Game({ size, difficulty, profile, onBackToMap, onUpdateProfile }) {
  const [gameState, setGameState] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null); // { r, c }
  const [useEmojis, setUseEmojis] = useState(true);
  const [activeShield, setActiveShield] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [winData, setWinData] = useState(null);

  // Timer reference
  const timerRef = useRef(null);

  // Fetch active game or generate new one
  useEffect(() => {
    fetchGame();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Sync state with server periodically or on modifications
  const saveGameToServer = async (grid, hearts, timeSpent) => {
    try {
      const token = localStorage.getItem("token");
      await fetch("/api/game/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ grid, hearts, time_spent: timeSpent })
      });
    } catch (err) {
      console.error("Failed to auto-save game:", err);
    }
  };

  const fetchGame = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      // 1. Check if there's an active game
      let res = await fetch("/api/game/state", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      let data = await res.json();

      // 2. If no active game, start a new one
      if (!data) {
        res = await fetch("/api/game/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ size, difficulty })
        });
        data = await res.json();
      }

      setGameState(data);
      startTimer(data.time_spent);
    } catch (err) {
      setError("Could not load magic grid. Please try again!");
    } finally {
      setLoading(false);
    }
  };

  const startTimer = (initialTime) => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    let time = initialTime;
    timerRef.current = setInterval(() => {
      time += 1;
      setGameState((prev) => {
        if (!prev) return prev;
        // Auto-save every 10 seconds
        if (time % 10 === 0) {
          saveGameToServer(prev.grid, prev.hearts, time);
        }
        return { ...prev, time_spent: time };
      });
    }, 1000);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleCellClick = (r, c) => {
    // Only allow selecting empty cells in the original puzzle
    if (gameState.original_grid[r][c] === 0) {
      setSelectedCell({ r, c });
    }
  };

  // Check if a move is valid and updates the grid
  const handleInputVal = async (val) => {
    if (!selectedCell || !gameState) return;
    const { r, c } = selectedCell;

    // Get the correct solution to verify immediately
    // Wait, the client doesn't have the solution in GameState. Let's check how we handle mistakes.
    // To support instant feedback, we can fetch the solution or check it.
    // But safety: the backend HAS the solution in the DB.
    // For child-friendly games, we check immediately against the correct number.
    // How does the client check? We can check the solution if we expose it, or check with backend.
    // Checking with backend for EVERY keypress is slow, so let's check with backend or expose it.
    // In backend model, solution is in the DB.
    // Let's modify our backend to verify the move or simply check locally.
    // Wait, to keep cheating hard but gameplay smooth, we can verify it via API or send validation.
    // Wait, actually, let's keep it simple: the child needs to know if it's right.
    // Let's query an API `/api/game/validate-move` or we can let backend return solution if we don't care about cheating.
    // In main.py, start_game does NOT return solution, which is correct.
    // Let's call the backend validation endpoint or check if we can add a check-move API.
    // Wait! Let's see if we can check it.
    // If the kid makes a mistake, they lose a heart. Let's add a small API `/api/game/check-cell`?
    // Or we can just let them fill the grid and check only at submission?
    // Kids get frustrated if they fill the whole grid and get told "it's wrong" without knowing where.
    // Interactive feedback is MUCH better.
    // Let's add a quick REST endpoint on the backend: `/api/game/validate-cell` that takes {r, c, val} and returns true/false.
    // Wait! A validate-cell API call takes ~50ms, which is fine for game input.
    // Let's call this endpoint.
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/game/validate-cell", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ r, c, val })
      });
      const data = await res.json(); // { correct: true/false }

      const newGrid = [...gameState.grid.map((row) => [...row])];
      let newHearts = gameState.hearts;

      if (data.correct) {
        newGrid[r][c] = val;
        // Sparkle sound or visual feedback
      } else {
        // Mistake!
        if (activeShield) {
          setActiveShield(false); // Shield breaks!
          alert("🛡️ Crystal Shield absorbed the mistake! Your heart is safe!");
        } else {
          newHearts -= 1;
        }
      }

      setGameState((prev) => ({
        ...prev,
        grid: newGrid,
        hearts: newHearts
      }));

      // Trigger auto-save immediately on change
      saveGameToServer(newGrid, newHearts, gameState.time_spent);

      if (newHearts <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        alert("💀 Oh no! You ran out of magic hearts! Let's start the level again!");
        // Re-generate or restart
        fetchGame();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Item usage functions
  const handleUseWand = async () => {
    if (!selectedCell || !gameState) return;
    const { r, c } = selectedCell;

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/game/use-item?item_type=hint_wand`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail);
        return;
      }

      // Fetch the correct value for this cell
      const hintRes = await fetch(`/api/game/hint?r=${r}&c=${c}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const hintData = await hintRes.json(); // { val: X }

      const newGrid = [...gameState.grid.map((row) => [...row])];
      newGrid[r][c] = hintData.val;

      setGameState((prev) => ({ ...prev, grid: newGrid }));
      saveGameToServer(newGrid, gameState.hearts, gameState.time_spent);
      onUpdateProfile(); // Sync profile inventory
    } catch (err) {
      console.error(err);
    }
  };

  const handleUseShield = async () => {
    if (activeShield) {
      alert("You already have an active Crystal Shield protecting you!");
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/game/use-item?item_type=crystal_shield`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail);
        return;
      }

      setActiveShield(true);
      onUpdateProfile();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUseHourglass = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/game/use-item?item_type=hourglass`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail);
        return;
      }

      // Hourglass deducts 60 seconds from current timer
      setGameState((prev) => {
        const newTime = Math.max(0, prev.time_spent - 60);
        saveGameToServer(prev.grid, prev.hearts, newTime);
        return { ...prev, time_spent: newTime };
      });
      onUpdateProfile();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/game/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ grid: gameState.grid })
      });
      const data = await res.json();

      if (data.correct) {
        if (timerRef.current) clearInterval(timerRef.current);
        
        // Celebrate!
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });

        setWinData(data);
      } else {
        alert("❌ Almost there! Some cells are incorrect. Keep searching!");
      }
    } catch (err) {
      alert("Submission error!");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-candy-purple border-t-transparent mb-4"></div>
        <p className="font-bold text-indigo-700">Opening magic scroll...</p>
      </div>
    );
  }

  if (error || !gameState) {
    return (
      <div className="text-center p-8 bg-white/80 rounded-2xl border-2 border-red-200">
        <p className="text-red-600 font-bold mb-4">{error || "Game load failed"}</p>
        <button onClick={onBackToMap} className="bg-indigo-600 text-white font-bold px-4 py-2 rounded-xl">
          Back to Map
        </button>
      </div>
    );
  }

  // Define column split logic for subgrids
  const getSubgridBorders = (r, c) => {
    let classes = "";
    if (size === 4) {
      if (r === 1) classes += " border-b-3 border-b-indigo-900";
      if (c === 1) classes += " border-r-3 border-r-indigo-900";
    } else if (size === 6) {
      if (r === 1 || r === 3) classes += " border-b-3 border-b-indigo-900";
      if (c === 2) classes += " border-r-3 border-r-indigo-900";
    } else if (size === 9) {
      if (r === 2 || r === 5) classes += " border-b-3 border-b-indigo-900";
      if (c === 2 || c === 5) classes += " border-r-3 border-r-indigo-900";
    }
    return classes;
  };

  // Keys available for input
  const keys = Array.from({ length: size }, (_, i) => i + 1);

  // User items inventory map
  const getInventoryQuantity = (type) => {
    const match = profile.inventory?.find((it) => it.item_type === type);
    return match ? match.quantity : 0;
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20">
      
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBackToMap}
          className="flex items-center gap-1.5 text-indigo-700 font-bold bg-white/80 hover:bg-white px-4 py-2 rounded-2xl border-2 border-indigo-100 shadow-sm cursor-pointer"
        >
          <ArrowLeft size={18} />
          <span>Back to Map</span>
        </button>

        {/* Level Banner */}
        <div className="bg-candy-purple text-white px-5 py-2 rounded-2xl font-extrabold text-sm shadow-md flex items-center gap-1.5">
          <Award size={18} />
          <span>QUEST LEVEL {profile.current_level}</span>
        </div>
      </div>

      {/* WIN OVERLAY IF LEVEL COMPLETED */}
      {winData && (
        <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 border-4 border-candy-purple text-center shadow-2xl animate-playful">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-extrabold text-indigo-900 mb-2">Quest Completed!</h2>
            <p className="text-sm font-semibold text-indigo-500 mb-6">Excellent solving, young apprentice!</p>
            
            <div className="bg-indigo-50 rounded-2xl p-4 space-y-3 mb-6 border-2 border-indigo-100">
              <div className="flex justify-between items-center font-extrabold text-indigo-900">
                <span>Coins Earned:</span>
                <span className="text-amber-600 flex items-center gap-1">+{winData.coins_earned} 🟡</span>
              </div>
              <div className="flex justify-between items-center font-extrabold text-indigo-900">
                <span>XP Gained:</span>
                <span className="text-purple-600">+{winData.xp_earned} XP</span>
              </div>
              <div className="flex justify-between items-center font-extrabold text-indigo-900">
                <span>Next Quest Level:</span>
                <span className="text-indigo-600">Level {winData.new_level}</span>
              </div>
            </div>

            <button
              onClick={() => {
                onUpdateProfile();
                onBackToMap();
              }}
              className="w-full bg-gradient-to-r from-candy-purple to-indigo-600 text-white font-extrabold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transform active:scale-95 transition-all text-lg cursor-pointer"
            >
              Continue Journey
            </button>
          </div>
        </div>
      )}

      {/* Main Game Interface */}
      <div className="bg-white/80 backdrop-blur-md rounded-3xl p-4 md:p-6 shadow-xl border-4 border-indigo-100">
        
        {/* Game Stats Bar */}
        <div className="flex items-center justify-between border-b-2 border-indigo-50 pb-4 mb-6">
          {/* Hearts */}
          <div className="flex items-center gap-1 bg-red-50 border-2 border-red-100 px-3 py-1.5 rounded-2xl">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart
                key={i}
                className={i < gameState.hearts ? "text-red-500 fill-red-500" : "text-gray-300"}
                size={22}
              />
            ))}
          </div>

          {/* Active Shield Display */}
          {activeShield && (
            <div className="flex items-center gap-1 bg-blue-50 border-2 border-blue-100 px-3 py-1.5 rounded-2xl text-blue-600 font-extrabold text-xs">
              <Shield size={16} fill="#70d6ff" />
              <span>Shield Active!</span>
            </div>
          )}

          {/* Timer */}
          <div className="flex items-center gap-1.5 bg-indigo-50 border-2 border-indigo-100 px-3 py-1.5 rounded-2xl font-extrabold text-indigo-800 text-lg">
            <Clock size={20} />
            <span>{formatTime(gameState.time_spent)}</span>
          </div>
        </div>

        {/* Inventory Quick Use Panel */}
        <div className="flex items-center justify-center gap-4 bg-indigo-50/40 p-3 rounded-2xl border-2 border-indigo-100/50 mb-6">
          <div className="text-xs font-bold text-indigo-500 uppercase tracking-wide mr-1">Magic Items:</div>
          
          {/* Wand / Hint */}
          <button
            onClick={handleUseWand}
            disabled={!selectedCell || getInventoryQuantity("hint_wand") <= 0}
            className="flex items-center gap-1 bg-white hover:bg-purple-50 disabled:bg-gray-100 disabled:opacity-50 border-2 border-purple-200 px-3 py-1.5 rounded-xl shadow-sm text-purple-700 font-bold text-sm transition-all cursor-pointer"
            title="Reveal selected cell"
          >
            <Wand2 size={16} />
            <span>Wand ({getInventoryQuantity("hint_wand")})</span>
          </button>

          {/* Shield */}
          <button
            onClick={handleUseShield}
            disabled={activeShield || getInventoryQuantity("crystal_shield") <= 0}
            className="flex items-center gap-1 bg-white hover:bg-blue-50 disabled:bg-gray-100 disabled:opacity-50 border-2 border-blue-200 px-3 py-1.5 rounded-xl shadow-sm text-blue-700 font-bold text-sm transition-all cursor-pointer"
            title="Shield mistake protector"
          >
            <Shield size={16} />
            <span>Shield ({getInventoryQuantity("crystal_shield")})</span>
          </button>

          {/* Hourglass */}
          <button
            onClick={handleUseHourglass}
            disabled={getInventoryQuantity("hourglass") <= 0}
            className="flex items-center gap-1 bg-white hover:bg-yellow-50 disabled:bg-gray-100 disabled:opacity-50 border-2 border-yellow-200 px-3 py-1.5 rounded-xl shadow-sm text-yellow-700 font-bold text-sm transition-all cursor-pointer"
            title="Minus 60 seconds from timer"
          >
            <Hourglass size={16} />
            <span>Glass ({getInventoryQuantity("hourglass")})</span>
          </button>
        </div>

        {/* Emoji / Number Mode Selector */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold text-indigo-700">Display Style:</span>
          <div className="bg-indigo-100 p-0.5 rounded-xl flex">
            <button
              onClick={() => setUseEmojis(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                useEmojis ? "bg-white text-indigo-800 shadow" : "text-indigo-500"
              }`}
            >
              🦄 Magic Emojis
            </button>
            <button
              onClick={() => setUseEmojis(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                !useEmojis ? "bg-white text-indigo-800 shadow" : "text-indigo-500"
              }`}
            >
              🔢 Numbers
            </button>
          </div>
        </div>

        {/* Sudoku Grid Board */}
        <div
          className={`grid gap-1 bg-indigo-200 p-2 rounded-2xl border-4 border-indigo-900/10 mb-6 mx-auto ${
            size === 4 ? "grid-cols-4 max-w-[280px]" : size === 6 ? "grid-cols-6 max-w-[360px]" : "grid-cols-9 max-w-[500px]"
          }`}
        >
          {gameState.grid.map((row, r) =>
            row.map((cellVal, c) => {
              const isSelected = selectedCell?.r === r && selectedCell?.c === c;
              const isPredefined = gameState.original_grid[r][c] !== 0;
              const isBorderClass = getSubgridBorders(r, c);

              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  className={`aspect-square w-full rounded-lg border border-indigo-100 flex items-center justify-center font-extrabold shadow-sm transition-all focus:outline-none cursor-pointer ${isBorderClass} ${
                    isPredefined
                      ? "bg-indigo-100 text-indigo-950 font-black cursor-not-allowed"
                      : isSelected
                      ? "bg-candy-pink/30 border-candy-pink ring-2 ring-candy-pink"
                      : "bg-white hover:bg-indigo-50/50 text-indigo-700"
                  } ${
                    size === 4 ? "text-2xl" : size === 6 ? "text-xl" : "text-lg"
                  }`}
                >
                  {cellVal !== 0 ? (
                    useEmojis ? (
                      MAGIC_EMOJIS[cellVal]?.char || cellVal
                    ) : (
                      cellVal
                    )
                  ) : (
                    ""
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Selected Cell Banner */}
        {selectedCell && (
          <div className="text-center font-bold text-indigo-500 text-sm mb-3">
            Select a magic piece to fill cell Row {selectedCell.r + 1}, Column {selectedCell.c + 1}:
          </div>
        )}

        {/* Keyboard input block */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          {keys.map((num) => (
            <button
              key={num}
              disabled={!selectedCell}
              onClick={() => handleInputVal(num)}
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-xl shadow-md border-b-4 border-indigo-500 active:translate-y-0.5 active:border-b-0 transition-all cursor-pointer ${
                selectedCell
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                  : "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
              }`}
            >
              {useEmojis ? MAGIC_EMOJIS[num]?.char || num : num}
            </button>
          ))}
          
          {/* Eraser Key */}
          <button
            disabled={!selectedCell}
            onClick={() => handleInputVal(0)}
            className={`px-4 h-12 rounded-xl flex items-center justify-center font-extrabold text-sm shadow-md border-b-4 border-red-500 active:translate-y-0.5 active:border-b-0 transition-all cursor-pointer ${
              selectedCell
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
            }`}
          >
            Erase
          </button>
        </div>

        {/* Submit Quest Button */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white font-extrabold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transform active:scale-98 transition-all text-lg flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles size={20} />
          <span>{submitting ? "Checking Scroll..." : "Submit Magic Grid"}</span>
        </button>

      </div>
    </div>
  );
}
