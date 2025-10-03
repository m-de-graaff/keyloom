import { useState, useCallback, useContext } from "react";
import { AuthUIProviderContext } from "../lib/auth-ui-provider";
import {
  validateEmail,
  validatePassword,
  validateUsername,
} from "../lib/validation-utils";
import type { ValidationResult } from "../lib/validation-utils";

interface UseAuthFormOptions<T extends Record<string, any>> {
  initialValues: T;
  onSubmit: (values: T) => Promise<void>;
  validate?: (values: T) => Record<keyof T, string | undefined>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

interface UseAuthFormResult<T extends Record<string, any>> {
  values: T;
  errors: Record<keyof T, string | undefined>;
  touched: Record<keyof T, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
  setValue: (field: keyof T, value: any) => void;
  setError: (field: keyof T, error: string | undefined) => void;
  setTouched: (field: keyof T, touched: boolean) => void;
  handleChange: (
    field: keyof T
  ) => (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleBlur: (
    field: keyof T
  ) => (event: React.FocusEvent<HTMLInputElement>) => void;
  handleSubmit: (event: React.FormEvent) => Promise<void>;
  reset: () => void;
  validateField: (field: keyof T, value: any) => string | undefined;
}

/**
 * Hook for managing auth form state with validation
 * Provides built-in validation for common auth fields (email, password, username)
 */
export function useAuthForm<T extends Record<string, any>>({
  initialValues,
  onSubmit,
  validate,
  validateOnChange = false,
  validateOnBlur = true,
}: UseAuthFormOptions<T>): UseAuthFormResult<T> {
  const { localization } = useContext(AuthUIProviderContext) || {};

  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<keyof T, string | undefined>>(
    {} as Record<keyof T, string | undefined>
  );
  const [touched, setTouchedState] = useState<Record<keyof T, boolean>>(
    {} as Record<keyof T, boolean>
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Built-in field validation
  const validateField = useCallback(
    (field: keyof T, value: any): string | undefined => {
      const fieldName = String(field);

      // Built-in validations for common auth fields
      if (fieldName === "email" && value) {
        const result = validateEmail(value);
        if (!result.valid) {
          return localization[result.error] || result.error;
        }
      }

      if (fieldName === "password" && value) {
        const result = validatePassword(value);
        if (!result.valid) {
          return localization[result.error] || result.error;
        }
      }

      if (fieldName === "username" && value) {
        const result = validateUsername(value);
        if (!result.valid) {
          return localization[result.error] || result.error;
        }
      }

      // Required field validation
      if (!value && (fieldName === "email" || fieldName === "password")) {
        return (
          localization[`${fieldName}_required`] || `${fieldName} is required`
        );
      }

      // Custom validation
      if (validate) {
        const customErrors = validate(values);
        return customErrors[field];
      }

      return undefined;
    },
    [values, validate, localization]
  );

  const setValue = useCallback(
    (field: keyof T, value: any) => {
      setValues((prev) => ({ ...prev, [field]: value }));

      if (validateOnChange) {
        const error = validateField(field, value);
        setErrors((prev) => ({ ...prev, [field]: error }));
      }
    },
    [validateField, validateOnChange]
  );

  const setError = useCallback((field: keyof T, error: string | undefined) => {
    setErrors((prev) => ({ ...prev, [field]: error }));
  }, []);

  const setTouched = useCallback((field: keyof T, touched: boolean) => {
    setTouchedState((prev) => ({ ...prev, [field]: touched }));
  }, []);

  const handleChange = useCallback(
    (field: keyof T) => {
      return (event: React.ChangeEvent<HTMLInputElement>) => {
        const value =
          event.target.type === "checkbox"
            ? event.target.checked
            : event.target.value;
        setValue(field, value);
      };
    },
    [setValue]
  );

  const handleBlur = useCallback(
    (field: keyof T) => {
      return (event: React.FocusEvent<HTMLInputElement>) => {
        setTouched(field, true);

        if (validateOnBlur) {
          const error = validateField(field, values[field]);
          setError(field, error);
        }
      };
    },
    [values, validateField, validateOnBlur, setTouched, setError]
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      if (isSubmitting) return;

      // Validate all fields
      const newErrors: Record<keyof T, string | undefined> = {} as Record<
        keyof T,
        string | undefined
      >;
      let hasErrors = false;

      for (const field in values) {
        const error = validateField(field, values[field]);
        newErrors[field] = error;
        if (error) hasErrors = true;
      }

      setErrors(newErrors);

      // Mark all fields as touched
      const allTouched: Record<keyof T, boolean> = {} as Record<
        keyof T,
        boolean
      >;
      for (const field in values) {
        allTouched[field] = true;
      }
      setTouchedState(allTouched);

      if (hasErrors) return;

      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } catch (error) {
        // Handle submission errors
        console.error("Form submission error:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validateField, onSubmit, isSubmitting]
  );

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({} as Record<keyof T, string | undefined>);
    setTouchedState({} as Record<keyof T, boolean>);
    setIsSubmitting(false);
  }, [initialValues]);

  // Calculate if form is valid
  const isValid = Object.values(errors).every((error) => !error);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    setValue,
    setError,
    setTouched,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    validateField,
  };
}
