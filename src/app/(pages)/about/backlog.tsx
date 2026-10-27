"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { compressCoverImage } from "@/app/lib/compressCoverImage";
import type { BacklogGame } from "@/app/lib/backlogFile";
import styles from "./backlog.module.scss";

interface DisplayGame extends BacklogGame {
  coverUrl: string | null;
}

interface BacklogProps {
  initialFilePath: string | null;
  initialGames: DisplayGame[];
  initialError: string | null;
}

interface GameForm {
  name: string;
  system: string;
  genre: string;
  players: string;
  playersUncertain: boolean;
  comments: string;
}

interface GameEditTarget {
  system: string;
  name: string;
  occurrence: number;
  coverUrl: string | null;
}

interface GameEditForm {
  name: string;
  system: string;
  newSystem: string;
  players: string;
  playersUncertain: boolean;
  comments: string;
}

const NEW_SYSTEM_OPTION = "__new_system__";
const SYSTEM_TOGGLES_COOKIE = "backlog-collapsed-systems";
const emptyForm: GameForm = { name: "", system: "", genre: "", players: "", playersUncertain: false, comments: "" };
const emptyEditForm: GameEditForm = {
  name: "",
  system: "",
  newSystem: "",
  players: "",
  playersUncertain: false,
  comments: "",
};

function buildCompletionHref(game: BacklogGame, occurrence: number): string {
  const params = new URLSearchParams({
    name: game.name,
    platform: game.system,
    genre: game.genre,
    backlogSystem: game.system,
    backlogName: game.name,
    backlogOccurrence: String(occurrence),
  });
  return `/score?${params.toString()}`;
}

