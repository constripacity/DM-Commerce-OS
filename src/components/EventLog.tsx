import React from 'react';
import { useTheme } from './ThemeProvider';

interface EventLogProps {
  entries: string[];
}

export function EventLog({ entries }: EventLogProps) {
  const { themeClasses } = useTheme();

  return (
    <div className={`w-80 ${themeClasses.panel} border-l ${themeClasses.border} flex flex-col animate-fadeIn`}>
      <div className="p-4 border-b">
        <h2 className={`text-lg font-semibold ${themeClasses.text}`}>Event Log</h2>
        <p className={`text-xs ${themeClasses.textSecondary} mt-1`}>Recent system events and actions</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 text-xs space-y-2">
        {entries.length === 0 && (
          <div className={`${themeClasses.textSecondary} text-sm`}>No events yet</div>
        )}
        {entries.map((e, i) => (
          <div key={i} className="p-2 rounded bg-gray-50 border">
            <div className={`${themeClasses.text} break-words`}>{e}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default EventLog;
