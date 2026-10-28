type FavoriteButtonProps = {
  itemId: string;
  name: string;
  nameAmharic: string;
  isFavorite: boolean;
  onToggle: (id: string) => void;
};

export default function FavoriteButton({ itemId, name, nameAmharic, isFavorite, onToggle }: FavoriteButtonProps) {
  const label = isFavorite
    ? `Remove ${name} from favorites / ${nameAmharic}ን ከተወዳጆች ያስወግዱ`
    : `Add ${name} to favorites / ${nameAmharic}ን ወደ ተወዳጆች ያክሉ`;

  return (
    <button
      className={`menu-favorite-button${isFavorite ? " is-saved" : ""}`}
      type="button"
      aria-label={label}
      aria-pressed={isFavorite}
      title={label}
      onClick={() => onToggle(itemId)}
    >
      <span aria-hidden="true">{isFavorite ? "♥" : "♡"}</span>
    </button>
  );
}
