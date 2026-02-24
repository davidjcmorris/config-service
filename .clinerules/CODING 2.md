# Coding Rules

## Backend

- New repository functions must follow the existing async cursor pattern in the codebase. The cursor passed to repository functions is the actual cursor object, not the context manager itself.

## Frontend — Error Handling

- Never display raw HTTP status codes to the user. Map them to friendly messages:
  - 500 → "Something went wrong on the server. Please try again."
  - 404 → "The item could not be found."
  - 409 → "This name is already in use."
  - 400 → "Please check your entries and try again."
  - Any other error → "An unexpected error occurred. Please try again."
- When a form submission fails (validation or API error), preserve all field values. Only clear the form on successful save or explicit cancel.

## Frontend — UI Behaviour

- The main list uses a single-open accordion — expanding and entry in the main list displays the related child entries.
- Each row in the main list and child list has a single edit icon only. 
- Delete actions are only accessible from within the edit form, never from the list view. All deletes require confirmation.
- When an application is expanded, an add configuration button appears at the top of its configuration list. This button only appears when the application is expanded.
- After any successful create, update, or delete operation, re-fetch data from the API rather than updating local state directly.
- After an unsuccessful create or update, the form field values submitted should be represented with any error message(s), rather than resetting them to the original values.