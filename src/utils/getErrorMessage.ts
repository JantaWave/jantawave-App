export const getErrorMessage = (error: any): string => {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.message) return error.message;
  if (typeof error === "string") return error;
  return "Something went wrong. Please try again.";
};
