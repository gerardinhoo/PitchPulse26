CREATE TYPE "TournamentStage" AS ENUM (
  'GROUP_STAGE',
  'ROUND_OF_32',
  'ROUND_OF_16',
  'QUARTER_FINAL',
  'SEMI_FINAL',
  'THIRD_PLACE',
  'FINAL'
);

ALTER TABLE "Match"
ADD COLUMN "tournamentStage" "TournamentStage" NOT NULL DEFAULT 'GROUP_STAGE';

CREATE INDEX "Match_tournamentStage_idx" ON "Match"("tournamentStage");
