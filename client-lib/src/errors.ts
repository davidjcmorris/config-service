export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}

export function friendlyErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.status) {
      case 400:
        return 'Please check your entries and try again.';
      case 404:
        return 'The item could not be found.';
      case 409:
        return 'This name is already in use.';
      case 500:
        return 'Something went wrong on the server. Please try again.';
      default:
        return `An unexpected error occurred (${err.status}). Please try again.`;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'An unexpected error occurred. Please try again.';
}
