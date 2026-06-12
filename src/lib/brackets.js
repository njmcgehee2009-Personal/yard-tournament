// Bracket generation logic

function nextPow2(n) {
  return Math.pow(2, Math.ceil(Math.log2(Math.max(n, 2))))
}

// ─── Round Robin ────────────────────────────────────────────────────────────

export function generateRoundRobinMatches(teams) {
  const list = teams.length % 2 === 0 ? [...teams] : [...teams, null]
  const size = list.length
  const matches = []

  for (let round = 0; round < size - 1; round++) {
    for (let i = 0; i < size / 2; i++) {
      const t1 = list[i]
      const t2 = list[size - 1 - i]
      if (t1 && t2) {
        matches.push({
          round: round + 1,
          position: i,
          bracket: 'round_robin',
          team1_id: t1.id,
          team2_id: t2.id,
          status: 'pending',
        })
      }
    }
    // Rotate keeping position 0 fixed
    const last = list.pop()
    list.splice(1, 0, last)
  }
  return matches
}

// ─── Single Elimination ──────────────────────────────────────────────────────

export function generateSingleElimMatches(teams) {
  const size = nextPow2(teams.length)
  const padded = [...teams, ...Array(size - teams.length).fill(null)]

  // Standard bracket seed order: 1v(size), size/2+1 v size/2, etc.
  // Build interleaved seed array so match-ups are correct
  const seedOrder = buildSeedOrder(size)
  const slotted = seedOrder.map(s => padded[s - 1] ?? null)

  const matches = []
  let pos = 0

  // Round 1
  for (let i = 0; i < size; i += 2) {
    const t1 = slotted[i]
    const t2 = slotted[i + 1]
    const isBye = !t1 || !t2
    matches.push({
      round: 1,
      position: pos++,
      bracket: 'winners',
      team1_id: t1?.id ?? null,
      team2_id: t2?.id ?? null,
      winner_id: isBye ? (t1?.id ?? t2?.id ?? null) : null,
      status: isBye ? 'bye' : 'pending',
    })
  }

  // Subsequent rounds (empty slots)
  const rounds = Math.log2(size)
  for (let r = 2; r <= rounds; r++) {
    const count = size / Math.pow(2, r)
    for (let i = 0; i < count; i++) {
      matches.push({
        round: r,
        position: i,
        bracket: 'winners',
        team1_id: null,
        team2_id: null,
        winner_id: null,
        status: 'pending',
      })
    }
  }

  return matches
}

// ─── Double Elimination ──────────────────────────────────────────────────────

export function generateDoubleElimMatches(teams) {
  const size = nextPow2(teams.length)
  const padded = [...teams, ...Array(size - teams.length).fill(null)]
  const seedOrder = buildSeedOrder(size)
  const slotted = seedOrder.map(s => padded[s - 1] ?? null)

  const matches = []

  // Winners bracket rounds (same structure as single elim)
  const wbRounds = Math.log2(size)
  for (let r = 1; r <= wbRounds; r++) {
    const count = size / Math.pow(2, r)
    for (let i = 0; i < count; i++) {
      const isR1 = r === 1
      const t1 = isR1 ? (slotted[i * 2] ?? null) : null
      const t2 = isR1 ? (slotted[i * 2 + 1] ?? null) : null
      const isBye = isR1 && (!t1 || !t2)
      matches.push({
        round: r,
        position: i,
        bracket: 'winners',
        team1_id: t1?.id ?? null,
        team2_id: t2?.id ?? null,
        winner_id: isBye ? (t1?.id ?? t2?.id ?? null) : null,
        status: isBye ? 'bye' : 'pending',
      })
    }
  }

  // Losers bracket: 2*(wbRounds-1) rounds
  const lbTotalRounds = 2 * (wbRounds - 1)
  for (let r = 1; r <= lbTotalRounds; r++) {
    // Odd LB rounds have size/2^(ceil(r/2)+1) matches, even rounds same count
    const count = size / Math.pow(2, Math.ceil(r / 2) + 1)
    for (let i = 0; i < Math.max(count, 1); i++) {
      matches.push({
        round: r,
        position: i,
        bracket: 'losers',
        team1_id: null,
        team2_id: null,
        winner_id: null,
        status: 'pending',
      })
    }
  }

  // Grand final
  matches.push({
    round: 1,
    position: 0,
    bracket: 'grand_final',
    team1_id: null,
    team2_id: null,
    winner_id: null,
    status: 'pending',
  })

  return matches
}

// ─── Standings (Round Robin) ─────────────────────────────────────────────────

