/**
 * Express middleware for validating request bodies against a Zod schema.
 * @param {import('zod').ZodSchema} schema - The Zod schema to validate against.
 */
export const validate = (schema) => async (req, res, next) => {
  try {
    // Parse the body to apply validation and sanitization (like trimming and coercion)
    req.body = await schema.parseAsync(req.body);
    next();
  } catch (err) {
    if (err.name === 'ZodError' || err.issues) {
      const issues = err.issues || err.errors || [];
      return res.status(400).json({
        error: 'Validation failed',
        details: issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    return res.status(400).json({ error: err.message || 'Invalid request body' });
  }
};
