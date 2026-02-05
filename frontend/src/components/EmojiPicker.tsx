'use client';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

// Эмодзи как в Telegram - самые популярные
const popularEmojis = [
  '😂', '😭', '🥰', '😍', '🤣', '😊', '🙏', '💕', '😘', '🥺', '😩', '🔥', '👍', '😁', '♥️', '🤦', '🤷', '😅', '😆', '👏',
  '🙄', '😉', '😎', '💔', '💖', '💙', '😢', '🤔', '😏', '🥲', '😳', '🙃', '😌', '🤪', '😔', '😞', '😬', '👀', '😴', '🤗',
  '😱', '😐', '🤨', '🤤', '😤', '😡', '😈', '💀', '☠️', '👻', '🤡', '🥴', '🥶', '🥵', '😵', '🤯', '🤮', '🤢', '😷', '🤒',
  '🤕', '🤑', '🤠', '😇', '🤓', '🧐', '😮', '😯', '😲', '😪', '😫', '🥱', '😖', '😣', '😛', '😜', '😝', '🤐', '😶', '😑',
  '🤥', '😕', '😟', '🙁', '☹️', '😲', '🥳', '🥸', '🫠', '🫢', '🫣', '🫡', '🫥', '🫤', '🥹', '😮‍💨', '😶‍🌫️', '😵‍💫', '🤧', '🥴',
  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐', '🖖', '👋', '🤏', '💪',
  '🦵', '🦶', '👂', '👃', '🧠', '🦷', '👀', '👁️', '👅', '👄', '💋', '🩸', '🫀', '🫁', '🦴', '🙌', '👐', '🤲', '🤝', '🙏',
  '✍️', '💅', '🤳', '💃', '🕺', '🧑', '👶', '👧', '🧒', '👦', '👩', '🧑', '👨', '👩‍🦰', '👨‍🦰', '👩‍🦱', '👨‍🦱', '👩‍🦳', '👨‍🦳', '👩‍🦲',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝',
  '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎',
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔',
  '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦗',
  '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑',
  '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳',
  '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗',
  '☕', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🧊', '🥄', '🍴', '🍽️', '🥣',
  '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳',
  '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '🤺', '⛹️', '🤾',
  '🌍', '🌎', '🌏', '🌐', '🗺️', '🗾', '🧭', '🏔️', '⛰️', '🌋', '🗻', '🏕️', '🏖️', '🏜️', '🏝️', '🏞️', '🏟️', '🏛️', '🏗️', '🧱',
  '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🦯', '🦽', '🦼', '🩼', '🛴', '🚲'
];

export default function EmojiPicker({ onEmojiSelect, onClose }: EmojiPickerProps) {
  return (
    <div className="absolute bottom-full left-0 mb-2 w-80 max-h-96 backdrop-blur-2xl bg-gradient-to-br from-[var(--bg-secondary)]/95 to-[var(--bg-tertiary)]/95 border border-white/20 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.1)] overflow-hidden z-50">
      <div className="p-2 border-b border-white/10 flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-secondary)]">Эмоджи</span>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          ✕
        </button>
      </div>
      
      <div className="p-2 overflow-y-auto max-h-80 scrollbar-thin scrollbar-thumb-white/20 hover:scrollbar-thumb-white/30 scrollbar-track-white/5">
        <div className="grid grid-cols-8 gap-1">
          {popularEmojis.map((emoji, idx) => (
            <button
              key={idx}
              onClick={() => {
                onEmojiSelect(emoji);
                onClose();
              }}
              className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95"
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
