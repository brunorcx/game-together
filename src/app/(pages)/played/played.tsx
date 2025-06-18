"use client";

import React, { useState, useMemo } from "react";
import { PlayedGame } from "@/app/interfaces/game.interface";
import styles from "./played.module.scss";

type SortKey =
  | "name"
  | "platform"
  | "genre"
  | "date"
  | "duration"
  | "graphics"
  | "soundtrack"
  | "replayability"
  | "difficulty"
  | "ranking"
  | "notes"
  | "flaws"
  | "suggestions";

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "name", label: "Nome" },
  { key: "platform", label: "Plataforma" },
  { key: "genre", label: "Gênero" },
  { key: "date", label: "Data" },
  { key: "duration", label: "Duração" },
  { key: "graphics", label: "Gráficos" },
  { key: "soundtrack", label: "Trilha Sonora" },
  { key: "replayability", label: "Fator Replay" },
  { key: "difficulty", label: "Dificuldade" },
  { key: "notes", label: "Comentários" },
  { key: "flaws", label: "Defeitos" },
  { key: "suggestions", label: "Sugestões" },
  { key: "ranking", label: "Ranking" },
];

function compare(a: PlayedGame, b: PlayedGame, key: SortKey) {
  if (key === "date") {
    return new Date(a[key]).getTime() - new Date(b[key]).getTime();
  }
  if (typeof a[key] === "number" && typeof b[key] === "number") {
    return a[key] - b[key];
  }
  return String(a[key]).localeCompare(String(b[key]));
}

// Helper to collapse text and show a button to expand
function CollapsibleCell({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return <span>-</span>;
  const isLong = text.length > 40;
  return (
    <span>
      {expanded || !isLong ? text : text.slice(0, 40) + "... "}
      {isLong && (
        <button className={styles.collapseButton} type="button" onClick={() => setExpanded((e) => !e)}>
          {expanded ? "Menos" : "Ver mais"}
        </button>
      )}
    </span>
  );
}

export default function Played({ playedGameList }: { playedGameList: PlayedGame[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sortedGames = useMemo(() => {
    const sorted = [...playedGameList].sort((a, b) => {
      const res = compare(a, b, sortKey);
      return sortDir === "asc" ? res : -res;
    });
    return sorted;
  }, [playedGameList, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className={styles.playedBg}>
      <div className={styles.playedContainer}>
        <h2 className={styles.playedTitle}>Jogos Zerados</h2>
        <div className={styles.sortBar}>
          <span>Ordenar por:</span>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className={styles.button}>
            {sortOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
          <button className={styles.button} onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))} type="button">
            {sortDir === "asc" ? "↑" : "↓"}
          </button>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.playedTable}>
            <thead>
              <tr>
                {sortOptions.map((opt) => (
                  <th key={opt.key} onClick={() => handleSort(opt.key)} className={sortKey === opt.key ? styles.activeHeader : ""}>
                    {opt.label}
                    {sortKey === opt.key && <span style={{ marginLeft: 4 }}>{sortDir === "asc" ? "↑" : "↓"}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedGames.map((game, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                  <td>{game.name}</td>
                  <td>{game.platform}</td>
                  <td>{game.genre}</td>
                  <td>{game.date.toISOString().split("T")[0].split("-").reverse().join("/")}</td>
                  <td>{game.duration}</td>
                  <td>{game.graphics}</td>
                  <td>{game.soundtrack}</td>
                  <td>{game.replayability}</td>
                  <td>{game.difficulty}</td>
                  <td>
                    <CollapsibleCell text={game.notes ?? ""} />
                  </td>
                  <td>
                    <CollapsibleCell text={game.flaws ?? ""} />
                  </td>
                  <td>
                    <CollapsibleCell text={game.suggestions ?? ""} />
                  </td>
                  <td>
                    {(() => {
                      const rankingMap: Record<number, string> = {
                        1: "/rankng_ruim_100.png",
                        2: "/rankng_legalzinho_100.png",
                        3: "/rankng_bom_100.png",
                        4: "/rankng_muito_bom_100.png",
                        5: "/rankng_bp_100.png",
                      };
                      const imgSrc = rankingMap[Number(game.ranking)] || "";
                      return imgSrc ? <img src={imgSrc} alt={String(game.ranking)} className={styles.rankingImg} /> : game.ranking;
                    })()}
                  </td>
                </tr>
              ))}
              {sortedGames.length === 0 && (
                <tr>
                  <td colSpan={sortOptions.length} className={styles.emptyRow}>
                    Nenhum jogo encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
