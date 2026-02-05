import { fireEvent, render, screen, within } from "@testing-library/react";
import App from "./App";

const STORAGE_KEY = "flashcards:v1";

function seedLocalStorage(cards) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

function getStoredCards() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
}

describe("Flashcards App core behaviors", () => {
  beforeEach(() => {
    localStorage.clear();
    // Avoid tests failing due to unimplemented browser APIs in JSDOM environments.
    // App uses crypto.randomUUID when available; we can provide a deterministic stub.
    Object.defineProperty(globalThis, "crypto", {
      value: { randomUUID: () => "test-uuid-1" },
      configurable: true,
    });
  });

  test("renders Flashcards title (smoke)", () => {
    render(<App />);
    const title = screen.getByRole("heading", { name: /flashcards/i });
    expect(title).toBeInTheDocument();
  });

  test("adds a flashcard and persists it to localStorage", () => {
    render(<App />);

    const questionInput = screen.getByLabelText(/question/i);
    const answerInput = screen.getByLabelText(/answer/i);
    const addButton = screen.getByRole("button", { name: /add card/i });

    fireEvent.change(questionInput, { target: { value: "  What is React?  " } });
    fireEvent.change(answerInput, {
      target: { value: "  A UI library for building interfaces.  " },
    });
    fireEvent.click(addButton);

    // Card appears in UI
    expect(screen.getByText("What is React?")).toBeInTheDocument();
    // Answer text exists in DOM (initially visually hidden via CSS, but still in DOM)
    expect(screen.getByText("A UI library for building interfaces.")).toBeInTheDocument();

    // Stats update: Total should be 1
    expect(screen.getByRole("status")).toHaveTextContent("Total");
    expect(screen.getByRole("status")).toHaveTextContent("1");

    // localStorage persisted
    const stored = getStoredCards();
    expect(Array.isArray(stored)).toBe(true);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toEqual(
      expect.objectContaining({
        id: "test-uuid-1",
        question: "What is React?",
        answer: "A UI library for building interfaces.",
      })
    );

    // Inputs cleared after add
    expect(questionInput).toHaveValue("");
    expect(answerInput).toHaveValue("");
  });

  test("deletes a flashcard and updates localStorage", () => {
    // Seed storage so the card loads on initial render
    seedLocalStorage([
      {
        id: "seed-1",
        question: "Seed question?",
        answer: "Seed answer.",
        createdAt: 123,
      },
    ]);

    render(<App />);

    expect(screen.getByText("Seed question?")).toBeInTheDocument();

    // Delete via the button with accessible label
    const deleteButton = screen.getByRole("button", {
      name: /delete flashcard: seed question\?/i,
    });
    fireEvent.click(deleteButton);

    // UI updates to empty state
    expect(screen.queryByText("Seed question?")).not.toBeInTheDocument();
    expect(screen.getByText(/no flashcards found/i)).toBeInTheDocument();

    // localStorage updated to empty array
    const stored = getStoredCards();
    expect(stored).toEqual([]);
  });

  test("loads flashcards from localStorage on mount (persistence across reloads)", () => {
    seedLocalStorage([
      {
        id: "persist-1",
        question: "Persisted Q",
        answer: "Persisted A",
        createdAt: 999,
      },
      {
        id: "persist-2",
        question: "Second Q",
        answer: "Second A",
        createdAt: 1000,
      },
    ]);

    render(<App />);

    // Both cards visible
    expect(screen.getByText("Persisted Q")).toBeInTheDocument();
    expect(screen.getByText("Persisted A")).toBeInTheDocument();
    expect(screen.getByText("Second Q")).toBeInTheDocument();
    expect(screen.getByText("Second A")).toBeInTheDocument();

    // Total should reflect seeded count
    expect(screen.getByRole("status")).toHaveTextContent("2");
  });

  test("Clear all asks for confirmation and clears UI + localStorage when confirmed", () => {
    seedLocalStorage([
      {
        id: "c1",
        question: "Q1",
        answer: "A1",
        createdAt: 1,
      },
    ]);

    // Confirm the native confirm dialog
    const confirmSpy = jest.spyOn(window, "confirm").mockImplementation(() => true);

    render(<App />);

    expect(screen.getByText("Q1")).toBeInTheDocument();

    const clearAllButton = screen.getByRole("button", { name: /clear all/i });
    expect(clearAllButton).toBeEnabled();

    fireEvent.click(clearAllButton);

    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.queryByText("Q1")).not.toBeInTheDocument();
    expect(screen.getByText(/no flashcards found/i)).toBeInTheDocument();
    expect(getStoredCards()).toEqual([]);

    confirmSpy.mockRestore();
  });

  test("clicking a card toggles its reveal state via aria-pressed (study behavior sanity)", () => {
    seedLocalStorage([
      {
        id: "r1",
        question: "Reveal Q",
        answer: "Reveal A",
        createdAt: 1,
      },
    ]);

    render(<App />);

    const list = screen.getByLabelText(/flashcards list/i);
    const firstCard = within(list).getByRole("button", { name: /flashcard: reveal q/i });

    // Starts hidden => aria-pressed false
    expect(firstCard).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(firstCard);
    expect(firstCard).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(firstCard);
    expect(firstCard).toHaveAttribute("aria-pressed", "false");
  });
});
