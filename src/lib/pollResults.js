export function tallyPollVotes(poll) {
  const options = Array.isArray(poll?.options) ? poll.options : [];
  const counts = options.map(() => 0);

  for (const row of poll?.poll_responses || []) {
    const index = Number(row?.selected_option);
    if (Number.isInteger(index) && index >= 0 && index < counts.length) {
      counts[index] += 1;
    }
  }

  return {
    total: counts.reduce((sum, n) => sum + n, 0),
    counts,
  };
}