function readCollapsedSystemsCookie(): Set<string> {
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${SYSTEM_TOGGLES_COOKIE}=`));
  if (!cookie) return new Set();

  try {
    const value: unknown = JSON.parse(decodeURIComponent(cookie.slice(SYSTEM_TOGGLES_COOKIE.length + 1)));
    return Array.isArray(value) ? new Set(value.filter((system): system is string => typeof system === "string")) : new Set();
  } catch {
    return new Set();
  }
}

export default function Backlog({ initialFilePath, initialGames, initialError }: BacklogProps) {
  const [filePath, setFilePath] = useState(initialFilePath);
  const [pathInput, setPathInput] = useState(initialFilePath || "");
  const [games, setGames] = useState(initialGames);
  const [form, setForm] = useState({ ...emptyForm, system: initialGames[0]?.system || "" });
  const [editTarget, setEditTarget] = useState<GameEditTarget | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [newSystem, setNewSystem] = useState("");
  const [addGameOpen, setAddGameOpen] = useState(false);
  const [collapsedSystems, setCollapsedSystems] = useState<Set<string>>(new Set());
  const [systemPreferencesLoaded, setSystemPreferencesLoaded] = useState(false);
  const [error, setError] = useState(initialError);
  const [addGameError, setAddGameError] = useState("");
  const [editError, setEditError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingPath, setSavingPath] = useState(false);
  const [savingGame, setSavingGame] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [compressingCover, setCompressingCover] = useState(false);
  const [syncingCovers, setSyncingCovers] = useState(false);

  const systems = useMemo(
    () => Array.from(new Set(games.map((game) => game.system))).sort((left, right) =>
      left.localeCompare(right, undefined, { sensitivity: "base", numeric: true }),
    ),
    [games],
  );
  const groupedGames = useMemo(
    () => systems.map((system) => ({ system, games: games.filter((game) => game.system === system) })),
    [games, systems],
  );

  useEffect(() => {
    if (!coverFile) return;
    const previewUrl = URL.createObjectURL(coverFile);
    setCoverPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [coverFile]);

  useEffect(() => {
    setCollapsedSystems(readCollapsedSystemsCookie());
    setSystemPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    if (!addGameOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !savingGame) setAddGameOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [addGameOpen, savingGame]);

  async function refreshGames() {
    const response = await fetch("/api/backlog");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Não foi possível atualizar o backlog.");
    setGames(data.games);
    setError(null);
    setFilePath(data.filePath);
  }

  async function handleSavePath(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingPath(true);
    setError(null);
    setNotice("");
    try {
      const response = await fetch("/api/backlog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: pathInput }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar o caminho.");
      await refreshGames();
      setNotice("Arquivo do backlog configurado.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar o caminho.");
    } finally {
      setSavingPath(false);
    }
  }

  async function handleAddGame(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedSystem = form.system === NEW_SYSTEM_OPTION ? newSystem.trim() : form.system;
    if (!selectedSystem) {
      setAddGameError("Choose an existing platform or enter a new one.");
      return;
    }
    setSavingGame(true);
    setAddGameError("");
    setError(null);
    setNotice("");
    try {
      const response = await fetch("/api/backlog/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          system: selectedSystem,
          players: form.players.trim() || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível adicionar o jogo.");
      await refreshGames();
      setForm({ ...emptyForm, system: selectedSystem });
      setNewSystem("");
      setAddGameOpen(false);
      setNotice("Jogo adicionado ao arquivo.");
    } catch (saveError) {
      setAddGameError(saveError instanceof Error ? saveError.message : "Não foi possível adicionar o jogo.");
    } finally {
      setSavingGame(false);
    }
  }

  async function handleCoverSync() {
    setSyncingCovers(true);
    setError(null);
    setNotice("");
    try {
      const response = await fetch("/api/backlog/covers", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível atualizar as capas.");
      await refreshGames();
      setNotice(
        `Capas atualizadas: ${data.updated} encontradas, ${data.missing} sem imagem, ${data.failed} falhas de busca. Capas de jogos removidos foram apagadas.`,
      );
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Não foi possível atualizar as capas.");
    } finally {
      setSyncingCovers(false);
    }
  }

  function startEditing(game: DisplayGame, occurrence: number) {
    setEditTarget({ system: game.system, name: game.name, occurrence, coverUrl: game.coverUrl });
    setCoverFile(null);
    setCoverPreview(game.coverUrl);
    setEditForm({
      name: game.name,
      system: game.system,
      newSystem: "",
      players: game.players || "",
      playersUncertain: game.playersUncertain,
      comments: game.comments,
    });
    setError(null);
    setEditError("");
    setNotice("");
  }

  function cancelEditing() {
    if (savingEdit) return;
    setEditTarget(null);
    setEditForm(emptyEditForm);
    setCoverFile(null);
    setCoverPreview(null);
    setEditError("");
  }

  function handleSystemToggle(system: string, isOpen: boolean) {
    const updated = new Set(collapsedSystems);
    if (isOpen) updated.delete(system);
    else updated.add(system);
    setCollapsedSystems(updated);
    document.cookie = `${SYSTEM_TOGGLES_COOKIE}=${encodeURIComponent(JSON.stringify([...updated]))}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }

  async function handleCoverSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setCoverFile(null);
    setCoverPreview(editTarget?.coverUrl || null);
    if (!file) return;

    setCompressingCover(true);
    setEditError("");
    try {
      const compressed = await compressCoverImage(file);
      setCoverFile(compressed);
    } catch (compressionError) {
      setEditError(compressionError instanceof Error ? compressionError.message : "Could not compress the cover image.");
      event.target.value = "";
    } finally {
      setCompressingCover(false);
    }
  }

  async function handleEditGame(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editTarget) return;

    const selectedSystem = editForm.system === NEW_SYSTEM_OPTION ? editForm.newSystem.trim() : editForm.system;
    if (!selectedSystem) {
      setEditError("Choose an existing platform or enter a new one.");
      return;
    }

    setSavingEdit(true);
    setEditError("");
    setError(null);
    setNotice("");
    try {
      const response = await fetch("/api/backlog/games", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalSystem: editTarget.system,
          originalName: editTarget.name,
          occurrence: editTarget.occurrence,
          name: editForm.name,
          system: selectedSystem,
          players: editForm.players.trim() || null,
          playersUncertain: editForm.playersUncertain,
          comments: editForm.comments,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update the game.");

      let uploadWarning: string | null = typeof data.coverWarning === "string" ? data.coverWarning : null;
      if (coverFile) {
        const coverData = new FormData();
        coverData.set("system", selectedSystem);
        coverData.set("name", editForm.name.trim());
        coverData.set("cover", coverFile);
        try {
          const coverResponse = await fetch("/api/backlog/covers/upload", { method: "POST", body: coverData });
          const coverResult = await coverResponse.json();
          if (!coverResponse.ok) throw new Error(coverResult.error || "Could not upload the cover.");
        } catch (coverError) {
          uploadWarning = coverError instanceof Error ? coverError.message : "Could not upload the cover.";
        }
      }

      await refreshGames();
      setEditTarget(null);
      setEditForm(emptyEditForm);
      setCoverFile(null);
      setCoverPreview(null);
      setNotice(uploadWarning
        ? coverFile
          ? `Game saved, but the cover was not uploaded or cleaned up: ${uploadWarning}`
          : `Game updated, but cover cleanup failed: ${uploadWarning}`
        : "Game updated in the backlog file.");
    } catch (editError) {
      setEditError(editError instanceof Error ? editError.message : "Could not update the game.");
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Game Together</p>
            <h1>Game backlog</h1>
            <p>All the games waiting for their turn, organized by system.</p>
          </div>
          <button className={styles.primaryButton} onClick={handleCoverSync} disabled={!filePath || syncingCovers}>
            {syncingCovers ? "Updating covers..." : "Update game covers"}
          </button>
        </header>

        <section className={styles.filePanel} aria-labelledby="file-heading">
          <div>
            <h2 id="file-heading">Backlog text file</h2>
            <p>Choose the .txt file to read and update. This path is saved for the next time you open the app.</p>
          </div>
          <form className={styles.pathForm} onSubmit={handleSavePath}>
            <label className={styles.visuallyHidden} htmlFor="backlog-path">Path to backlog .txt</label>
            <input
              id="backlog-path"
              value={pathInput}
              onChange={(event) => setPathInput(event.target.value)}
              placeholder="C:\Users\...\backlog.txt"
              required
            />
            <button className={styles.secondaryButton} type="submit" disabled={savingPath}>
              {savingPath ? "Saving..." : "Save file"}
            </button>
          </form>
          {filePath && <p className={styles.currentPath}>Current file: {filePath}</p>}
        </section>

        {error && <p className={styles.error} role="alert">{error}</p>}
        {notice && <p className={styles.notice} role="status">{notice}</p>}

        <section className={styles.listSection} aria-labelledby="list-heading">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Your collection</p>
              <h2 id="list-heading">Games to play</h2>
            </div>
            <span className={styles.count}>{games.length} games · {systems.length} systems</span>
          </div>
          {!filePath ? (
            <p className={styles.emptyState}>Set the path to your backlog .txt file above to see your games.</p>
          ) : error && games.length === 0 ? (
            <p className={styles.emptyState}>The backlog file could not be loaded. Check its path and try again.</p>
          ) : games.length === 0 ? (
            <p className={styles.emptyState}>No games found in this file yet.</p>
          ) : (
            <div className={styles.systemList}>
              {groupedGames.map(({ system, games: systemGames }) => (
                <details
                  className={styles.systemSection}
                  key={system}
                  open={!systemPreferencesLoaded || !collapsedSystems.has(system)}
                  onToggle={(event) => {
                    if (systemPreferencesLoaded) handleSystemToggle(system, event.currentTarget.open);
                  }}
                >
                  <summary className={styles.systemHeading}>
                    <h3>{system}</h3>
                    <span className={styles.systemCount}>{systemGames.length}</span>
                    <span className={styles.disclosureArrow} aria-hidden="true" />
                  </summary>
                  <div className={styles.gameGrid}>
                    {systemGames.map((game, index) => (
                      <article className={styles.gameCard} key={`${game.system}-${game.name}-${index}`}>
                        <div className={styles.cover}>
                          {game.coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={game.coverUrl} alt={`${game.name} cover`} loading="lazy" />
                          ) : (
                            <span aria-hidden="true">🎮</span>
                          )}
                        </div>
                        <div className={styles.gameDetails}>
                          <div className={styles.gameTitleRow}>
                            <h4>{game.name}</h4>
                            <div className={styles.gameActions}>
                              <button
                                className={styles.editButton}
                                type="button"
                                onClick={() => startEditing(game, systemGames.slice(0, index).filter((item) => item.name === game.name).length)}
                                aria-label={`Edit ${game.name}`}
                                disabled={!filePath || Boolean(editTarget)}
                              >
                                Edit
                              </button>
                              <Link
                                className={styles.completeButton}
                                href={buildCompletionHref(game, systemGames.slice(0, index).filter((item) => item.name === game.name).length)}
                                aria-label={`Complete ${game.name}`}
                              >
                                Complete game
                              </Link>
                            </div>
                          </div>
                          <p className={styles.gameMeta}>
                            {game.players && <span>{game.players.replace(/,/g, ", ")} player{game.players === "1" ? "" : "s"}{game.playersUncertain ? "?" : ""}</span>}
                            {!game.players && game.playersUncertain && <span>Player count unknown</span>}
                            {game.genre && <span>{game.genre}</span>}
                          </p>
                          {game.comments && <p className={styles.gameComments}>{game.comments}</p>}
                        </div>
                      </article>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>

        <button
          className={styles.floatingAddButton}
          type="button"
          onClick={() => setAddGameOpen(true)}
          disabled={!filePath}
          title={filePath ? "Add a game to your backlog" : "Choose a backlog file first"}
        >
          <span className={styles.floatingAddIcon} aria-hidden="true">+</span>
          <span>Add a game</span>
        </button>

        {addGameOpen && (
          <div
            className={styles.dialogBackdrop}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !savingGame) setAddGameOpen(false);
            }}
          >
            <section
              className={styles.addDialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-heading"
            >
              <div className={styles.dialogHeading}>
                <div>
                  <p className={styles.eyebrow}>Grow your collection</p>
                  <h2 id="add-heading">Add a game</h2>
                </div>
                <button
                  className={styles.closeButton}
                  type="button"
                  onClick={() => setAddGameOpen(false)}
                  disabled={savingGame}
                  aria-label="Close add game form"
                >
                  ×
                </button>
              </div>
              {addGameError && <p className={styles.dialogError} role="alert">{addGameError}</p>}
              <form className={styles.gameForm} onSubmit={handleAddGame}>
                <label>
                  Game name
                  <input
                    autoFocus
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    required
                  />
                </label>
                <label>
                  Genre
                  <input
                    value={form.genre}
                    onChange={(event) => setForm({ ...form, genre: event.target.value })}
                    placeholder="Action, RPG..."
                  />
                </label>
                <label>
                  Number of players
                  <input
                    type="number"
                    min="1"
                    value={form.players}
                    onChange={(event) => setForm({ ...form, players: event.target.value })}
                    placeholder="Optional"
                  />
                </label>
                <label>
                  System / platform
                  <select
                    value={form.system}
                    onChange={(event) => setForm({ ...form, system: event.target.value })}
                    required
                  >
                    <option value="" disabled>Select a platform...</option>
                    {systems.map((system) => <option key={system} value={system}>{system}</option>)}
                    <option value={NEW_SYSTEM_OPTION}>+ Add a new platform</option>
                  </select>
                </label>
                {form.system === NEW_SYSTEM_OPTION && (
                  <label>
                    New platform
                    <input
                      value={newSystem}
                      onChange={(event) => setNewSystem(event.target.value)}
                      required
                      placeholder="e.g. Nintendo Switch"
                    />
                  </label>
                )}
                <label className={styles.commentsField}>
                  Comments
                  <textarea
                    value={form.comments}
                    onChange={(event) => setForm({ ...form, comments: event.target.value })}
                    placeholder="Notes about this game"
                    rows={3}
                  />
                </label>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={form.playersUncertain}
                    onChange={(event) => setForm({ ...form, playersUncertain: event.target.checked })}
                  />
                  Multiplayer support is uncertain
                </label>
                <div className={styles.dialogActions}>
                  <button
                    className={styles.cancelButton}
                    type="button"
                    onClick={() => setAddGameOpen(false)}
                    disabled={savingGame}
                  >
                    Cancel
                  </button>
                  <button className={styles.primaryButton} type="submit" disabled={savingGame}>
                    {savingGame ? "Adding..." : "Add to backlog"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {editTarget && (
          <div className={styles.dialogBackdrop} onMouseDown={(event) => {
            if (event.target === event.currentTarget) cancelEditing();
          }}>
            <section
              className={styles.editDialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-game-heading"
            >
              <div className={styles.dialogHeading}>
                <div>
                  <p className={styles.eyebrow}>Backlog details</p>
                  <h2 id="edit-game-heading">Edit game</h2>
                </div>
                <button className={styles.closeButton} type="button" onClick={cancelEditing} disabled={savingEdit} aria-label="Close edit form">
                  ×
                </button>
              </div>
              {editError && <p className={styles.dialogError} role="alert">{editError}</p>}
              <form className={styles.editForm} onSubmit={handleEditGame}>
                <label>
                  Game name
                  <input value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} required />
                </label>
                <label>
                  System / platform
                  <select value={editForm.system} onChange={(event) => setEditForm({ ...editForm, system: event.target.value })} required>
                    {systems.map((system) => <option key={system} value={system}>{system}</option>)}
                    <option value={NEW_SYSTEM_OPTION}>+ Add a new platform</option>
                  </select>
                </label>
                {editForm.system === NEW_SYSTEM_OPTION && (
                  <label>
                    New platform
                    <input
                      value={editForm.newSystem}
                      onChange={(event) => setEditForm({ ...editForm, newSystem: event.target.value })}
                      placeholder="Enter a platform name"
                      required
                    />
                  </label>
                )}
                <label>
                  Number of players
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editForm.players}
                    onChange={(event) => setEditForm({ ...editForm, players: event.target.value })}
                    placeholder="Optional"
                  />
                </label>
                <label className={styles.editCheckbox}>
                  <input
                    type="checkbox"
                    checked={editForm.playersUncertain}
                    onChange={(event) => setEditForm({ ...editForm, playersUncertain: event.target.checked })}
                  />
                  Player count or multiplayer support is uncertain
                </label>
                <label className={styles.editComments}>
                  Comments
                  <textarea
                    value={editForm.comments}
                    onChange={(event) => setEditForm({ ...editForm, comments: event.target.value })}
                    placeholder="Notes about this game"
                    rows={4}
                  />
                </label>
                <label className={styles.coverUpload}>
                  Cover image
                  <input type="file" accept="image/*" onChange={handleCoverSelection} />
                  <span>{compressingCover ? "Compressing image..." : coverFile ? `${coverFile.name} · ${(coverFile.size / 1024).toFixed(0)} KB` : "Images are compressed to 1 MB or less before upload."}</span>
                  {coverPreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverPreview} alt={`Cover preview for ${editForm.name}`} />
                  )}
                </label>
                <div className={styles.dialogActions}>
                  <button className={styles.cancelButton} type="button" onClick={cancelEditing} disabled={savingEdit || compressingCover}>
                    Cancel
                  </button>
                  <button className={styles.primaryButton} type="submit" disabled={savingEdit || compressingCover}>
                    {savingEdit ? "Saving..." : coverFile ? "Save changes & cover" : "Save changes"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

      </div>
    </main>
  );
}
