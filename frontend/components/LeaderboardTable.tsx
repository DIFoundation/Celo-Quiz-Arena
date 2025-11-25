// components/LeaderboardTable.jsx
export default function LeaderboardTable({ rows = [] }) {
  return (
    <div className="bg-white rounded shadow overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3 text-left">Rank</th>
            <th className="p-3 text-left">Player</th>
            <th className="p-3 text-right">Score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              <td className="p-3">{r.rank ?? i + 1}</td>
              <td className="p-3 font-mono text-sm">{r.wallet ?? r.player_address ?? "anonymous"}</td>
              <td className="p-3 text-right">{r.total_score ?? r.score ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
