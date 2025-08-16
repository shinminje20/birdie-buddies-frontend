//src/pages/Wallet.tsx — wallet + ledger
import { useQuery } from "@tanstack/react-query";
import { Ledger, myLedger, myWallet } from "../lib/api";

function cents(n: number) {
  return `$${n.toFixed(2)}`;
}

export default function Wallet() {
  const w = useQuery({ queryKey: ["wallet"], queryFn: myWallet });
  const l = useQuery({ queryKey: ["ledger"], queryFn: myLedger });

  if (w.isLoading || l.isLoading) return <div>Loading…</div>;
  if (w.isError || l.isError) return <div>Error</div>;

  return (
    <div>
      <h2>Wallet</h2>
      <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
        <div>
          Posted: <b>{cents(w.data!.posted_cents)}</b>
        </div>
        <div>
          On Hold: <b>{cents(w.data!.holds_cents)}</b>
        </div>
        <div>
          Available: <b>{cents(w.data!.available_cents)}</b>
        </div>
      </div>
      <h3>Ledger</h3>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Kind</th>
            <th>Amount</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {l.data!.map((row: Ledger) => (
            <tr key={row.id}>
              <td>{row.id}</td>
              <td>{row.kind}</td>
              <td>{cents(row.amount_cents)}</td>
              <td>{new Date(row.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
