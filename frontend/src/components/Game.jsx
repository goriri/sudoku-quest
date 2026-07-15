import React, { useState, useEffect, useRef } from "react";
import { Heart, Clock, ArrowLeft, Wand2, Shield, Hourglass, Award, Sparkles, X } from "lucide-react";
import { MAGIC_EMOJIS, AVATARS } from "../utils/magic_emojis";
import confetti from "canvas-confetti";

export default function Game({ size, difficulty, profile, onBackToMap, onUpdateProfile }) {
  const monster = (() => {
    const lvl = profile.current_level;
    if (lvl <= 5) {
      return { name: "Forest Slime", avatar: "👻" };
    } else if (lvl <= 10) {
      return { name: "Cave Troll", avatar: "👹" };
    } else {
      return { name: "Lava Dragon", avatar: "🐉" };
    }
  })();

  const [gameState, setGameState] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null); // { r, c }
  const [useEmojis, setUseEmojis] = useState(true);
  const [activeShield, setActiveShield] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [winData, setWinData] = useState(null);

  // Combat States
  const [monsterHp, setMonsterHp] = useState(100);
  const [totalEmptyCells, setTotalEmptyCells] = useState(1);
  const [playerAttacking, setPlayerAttacking] = useState(false);
  const [monsterHit, setMonsterHit] = useState(false);
  const [monsterAttacking, setMonsterAttacking] = useState(false);
  const [playerHit, setPlayerHit] = useState(false);
  const [showOutOfLivesModal, setShowOutOfLivesModal] = useState(false);
  const [spellProjectile, setSpellProjectile] = useState(null); // { type: 'player' | 'monster', emoji }

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

      const total = data.original_grid.reduce((acc, row) => acc + row.filter(c => c === 0).length, 0);
      const originalFilled = data.original_grid.reduce((acc, row) => acc + row.filter(c => c !== 0).length, 0);
      const currentFilled = data.grid.reduce((acc, row) => acc + row.filter(c => c !== 0).length, 0);
      const solvedCount = currentFilled - originalFilled;
      const calculatedHp = Math.max(0, 100 - (solvedCount * (100 / (total || 1))));

      setTotalEmptyCells(total || 1);
      setMonsterHp(calculatedHp);
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
        
        // Attack animations
        setPlayerAttacking(true);
        setMonsterHit(true);
        const playerSpells = ["⚡", "🔥", "❄️", "✨", "☄️", "💫"];
        setSpellProjectile({
          type: "player",
          emoji: playerSpells[Math.floor(Math.random() * playerSpells.length)]
        });
        setTimeout(() => {
          setPlayerAttacking(false);
          setMonsterHit(false);
          setSpellProjectile(null);
        }, 600);

        // Update Monster Health
        setMonsterHp((prev) => Math.max(0, prev - (100 / totalEmptyCells)));
      } else {
        // Mistake animations
        setMonsterAttacking(true);
        setPlayerHit(true);
        const monsterSpells = ["💀", "💥", "🩸", "👾", "🌀"];
        setSpellProjectile({
          type: "monster",
          emoji: monsterSpells[Math.floor(Math.random() * monsterSpells.length)]
        });
        setTimeout(() => {
          setMonsterAttacking(false);
          setPlayerHit(false);
          setSpellProjectile(null);
        }, 600);

        if (activeShield) {
          setActiveShield(false);
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

      saveGameToServer(newGrid, newHearts, gameState.time_spent);

      if (newHearts <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        // Trigger Out of Lives Modal!
        setShowOutOfLivesModal(true);
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

  const handleUsePotion = async () => {
    if (gameState.hearts >= 3) {
      alert("Your magic hearts are already full!");
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/game/use-item?item_type=life_potion`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail);
        return;
      }

      setGameState((prev) => {
        const newHearts = Math.min(3, prev.hearts + 1);
        saveGameToServer(prev.grid, newHearts, prev.time_spent);
        return { ...prev, hearts: newHearts };
      });
      onUpdateProfile();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBuyLife = async () => {
    if (profile.coins < 15) {
      alert("Not enough coins! You must restart the quest.");
      return;
    }

    const token = localStorage.getItem("token");
    try {
      // 1. Buy life potion
      let res = await fetch("/api/shop/buy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ item_type: "life_potion", quantity: 1 })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail);
        return;
      }

      // 2. Use life potion
      res = await fetch("/api/game/use-item?item_type=life_potion", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail);
        return;
      }

      // 3. Update client state
      setGameState((prev) => {
        const newHearts = Math.min(3, prev.hearts + 1);
        saveGameToServer(prev.grid, newHearts, prev.time_spent);
        return { ...prev, hearts: newHearts };
      });

      onUpdateProfile();
      setShowOutOfLivesModal(false);
      startTimer(gameState.time_spent);

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

  const getDifficultyBadge = (diff) => {
    if (diff === "easy") return "bg-green-100 text-green-700 border-green-200";
    if (diff === "medium") return "bg-blue-100 text-blue-700 border-blue-200";
    if (diff === "hard") return "bg-orange-100 text-orange-700 border-orange-200";
    return "bg-red-100 text-red-700 border-red-200"; // expert/master
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20">
      
      {/* Top Bar Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <button
          onClick={onBackToMap}
          className="flex items-center gap-1.5 text-indigo-700 font-bold bg-white/80 hover:bg-white px-4 py-2 rounded-2xl border-2 border-indigo-100 shadow-sm cursor-pointer"
        >
          <ArrowLeft size={18} />
          <span>Back to Map</span>
        </button>

        {/* Level, Stage & Difficulty Badges */}
        {gameState && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-candy-purple text-white px-4 py-1.5 rounded-2xl font-extrabold text-xs shadow-md flex items-center gap-1.5">
              <Award size={14} />
              <span>LEVEL {profile.current_level}</span>
            </div>
            <div className="bg-indigo-50 border-2 border-indigo-100 text-indigo-700 px-3 py-1 rounded-2xl font-extrabold text-xs">
              STAGE {gameState.stage} OF 50
            </div>
            <div className={`border-2 px-3 py-1 rounded-2xl font-extrabold text-xs capitalize ${getDifficultyBadge(gameState.difficulty)}`}>
              {gameState.difficulty}
            </div>
          </div>
        )}
      </div>

      {/* WIN OVERLAY IF STAGE/LEVEL COMPLETED */}
      {winData && (
        <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 border-4 border-candy-purple text-center shadow-2xl animate-playful">
            {winData.level_completed ? (
              <>
                <div className="text-6xl mb-4">🏆</div>
                <h2 className="text-3xl font-extrabold text-indigo-900 mb-2">Quest Completed!</h2>
                <p className="text-sm font-semibold text-indigo-500 mb-6">Excellent solving, young apprentice!</p>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">🌟</div>
                <h2 className="text-3xl font-extrabold text-indigo-900 mb-2">Stage Cleared!</h2>
                <p className="text-sm font-semibold text-indigo-500 mb-6">Great job beating the monster! Prepare for the next wave!</p>
              </>
            )}
            
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
                {winData.level_completed ? (
                  <>
                    <span>Next Quest Level:</span>
                    <span className="text-indigo-600">Level {winData.new_level}</span>
                  </>
                ) : (
                  <>
                    <span>Next Stage:</span>
                    <span className="text-indigo-600">Stage {winData.new_stage} of 50</span>
                  </>
                )}
              </div>
            </div>

            {winData.level_completed ? (
              <button
                onClick={() => {
                  onUpdateProfile();
                  onBackToMap();
                }}
                className="w-full bg-gradient-to-r from-candy-purple to-indigo-600 text-white font-extrabold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transform active:scale-95 transition-all text-lg cursor-pointer"
              >
                Continue Journey
              </button>
            ) : (
              <button
                onClick={async () => {
                  onUpdateProfile();
                  setWinData(null);
                  setGameState(null);
                  setLoading(true);
                  await fetchGame();
                }}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-extrabold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transform active:scale-95 transition-all text-lg cursor-pointer animate-pulse"
              >
                Enter Stage {winData.new_stage} ⚔️
              </button>
            )}
          </div>
        </div>
      )}

      {/* OUT OF LIVES BUY-BACK MODAL */}
      {showOutOfLivesModal && (
        <div className="fixed inset-0 bg-indigo-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border-4 border-red-500 text-center shadow-2xl animate-playful relative">
            <div className="text-5xl mb-4">💀</div>
            <h2 className="text-2xl font-black text-red-600 mb-2">Defeated by the Monster!</h2>
            <p className="text-xs text-indigo-500 font-semibold mb-6">
              You are out of magic hearts! Purchase a Life Potion to heal and continue the battle, or retreat to the map.
            </p>
            
            <div className="bg-indigo-50 rounded-2xl p-4 mb-6 border-2 border-indigo-100 flex items-center justify-between">
              <div className="text-left">
                <div className="text-xs text-indigo-400 font-bold uppercase">Your Coins</div>
                <div className="text-lg font-black text-indigo-900">{profile.coins} 🟡</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-red-400 font-bold uppercase">Potion Cost</div>
                <div className="text-lg font-black text-red-600">15 🟡</div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleBuyLife}
                disabled={profile.coins < 15}
                className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-md transition-all text-sm cursor-pointer"
              >
                {profile.coins >= 15 ? "Buy Life Potion & Revive (15 🟡)" : "Not Enough Coins!"}
              </button>
              
              <button
                onClick={() => {
                  setShowOutOfLivesModal(false);
                  fetchGame(); // restarts level
                }}
                className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-3 px-4 rounded-xl border border-indigo-200 transition-all text-xs cursor-pointer"
              >
                Restart Level (Lose Progress)
              </button>
              
              <button
                onClick={() => {
                  setShowOutOfLivesModal(false);
                  onBackToMap();
                }}
                className="w-full text-indigo-400 hover:text-indigo-600 font-bold text-xs pt-1 cursor-pointer"
              >
                Retreat to Map
              </button>
            </div>
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

        {/* Combat Battle Arena */}
        <div className="bg-indigo-950 text-white rounded-3xl p-4 mb-6 border-4 border-indigo-900 flex justify-between items-center relative overflow-hidden h-36 shadow-inner">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-transparent to-transparent pointer-events-none" />

          {/* Flying Spell Projectile */}
          {spellProjectile && (
            <span
              className={`absolute text-4xl z-30 pointer-events-none ${
                spellProjectile.type === "player"
                  ? "left-24 top-10 animate-projectile-right"
                  : "right-24 top-10 animate-projectile-left"
              }`}
            >
              {spellProjectile.emoji}
            </span>
          )}

          {/* Player Side */}
          <div className={`flex flex-col items-center gap-1 transition-all duration-300 w-24 ${playerAttacking ? 'translate-x-12 scale-110 z-20' : ''} ${playerHit ? 'animate-shake bg-red-900/40 rounded-2xl p-2' : ''}`}>
            <span className="text-5xl select-none filter drop-shadow-[0_4px_6px_rgba(255,255,255,0.15)]">
              {AVATARS[profile.avatar]?.emoji || "🧙‍♂️"}
            </span>
            <span className="text-xs font-black tracking-wide truncate max-w-full text-indigo-200">{profile.username}</span>
            <div className="w-16 bg-gray-800 h-2 rounded-full overflow-hidden border border-gray-700 mt-1">
              <div className="bg-red-500 h-full transition-all duration-300" style={{ width: `${(gameState.hearts / 3) * 100}%` }} />
            </div>
          </div>

          {/* Clash Effect */}
          <div className="flex flex-col items-center z-10">
            <div className="text-amber-400 font-black text-2xl italic tracking-widest animate-pulse filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">VS</div>
            {(playerAttacking || monsterAttacking) && (
              <span className="absolute text-3xl animate-ping text-amber-300">💥</span>
            )}
          </div>

          {/* Monster Side */}
          <div className={`flex flex-col items-center gap-1 transition-all duration-300 w-24 ${monsterAttacking ? '-translate-x-12 scale-110 z-20' : ''} ${monsterHit ? 'animate-shake bg-red-900/40 rounded-2xl p-2' : ''}`}>
            <span className="text-5xl select-none filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.15)]">{monster.avatar}</span>
            <span className="text-xs font-black tracking-wide truncate max-w-full text-indigo-200">{monster.name}</span>
            <div className="w-16 bg-gray-800 h-2 rounded-full overflow-hidden border border-gray-700 mt-1">
              <div className="bg-green-500 h-full transition-all duration-300" style={{ width: `${monsterHp}%` }} />
            </div>
          </div>
        </div>

        {/* Inventory Quick Use Panel */}
        {/* Inventory Quick Use Panel */}
        <div className="flex items-center justify-center gap-3.5 bg-indigo-50/50 p-2.5 rounded-2xl border-2 border-indigo-100/50 mb-6 max-w-sm mx-auto">
          {/* Wand */}
          <button
            onClick={handleUseWand}
            disabled={!selectedCell || getInventoryQuantity("hint_wand") <= 0}
            className="relative w-12 h-12 bg-white hover:bg-purple-50 disabled:bg-gray-100 disabled:opacity-50 border-2 border-purple-200 border-b-4 hover:border-purple-300 rounded-2xl flex items-center justify-center shadow-md active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer"
            title="Wand: Reveal selected cell"
          >
            <Wand2 className="text-purple-600" size={20} />
            <span className="absolute -top-1.5 -right-1.5 bg-purple-600 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow">
              {getInventoryQuantity("hint_wand")}
            </span>
          </button>

          {/* Shield */}
          <button
            onClick={handleUseShield}
            disabled={activeShield || getInventoryQuantity("crystal_shield") <= 0}
            className="relative w-12 h-12 bg-white hover:bg-blue-50 disabled:bg-gray-100 disabled:opacity-50 border-2 border-blue-200 border-b-4 hover:border-blue-300 rounded-2xl flex items-center justify-center shadow-md active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer"
            title="Shield: Protect next mistake"
          >
            <Shield className="text-blue-500 fill-blue-50" size={20} />
            <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow">
              {getInventoryQuantity("crystal_shield")}
            </span>
          </button>

          {/* Hourglass */}
          <button
            onClick={handleUseHourglass}
            disabled={getInventoryQuantity("hourglass") <= 0}
            className="relative w-12 h-12 bg-white hover:bg-yellow-50 disabled:bg-gray-100 disabled:opacity-50 border-2 border-yellow-200 border-b-4 hover:border-yellow-300 rounded-2xl flex items-center justify-center shadow-md active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer"
            title="Hourglass: Reduce timer by 60s"
          >
            <Hourglass className="text-yellow-600" size={20} />
            <span className="absolute -top-1.5 -right-1.5 bg-yellow-600 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow">
              {getInventoryQuantity("hourglass")}
            </span>
          </button>

          {/* Potion */}
          <button
            onClick={handleUsePotion}
            disabled={gameState.hearts >= 3 || getInventoryQuantity("life_potion") <= 0}
            className="relative w-12 h-12 bg-white hover:bg-red-50 disabled:bg-gray-100 disabled:opacity-50 border-2 border-red-200 border-b-4 hover:border-red-300 rounded-2xl flex items-center justify-center shadow-md active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer"
            title="Life Potion: Restore 1 heart"
          >
            <Heart className="text-red-500 fill-red-400" size={20} />
            <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow">
              {getInventoryQuantity("life_potion")}
            </span>
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
        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-6">
          {keys.map((num) => (
            <button
              key={num}
              disabled={!selectedCell}
              onClick={() => handleInputVal(num)}
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-xl shadow-md border-b-4 active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer ${
                selectedCell
                  ? "bg-candy-yellow hover:bg-amber-400 text-amber-950 border-amber-500"
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
            className={`px-4 h-12 rounded-xl flex items-center justify-center font-extrabold text-sm shadow-md border-b-4 active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer ${
              selectedCell
                ? "bg-rose-100 hover:bg-rose-200 text-rose-700 border-rose-400"
                : "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
            }`}
          >
            Erase 🧹
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
