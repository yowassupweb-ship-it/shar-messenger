'use client';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
  mode?: 'overlay' | 'inline';
}

function getTwemojiUrl(emoji: string): string {
  const codepoints: string[] = [];
  for (const symbol of Array.from(emoji)) {
    const cp = symbol.codePointAt(0);
    if (!cp || cp === 0xfe0f) continue;
    codepoints.push(cp.toString(16));
  }
  return `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/${codepoints.join('-')}.png`;
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

export default function EmojiPicker({ onEmojiSelect, onClose, mode = 'overlay' }: EmojiPickerProps) {
  const containerClass = mode === 'inline'
    ? 'w-80 max-h-96 backdrop-blur-md bg-[var(--bg-primary)] dark:bg-[#1a1f2e] border border-[var(--border-color)] dark:border-gray-700 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.7)] overflow-hidden z-50'
    : 'absolute bottom-full left-0 mb-2 w-80 max-h-96 backdrop-blur-md bg-[var(--bg-primary)] dark:bg-[#1a1f2e] border border-[var(--border-color)] dark:border-gray-700 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.7)] overflow-hidden z-50';

  return (
    <div className={containerClass}>
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
              className="w-9 h-9 rounded-lg hover:bg-[var(--bg-tertiary)] dark:hover:bg-gray-700 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              title={emoji}
            >
              <img
                src={getTwemojiUrl(emoji)}
                alt={emoji}
                className="h-7 w-7 object-contain"
                draggable={false}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
