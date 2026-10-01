// Limits the browser and the server must agree on. Constants only, so a client component can
// import it without pulling any server code into its bundle.
export const MAX_PDF_BYTES = 5 * 1024 * 1024;
// Largest job description a job accepts, whether pasted or imported from a posting URL.
export const MAX_JD_BYTES = 20 * 1024;
