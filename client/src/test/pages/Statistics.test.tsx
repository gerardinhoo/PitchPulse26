import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Statistics from "../../pages/Statistics";

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock("../../api/axios", () => ({
  default: {
    get: mockGet,
  },
}));

const sampleStats = {
  generatedAt: "2026-07-30T12:00:00.000Z",
  tournamentComplete: true,
  definitions: {
    accuracy:
      "(exact-score predictions + correct-result predictions) / scored predictions × 100",
    scoredPredictions: "Predictions on matches with recorded final scores",
    exactScore: "Both predicted scores match the final score (3 points)",
    correctResult:
      "Correct home win, away win, or draw without an exact score (1 point)",
  },
  participation: {
    registeredPlayers: 42,
    activePredictors: 30,
    leaderboardParticipants: 28,
  },
  matches: {
    total: 104,
    completed: 104,
    stagesCovered: 7,
    byStage: [
      {
        stage: "GROUP_STAGE",
        label: "Group Stage",
        fixtureCount: 72,
        completedCount: 72,
        completed: true,
        predictionCount: 400,
        archivePath: "/matches?stage=GROUP_STAGE&view=completed",
      },
      {
        stage: "FINAL",
        label: "Final",
        fixtureCount: 1,
        completedCount: 1,
        completed: true,
        predictionCount: 25,
        archivePath: "/matches?stage=FINAL&view=completed",
      },
    ],
  },
  predictions: {
    total: 520,
    scored: 500,
    exactScore: 80,
    correctResult: 170,
    incorrect: 250,
    accuracyPercentage: 50,
    byStage: [
      { stage: "GROUP_STAGE", label: "Group Stage", predictionCount: 400 },
      { stage: "FINAL", label: "Final", predictionCount: 25 },
    ],
  },
  standings: {
    champion: { displayName: "Casey Champion", points: 91, rank: 1 },
    runnerUp: { displayName: "Riley Runner", points: 84, rank: 2 },
    thirdPlace: { displayName: "Taylor Third", points: 79, rank: 3 },
    firstSecondPointGap: 7,
  },
  highlights: {
    mostPredictedMatch: {
      matchId: 1,
      label: "Spain vs Argentina",
      predictionCount: 40,
      stage: "FINAL",
    },
    mostExactScoreMatch: {
      matchId: 2,
      label: "France vs England",
      exactScoreCount: 12,
      stage: "THIRD_PLACE",
    },
    mostActivePredictor: {
      displayName: "Casey Champion",
      predictionCount: 90,
    },
  },
  worldCupFinal: {
    homeTeam: "Spain",
    awayTeam: "Argentina",
    homeScore: 1,
    awayScore: 0,
    champion: "Spain",
  },
};

describe("Statistics", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("shows a loading skeleton while statistics load", () => {
    mockGet.mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <Statistics />
      </MemoryRouter>,
    );

    expect(screen.getByText("Loading tournament statistics")).toBeInTheDocument();
  });

  it("shows a retryable error state when the request fails", async () => {
    let attempts = 0;
    mockGet.mockImplementation(() => {
      attempts += 1;
      if (attempts === 1) {
        return Promise.reject(new Error("network"));
      }
      return Promise.resolve({ data: sampleStats });
    });

    render(
      <MemoryRouter>
        <Statistics />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("Tournament statistics could not be loaded."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("PitchPulse 26 by the numbers")).toBeInTheDocument();
    expect(attempts).toBe(2);
  });

  it("renders core metrics and stage breakdown from API data without hardcoded champions", async () => {
    mockGet.mockResolvedValue({ data: sampleStats });

    render(
      <MemoryRouter>
        <Statistics />
      </MemoryRouter>,
    );

    expect(await screen.findByText("PitchPulse 26 by the numbers")).toBeInTheDocument();
    expect(screen.getByText("World Cup 2026 Complete")).toBeInTheDocument();

    expect(screen.getAllByText("Registered players").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("42").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("520")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();

    expect(screen.getAllByText("Casey Champion").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Jimbo")).not.toBeInTheDocument();

    const journey = screen.getByRole("heading", { name: "Tournament Journey" }).closest("section");
    expect(journey).toBeTruthy();
    expect(within(journey as HTMLElement).getByText("Group Stage")).toBeInTheDocument();
    expect(within(journey as HTMLElement).getByText("Final")).toBeInTheDocument();
    expect(screen.getAllByText(/Spain vs Argentina/).length).toBeGreaterThanOrEqual(1);

    expect(mockGet).toHaveBeenCalledWith("/statistics/tournament");
  });
});
