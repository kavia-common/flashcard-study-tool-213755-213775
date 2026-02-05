import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders Flashcards title", () => {
  render(<App />);
  const title = screen.getByRole("heading", { name: /flashcards/i });
  expect(title).toBeInTheDocument();
});
