export class AppError extends Error {
  public readonly code: string;
  public readonly userMessage: string;
  public readonly originalError?: Error;

  constructor(
    code: string,
    message: string,
    userMessage: string,
    originalError?: Error
  ) {
    super(message);
    this.code = code;
    this.userMessage = userMessage;
    this.originalError = originalError;
    this.name = "AppError";
  }
}

export const ErrorRegistry = {
  API_ERROR: {
    code: "API_ERROR",
    userMessage: "An unexpected API error occurred. Please try again.",
  },
  NETWORK_ERROR: {
    code: "NETWORK_ERROR",
    userMessage:
      "A network error occurred. Please check your connection and try again.",
  },
  UNKNOWN_ERROR: {
    code: "UNKNOWN_ERROR",
    userMessage: "An unexpected error occurred. Please try again.",
  },
}; 