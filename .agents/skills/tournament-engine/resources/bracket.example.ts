// Thuật toán cốt lõi cho giải đấu. Thuần hàm, dễ test.

const BYE = null;
export type TeamId = string | typeof BYE;

/** Thứ tự hạt giống chuẩn cho bảng loại trực tiếp (size là lũy thừa của 2): size 8 → [1,8,4,5,2,7,3,6]. */
export function seedOrder(size: number): number[] {
  let seeds = [1, 2];
  while (seeds.length < size) {
    const n = seeds.length * 2;
    seeds = seeds.flatMap((s) => [s, n + 1 - s]);
  }
  return seeds;
}

export const nextPow2 = (n: number) => 2 ** Math.ceil(Math.log2(Math.max(n, 2)));

export interface MatchSeed { round: number; index: number; teamA: TeamId; teamB: TeamId; next?: { round: number; index: number; side: 'A' | 'B' }; }

/** Sinh toàn bộ trận của bảng loại trực tiếp. `teams` đã xếp theo hạt giống (phần tử 0 = hạt giống 1). Hạt giống cao nhận BYE. */
export function singleElimination(teams: string[]): MatchSeed[] {
  const size = nextPow2(teams.length);
  const slots: TeamId[] = seedOrder(size).map((seed) => (seed <= teams.length ? teams[seed - 1] : BYE));
  const matches: MatchSeed[] = [];
  const rounds = Math.log2(size);
  for (let r = 1; r <= rounds; r++) {
    const count = size / 2 ** r;
    for (let i = 0; i < count; i++) {
      matches.push({
        round: r, index: i,
        teamA: r === 1 ? slots[2 * i] : BYE, teamB: r === 1 ? slots[2 * i + 1] : BYE,
        next: r < rounds ? { round: r + 1, index: Math.floor(i / 2), side: i % 2 === 0 ? 'A' : 'B' } : undefined,
      });
    }
  }
  return matches; // trận vòng 1 có BYE: thắng tự động, đẩy đội còn lại lên vòng sau
}

/** Vòng tròn (circle method): trả về danh sách các lượt, mỗi lượt là các cặp. Số đội lẻ → thêm BYE. */
export function roundRobin(teams: string[]): Array<Array<[TeamId, TeamId]>> {
  const list: TeamId[] = [...teams];
  if (list.length % 2 === 1) list.push(BYE);
  const n = list.length;
  const rounds: Array<Array<[TeamId, TeamId]>> = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: Array<[TeamId, TeamId]> = [];
    for (let i = 0; i < n / 2; i++) pairs.push([list[i], list[n - 1 - i]]);
    rounds.push(pairs.filter(([a, b]) => a !== BYE && b !== BYE));
    list.splice(1, 0, list.pop() as TeamId); // giữ nguyên phần tử đầu, xoay các phần tử còn lại
  }
  return rounds;
}

/** Chia bảng kiểu "rắn" (snake) theo hạt giống để các bảng cân bằng sức mạnh. */
export function snakeGroups(teams: string[], groupCount: number): string[][] {
  const groups: string[][] = Array.from({ length: groupCount }, () => []);
  teams.forEach((t, i) => {
    const row = Math.floor(i / groupCount);
    const col = i % groupCount;
    groups[row % 2 === 0 ? col : groupCount - 1 - col].push(t);
  });
  return groups;
}
