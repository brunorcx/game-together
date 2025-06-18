"use client";

import React, { useState } from "react";
import styles from "./score.module.scss";
import { PlayedGame } from "@/app/interfaces/game.interface";
import { addPlayedGame } from "@/app/lib/mongodb";

const initialForm: PlayedGame = {
  name: "",
  genre: [""],
  date: new Date(),
  duration: 0,
  graphics: 0,
  soundtrack: 0,
  replayability: 0,
  notes: "",
  flaws: "",
  suggestions: "",
  difficulty: 0,
  ranking: "3",
  platform: "",
};

export default function Score() {
  const [form, setForm] = useState<PlayedGame>(initialForm);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchImage = async (gameName: string) => {
    if (!gameName) return;
    try {
      const res = await fetch(`https://retroachievements.org/API/API_GetGameList.php?z=demo&y=demo`);
      const data = await res.json();

      const game = data.find((g: any) => g.Title.toLowerCase().includes(gameName.toLowerCase()));

      if (game?.ImageIcon) {
        setForm((prev) => ({ ...prev, imageUrl: game.ImageIcon }));
      }
    } catch {
      setForm((prev) => ({ ...prev, imageUrl: "" }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "nome") fetchImage(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);

    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setSaved(true);
        setForm(initialForm);
      } else {
        console.error(await res.json());
      }
    } catch (error) {
      console.error("Submit error", error);
    }

    setLoading(false);
  };

  return (
    <div className={styles.formContainer}>
      <h2>Adicionar Jogo</h2>

      <form onSubmit={handleSubmit} className={styles.form}>
        {[
          { label: "Plataforma", name: "platform", type: "text" },
          { label: "Nome", name: "name", type: "text" },
          { label: "Gênero", name: "genre", type: "text" },
          { label: "Data", name: "date", type: "date" },
          { label: "Duração (horas)", name: "duration", type: "number" },
          { label: "Gráfico", name: "graphics", type: "number" },
          { label: "Trilha Sonora", name: "soundtrack", type: "number" },
          { label: "Fator Replay", name: "replayability", type: "number" },
          { label: "Dificuldade", name: "difficulty", type: "number" },
        ].map((field) => (
          <div key={field.name} className={styles.formGroup}>
            <label htmlFor={field.name}>{field.label}</label>
            <input id={field.name} name={field.name} type={field.type} value={(form as any)[field.name]} onChange={handleChange} required={field.name === "nome"} />
          </div>
        ))}

        {[
          { label: "Comentários", name: "notes" },
          { label: "Defeitos", name: "flaws" },
          { label: "Sugestões", name: "suggestions" },
        ].map((field) => (
          <div key={field.name} className={styles.formGroup}>
            <label htmlFor={field.name}>{field.label}</label>
            <textarea id={field.name} name={field.name} value={(form as any)[field.name]} onChange={handleChange} />
          </div>
        ))}

        <div className={styles.formGroup}>
          <label htmlFor="ranking">Ranking</label>
          <select id="ranking" name="ranking" value={form.ranking} onChange={handleChange}>
            <option value="1">Ruim</option>
            <option value="2">Legalzinho</option>
            <option value="3">Bom</option>
            <option value="4">Muito Bom</option>
            <option value="5">Beira a Perfeição</option>
          </select>
        </div>

        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </button>

        {saved && <div className={styles.successMessage}>Salvo com sucesso!</div>}
      </form>
    </div>
  );
}
