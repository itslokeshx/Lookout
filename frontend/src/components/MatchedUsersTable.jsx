import { Users } from 'lucide-react';

export default function MatchedUsersTable({ users = [], prompt = '' }) {
  if (!users.length) return null;

  // Determine which columns to show based on available data
  const hasMinutes = users.some((u) => u.minutesListened !== undefined);
  const hasJoinDate = users.some((u) => u.joinDate || u.createdAt);

  const formatDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatMinutes = (m) => {
    if (m === undefined || m === null) return '—';
    if (m >= 60) return `${(m / 60).toFixed(1)}h`;
    return `${m}m`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-in">
      {/* Header */}
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

      {/* Table */}
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
              {hasMinutes && (
                <th className="text-right py-3 px-4 text-xs font-medium text-text-tertiary uppercase tracking-wider">
                  Listened
                </th>
              )}
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
                key={user.email || i}
                className="border-b border-border last:border-b-0 transition-colors duration-150 hover:bg-surface-hover"
              >
                <td className="py-3 px-4 text-text-tertiary text-xs tabular-nums">
                  {user.rank || i + 1}
                </td>
                <td className="py-3 px-4 text-text-primary font-medium">
                  {user.name || user.username || '—'}
                </td>
                <td className="py-3 px-4 text-text-secondary font-mono text-xs">
                  {user.email}
                </td>
                {hasMinutes && (
                  <td className="py-3 px-4 text-right text-text-secondary tabular-nums">
                    {formatMinutes(user.minutesListened)}
                  </td>
                )}
                {hasJoinDate && (
                  <td className="py-3 px-4 text-right text-text-secondary text-xs">
                    {formatDate(user.joinDate || user.createdAt)}
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
