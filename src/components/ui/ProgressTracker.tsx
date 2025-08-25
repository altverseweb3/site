import React, { useState, useCallback } from "react";
import { CheckCircle, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type StepState = "pending" | "active" | "completed" | "failed";

export interface Step {
  id: string;
  title: string;
  description: string;
  state: StepState;
}

export interface ProgressTrackerProps {
  /**
   * Array of steps to display in the progress tracker
   */
  steps: Step[];

  /**
   * Optional title/description for the overall progress
   */
  title?: string;

  /**
   * Optional description text shown below the title
   */
  description?: string;

  /**
   * Optional action button configuration
   */
  actionButton?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "destructive";
    disabled?: boolean;
  };

  /**
   * Custom styling classes
   */
  className?: string;

  /**
   * Show/hide the progress tracker
   */
  show?: boolean;
}

const StepIndicator: React.FC<{
  step: Step;
}> = ({ step }) => {
  const { state, title, description } = step;

  const icons = {
    pending: (
      <div className="w-6 h-6 rounded-full border-2 border-gray-600 bg-gray-800" />
    ),
    active: <Clock className="w-6 h-6 text-amber-500" />,
    completed: <CheckCircle className="w-6 h-6 text-green-500" />,
    failed: <AlertCircle className="w-6 h-6 text-red-500" />,
  };

  return (
    <div className="flex items-center gap-3">
      {icons[state]}
      <div>
        <div
          className={`text-sm font-medium ${
            state === "completed"
              ? "text-green-500"
              : state === "failed"
                ? "text-red-500"
                : state === "active"
                  ? "text-amber-500"
                  : "text-gray-400"
          }`}
        >
          {title}
        </div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
    </div>
  );
};

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  steps,
  title,
  description,
  actionButton,
  className = "",
  show = true,
}) => {
  if (!show || steps.length === 0) {
    return null;
  }

  return (
    <div
      className={`p-4 bg-[#27272A] rounded-lg border border-[#3F3F46] ${className}`}
    >
      {/* Title and Description */}
      {(title || description) && (
        <div className="mb-3">
          {title && (
            <div className="text-sm font-medium text-[#FAFAFA] break-words">
              {title}
            </div>
          )}
          {description && (
            <div className="text-xs text-gray-500 mt-1">{description}</div>
          )}
        </div>
      )}

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step) => (
          <StepIndicator key={step.id} step={step} />
        ))}
      </div>

      {/* Action Button */}
      {actionButton && (
        <div className="mt-3 pt-3 border-t border-[#3F3F46]">
          <Button
            onClick={actionButton.onClick}
            variant={actionButton.variant || "outline"}
            size="sm"
            disabled={actionButton.disabled}
            className={`w-full ${
              actionButton.variant === "outline"
                ? "text-amber-500 border-amber-500 hover:bg-amber-500/10"
                : ""
            }`}
          >
            {actionButton.label}
          </Button>
        </div>
      )}
    </div>
  );
};

// Helper function to create steps easily
export const createStep = (
  id: string,
  title: string,
  description: string,
  state: StepState = "pending",
): Step => ({
  id,
  title,
  description,
  state,
});

// Hook for managing step states (optional utility)
export const useStepTracker = (initialSteps: Omit<Step, "state">[]) => {
  const [steps, setSteps] = useState<Step[]>(
    initialSteps.map((step) => ({ ...step, state: "pending" as StepState })),
  );

  const updateStep = useCallback((stepId: string, state: StepState) => {
    setSteps((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, state } : step)),
    );
  }, []);

  const updateStepByIndex = useCallback(
    (index: number, state: StepState) => {
      setSteps((prev) =>
        prev.map((step, i) => (i === index ? { ...step, state } : step)),
      );
    },
    [],
  );

  const resetSteps = useCallback(() => {
    setSteps((prev) =>
      prev.map((step) => ({ ...step, state: "pending" as StepState })),
    );
  }, []);

  const getCurrentStepIndex = useCallback(() => {
    return steps.findIndex((step) => step.state === "active");
  }, [steps]);

  const isCompleted = useCallback(() => {
    return steps.every((step) => step.state === "completed");
  }, [steps]);

  const hasFailed = useCallback(() => {
    return steps.some((step) => step.state === "failed");
  }, [steps]);

  return {
    steps,
    updateStep,
    updateStepByIndex,
    resetSteps,
    getCurrentStepIndex,
    isCompleted,
    hasFailed,
  };
};

export default ProgressTracker;
