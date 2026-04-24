import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MatchCard from "../../components/MatchCard";

describe("MatchCard", () => {
  it("displays team names, formatted date, and final score", () => {
    const date = "2026-06-14T18:30:00.000Z";
    const formattedDate = new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    render(
      <MatchCard
        homeTeam="Argentina"
        awayTeam="Brazil"
        homeCode="ar"
        awayCode="br"
        date={date}
        homeScore={2}
        awayScore={1}
      />,
    );

    expect(
      screen.getByText(
        (_, node) =>
          node?.tagName === "P" &&
          (node.textContent?.includes("Argentina") ?? false) &&
          (node.textContent?.includes("Brazil") ?? false),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(formattedDate)).toBeInTheDocument();
    expect(screen.getByText("Final")).toBeInTheDocument();
    expect(screen.getByText((_, node) => node?.textContent === "2 – 1")).toBeInTheDocument();
  });
});
