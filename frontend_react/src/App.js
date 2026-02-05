import React, { useEffect, useId, useMemo, useState } from "react";
import "./App.css";

/**
 * Small helper to generate stable IDs without adding dependencies.
 * Uses crypto.randomUUID when available, otherwise falls back to a timestamp+random string.
 */
function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const STORAGE_KEY = "flashcards:v1";

/**
 * @typedef {Object} Flashcard
 * @property {string} id
 * @property {string} question
 * @property {string} answer
 * @property {number} createdAt
 */

function loadFlashcards() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Minimal validation
    return parsed
      .filter(
        (c) =>
          c &&
          typeof c.id === "string" &&
          typeof c.question === "string" &&
          typeof c.answer === "string"
      )
      .map((c) => ({
        id: c.id,
        question: c.question,
        answer: c.answer,
        createdAt: typeof c.createdAt === "number" ? c.createdAt : Date.now(),
      }));
  } catch {
    return [];
  }
}

function saveFlashcards(cards) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

function normalizeText(v) {
  return v.replace(/\s+/g, " ").trim();
}

// PUBLIC_INTERFACE
function App() {
  /** Theme is kept only to align with the template's theme variables; we default to "retro-dark". */
  const [theme] = useState("retro-dark");

  /** @type {[Flashcard[], Function]} */
  const [cards, setCards] = useState(() => loadFlashcards());

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const [query, setQuery] = useState("");
  const [onlyUnrevealed, setOnlyUnrevealed] = useState(false);
  const [revealedIds, setRevealedIds] = useState(() => new Set());
  const [error, setError] = useState("");

  const formId = useId();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    saveFlashcards(cards);
  }, [cards]);

  const stats = useMemo(() => {
    const total = cards.length;
    const revealedCount = revealedIds.size;
    return { total, revealedCount };
  }, [cards.length, revealedIds]);

  const filteredCards = useMemo(() => {
    const q = normalizeText(query).toLowerCase();
    const base = q
      ? cards.filter((c) => {
          const hay = `${c.question}\n${c.answer}`.toLowerCase();
          return hay.includes(q);
        })
      : cards;

    if (!onlyUnrevealed) return base;
    return base.filter((c) => !revealedIds.has(c.id));
  }, [cards, query, onlyUnrevealed, revealedIds]);

  function handleAdd(e) {
    e.preventDefault();
    setError("");

    const q = normalizeText(question);
    const a = normalizeText(answer);

    if (!q || !a) {
      setError("Please enter both a question and an answer.");
      return;
    }
    if (q.length > 200) {
      setError("Question is too long (max 200 characters).");
      return;
    }
    if (a.length > 600) {
      setError("Answer is too long (max 600 characters).");
      return;
    }

    const newCard = {
      id: generateId(),
      question: q,
      answer: a,
      createdAt: Date.now(),
    };

    setCards((prev) => [newCard, ...prev]);
    setQuestion("");
    setAnswer("");

    // New card starts unrevealed.
    setRevealedIds((prev) => {
      const next = new Set(prev);
      next.delete(newCard.id);
      return next;
    });
  }

  function handleDelete(cardId) {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setRevealedIds((prev) => {
      const next = new Set(prev);
      next.delete(cardId);
      return next;
    });
  }

  function toggleReveal(cardId) {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }

  function clearAll() {
    // Keep this simple: no modal lib, just native confirm.
    // eslint-disable-next-line no-alert
    const ok = window.confirm("Delete ALL flashcards? This cannot be undone.");
    if (!ok) return;
    setCards([]);
    setRevealedIds(new Set());
  }

  function resetReveals() {
    setRevealedIds(new Set());
  }

  return (
    <div className="App">
      <div className="retro-bg" aria-hidden="true" />
      <header className="retro-header">
        <div className="container">
          <div className="brand">
            <div className="brand__badge" aria-hidden="true">
              FC
            </div>
            <div className="brand__text">
              <h1 className="title">Flashcards</h1>
              <p className="subtitle">Create • Study • Delete (no login, saved locally)</p>
            </div>
          </div>

          <div className="statusbar" role="status" aria-live="polite">
            <div className="statusbar__item">
              <span className="statusbar__label">Total</span>
              <span className="statusbar__value">{stats.total}</span>
            </div>
            <div className="statusbar__divider" aria-hidden="true" />
            <div className="statusbar__item">
              <span className="statusbar__label">Revealed</span>
              <span className="statusbar__value">{stats.revealedCount}</span>
            </div>

            <div className="statusbar__actions">
              <button type="button" className="btn btn-ghost" onClick={resetReveals}>
                Reset reveals
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={clearAll}
                disabled={cards.length === 0}
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="retro-main">
        <div className="container">
          <section className="panel" aria-labelledby={`${formId}-heading`}>
            <div className="panel__header">
              <h2 className="panel__title" id={`${formId}-heading`}>
                Add a new flashcard
              </h2>
              <p className="panel__hint">Tip: Keep questions short; answers can be longer.</p>
            </div>

            <form className="form" onSubmit={handleAdd} aria-describedby={`${formId}-error`}>
              <div className="form__grid">
                <div className="field">
                  <label className="label" htmlFor={`${formId}-question`}>
                    Question
                  </label>
                  <input
                    id={`${formId}-question`}
                    className="input"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="e.g., What is a closure in JavaScript?"
                    maxLength={240}
                    autoComplete="off"
                    required
                  />
                </div>

                <div className="field">
                  <label className="label" htmlFor={`${formId}-answer`}>
                    Answer
                  </label>
                  <textarea
                    id={`${formId}-answer`}
                    className="textarea"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="e.g., A closure is a function that retains access to its lexical scope..."
                    rows={4}
                    maxLength={800}
                    required
                  />
                </div>
              </div>

              <div className="form__footer">
                <div className="form__error" id={`${formId}-error`} role="alert">
                  {error ? error : "\u00A0"}
                </div>
                <button type="submit" className="btn btn-primary">
                  Add card
                </button>
              </div>
            </form>
          </section>

          <section className="panel" aria-labelledby="cards-heading">
            <div className="panel__header panel__header--row">
              <div>
                <h2 className="panel__title" id="cards-heading">
                  Your cards
                </h2>
                <p className="panel__hint">
                  Click a card to reveal/hide the answer. Use search to filter.
                </p>
              </div>

              <div className="filters">
                <div className="field field--inline">
                  <label className="label" htmlFor="search">
                    Search
                  </label>
                  <input
                    id="search"
                    className="input input--small"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Type to filter..."
                    autoComplete="off"
                  />
                </div>

                <label className="check">
                  <input
                    type="checkbox"
                    checked={onlyUnrevealed}
                    onChange={(e) => setOnlyUnrevealed(e.target.checked)}
                  />
                  <span>Only unrevealed</span>
                </label>
              </div>
            </div>

            {filteredCards.length === 0 ? (
              <div className="empty">
                <p className="empty__title">No flashcards found.</p>
                <p className="empty__subtitle">
                  {cards.length === 0
                    ? "Add your first one above."
                    : "Try clearing the search or toggling filters."}
                </p>
              </div>
            ) : (
              <ul className="cards" aria-label="Flashcards list">
                {filteredCards.map((c) => {
                  const revealed = revealedIds.has(c.id);
                  return (
                    <li key={c.id} className="card">
                      <button
                        type="button"
                        className="card__body"
                        onClick={() => toggleReveal(c.id)}
                        aria-pressed={revealed}
                        aria-label={`Flashcard: ${c.question}. ${
                          revealed ? "Answer shown." : "Answer hidden."
                        } Click to ${revealed ? "hide" : "reveal"} answer.`}
                      >
                        <div className="card__q">
                          <span className="chip">Q</span>
                          <span className="card__text">{c.question}</span>
                        </div>

                        <div className={`card__a ${revealed ? "card__a--shown" : ""}`}>
                          <span className="chip chip--alt">A</span>
                          <span className="card__text">{c.answer}</span>
                        </div>

                        <div className="card__meta" aria-hidden="true">
                          <span className="meta-dot" />
                          <span>{revealed ? "Revealed" : "Hidden"}</span>
                        </div>
                      </button>

                      <div className="card__actions">
                        <button
                          type="button"
                          className="btn btn-small btn-ghost"
                          onClick={() => toggleReveal(c.id)}
                        >
                          {revealed ? "Hide" : "Reveal"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-small btn-danger"
                          onClick={() => handleDelete(c.id)}
                          aria-label={`Delete flashcard: ${c.question}`}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <footer className="retro-footer">
            <p className="footer-text">
              Data is stored in your browser (localStorage). Clearing site data will remove cards.
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
