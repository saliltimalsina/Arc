"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

export type MentionItem = { id: string; name: string; initials: string; color: string };

interface Props {
  items: MentionItem[];
  command: (item: { id: string; label: string }) => void;
}

const MentionList = forwardRef<{ onKeyDown: (event: { event: KeyboardEvent }) => boolean }, Props>(
  function MentionListInner({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => setSelectedIndex(0), [items]);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) command({ id: item.id, label: item.name });
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex(prev => (prev + items.length - 1) % Math.max(1, items.length));
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex(prev => (prev + 1) % Math.max(1, items.length));
          return true;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return <div className="mention-list mention-list-empty">No matches</div>;
    }
    return (
      <div className="mention-list">
        {items.map((it, i) => (
          <button
            key={it.id}
            className={"mention-item" + (i === selectedIndex ? " active" : "")}
            onClick={() => selectItem(i)}
            onMouseEnter={() => setSelectedIndex(i)}
          >
            <span className="mention-avatar" style={{ background: it.color }}>{it.initials}</span>
            <span className="mention-name">{it.name}</span>
          </button>
        ))}
      </div>
    );
  },
);

export default MentionList;
