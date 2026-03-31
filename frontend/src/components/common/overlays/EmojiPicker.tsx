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
    <div className="absolute bottom-full left-0 mb-2 w-80 max-h-96 backdrop-blur-md bg-[var(--bg-primary)] dark:bg-[#1a1f2e] border border-[var(--border-color)] dark:border-gray-700 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.7)] overflow-hidden z-50">
      <div className="p-2 border-b border-[var(--border-color)] dark:border-gray-700 flex items-center justify-between bg-[var(--bg-secondary)] dark:bg-[#151922]">
        <span className="text-xs font-medium text-[var(--text-secondary)]">Эмоджи</span>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full hover:bg-[var(--bg-tertiary)] dark:hover:bg-gray-700 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          ✕
        </button>
      </div>
      
      <div className="p-2 overflow-y-auto max-h-80 bg-[var(--bg-primary)] dark:bg-[#1a1f2e] scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500 dark:hover:scrollbar-thumb-gray-500 scrollbar-track-transparent">
        <div className="grid grid-cols-8 gap-1">
          {popularEmojis.map((emoji, idx) => (
            <button
              key={idx}
              onClick={() => {
                onEmojiSelect(emoji);
              }}
              className="w-9 h-9 rounded-lg hover:bg-[var(--bg-tertiary)] dark:hover:bg-gray-700 flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95"
              title={emoji}
            >
              <span className="emoji-native">{emoji}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
