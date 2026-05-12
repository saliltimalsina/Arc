"use client";

type Variant = "tasks" | "backlog" | "sprint" | "assigned" | "mywork" | "subtasks";

interface EmptyStateProps {
  variant?: Variant;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  compact?: boolean;
}

export default function EmptyState({ title, description, action, compact }: EmptyStateProps) {
  if (compact) {
    return (
      <div className="es-compact">
        <div className="es-compact-title">{title}</div>
        {description && <div className="es-compact-sub">{description}</div>}
        {action && (
          <button className="es-compact-btn" onClick={action.onClick}>{action.label}</button>
        )}
      </div>
    );
  }

  return (
    <div className="es-wrap">
      <div className="es-title">{title}</div>
      {description && <div className="es-sub">{description}</div>}
      {action && (
        <button className="es-btn" onClick={action.onClick}>{action.label}</button>
      )}
    </div>
  );
}
