// Dates are planning bounds, not promises of seats, score delivery or admission.
const validDay = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value;
const shift = (day, days) => new Date(Date.parse(`${day}T00:00:00Z`) + days * 86400000).toISOString().slice(0,10);
const difference = (a,b) => Math.round((Date.parse(`${b}T00:00:00Z`)-Date.parse(`${a}T00:00:00Z`))/86400000);

export function examPlan({ step, track, state, profile, today, deadline }) {
  const code = step.id.startsWith('test:') ? step.id.slice(5) : step.track;
  const target = step.target?.min ?? step.target?.recommendedMin ?? null;
  const recommended = step.target?.min == null && step.target?.recommendedMin != null;
  const test = step.target?.test;
  const history = (state.scores?.[code] ?? []).filter(score => score.date <= today && (step.track !== 'toefl' || score.test === test));
  const recent = [...history].sort((a,b) => b.date.localeCompare(a.date))[0];
  const certificate = [...(profile.languageTests ?? []), ...(profile.exams ?? [])].find(score => score.test === test);
  const current = recent?.overall ?? certificate?.score ?? null;
  const format = state.examFormats?.[code] ?? (track.resultDays?.computer ? 'computer' : 'default');
  const historicalScale = test === 'TOEFL_IBT';
  const buffer = state.retakeBuffers?.[code] ?? 0;
  const interval = track.resultDays?.[format] ?? null;
  const wait = interval && !historicalScale ? interval[1] + (track.reportDays?.[1] ?? 0) : null;
  const closes = deadline?.closes;
  const sessions = (track.sessions ?? []).filter(session => validDay(session.date) && validDay(session.result)).sort((a,b) => a.date.localeCompare(b.date));
  let last = null;
  let latest = null;
  if (validDay(closes)) {
    if (sessions.length) {
      latest = sessions.filter(s => s.result <= closes && s.date >= today).at(-1)?.date ?? null;
      last = sessions.filter(s => s.result <= shift(closes,-buffer) && s.date >= today).at(-1)?.date ?? null;
    } else if (wait != null) { latest = shift(closes,-wait); last = shift(latest,-buffer); }
  }
  const booked = state.examDates?.[code] ?? null;
  const resultDate = validDay(booked) ? sessions.length ? sessions.find(s => s.date === booked)?.result ?? null
    : wait != null ? shift(booked,wait) : null : null;
  const expired = Boolean(validDay(closes) && closes < today);
  const tooLate = Boolean(resultDate && validDay(closes) && resultDate > closes);
  const pastBooking = Boolean(booked && booked < today);
  const retakeKnown = track.retakeRule?.minDays != null;
  const canReserveRetake = Boolean(last && latest && last >= today && buffer > 0 && retakeKnown && wait != null
    && (!booked || booked <= last) && buffer >= Math.max(wait,track.retakeRule.minDays));
  return { code, test, target, recommended, current, gap: current == null || target == null ? null : Math.max(0,target-current),
    partsUnknown: Boolean(step.target?.parts), recent: recent ?? null, historicalScale, format, buffer, booked, resultDate,
    lastDate: expired ? null : last, latestDate: expired ? null : latest,
    waitDays: wait, expired, tooLate, pastBooking,
    hasTime: Boolean(last && last >= today && !expired), canReserveRetake,
    daysLeft: last && last >= today ? difference(today,last) : null,
    expectedDeadline: deadline?.confidence !== 'confirmed',
  };
}
