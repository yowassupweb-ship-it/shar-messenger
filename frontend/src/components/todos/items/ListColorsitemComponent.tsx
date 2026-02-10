'use client';

import React, { memo } from 'react';




const ListColorsitemComponent = memo(function ListColorsitemComponent({}: ListColorsitemComponentProps) {
  return (
    (
                    <button
                      key={color}
                      onClick={() => setNewListColor(color)}
                      className={`w-6 h-6 rounded-full transition-all ${newListColor === color ? 'ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--bg-tertiary)] scale-110' : 'hover:scale-110'}`}
                      style={{ backgroundColor: color }}
                    />
                  )
  );
});

export default ListColorsitemComponent;
