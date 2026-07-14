import React, { useState } from "react";
import { AVATARS } from "../utils/magic_emojis";
import { Sparkles, Key, User as UserIcon } from "lucide-react";

export default function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState("wizard");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Please fill in all fields!");
      return;
    }

    const url = isRegister ? "/api/auth/register" : "/api/auth/login";
    const payload = isRegister 
      ? { username, password, avatar }
      : { username, password };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Something went wrong!");
      }

      if (isRegister) {
        // If registered, automatically log in
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const loginData = await loginRes.json();
        localStorage.setItem("token", loginData.access_token);
        onLoginSuccess();
      } else {
        const data = await res.json();
        localStorage.setItem("token", data.access_token);
        onLoginSuccess();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-xl max-w-md w-full border-4 border-candy-purple/30">
        
        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-block bg-candy-purple p-3 rounded-full text-white mb-2 animate-playful">
            <Sparkles size={32} />
          </div>
          <h1 className="text-3xl font-extrabold text-indigo-700 tracking-wide">
            SUDOKU QUEST
          </h1>
          <p className="text-sm text-indigo-500 font-medium mt-1">
            Magic Kingdom Adventure
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border-2 border-red-300 text-red-700 px-4 py-2 rounded-xl mb-4 text-center font-bold text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username */}
          <div>
            <label className="block text-indigo-700 font-bold mb-1 ml-1 text-sm">Character Name</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-3.5 text-indigo-400" size={20} />
              <input
                type="text"
                placeholder="Enter character name..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-indigo-50/50 border-2 border-indigo-200 rounded-2xl py-3 pl-10 pr-4 text-indigo-800 font-semibold focus:outline-none focus:border-candy-purple"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-indigo-700 font-bold mb-1 ml-1 text-sm">Secret Password</label>
            <div className="relative">
              <Key className="absolute left-3 top-3.5 text-indigo-400" size={20} />
              <input
                type="password"
                placeholder="Enter secret password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-indigo-50/50 border-2 border-indigo-200 rounded-2xl py-3 pl-10 pr-4 text-indigo-800 font-semibold focus:outline-none focus:border-candy-purple"
              />
            </div>
          </div>

          {/* Avatar Selector (Only for Register) */}
          {isRegister && (
            <div>
              <label className="block text-indigo-700 font-bold mb-2 ml-1 text-sm">Choose Your Avatar</label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(AVATARS).map(([key, info]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAvatar(key)}
                    className={`p-3 rounded-2xl border-3 text-left font-bold transition-all ${
                      avatar === key
                        ? "border-indigo-600 bg-indigo-50 scale-102"
                        : "border-indigo-100 bg-white/40 hover:bg-indigo-50/20"
                    }`}
                  >
                    <div className="text-sm text-indigo-800">{info.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-candy-purple to-indigo-600 text-white font-extrabold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transform active:scale-98 transition-all text-lg cursor-pointer"
          >
            {isRegister ? "Start Adventure!" : "Enter Magic World"}
          </button>
        </form>

        {/* Toggle Register/Login */}
        <div className="text-center mt-6">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-indigo-600 font-bold hover:underline text-sm focus:outline-none cursor-pointer"
          >
            {isRegister
              ? "Already have a character? Log In"
              : "New player? Create a character"}
          </button>
        </div>
      </div>
    </div>
  );
}
