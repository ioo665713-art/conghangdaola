export enum TierLevel {
  S = '夯爆了',
  A = '顶尖',
  B = '人上人',
  C = '一般',
  D = '拉完了',
}

export interface RankItem {
  id: string;
  content: string;
  category: string;
  stats?: TierStats; // Optional stats for community ranking
}

export interface TierStats {
  [TierLevel.S]: number;
  [TierLevel.A]: number;
  [TierLevel.B]: number;
  [TierLevel.C]: number;
  [TierLevel.D]: number;
  totalVotes: number;
}

export interface TierData {
  id: TierLevel;
  label: string;
  color: string;
  items: RankItem[];
}

export interface CategoryData {
  id: string;
  name: string;
  items: string[]; // Raw strings, converted to RankItems at runtime
}

export type GameState = {
  [key in TierLevel]: RankItem[];
};

export interface DragItem {
  type: 'ITEM';
  id: string;
  fromContainer: string; // 'POOL' or TierLevel
}