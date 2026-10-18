export function referenceError(error) {
  const issues = error?.data?.error?.details?.issues;
  if (issues?.length) return issues.map(issue => `${issue.path?.join(".") || "Form"}: ${issue.message}`).join("; ");
  if (error?.data?.error?.message) return error.data.error.message;
  if (error?.status === 404 || error?.originalStatus === 404) return "Reference API route was not found (HTTP 404). Check the API address and restart the backend, then reload this page.";
  if (error?.status === "FETCH_ERROR" || error?.status === "TIMEOUT_ERROR") return "Cannot connect to the server. Check your connection and that the backend is running, then try again.";
  if (error?.status === "PARSING_ERROR") return `The server returned an invalid response${error.originalStatus ? ` (HTTP ${error.originalStatus})` : ""}. Check that the backend is running, then try again.`;
  if (error?.status === 403) return "You do not have permission to manage references.";
  if (error?.status === 401) return "Your session has expired. Sign in again.";
  if (error instanceof Error) return error.message;
  return "Reference could not be saved. Please try again.";
}