export function computeRoundRobinStandings(teams, matches) {
  const stats = {}
  for (const t of teams) {
    stats[t.id] = { team: t, w: 0, l: 0, d: 0, pts: 0, pf: 0, pa: 0 }
  }

  for (const m of matches) {
    if (m.status !== 'completed') continue
    const s = stats
    if (!s[m.team1_id] || !s[m.team2_id]) continue
    s[m.team1_id].pf += m.score1 ?? 0
    s[m.team1_id].pa += m.score2 ?? 0
    s[m.team2_id].pf += m.score2 ?? 0
    s[m.team2_id].pa += m.score1 ?? 0

    if (m.winner_id === m.team1_id) {
      s[m.team1_id].w++; s[m.team1_id].pts += 2
      s[m.team2_id].l++
    } else if (m.winner_id === m.team2_id) {
      s[m.team2_id].w++; s[m.team2_id].pts += 2
      s[m.team1_id].l++
    } else if (m.score1 != null) {
      s[m.team1_id].d++; s[m.team1_id].pts++
      s[m.team2_id].d++; s[m.team2_id].pts++
    }
  }

  return Object.values(stats).sort((a, b) =>
    b.pts - a.pts || (b.pf - b.pa) - (a.pf - a.pa) || b.pf - a.pf
  )
}

export function computeElimStandings(teams, matches) {
  const best = {}
  for (const t of teams) best[t.id] = { team: t, round: 0, bracket: 'none' }

  for (const m of matches) {
    if (!m.team1_id && !m.team2_id) continue
    const advance = (tid) => {
      if (!best[tid]) return
      const val = bracketValue(m.bracket) + m.round
      if (val > (best[tid].round + bracketValue(best[tid].bracket))) {
        best[tid].round = m.round
        best[tid].bracket = m.bracket
      }
    }
    if (m.team1_id) advance(m.team1_id)
    if (m.team2_id) advance(m.team2_id)
  }

  return Object.values(best).sort((a, b) =>
    (bracketValue(b.bracket) + b.round) - (bracketValue(a.bracket) + a.round)
  )
}

function bracketValue(bracket) {
  if (bracket === 'grand_final') return 1000
  if (bracket === 'winners') return 100
  if (bracket === 'losers') return 10
  return 0
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildSeedOrder(size) {
  let order = [1, 2]
  while (order.length < size) {
    order = order.flatMap(s => [s, size + 1 - s])
  }
  return order
}

// Given a completed match and all matches in the game, return:
// { winMatch, winSlot, lossMatch, lossSlot } — which match slots to fill
export function findNextMatches(match, allMatches) {
  const { round, position, bracket } = match

  if (bracket === 'round_robin' || bracket === 'grand_final') {
    return { winMatch: null, lossMatch: null }
  }

  if (bracket === 'winners') {
    const nextRound = round + 1
    const nextPos = Math.floor(position / 2)
    const winSlot = (position % 2 === 0) ? 'team1_id' : 'team2_id'

    const winMatch = allMatches.find(
      m => m.bracket === 'winners' && m.round === nextRound && m.position === nextPos
    ) ?? null

    // Check if this is the winners final (feeds grand final)
    const wbRounds = Math.max(...allMatches.filter(m => m.bracket === 'winners').map(m => m.round))
    if (round === wbRounds && winMatch === null) {
      const gfMatch = allMatches.find(m => m.bracket === 'grand_final') ?? null
      return { winMatch: gfMatch, winSlot: 'team1_id', lossMatch: findLossMatch(match, allMatches), lossSlot: lossSlot(match, allMatches) }
    }

    return {
      winMatch,
      winSlot,
      lossMatch: findLossMatch(match, allMatches),
      lossSlot: lossSlot(match, allMatches),
    }
  }

  if (bracket === 'losers') {
    const lbMatches = allMatches.filter(m => m.bracket === 'losers')
    const maxLBRound = Math.max(...lbMatches.map(m => m.round))
    if (round === maxLBRound) {
      const gfMatch = allMatches.find(m => m.bracket === 'grand_final') ?? null
      return { winMatch: gfMatch, winSlot: 'team2_id', lossMatch: null, lossSlot: null }
    }
    const nextRound = round + 1
    const nextPos = Math.floor(position / 2)
    const winSlot = (position % 2 === 0) ? 'team1_id' : 'team2_id'
    const winMatch = lbMatches.find(m => m.round === nextRound && m.position === nextPos) ?? null
    return { winMatch, winSlot, lossMatch: null, lossSlot: null }
  }

  return { winMatch: null, lossMatch: null }
}

function findLossMatch(match, allMatches) {
  const lbMatches = allMatches.filter(m => m.bracket === 'losers')
  if (!lbMatches.length) return null

  // WB R1 losers go to LB R1
  // WB Rk losers go to LB R(2k-2) for k>=2
  const { round } = match
  const targetLBRound = round === 1 ? 1 : 2 * (round - 1)
  const lbMatchesInRound = lbMatches.filter(m => m.round === targetLBRound)
  const pos = match.position % lbMatchesInRound.length
  return lbMatchesInRound[pos] ?? null
}

function lossSlot(match, allMatches) {
  const lm = findLossMatch(match, allMatches)
  if (!lm) return null
  // WB R1 losses fill both slots of LB R1 matches
  // WB Rk losses fill team1 of LB R(2k-2) matches (team2 comes from prev LB winner)
  return match.round === 1 ? (match.position % 2 === 0 ? 'team1_id' : 'team2_id') : 'team1_id'
}
