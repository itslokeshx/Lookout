import { Users } from 'lucide-react';

export default function MatchedUsersTable({ users = [], prompt = '', settings = null }) {
  if (!users.length) return null;

  const nameField = settings?.field_mapping?.name || 'name';
  const emailField = settings?.field_mapping?.email || 'email';
  const joinedField = settings?.field_mapping?.joined_date || 'createdAt';
  const metrics = settings?.metrics || [];

  const hasJoinDate = users.some((u) => u[joinedField] !== undefined || u.joinDate || u.createdAt);

  const formatDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatMetricValue = (val, unit) => {
    if (val === undefined || val === null) return '—';
    if ((unit === 'seconds' || unit === 'sec' || unit === 's') && typeof val === 'number') {
      const mins = Math.round(val / 60);
      if (mins >= 60) return `${(mins / 60).toFixed(1)}h`;
      return `${mins}m`;
    }
    return `${val}${unit ? ` ${unit}` : ''}`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-in">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-accent-muted">
          <Users size={13} className="text-accent" />
        </div>
        <span className="text-sm font-medium text-text-primary">
          {users.length} user{users.length !== 1 ? 's' : ''} matched
        </span>
        <span className="text-xs text-text-tertiary ml-1 truncate max-w-xs">
          — "{prompt}"
        </span>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-raised">
              <th className="text-left py-3 px-4 text-xs font-medium text-text-tertiary uppercase tracking-wider">
                #
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-text-tertiary uppercase tracking-wider">
                Name
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-text-tertiary uppercase tracking-wider">
                Email
              </th>
              {metrics.map((m) => (
                <th key={m.field} className="text-right py-3 px-4 text-xs font-medium text-text-tertiary uppercase tracking-wider">
                  {m.label || m.field}
                </th>
              ))}
              {hasJoinDate && (
                <th className="text-right py-3 px-4 text-xs font-medium text-text-tertiary uppercase tracking-wider">
                  Joined
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => (
              <tr
                key={user[emailField] || i}
                className="border-b border-border last:border-b-0 transition-colors duration-150 hover:bg-surface-hover"
              >
                <td className="py-3 px-4 text-text-tertiary text-xs tabular-nums">
                  {user.rank || i + 1}
                </td>
                <td className="py-3 px-4 text-text-primary font-medium">
                  {user[nameField] || user.name || user.username || '—'}
                </td>
                <td className="py-3 px-4 text-text-secondary font-mono text-xs">
                  {user[emailField] || user.email}
                </td>
                {metrics.map((m) => (
                  <td key={m.field} className="py-3 px-4 text-right text-text-secondary tabular-nums">
                    {formatMetricValue(user[m.field], m.unit)}
                  </td>
                ))}
                {hasJoinDate && (
                  <td className="py-3 px-4 text-right text-text-secondary text-xs">
                    {formatDate(user[joinedField] || user.joinDate || user.createdAt)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
