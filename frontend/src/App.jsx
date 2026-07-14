import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Map from "./components/Map";
import Game from "./components/Game";
import Shop from "./components/Shop";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState("map"); // map, game
  const [activeLevel, setActiveLevel] = useState(null); // { size, difficulty }
  const [showShop, setShowShop] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeGame, setActiveGame] = useState(null);

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/auth/profile", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        fetchActiveGame();
      } else {
        // Token expired
        handleLogout();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveGame = async () => {
    try {
      const res = await fetch("/api/game/state", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveGame(data);
      }
    } catch (err) {
      console.error("Failed to fetch active game:", err);
    }
  };

  const handleResumeGame = () => {
    if (activeGame) {
      setActiveLevel({ size: activeGame.size, difficulty: activeGame.difficulty });
      setView("game");
    }
  };

  const handleLoginSuccess = () => {
    setToken(localStorage.getItem("token"));
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setProfile(null);
    setView("map");
    setActiveLevel(null);
  };

  const handleSelectLevel = (size, difficulty) => {
    setActiveLevel({ size, difficulty });
    setView("game");
  };

  const handlePurchaseSuccess = () => {
    fetchProfile(); // Refresh profile coins & inventory
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#faedcd]">
        <div className="animate-bounce text-6xl mb-4">🧙‍♂️</div>
        <div className="text-xl font-bold text-indigo-700 animate-pulse">Loading Magic Portal...</div>
      </div>
    );
  }

  if (!token || !profile) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen relative p-4">
      {view === "map" ? (
        <Map
          profile={profile}
          activeGame={activeGame}
          onSelectLevel={handleSelectLevel}
          onOpenShop={() => setShowShop(true)}
          onLogout={handleLogout}
          onUpdateProfile={fetchProfile}
          onResumeGame={handleResumeGame}
        />
      ) : (
        <Game
          size={activeLevel.size}
          difficulty={activeLevel.difficulty}
          profile={profile}
          onBackToMap={() => {
            fetchProfile();
            setView("map");
          }}
          onUpdateProfile={fetchProfile}
        />
      )}

      {showShop && (
        <Shop
          profile={profile}
          onClose={() => setShowShop(false)}
          onPurchaseSuccess={handlePurchaseSuccess}
        />
      )}
    </div>
  );
}
