import { parseDecimalNumberToSubscript } from "@/utils/formatters";

export const SubscriptNumber = ({ value }: { value: string | number }) => {
  const { hasSubscript, subscriptCount, remainingDigits } =
    parseDecimalNumberToSubscript(value);
  if (hasSubscript) {
    return (
      <span>
        0.0<sub>{subscriptCount}</sub>
        {remainingDigits}
      </span>
    );
  }

  return <span>{remainingDigits}</span>;
};

export default SubscriptNumber;
