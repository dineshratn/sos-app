'use client';

interface EmergencyButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function EmergencyButton({
  onClick,
  disabled = false,
}: EmergencyButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="emergency-button emergency-button-pulse w-64 h-64 flex flex-col items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="Emergency SOS Button"
    >
      <span className="text-7xl font-black tracking-wider">SOS</span>
      <span className="text-sm font-medium mt-2 opacity-90">
        Tap to Alert
      </span>
    </button>
  );
}
