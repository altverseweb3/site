import React from "react";

interface BaseButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

/**
 * Primary (orange) button - for 'switch' and 'supply' actions
 */
const PrimaryButton: React.FC<BaseButtonProps> = ({
  onClick,
  children,
  className = "",
  disabled = false,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex 
        items-center 
        justify-center 
        font-medium 
        transition-colors 
        focus-visible:outline-none 
        border 
        border-[#61410B] 
        rounded-[3px]
        text-sm 
        bg-[#4F3917] 
        hover:bg-[#5e4520] 
        text-[#F59E0B] 
        py-1
        px-4
        h-6
        w-full
        ${className}
      `}
    >
      {children}
    </button>
  );
};

/**
 * Secondary (blue text) button - for 'withdraw' action
 */
const BlueButton: React.FC<BaseButtonProps> = ({
  onClick,
  children,
  className = "",
  disabled = false,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex 
        items-center 
        justify-center 
        font-medium 
        transition-colors 
        focus-visible:outline-none 
        border 
        border-[#183644] 
        rounded-[3px]
        text-sm 
        bg-[#192930]
        hover:bg-[#323232] 
        text-[#0EA5E9] 
        py-1
        px-4
        h-6
        w-full
        ${className}
      `}
    >
      {children}
    </button>
  );
};

/**
 * Secondary (gray text) button - for 'details' action
 */
const GrayButton: React.FC<BaseButtonProps> = ({
  onClick,
  children,
  className = "",
  disabled = false,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
          inline-flex 
          items-center 
          justify-center 
          font-medium 
          transition-colors 
          focus-visible:outline-none 
          border 
          border-[#27272A] 
          rounded-[3px]
          text-sm 
          bg-[#27272ABF] 
          hover:bg-[#323232] 
          text-[#A1A1AA] 
          py-1
          px-4
          h-6
          w-full
          ${className}
        `}
    >
      {children}
    </button>
  );
};

// Only export once at the end of the file
export { PrimaryButton, BlueButton, GrayButton };
