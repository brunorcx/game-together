"use client";

import React, { useState } from "react";
import styles from "./score.module.scss";

interface BacklogCompletion {
  system: string;
  name: string;
  occurrence: number;
}

interface ScoreForm {
  name: string;
  genre: string;
  date: string;
  duration: number;
  graphics: number;
  soundtrack: number;
  replayability: number;
  notes: string;
  flaws: string;
  suggestions: string;
  difficulty: number;
  ranking: string;
  platform: string;
}

const initialForm: ScoreForm = {
  name: "",
  genre: "",
  date: new Date().toISOString().split("T")[0],
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

const NEW_PLATFORM_OPTION = "__new__";

interface ScoreProps {
  initialFilePath: string | null;
  initialPlatforms: string[];
  initialGame: Pick<ScoreForm, "name" | "platform" | "genre">;
  backlogCompletion: BacklogCompletion | null;
}

export default function Score({ initialFilePath, initialPlatforms, initialGame, backlogCompletion }: ScoreProps) {
  const [form, setForm] = useState<ScoreForm>(() => ({ ...initialForm, ...initialGame }));
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const [filePath, setFilePath] = useState<string | null>(initialFilePath);
  const [pathInput, setPathInput] = useState(initialFilePath || "");
  const [savingPath, setSavingPath] = useState(false);
  const [pathMessage, setPathMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const [platforms, setPlatforms] = useState<string[]>(initialPlatforms);
  const [platformMode, setPlatformMode] = useState<"select" | "new">(
    initialGame.platform && !initialPlatforms.includes(initialGame.platform)
      ? "new"
      : initialPlatforms.length
        ? "select"
        : "new",
  );

  const refreshPlatforms = async () => {
    try {
      const res = await fetch("/api/platforms");
      const data = await res.json();
      if (data.success) setPlatforms(data.platforms);
    } catch {
      // keep previous list on failure
    }
  };

  const handleSavePath = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPath(true);
    setPathMessage(null);

    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: pathInput }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setFilePath(pathInput);
        setPathMessage({ text: "Arquivo configurado com sucesso!", isError: false });
        await refreshPlatforms();
      } else {
        setPathMessage({ text: data.error || "Erro ao salvar o caminho.", isError: true });
      }
    } catch {
      setPathMessage({ text: "Erro ao salvar o caminho.", isError: true });
    }

    setSavingPath(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlatformSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === NEW_PLATFORM_OPTION) {
      setPlatformMode("new");
      return;
    }
    setPlatformMode("select");
    setForm((prev) => ({ ...prev, platform: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    setSubmissionMessage(null);

    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          backlogCompletion: backlogCompletion
            ? {
                backlogSystem: backlogCompletion.system,
                backlogName: backlogCompletion.name,
                backlogOccurrence: backlogCompletion.occurrence,
              }
            : undefined,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSaved(true);
        setSubmissionMessage({
          text: data.coverWarning
            ? `Score saved and backlog item removed, but cover cleanup failed: ${data.coverWarning}`
            : backlogCompletion
              ? "Score saved. The game and its cover were removed from the backlog."
              : "Salvo com sucesso!",
          isError: Boolean(data.coverWarning),
        });
        setForm(initialForm);
        setPlatformMode(platforms.length ? "select" : "new");
        await refreshPlatforms();
      } else {
        setSubmissionMessage({ text: data.error || "Não foi possível salvar o jogo.", isError: true });
      }
    } catch (submitError) {
      setSubmissionMessage({
        text: submitError instanceof Error ? submitError.message : "Não foi possível salvar o jogo.",
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <h2>Arquivo de Dados</h2>
      <form onSubmit={handleSavePath} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="scoresPath">Caminho do .txt</label>
          <input
            id="scoresPath"
            type="text"
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            placeholder="C:\Users\...\OneDrive\...\scores.txt"
          />
        </div>
        <button type="submit" className={styles.button} disabled={savingPath || !pathInput}>
          {savingPath ? "Salvando..." : "Salvar caminho"}
        </button>
        {pathMessage && <div className={pathMessage.isError ? styles.errorMessage : styles.successMessage}>{pathMessage.text}</div>}
        {filePath && !pathMessage && <p className={styles.currentPath}>Arquivo atual: {filePath}</p>}
      </form>

      <h2>Adicionar Jogo</h2>
      {backlogCompletion && (
        <p className={styles.completionNotice}>
          Complete this backlog game by saving its score. It will be removed from the backlog after the score is saved.
        </p>
      )}

      {!filePath ? (
        <p>Configure o caminho do arquivo .txt acima antes de adicionar um jogo.</p>
      ) : (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="platform">Plataforma</label>
            {platformMode === "select" ? (
              <select id="platform" name="platform" value={form.platform} onChange={handlePlatformSelect} required>
                <option value="" disabled>
                  Selecione...
                </option>
                {platforms.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
                <option value={NEW_PLATFORM_OPTION}>+ Nova / editar plataforma</option>
              </select>
            ) : (
              <div style={{ display: "flex", gap: 8, flex: 1 }}>
                <input id="platform" name="platform" type="text" value={form.platform} onChange={handleChange} placeholder="Nome da plataforma" required />
                {platforms.length > 0 && (
                  <button type="button" className={styles.button} onClick={() => setPlatformMode("select")}>
                    Usar lista
                  </button>
                )}
              </div>
            )}
          </div>

          {[
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
              <input id={field.name} name={field.name} type={field.type} value={form[field.name as keyof ScoreForm]} onChange={handleChange} required={field.name === "name"} />
            </div>
          ))}

          {[
            { label: "Comentários", name: "notes" },
            { label: "Defeitos", name: "flaws" },
            { label: "Sugestões", name: "suggestions" },
          ].map((field) => (
            <div key={field.name} className={styles.formGroup}>
              <label htmlFor={field.name}>{field.label}</label>
              <textarea id={field.name} name={field.name} value={form[field.name as keyof ScoreForm]} onChange={handleChange} />
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

          {submissionMessage && (
            <div className={submissionMessage.isError ? styles.errorMessage : styles.successMessage} role={submissionMessage.isError ? "alert" : "status"}>
              {submissionMessage.text}
            </div>
          )}
          {saved && !submissionMessage && <div className={styles.successMessage}>Salvo com sucesso!</div>}
        </form>
      )}
    </div>
  );
}
