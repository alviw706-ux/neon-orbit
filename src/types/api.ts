export type NewAchievement = {
  key: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  coinReward: number;
};

export type SubmitScoreResult = {
  runId: string;
  isNewBest: boolean;
  xpEarned: number;
  coinsEarned: number;
  levelBefore: number;
  levelAfter: number;
  xp: number;
  coins: number;
  newAchievements: NewAchievement[];
};

export type ClaimRewardResult = {
  challengeId: string;
  xpEarned: number;
  coinsEarned: number;
  xp: number;
  coins: number;
};
